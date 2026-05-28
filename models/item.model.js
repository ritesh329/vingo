import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    image: {
      type: String,
     
    },
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
    },
    category: {
      type: String,
      enum: [
  "Snacks",
  "Desserts",
  "Pizza",
  "Burgers",
  "Sandwiches",   // ✅ सही spelling
  "South Indian",
  "Chinese",
  "Fast Food",
  "Others",
],

      required: true,
    },
    price: {
      type: Number,
      min: 0,
      required: true,
    },
    Foodtype: {
      type: String,
      enum: ["veg", "non veg"],
      required: true,
    },
    rating:{
         average:{type:Number,default:0},
         count:{type:Number,default:0}
    }
  },
  {
    timestamps: true,
  }
);

const Item = mongoose.model("Item", itemSchema);
export default Item;
