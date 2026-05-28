import express from 'express'
import isAuth from '../middlewares/isAuth.js';
import { createShop, getShopAccount, getShopByCity } from '../controllers/shop.controllers.js';
import { upload } from '../middlewares/multer.js';


const shopRouter=express.Router();


shopRouter.post('/create-edit',isAuth,upload.single('image'),createShop);
shopRouter.get('/get-my-account',isAuth,getShopAccount);
shopRouter.get('/get-shop-city/:city',isAuth,getShopByCity);
export default shopRouter