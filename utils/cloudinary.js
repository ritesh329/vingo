import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// ✅ Cloudinary config (एक बार globally)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Upload function
export const uploadOnCloudinary = async (filePath) => {
  try {
    if (!filePath) return null;

    const result = await cloudinary.uploader.upload(filePath, {
      folder: "food_items",               // folder का नाम
    
    });

    // ✅ Local file delete after upload
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return {
      url: result.secure_url,       // frontend use
      public_id: result.public_id,  // delete/edit use
    };
  } catch (error) {
    console.error("❌ Cloudinary upload error:", error.message);

    // ✅ अगर error आया तो भी local file delete
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    throw error;
  }
};

// ✅ Delete function
export const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return null;
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("❌ Cloudinary delete error:", error.message);
    throw error;
  }
};
