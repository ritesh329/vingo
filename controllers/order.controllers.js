import DeliveryAssignment from "../models/deliveryAssignmentSchema.model.js";
import Order from "../models/order.model.js";
import Shop from "../models/shop.models.js";
import User from "../models/user.model.js";
import { sendDeliveryOtpMail } from "../utils/mail.js";
export const placeOrder = async (req, res) => {
  try {
    const { cartItems, paymentMethod, deliveryAddress, totalAmount } = req.body;

    // Validate cart
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Validate delivery address
    if (
      !deliveryAddress?.text ||
      !deliveryAddress?.latitude ||
      !deliveryAddress?.longitude
    ) {
      return res
        .status(400)
        .json({ error: "Send complete delivery address" });
    }

    // Group cart items by shop
    const groupItemByShop = {};
    cartItems.forEach((item) => {
      const shopId = item.shop;
      if (!groupItemByShop[shopId]) {
        groupItemByShop[shopId] = [];
      }
      groupItemByShop[shopId].push(item);
    });

    // Create shop orders for each shop
    const shopOrders = await Promise.all(
      Object.keys(groupItemByShop).map(async (shopId) => {
        const shop = await Shop.findById(shopId).populate("owner");
        if (!shop) {
          throw new Error(`Shop not found: ${shopId}`);
        }

        const items = groupItemByShop[shopId];
        const subtotal = items.reduce(
          (sum, i) => sum + Number(i.price) * Number(i.quantity),
          0
        );

        return {
          shop: shop._id,
          owner: shop.owner._id,
          subtotal,
          shopOrderItem: items.map((i) => ({
            item: i.id,
            price: i.price,
            quantity: i.quantity,
            name: i.name,
          })),
        };
      })
    );

    // Create the full order
    const newOrder = await Order.create({
      user: req.userId,
      paymentMethod,
      deliveryAddress,
      totalAmount,
      shopOrders,
    });

    await newOrder.populate("shopOrders.shopOrderItem.item", "name image price");
    await newOrder.populate("shopOrders.shop","name")
    await newOrder.populate("shopOrders.owner","name socketId")
    await newOrder.populate("user","name email mobile")
   const io=req.app.get('io')

   if(io)
   {
       newOrder.shopOrders.forEach(shopOrder=>{
          const ownerSocketId=shopOrder.owner.socketId
          if(ownerSocketId){

              io.to(ownerSocketId).emit('newOrder',{
                   _id:newOrder._id,
            paymentMethod:newOrder.paymentMethod,
            user:newOrder.user,
            // shopOrders:newOrder.shopOrders.find(o=>o.owner._id==req.userId),
            shopOrders:shopOrder,
            createdAt:newOrder.createdAt,
            deliveryAddress:newOrder.deliveryAddress
              })
          }
       })
      
   }
     





    return res.status(201).json(newOrder);
  } catch (err) {
    console.error("Place order error:", err);
    return res.status(500).json({ message: "Place order error" });
  }
};


export const getMyOrders = async (req, res) => {
  try {
    // ✅ Correct way to find by ID
    const user = await User.findById(req.userId);

    if (user.role === "user") {
      const orders = await Order.find({ user: req.userId })
        .sort({ createdAt: -1 })
        .populate("shopOrders.shop", "name")
        .populate("shopOrders.owner", "name email mobile")
        .populate("shopOrders.shopOrderItem.item", "name image price"); // ✅ corrected path

      return res.status(200).json(orders);
    } else if (user.role === "owner") {
      const orders = await Order.find({ "shopOrders.owner": req.userId })
        .sort({ createdAt: -1 })
        .populate("shopOrders.shop", "name")
        .populate("user")
        .populate("shopOrders.shopOrderItem.item", "name image price") // ✅ corrected path
         .populate("shopOrders.assignedDeliveryBoy", "fullName mobileNo");
        const filteredOrders=orders.map((order=>({
           
          
            _id:order._id,
            paymentMethod:order.paymentMethod,
            user:order.user,
            shopOrders:order.shopOrders.find(o=>o.owner._id==req.userId),
            createdAt:order.createdAt,
            deliveryAddress:order.deliveryAddress

        })))
      return res.status(200).json(filteredOrders);
    }

    // If role is neither "user" nor "owner"
    return res.status(403).json({ error: "Unauthorized role" });

  } catch (err) {
    console.error("❌ getMyOrders error:", err);
    return res.status(500).json({
      error: "get User and owner order error",
    });
  }
};


