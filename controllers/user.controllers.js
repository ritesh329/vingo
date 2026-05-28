import User from "../models/user.model.js";

export const getCurrentUser = async (req, res) => {
  try {
    const { userId } = req;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "Unauthorized: User ID missing from request",
      });
    }

    // 🔹 Fetch user और password hide करो
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("❌ getCurrentUser Error:", error);

    return res.status(500).json({
      success: false,
      error: "Internal server error while fetching current user",
    });
  }
};


export const updateUserLocation = async (req, res) => {
  try {
    const { lat, lon } = req.body;

    // Validate input
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      return res.status(400).json({ error: 'Invalid latitude or longitude' });
    }

    // Check if userId is available (from middleware like auth)
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized: no user ID' });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        location: {
          type: 'Point',
          coordinates: [lon, lat],
        },
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ message: 'Location updated successfully' });

  } catch (err) {
    console.error('Update location error:', err);
    return res.status(500).json({ error: 'update location error' });
  }
};
