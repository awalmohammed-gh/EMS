import jwt from "jsonwebtoken"

export const verifyAdmin = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized.",
    });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || "default_jwt_secret_key_12345";
    const decoded = jwt.verify(token, jwtSecret);

    if (decoded.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden.",
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token.",
    });
  }
};
