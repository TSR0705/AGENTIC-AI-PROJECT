import dotenv from 'dotenv';
import express from 'express';
configDotenv.comfig()


const app = express();


app.use (express.json());
app.use(express.urlencoded({extended: true}));


app.get('/', function(req,res){
    res.send('hello world');
});

export default app;