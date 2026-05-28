import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import dbcon from './config/db.js'
import cookieParser from 'cookie-parser';
import authrouter from './routes/auth.routes.js';
import cors from 'cors'
import Userrouter from './routes/user.routes.js';
import shopRouter from './routes/shop.routes.js';
import itemRouter from './routes/item.routes.js';
import orderRouter from './routes/order.routes.js';
import http from 'http'
import  { Server }  from 'socket.io'
import { socketHandler } from './socket.js';

const app = express();

const server= http.createServer(
     app
);

const origin=["http://localhost:5173","https://vingo-sozm.onrender.com","https://vingo-frontend-n7hr.onrender.com"]

const io=new Server(server,{
       cors:{
              origin: origin,
              credentials:true,
              methods:['POST',"GET"]
       }
})

app.set("io",io)     





const PORT = process.env.PORT || 8000;

app.use(cors(
       {
              
              origin: origin,
              credentials: true

       }))
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authrouter);
app.use('/api/user', Userrouter);
app.use('/api/shop', shopRouter);
app.use('/api/item', itemRouter);
app.use('/api/order', orderRouter);

socketHandler(io);

server.listen(PORT, () => {
       dbcon();
       console.log("server is running ");

})