export const getOwnerOrder=async(req,res)=>{

   try{

           const orders=await Order.find({"shopOrders.owner":req.userId})
           .sort({createdAt:-1})
           .populate("shopOrders.shop","name")
           .populate("user")
           .populate("shopOrders.shopOrderItems.item","name image price")

           return res.status(200).json(orders);
      }catch(err)
      {
          return res.status(500).json({
              error:"get Owner Item error"
          })
      }


    }


    export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, shopId } = req.params;
    const { status } = req.body;

    // 1️⃣ Find the full order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // 2️⃣ Find the specific shopOrder
    const shopOrder = order.shopOrders.find(o => o.shop.toString() === shopId);
    if (!shopOrder) {
      return res.status(400).json({ message: "Shop order not found" });
    }

    // 3️⃣ Update status
    shopOrder.status = status;
    let deliveryBoyPayload = [];

    // 4️⃣ When moving to "out of delivery" and no assigned boy yet
     if(status=="out of delivery" && !shopOrder.assignment)
      {

           console.log("this is available section");
           const {longitude,latitude}=order.deliveryAddress
           const nearByDeliveryBoys=await User.find({
               role:"deliveryBoy",
               location:{

                    $near:{

                         $geometry:{type:"Point",coordinates:[Number(longitude),Number(latitude)]},
                         $maxDistance:5000
                    }
               }
           })


      console.log("Nearby delivery boys (raw):", nearByDeliveryBoys);

      const nearByIds = nearByDeliveryBoys.map(b => b._id);

      const BusyIds = await DeliveryAssignment.find({
        assignedTo: { $in: nearByIds },
        status: { $nin: ["brodcasted", "completed"] },
      }).distinct("assignedTo");

      const busyIdSet = new Set(BusyIds.map(id => String(id)));

      // Filter available boys
      const availableBoys = nearByDeliveryBoys.filter(b => !busyIdSet.has(String(b._id)));
      const candidates = availableBoys.map(b => b._id);

      if (candidates.length === 0) {
        await order.save();
        return res.json({
          message: "Order status updated, but there are no available delivery boys.",
          availableBoys: [],
        });
      }







      // Create delivery assignment record
      const deliveryAssignmentRecord = await DeliveryAssignment.create({
        order: order._id,
        shop: shopOrder.shop,
        shopOrderId: shopOrder._id,
        brodcastedTo: candidates,
        status: "brodcasted",
      });



      // Assign delivery reference
      shopOrder.assignedDeliveryBoy = deliveryAssignmentRecord.assignedTo;
      shopOrder.assignment = deliveryAssignmentRecord._id;

      // Prepare frontend payload
      deliveryBoyPayload = availableBoys.map(b => ({
        id: b._id,
        fullName: b.fullName,
        longitude: b.location?.coordinates?.[0],
        latitude: b.location?.coordinates?.[1],
        mobile: b.mobileNo,
      }));
await deliveryAssignmentRecord.populate("order");
await deliveryAssignmentRecord.populate("shop");

const io = req.app.get("io");

if (io && Array.isArray(availableBoys) && availableBoys.length > 0) {
  const order = deliveryAssignmentRecord?.order;
  const shop = deliveryAssignmentRecord?.shop;

  // 🧠 Find the correct shopOrder for this shop
  const shopOrder = order?.shopOrders?.find(
    (so) => String(so.shop) === String(shop?._id)
  );

  // 📦 Prepare assignment data (same structure as formatted[])
  const formattedAssignment = {
    assignmentId: deliveryAssignmentRecord._id,
    orderId: order?._id || null,
    shopName: shop?.name || "Unknown Shop",
    deliveryAddress: order?.deliveryAddress || "N/A",
    items: shopOrder?.shopOrderItem || [],
    subtotal: shopOrder?.subtotal || 0,
  };

  // 🚀 Emit to each available delivery boy
  availableBoys.forEach((boy) => {
    const boySocketId = boy.socketId;

    if (boySocketId) {
      io.to(boySocketId).emit("newAssignment", {
        ...formattedAssignment,
        sentTo: boy._id, // include who this assignment is sent to
      });

      console.log(
        `✅ Emitted 'newAssignment' to Delivery Boy: ${boy._id} (Socket: ${boySocketId})`
      );
    } else {
      console.warn(`⚠️ No socketId found for Delivery Boy: ${boy._id}`);
    }
  });
} else {
  console.warn("⚠️ No available delivery boys or Socket.IO not initialized");
}




    }

    // 5️⃣ Save updates
    await order.save();

    const updatedShopOrder = order.shopOrders.find(o => o.shop.toString() === shopId);
    await order.populate("shopOrders.shop", "name");
    await order.populate("shopOrders.assignedDeliveryBoy", "fullName email mobileNo");
    await order.populate("user", "socketId");

    console.log("✅ Complete order model after update:", order);
    console.log("🧾 Updated shop order:", updatedShopOrder);

    // 6️⃣ Emit socket event
    const io = req.app.get("io");
    if (io) {
      const userSocketId = order.user?.socketId;
      if (userSocketId) {
        io.to(userSocketId).emit("update-status", {
          orderId: order._id,
          shopId: updatedShopOrder.shop?._id,
          status: updatedShopOrder.status,
          userId: order.user._id,
        });
      }
    }

    // 7️⃣ Final response
    return res.status(200).json({
      shopOrder: updatedShopOrder,
      assignedDeliveryBoy: updatedShopOrder?.assignedDeliveryBoy || null,
      availableBoys: deliveryBoyPayload,
      assignment: updatedShopOrder?.assignment || null, // ✅ fixed null-safe access
    });
  } catch (err) {
    console.error("❌ Error updating status:", err);
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

    
// export const updateOrderStatus = async (req, res) => {
//   try {
//     const { orderId, shopId } = req.params;
//     const { status } = req.body;

//     const order = await Order.findById(orderId);
//     if (!order) {
//       return res.status(404).json({ message: "Order not found" });
//     }

//     const shopOrder = order.shopOrders.find(o => o.shop.toString() === shopId);



//     if (!shopOrder) {
//       return res.status(400).json({ message: "Shop order not found" });
//     }
      
//      shopOrder.status = status;
//      let deliveryBoyPayload=[];

//       if(status=="out of delivery" && !shopOrder.assignment)
//       {

//            console.log("this is available section");
//            const {longitude,latitude}=order.deliveryAddress
//            const nearByDeliveryBoys=await User.find({
//                role:"deliveryBoy",
//                location:{

//                     $near:{

//                          $geometry:{type:"Point",coordinates:[Number(longitude),Number(latitude)]},
//                          $maxDistance:5000
//                     }
//                }
//            })

//            console.log("this is nea by delivery boys backend",nearByDeliveryBoys)



//     const nearByIds=nearByDeliveryBoys.map(b=>b._id);

//     const BusyIds=await DeliveryAssignment.find({
//          assignedTo:{$in:nearByIds},
//          status:{$nin:["brodcasted","completed"]}
//     }).distinct("assignedTo")


//       const busyIdSet=new Set(BusyIds.map(id=>String(id)))

//       const availableBoys=nearByDeliveryBoys.filter(b=>!busyIdSet.has(b._id))

// const candidates=availableBoys.map(b=>b._id)

// if(candidates.length==0)
// {

//     await order.save();
//     return res.json({
//         message:"order status update but there is no available delivery boys "
//   })}

//        const deliveryAssignmentRecord= await DeliveryAssignment.create({

//            order:order._id,
//            shop:shopOrder.shop,
//           shopOrderId:shopOrder._id,
//           brodcastedTo:candidates,
//           status:"brodcasted"

//        })

//        shopOrder.assignedDeliveryBoy=deliveryAssignmentRecord.assignedTo

//     shopOrder.assignment=deliveryAssignmentRecord._id
   
//      deliveryBoyPayload = availableBoys.map(b => ({
//         id: b._id,
//         fullName: b.fullName,
//         longitude: b.location?.coordinates?.[0], // ✅ Correct reference
//         latitude: b.location?.coordinates?.[1], // ✅ Correct reference
//         mobile: b.mobileNo,
//       }));
//     }
//     await order.save(); 
//     const updatedShopOrder=order.shopOrders.find(o=>o.shop==shopId)
//     await order.populate("shopOrders.shop","name")
//     await order.populate("shopOrders.assignedDeliveryBoy","fullName email mobileNo")
  
     
//     await order.populate('user','socketId');
//      console.log("this is complete order model bac",order);
   


//       const io=req.app.get('io')
//       if(io){

//            const userSocketId=order.user.socketId
//         if(userSocketId){


//              io.to(userSocketId).emit('update-status',{
//                  orderId:order._id,
//                  shopId:updateOrderStatus.shop._id,
//                  status:updatedShopOrder.status,
//                  userId:order.user._id
                 
//              })
//         }
//     }
  
      







//       console.log("this is updated shop order",updatedShopOrder);

//     return res.status(200).json({
//        shopOrder:updatedShopOrder,
//        assignedDeliveryBoy:updatedShopOrder?.assignedDeliveryBoy,
//       availableBoys:deliveryBoyPayload,
//       assignment:updatedShopOrder?.assignment._id
//     })


//     // return res.status(200).json({ status: shopOrder.status });
//   } catch (err) {
//     console.error("Error updating status:", err);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };



export const getDeliveryBoyAssignment = async (req, res) => {
  try {
    const deliveryBoyId = req.userId;

    
    const assignments = await DeliveryAssignment.find({
      brodcastedTo: deliveryBoyId,
      status: "brodcasted",
    })
      .populate("order")
      .populate("shop");

    if (!assignments || assignments.length === 0) {
      return res.status(200).json([]);
    }

    // 🟢 Format data safely
    const formatted = assignments.map((assignment) => {
      const order = assignment?.order;
      const shop = assignment?.shop;

      // Find the specific shop order by ID
      const shopOrder = order?.shopOrders?.find(
        (so) => String(so._id) === String(assignment.shopOrderId)
      );

      return {
        assignmentId: assignment._id,
        orderId: order?._id || null,
        shopName: shop?.name || "Unknown Shop",
        deliveryAddress: order?.deliveryAddress || "N/A",
        items: shopOrder?.shopOrderItem || [],
        subtotal: shopOrder?.subtotal || 0,
      };
    });

    return res.status(200).json(formatted);
  } catch (err) {
    console.error("❌ Error fetching delivery boy assignments:", err);
    return res.status(500).json({
      message: "Internal server error while fetching delivery assignments",
    });
  }
};


export const acceptOrder = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    // 1. Find the delivery assignment by ID
    const assignment = await DeliveryAssignment.findById(assignmentId);

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // 2. Check if the assignment is still available
    if (assignment.status !== "brodcasted") {
      return res.status(400).json({ message: "Assignment is expired or already taken" });
    }

    // 3. Check if the user already has an active assignment
    const alreadyAssigned = await DeliveryAssignment.findOne({
      assignedTo: req.userId,
      status: { $nin: ["brodcasted", "completed"] },
    });

    if (alreadyAssigned) {
      return res.status(400).json({ message: "You are already assigned to another order" });
    }

    // 4. Assign the order to the current user
    assignment.assignedTo = req.userId;
    assignment.status = "assigned";
    assignment.acceptedAt = new Date();

    await assignment.save();

    // 5. Update the corresponding shop order inside the parent order
    const order = await Order.findById(assignment.order);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // 6. Find the correct shopOrder and assign delivery boy
    const shopOrder = order.shopOrders.find(so => String(so._id) === String(assignment.shopOrderId));

    if (!shopOrder) {
      return res.status(400).json({ message: "Shop order not found in this order" });
    }

    shopOrder.assignedDeliveryBoy = req.userId;

    await order.save();
    await order.populate("shopOrders.assignedDeliveryBoy");

    // 7. Respond success
    return res.status(200).json({
      message: "Order accepted",
      assignment,
      order,
    });

  } catch (err) {
    console.error("❌ Error in acceptOrder:", err);
    return res.status(500).json({
      message: "Accept order error",
      error: err.message || err,
    });
  }
};


