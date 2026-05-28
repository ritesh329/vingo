import Shop from '../models/shop.models.js';
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

export const createShop = async (req, res) => {
  try {
    const { name, city, state, address } = req.body;

    let image = null;

    if (req.file) {
      image = await uploadOnCloudinary(req.file.path);
    }

    let shop = await Shop.findOne({ owner: req.userId });

    if (!shop) {
      // ✅ Create new shop
      shop = await Shop.create({
        name,
        city,
        state,
        address,
        image,
        owner: req.userId,
      });
    } else {
      // ✅ Delete old image if new one uploaded
      if (image && shop.image?.public_id) {
        await deleteFromCloudinary(shop.image.public_id);
      }

      // ✅ Update shop
      shop = await Shop.findByIdAndUpdate(
        shop._id,
        {
          name,
          city,
          state,
          address,
          ...(image && { image }),
        },
        { new: true }
      );
    }

    await shop.populate("owner");

    return res.status(201).json(shop);
  } catch (err) {
    console.error("create shop error:", err);
    return res.status(500).json({ error: `create shop error: ${err.message}` });
  }
};


export const getShopAccount = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.userId })
      .populate("owner")
      .populate({
     path:"items",
     options:{

        sort:{updatedAt:-1}}
     }
    
  ); // ✅ अब Item schema properly registered है

    if (!shop) {
      return res.status(404).json({
        success: false,
        error: "Shop not found",
      });
    }

    return res.status(200).json({
      success: true,
      shop,
    });
  } catch (err) {
    console.error("getShopAccount error:", err);
    return res.status(500).json({
      success: false,
      error: `get my shop error: ${err.message}`,
    });
  }
};

export const getShopByCity=async (req,res)=>{
    try{
         const {city}=req.params;
         const shops=await Shop.find({
            city:{
              $regex:new RegExp(`^${city}$`,"i")
            }
         }).populate("items");

         if(!shops)
         {
             return res.status(404).json({
        error: "Shop not found",
      });
         }

         return res.status(200).json({
          message:shops
         })



    }catch(err)
    {
        return res.status(500).json({
      success: false,
      error: `get shop by city error: ${err.message}`,
    });
    }
}