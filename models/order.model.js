import mongoose from "mongoose";

const ShopOrderItemSchema = new mongoose.Schema({
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    price: { type: Number },
    name: String,
    quantity: Number
});

const shopOrderSchema = new mongoose.Schema({
    shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    subtotal: Number,
    shopOrderItem: [ShopOrderItemSchema],
    status: { type: String, enum: ["pending", "preparing", "out of delivery", "delivered"], default: "pending" },
    
    // Added for delivery assignment tracking per shopOrder
    assignedDeliveryBoy: { type: mongoose.Schema.Types.ObjectId, ref: "User"  },
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: "DeliveryAssignment", default: null },
    deliveryOtp:{
          type:String,
          default:null
    },
    // isOtpVerified:{
    //     type:Boolean,
    //     default:false
    // },
    otpExpires:{

         type:Date,
         default:null
    },
    deliveredAt:{
        type:Date,
        default:null
    }
}, { timestamps: true });

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    paymentMethod: { type: String, enum: ["cod", "online"], required: true },
    deliveryAddress: {
        text: String,
        latitude: Number,
        longitude: Number
    },
    totalAmount: { type: Number },
    shopOrders: [shopOrderSchema]
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);
export default Order;