export const getCurrentOrder = async (req, res) => {
  console.log("📞 getCurrentOrder() called");

  try {
    const assignment = await DeliveryAssignment.findOne({
      assignedTo: req.userId,
      status: "assigned",
    })
      .populate("shop", "name")
.populate("assignedTo", "fullName email mobile location")
.populate({
  path: "order",
  populate: [
    { path: "user", select: "fullName email location mobile" }, // ✅ Corrected
  ],
});


    if (!assignment) {
      console.warn("❌ Assignment not found");
      return res.status(400).json({ message: "Assignment not found" });
    }

    if (!assignment.order) {
      console.warn("❌ Order not found");
      return res.status(400).json({ message: "Order not found" });
    }

    const shopOrder = assignment.order.shopOrders.find(
      (so) => String(so._id) === String(assignment.shopOrderId)
    );

    if (!shopOrder) {
      console.warn("❌ ShopOrder not found");
      return res.status(400).json({ message: "ShopOrder not found" });
    }

    let deliveryBoyLocation = { lat: null, lon: null };
    const coords = assignment.assignedTo.location.coordinates;

    if (coords && coords.length === 2) {
      deliveryBoyLocation.lat = coords[1]; // latitude
      deliveryBoyLocation.lon = coords[0]; // longitude
    }

    let customerLocation = { lat: null, lon: null };
    const address = assignment.order.deliveryAddress;

    if (address) {
      customerLocation.lat = address.latitude;
      customerLocation.lon = address.longitude;
    }

    return res.status(200).json({
      _id: assignment.order._id,
      user: assignment.order.user,
      shopOrder,
      deliveryAddress: assignment.order.deliveryAddress,
      deliveryBoyLocation,
      customerLocation,
    });
  } catch (err) {
    console.error("❌ Error in getCurrentOrder:", err.message || err);
    return res.status(500).json({ message: "Server error" });
  }
};


