import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Designated storage path for company branding assets
export const brandingUploadDir = path.resolve(__dirname, "../uploads/branding");
if (!fs.existsSync(brandingUploadDir)) {
  fs.mkdirSync(brandingUploadDir, { recursive: true });
}

// In-memory buffer storage so sharp can optimize images before disk writing
const memoryStorage = multer.memoryStorage();

// File filter strictly allowing standard image formats
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/svg+xml",
    "image/gif",
    "image/jpg",
  ];
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".svg", ".gif"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    const error = new Error("Invalid image format. Supported formats are PNG, JPEG, WEBP, SVG, and GIF.");
    error.statusCode = 400;
    error.code = "INVALID_IMAGE_TYPE";
    cb(error, false);
  }
};

// Multer upload middleware instance (10MB limit per file)
export const uploadBranding = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter,
}).fields([
  { name: "logo", maxCount: 1 },
  { name: "welcomeBackground", maxCount: 1 },
]);

/**
 * Middleware: Process, optimize, and store uploaded images using Sharp
 * - Logos: Resized to max 800x800, converted to optimized WebP (or preserves SVG), stored to /backend/uploads/branding/
 * - Welcome background: Resized to max 1920x1080, converted to high-efficiency WebP, stored to /backend/uploads/branding/
 */
export const processAndOptimizeBranding = async (req, res, next) => {
  try {
    if (!req.files) {
      return next();
    }

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

    // 1. Process and optimize company logo
    if (req.files.logo && req.files.logo[0]) {
      const logoFile = req.files.logo[0];
      const isSvg =
        logoFile.mimetype === "image/svg+xml" ||
        path.extname(logoFile.originalname).toLowerCase() === ".svg";

      let logoFilename = "";
      let logoFilePath = "";

      if (isSvg) {
        // Preserve vectors without rasterization
        logoFilename = `logo-${uniqueSuffix}.svg`;
        logoFilePath = path.join(brandingUploadDir, logoFilename);
        await fs.promises.writeFile(logoFilePath, logoFile.buffer);
      } else {
        // Optimize raster logos using Sharp
        logoFilename = `logo-${uniqueSuffix}.webp`;
        logoFilePath = path.join(brandingUploadDir, logoFilename);
        await sharp(logoFile.buffer)
          .resize({
            width: 800,
            height: 800,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: 90, effort: 4 })
          .toFile(logoFilePath);
      }

      // Populate file properties for controller access
      logoFile.filename = logoFilename;
      logoFile.path = logoFilePath;
      logoFile.publicUrl = `/uploads/branding/${logoFilename}`;
    }

    // 2. Process and optimize welcome background image
    if (req.files.welcomeBackground && req.files.welcomeBackground[0]) {
      const bgFile = req.files.welcomeBackground[0];
      const bgFilename = `bg-${uniqueSuffix}.webp`;
      const bgFilePath = path.join(brandingUploadDir, bgFilename);

      await sharp(bgFile.buffer)
        .resize({
          width: 1920,
          height: 1080,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 85, effort: 4 })
        .toFile(bgFilePath);

      // Populate file properties for controller access
      bgFile.filename = bgFilename;
      bgFile.path = bgFilePath;
      bgFile.publicUrl = `/uploads/branding/${bgFilename}`;
    }

    next();
  } catch (err) {
    console.error("[BrandingUpload] Sharp image optimization error:", err);
    return res.status(500).json({
      success: false,
      message: "Image optimization failed. Please verify the uploaded image file.",
      error: err.message,
    });
  }
};

// Error handling middleware for branding upload issues
export const handleBrandingUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Brand asset file size exceeds the 10MB maximum limit.",
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  } else if (err) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || "File upload failed.",
    });
  }
  next();
};

export default uploadBranding;
