import jwt from "jsonwebtoken";

export const employeeAuth = (req, res, next) => {
  try {
    const token = req.cookies.employeeToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated.",
      });
    }

    const jwtSecret = process.env.JWT_SECRET || "default_jwt_secret_key_12345";
    const decoded = jwt.verify(token, jwtSecret);

    req.employee = {
      id: decoded.id,
      employeeId: decoded.employeeId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};
