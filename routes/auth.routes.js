import express from 'express'
import { signup,signIn,signOut ,sendOtp, verifyOtp, resetPassword, googleAuth } from '../controllers/auth.controllers.js';
const authrouter=express.Router();


authrouter.post('/signup',signup);
authrouter.post('/signin',signIn);
authrouter.get('/signout',signOut);
authrouter.post('/otp-send',sendOtp);
authrouter.post('/verify-otp',verifyOtp);
authrouter.post('/reset-password',resetPassword);
authrouter.post('/google-auth',googleAuth);


export default authrouter