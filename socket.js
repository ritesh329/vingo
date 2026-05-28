// socketHandler.js
import User from "./models/user.model.js";

/**
 * Handles all socket.io events and user connection management.
 * @param {import('socket.io').Server} io - The initialized Socket.IO server instance
 */
export const socketHandler = async (io) => {
  io.on("connection", (socket) => {
    console.log(`✅ New connection established: ${socket.id}`);

    // Handle identity event from the client
    socket.on("identity", async ({ userId }) => {
      console.log("🪪 Identity received for user:", userId);

      try {
        if (!userId) {
          console.warn("⚠️ No userId provided in identity event");
          return;
        }

        // Update user status to online
        const user = await User.findByIdAndUpdate(
          userId,
          { socketId: socket.id, isOnline: true },
          { new: true }
        );

        if (user) {
          console.log(`✅ User ${user.name || user._id} is now online`);
        } else {
          console.warn("⚠️ User not found for provided userId:", userId);
        }
      } catch (err) {
        console.error("❌ Error updating user socket identity:", err);
      }
    });



   socket.on("updateLocation", async ({ latitude, longitude, userId }) => {
  try {
    if (!userId || latitude == null || longitude == null) return;

    // Update user location and socket info
    const user = await User.findByIdAndUpdate(
      userId,
      {
        location: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        isOnline: true,
        socketId: socket.id,
        updatedAt: new Date(),
      },
      { new: true } // return updated document
    );

    if (user) {
      // Emit only if update succeeded
      io.emit("updateDeliveryLocation", {
        deliveryBoyId: userId,
        latitude,
        longitude,
      });

      console.log(
        `📍 Updated location for deliveryBoy ${userId}: [${latitude}, ${longitude}]`
      );
    } else {
      console.warn(`⚠️ DeliveryBoy not found with ID: ${userId}`);
    }
  } catch (error) {
    console.error(
      "❌ Error updating delivery boy location via socket:",
      error.message
    );
  }
});

    // Handle user disconnect event
    socket.on("disconnect", async () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);

      try {
        // Set user offline when disconnected
        const user = await User.findOneAndUpdate(
          { socketId: socket.id },
          { isOnline: false, socketId: null },
          { new: true }
        );

        if (user) {
          console.log(`⚡ User ${user.name || user._id} is now offline`);
        }
      } catch (err) {
        console.error("❌ Error setting user offline:", err);
      }
    });
  });
};
