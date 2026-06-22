import Item from "../models/item.model.js";
import Shop from "../models/shop.models.js";

import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

// 🟢 Add Item with rollback
export const addItem = async (req, res) => {
  let uploadedImage = null;

  try {
    const { name, category, Foodtype, price } = req.body;

    // ✅ Shop find
    const shop = await Shop.findOne({ owner: req.userId });
    if (!shop) {
      return res.status(400).json({ error: "Shop not found" });
    }

    // ✅ पहले image upload करो
    if (req.file) {
      uploadedImage = await uploadOnCloudinary(req.file.buffer);
      if (!uploadedImage?.url) {
        return res.status(400).json({ error: "Image upload failed" });
      }
    } else {
      return res.status(400).json({ error: "Image is required" });
    }

    // ✅ फिर DB में item save करो
    const item = await Item.create({
      name,
      category,
      Foodtype,
      price,
      image: uploadedImage.url,
      shop: shop._id,
    });

    // ✅ shop.items में push करो
    shop.items.push(item._id);
    await shop.save();
    // await shop.populate('items owners');

    return res.status(201).json(item);
  } catch (err) {
    // ❌ अगर DB में error आया → Cloudinary से image delete कर दो
    if (uploadedImage?.public_id) {
      await deleteFromCloudinary(uploadedImage.public_id);
    }
    return res.status(500).json({ error: `add item error ${err.message}` });
  }
};



// 🟢 Edit Item
export const editItem = async (req, res) => {
  try {
    const itemId = req.params.itemId;
    const { name, category, Foodtype, price } = req.body;

    let updateData = { name, category, Foodtype, price };

    if (req.file) {
      const uploadedImage = await uploadOnCloudinary(req.file.buffer);
      updateData.image = uploadedImage?.url;
    }

    const item = await Item.findByIdAndUpdate(itemId, updateData, {
      new: true,
    });

    if (!item) {
      return res.status(400).json({ error: "ItemId not found" });
    }


    const shop=await Shop.findOne({owner:req.userId}).populate({
     path:"items",
     options:{

        sort:{updatedAt:-1}}
     }
    
  );

    return res.status(200).json(shop);
  } catch (error) {
    return res.status(500).json({ error: `edit item error ${error.message}` });
  }
};

export const getItemById=async (req,res)=>{

  try{

       const itemId=req.params.itemId
       const item=await Item.findById(itemId)
       if(!item){

        return res.status(400).json({message:"item not found"});

       }

       return res.status(200).json(item)
  }catch(err)
  {
       return res.status(500).json({ error: `geting item error ${err.message}` });
  }
}

export const deleteItem = async (req, res) => {
  try {
    const itemId = req.params.itemId;

    // 1️⃣ Pehle item find karo
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // 2️⃣ Agar image Cloudinary pe hai to delete karo
    if (item?.image?.public_id) {
      await deleteFromCloudinary(item.image.public_id);
    }

    // 3️⃣ Ab item DB se delete karo
    await Item.findByIdAndDelete(itemId);

    // 4️⃣ Shop ke items array se bhi remove karo
    const shop = await Shop.findOne({ owner: req.userId });
    if (shop) {
      shop.items = shop.items.filter((i) => i.toString() !== item._id.toString());
      await shop.save();
      await shop.populate({
        path: "items",
        options: { sort: { updatedAt: -1 } },
      });
    }

    return res.status(200).json(shop || { message: "Item deleted" });
  } catch (err) {
    console.error("Delete item error:", err);
    return res.status(500).json({ error: `Delete item error: ${err.message}` });
  }
};


export const getItemByCity=async (req,res)=>{

    try{

          const {city}=req.params;
          if(!city){

            return res.status(400).json({message:"city is required"});
          }

          const shops=await Shop.find({
            city:{$regex:new RegExp(`^${city}$`,"i" )}
          }).populate('items')

        if(!shops){

          return res.status(400).json({
            error:"shops not found"
          })
        }
          const itemsID=shops.map((shop)=>shop._id);

          const items= await Item.find({shop:{$in:itemsID}})
                                                                                                                                                                                                
          return res.status(200).json(items);

    }catch(err)
    {
       return res.status(400).json({
            error:`get item by city error  ${err} `
          })
    }
}

export const getItemsByShop=async (req,res)=>{

  try{

       const {shopId}=req.params
       const shop=await Shop.findById(shopId).populate("items")
       if(!shop)
       {
          
          return res.status(400).json("shop not found")
       }
       return res.status(200).json({
        shop,items:shop.items
       })
  }catch(err)
  {
         return res.status(400).json({
            error:`get item by city error  ${err} `
          })
  }
}


export const searchItems = async (req, res) => {
  try {
    const { query, city } = req.query;

    // ✅ Validate input
    if (!query || !city) {
      return ;
    }

    // ✅ Correct regex string interpolation (use backticks)
    const shops = await Shop.find({
      city: { $regex: new RegExp(`^${city}$`, "i") },
    }).populate("items");

    if (!shops || shops.length === 0) {
      return res.status(404).json({ message: "No shops found in this city" });
    }

    // ✅ Get all shop IDs
    const shopIds = shops.map((s) => s._id);

    // ✅ Search for matching items by name or category
    const items = await Item.find({
      shop: { $in: shopIds },
      $or: [
        { name: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } },
      ],
    }).populate("shop", "name image");

    if (!items || items.length === 0) {
      return res.status(404).json({ message: "No items found for this query" });
    }

    // ✅ Return items successfully
    return res.status(200).json({
      success: true,
      count: items.length,
      items,
    });

  } catch (err) {
    console.error("Search item error:", err);
    return res.status(500).json({
      message: err.message || "Internal Server Error while searching items",
    });
  }
};






