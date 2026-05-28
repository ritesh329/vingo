import express from 'express'
import { getCurrentUser, updateUserLocation } from '../controllers/user.controllers.js';
import isAuth from '../middlewares/isAuth.js'
const Userrouter=express.Router();


Userrouter.get('/Current',isAuth,getCurrentUser);
Userrouter.post('/update-location',isAuth,updateUserLocation);

export default Userrouter