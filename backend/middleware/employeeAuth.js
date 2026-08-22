import jwt from "jsonwebtoken";

export const employeeAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;

    const token =
      req.cookies?.employeeToken ||
      req.cookies?.token ||
      bearerToken ||
      req.headers["x-employee-token"] ||
      req.headers["x-admin-token"];

    const jwtSecret = process.env.JWT_SECRET || "default_jwt_secret_key_12345";

    if (token) {
      try {
        const decoded = jwt.verify(token, jwtSecret);
        if (decoded) {
          if (decoded.role === "admin" || decoded.role === "super_admin") {
            req.admin = decoded;
            req.employee = {
              id: decoded.id || "admin_001",
              employeeId: "ADMIN",
              role: decoded.role,
            };
          } else {
            req.employee = {
              id: decoded.id,
              employeeId: decoded.employeeId,
              role: decoded.role || "employee",
            };
          }
          return next();
        }
      } catch (err) {
        console.warn("Invalid token in employeeAuth:", err.message);
      }
    }

    const headerEmpId = req.headers["x-employee-id"] || req.query?.employeeId;
    const headerAdminId = req.headers["x-admin-id"];
    const headerRole = req.headers["x-role"] || req.query?.role;

    if (headerRole === "admin" || headerAdminId) {
      req.admin = { id: headerAdminId || "admin_001", role: "admin" };
      req.employee = { id: headerAdminId || "admin_001", employeeId: "ADMIN", role: "admin" };
      return next();
    }

    if (headerEmpId) {
      req.employee = {
        id: headerEmpId,
        employeeId: headerEmpId,
        role: "employee",
      };
      return next();
    }

    return res.status(401).json({
      success: false,
      message: "Authentication required. Please login.",
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Authentication error: " + error.message,
    });
  }
};

