import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import projectModel from './models/project.model.js';
import { generateResult } from './services/ai.service.js';

const port = process.env.PORT || 3000;



const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*'
    }
});


io.use(async (socket, next) => {

    try {

        const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(' ')[ 1 ];
        const projectId = socket.handshake.query.projectId;

        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return next(new Error('Invalid projectId'));
        }


        socket.project = await projectModel.findById(projectId);


        if (!token) {
            return next(new Error('Authentication error'))
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded) {
            return next(new Error('Authentication error'))
        }


        socket.user = decoded;

        next();

    } catch (error) {
        next(error)
    }

})


io.on('connection', socket => {
    socket.roomId = socket.project._id.toString()


    console.log('a user connected');



    socket.join(socket.roomId);

    socket.on('project-message', async data => {

        const message = data.message;

        // Persist user message to project in database
        try {
            await projectModel.findByIdAndUpdate(socket.project._id, {
                $push: {
                    messages: {
                        sender: {
                            _id: data.sender._id,
                            email: data.sender.email
                        },
                        message: data.message
                    }
                }
            });
        } catch (dbErr) {
            console.error("Failed to save user message to DB:", dbErr.message);
        }

        const aiIsPresentInMessage = message.includes('@ai');
        socket.broadcast.to(socket.roomId).emit('project-message', data)

        if (aiIsPresentInMessage) {
            const prompt = message.replace('@ai', '');

            try {
                const result = await generateResult(prompt);

                // Persist AI message to database
                await projectModel.findByIdAndUpdate(socket.project._id, {
                    $push: {
                        messages: {
                            sender: {
                                _id: 'ai',
                                email: 'AI'
                            },
                            message: result
                        }
                    }
                });

                io.to(socket.roomId).emit('project-message', {
                    message: result,
                    sender: {
                        _id: 'ai',
                        email: 'AI'
                    }
                })
            } catch (error) {
                console.error("AI Generation Error:", error.message);
                io.to(socket.roomId).emit('project-message', {
                    message: JSON.stringify({
                        text: `⚠️ WhisperAgent Error: Failed to generate response (${error.message}). Please verify your GOOGLE_AI_KEY in backend/.env.`
                    }),
                    sender: {
                        _id: 'ai',
                        email: 'AI'
                    }
                });
            }

            return
        }


    })

    socket.on('disconnect', () => {
        console.log('user disconnected');
        socket.leave(socket.roomId)
    });
});




server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})