export const getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findById(orderId)
            .populate("user")
            .populate({
                path: "shopOrders.shop",
                model: "Shop"
            })
            .populate({
                path: "shopOrders.assignedDeliveryBoy",
                model: "User"
            })
          .populate({
    path: "shopOrders.shopOrderItem.item", // ✅ correct path
    model: "Item"
})
            .lean();

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        return res.status(200).json(order);

    } catch (err) {
        console.error("Error fetching order by ID:", err);
        return res.status(500).json({ error: "Error fetching order by ID" });
    }
};



// ======================
// Send Delivery OTP
// ======================
export const sendDeliveryOtp = async (req, res) => {
  try {
    const { orderId, shopOrderId } = req.body;

      console.log("jkdkkdk this is bkkk",orderId,shopOrderId);
     
    // ✅ Validate input
    if (!orderId || !shopOrderId) {
      return res.status(400).json({ message: "Order ID and Shop Order ID are required." });
    }

    // ✅ Find order and user
    const order = await Order.findById(orderId).populate("user");
    if (!order) {
      return res.status(400).json({ message: "Order not found." });
    }

    const shopOrder = order.shopOrders.id(shopOrderId);
    if (!shopOrder) {
      return res.status(400).json({ message: "Shop order not found for given order ID." });
    }

    // ✅ Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    shopOrder.deliveryOtp = otp;
    shopOrder.otpExpires = Date.now() + 5 * 60 * 1000; // valid for 5 minutes

    await order.save();

    // ✅ Send OTP mail
    await sendDeliveryOtpMail(order.user, otp);

    return res.status(200).json({
      message: `OTP sent successfully to ${order?.user?.fullName || "the user"}`,
    });
  } catch (error) {
    console.error("❌ sendDeliveryOtp Error:", error);
    return res.status(500).json({ message: `Delivery OTP error: ${error.message}` });
  }
};

