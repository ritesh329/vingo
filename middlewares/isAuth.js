import jwt from "jsonwebtoken";

const isAuth = (req, res, next) => {
  try {
    // 🔹 Cookie या Authorization Header से token लो
    const token =
      req.cookies?.token ||
      (req.headers["authorization"]?.startsWith("Bearer")
        ? req.headers["authorization"].split(" ")[1]
        : null);


        // console.log("this is actual TOKEN",token);
        
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Token not found, please login first",
      });
    }

    // 🔹 Token verify करो
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.userId) {
      return res.status(401).json({
        success: false,
        error: "Invalid token: User ID missing",
      });
    }

    // 🔹 UserId को request में attach करो
    req.userId = decoded.userId;

    // ✅ Middleware pass
    next();
  } catch (err) {
    console.error("❌ isAuth Error:", err.message);

    return res.status(401).json({
      success: false,
      error: "Unauthorized: Invalid or expired token",
    });
  }
};

export default isAuth;
