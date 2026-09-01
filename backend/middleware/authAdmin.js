import { protect, authorize } from "./authMiddleware.js";

/**
 * verifyAdmin middleware
 * Combines token extraction, user status verification, and admin role checking.
 */
export const verifyAdmin = (req, res, next) => {
  protect(req, res, (err) => {
    if (err) return next(err);
    return authorize("admin", "super_admin")(req, res, next);
  });
};

export default verifyAdmin;