// ======================
// Verify Delivery OTP
// ======================
export const verifyDeliveryOtp = async (req, res) => {
  try {
    const { orderId, shopOrderId, otp } = req.body;

    // ✅ Validate input
    if (!orderId || !shopOrderId || !otp) {
      return res.status(400).json({ message: "Order ID, Shop Order ID, and OTP are required." });
    }

    const order = await Order.findById(orderId).populate("user");
    if (!order) {
      return res.status(400).json({ message: "Order not found." });
    }

    const shopOrder = order.shopOrders.id(shopOrderId);
    if (!shopOrder) {
      return res.status(400).json({ message: "Shop order not found for given order ID." });
    }

    // ✅ Verify OTP and expiry
    if (
      shopOrder.deliveryOtp !== otp ||
      !shopOrder.otpExpires ||
      shopOrder.otpExpires < Date.now()
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    // ✅ Mark as delivered
    shopOrder.status = "delivered";
    shopOrder.deliveredAt = Date.now();

    await order.save();

    // ✅ Remove delivery assignment
    await DeliveryAssignment.deleteOne({
      shopOrderId: shopOrder._id,
      order: order._id,
      assignedTo: shopOrder.assignedDeliveryBoy,
    });

    return res.status(200).json({ message: "Order marked as delivered successfully." });
  } catch (error) {
    console.error("❌ verifyDeliveryOtp Error:", error);
    return res.status(500).json({ message: `Verify delivery OTP error: ${error.message}` });
  }
};




// export const getCurrentOrder=async (req,res)=>{

//     console.log("this is jdkkasd");
//   try{

//       const assignment=await DeliveryAssignment.findOne({
//         assignedTo:req.userId,
//         status:"assigned"
//       })
//       .populate("shop","name")
//       .populate("assignedTo","fullName email mobile location")
//       .populate({
//         path:"order",
//         populate:[{path:"user" ,  select:"fullName email location mobile"}],
       
//       })

//       if(!assignment){

//         return res.status(400).json({message:"assignment not found"})
//       }

//       if(!assignment.order)
//       {
//          return res.status(400).json({message:"order not found"})
//       }
//       const shopOrder=assignment.order.shopOrders.find(so=>String(so._id)==String(assignment.shopOrderId))

//       if(!shopOrder){
//         return res.status(400).json({message:"shopOrder not found"})
//       }

//       let deliveryBoyLocation={lat:null ,lon:null}
//       if(assignment.assignedTo.location.coordinatess.length==2){
//         deliveryBoyLocation.lat=assignment.assignedTo.location.coordinates[1]
//                deliveryBoyLocation.lat=assignment.assignedTo.location.coordinates[0]
//       }

//       let customerLocation={lat:null,lon:null}
//       if(assignment.order.deliveryAddress)
//       {
//           customerLocation.lat=assignment.order.deliveryAddress.latitude,
//             customerLocation.lat=assignment.order.deliveryAddress.longitude
//       }

//       return res.status(200).json({

//         _id:assignment.order._id,
//         user:assignment.order.user,
//         shopOrder,
//         deliveryAddress: assignment.order.deliveryAddress,
//         deliveryBoyLocation,
//         customerLocation
      
//       })

//   }catch(err){

//   }
// }

// export const updateOrderStatus = async (req, res) => {
//   try {
//     const { orderId, shopId } = req.params;
//     const { status } = req.body;

//     const order = await Order.findById(orderId);
//     if (!order) {
//       return res.status(404).json({ message: "Order not found" });
//     }

//     const shopOrder = order.shopOrders.find(
//       (o) => o.shop.toString() === shopId
//     );

//     if (!shopOrder) {
//       return res.status(400).json({ message: "Shop order not found" });
//     }

//     shopOrder.status = status;

//     let deliveryBoyPayload = [];

//     if (status === "out of delivery" || !shopOrder.assignment) {
//       const { longitude, latitude } = order.deliveryAddress;

//       const nearByDeliveryBoys = await User.find({
//         role: "deliveryBoy",
//         location: {
//           $near: {
//             $geometry: {
//               type: "Point",
//               coordinates: [Number(longitude), Number(latitude)],
//             },
//             $maxDistance: 5000,
//           },
//         },
//       });

//       const nearByIds = nearByDeliveryBoys.map((b) => b._id);

//       const BusyIds = await DeliveryAssignment.find({
//         assignedTo: { $in: nearByIds },
//         status: { $nin: ["brodcasted", "completed"] },
//       }).distinct("assignedTo");

//       const busyIdSet = new Set(BusyIds.map((id) => String(id)));

//       const availableBoys = nearByDeliveryBoys.filter(
//         (b) => !busyIdSet.has(String(b._id))
//       );

//       const candidates = availableBoys.map((b) => b._id);

//       if (candidates.length === 0) {
//         await order.save();
//         return res.json({
//           message:
//             "Order status updated, but there are no available delivery boys",
//         });
//       }

//       const deliveryAssignment = await DeliveryAssignment.create({
//         order: order._id,
//         shop: shopOrder.shop,
//         shopOrderId: shopOrder._id,
//         brodcastedTo: candidates,
//         status: "brodcasted",
//       });

//       shopOrder.assignedDeliveryBoy = deliveryAssignment.assignedTo;
//       shopOrder.assignment = deliveryAssignment._id;

//       deliveryBoyPayload = availableBoys.map((b) => ({
//         id: b._id,
//         fullName: b.fullName,
//         longitude: b.location?.coordinates?.[0],
//         latitude: b.location?.coordinates?.[1],
//         mobile: b.mobileNo,
//       }));
//     }

//     await order.save();

//     return res.status(200).json({
//       status: shopOrder.status,
//       deliveryBoyPayload, // Optional: return this if frontend uses it
//     });

//   } catch (err) {
//     console.error("Error updating status:", err);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };
