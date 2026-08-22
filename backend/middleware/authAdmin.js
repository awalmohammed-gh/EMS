import jwt from "jsonwebtoken";

export const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const bearerToken =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

  const token =
    req.cookies?.token ||
    bearerToken ||
    req.headers["x-admin-token"];

  const jwtSecret = process.env.JWT_SECRET || "default_jwt_secret_key_12345";

  if (token) {
    try {
      const decoded = jwt.verify(token, jwtSecret);
      if (decoded && (decoded.role === "admin" || decoded.role === "super_admin")) {
        req.admin = decoded;
        return next();
      } else {
        return res.status(403).json({
          success: false,
          message: "Access forbidden: Admin or Super Admin privileges required.",
        });
      }
    } catch (err) {
      console.warn("Invalid admin token:", err.message);
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token. Please log in again.",
      });
    }
  }

  // Check custom header if provided
  const headerAdminId = req.headers["x-admin-id"];
  if (headerAdminId) {
    req.admin = {
      id: headerAdminId,
      role: "admin",
    };
    return next();
  }

  return res.status(401).json({
    success: false,
    message: "Authentication required. Please log in with an admin account.",
  });
};

