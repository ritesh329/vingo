import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { acceptOrder, getCurrentOrder, getDeliveryBoyAssignment, getMyOrders, getOrderById, placeOrder, sendDeliveryOtp, updateOrderStatus, verifyDeliveryOtp } from "../controllers/order.controllers.js";

const orderRouter = express.Router();

// ✅ Place a new order (requires auth)
orderRouter.post("/place-order", isAuth, placeOrder);

// ✅ Get orders of the logged-in user
orderRouter.get("/get-assignments", isAuth, getDeliveryBoyAssignment);
orderRouter.get("/my-orders", isAuth, getMyOrders);
orderRouter.post("/update-status/:orderId/:shopId", isAuth, updateOrderStatus);
orderRouter.get("/accept-order/:assignmentId", isAuth, acceptOrder);
orderRouter.get("/get-current-order", isAuth, getCurrentOrder);
orderRouter.get("/get-order-by-id/:orderId", isAuth, getOrderById);
orderRouter.post("/send-delivery-otp", isAuth, sendDeliveryOtp);
orderRouter.post("/verify-delivery-otp", isAuth, verifyDeliveryOtp);
// 🔒 Future: Get orders for owners (e.g., restaurant owner)
// orderRouter.post("/owner-orders", isAuth, getOwnerOrder);

export default orderRouter;
