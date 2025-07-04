import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();  // Required to load .env variables

console.log(process.env.MONGODB_URI);  // Should now print the correct value

function connect() {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => {
            console.log("Connected to MongoDB");
        })
        .catch(err => {
            console.error(err);
        });
}

export default connect;
