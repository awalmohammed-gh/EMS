import express from "express";
import {
  getPublicBranding,
  getCompanyStatus,
  getInitStatus,
  setupInitialCompany,
  registerOrganization,
  getAdminBranding,
  updateBranding,
  uploadBrandAssets,
} from "../controllers/companyController.js";
import { verifyAdmin } from "../middleware/authAdmin.js";
import {
  uploadBranding,
  processAndOptimizeBranding,
  handleBrandingUploadError,
} from "../middleware/brandingUploadMiddleware.js";

const companyRouter = express.Router();

// Publicly accessible routes (no token required)
companyRouter.get("/public-branding", getPublicBranding);
companyRouter.get("/status", getCompanyStatus);
companyRouter.get("/init-status", getInitStatus);

// Standalone brand assets upload & optimization endpoint
companyRouter.post(
  "/upload-assets",
  uploadBranding,
  processAndOptimizeBranding,
  handleBrandingUploadError,
  uploadBrandAssets
);

// Register New Organization endpoint (handles multipart form data with logo and welcomeBackground)
companyRouter.post(
  "/register-organization",
  uploadBranding,
  processAndOptimizeBranding,
  handleBrandingUploadError,
  registerOrganization
);

// Initial setup wizard route (handles multipart form data with logo and welcomeBackground files)
companyRouter.post(
  "/setup",
  uploadBranding,
  processAndOptimizeBranding,
  handleBrandingUploadError,
  setupInitialCompany
);

// Protected Admin branding management routes
companyRouter.get("/branding", verifyAdmin, getAdminBranding);
companyRouter.put(
  "/branding",
  verifyAdmin,
  uploadBranding,
  processAndOptimizeBranding,
  handleBrandingUploadError,
  updateBranding
);

export default companyRouter;
