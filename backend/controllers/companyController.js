import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { CompanySettings } from "../models/CompanySettings.js";
import { Settings } from "../models/adminSettingsModel.js";
import { Admin } from "../models/Admin.js";
import { User } from "../models/User.js";
import { AuditLog } from "../models/AuditLog.js";

const getJwtSecret = () => process.env.JWT_SECRET || "default_jwt_secret_key_12345";

// Default branding configuration fallback
const DEFAULT_BRANDING = {
  companyName: "Enterprise Organization",
  logoUrl: "/eyenit_logo.png",
  welcomeBackgroundUrl: "",
  primaryColor: "#0B1E48",
  contactEmail: "admin@company.com",
  isConfigured: false,
};

/**
 * Helper to construct public asset URL
 */
const buildAssetUrl = (file) => {
  if (!file) return "";
  if (file.publicUrl) return file.publicUrl;
  return `/uploads/branding/${file.filename}`;
};

/**
 * GET /api/company/public-branding
 * Unauthenticated endpoint for login, welcome, and public-facing portal views.
 * Gracefully returns neutral enterprise defaults if database is offline or uninitialized.
 */
export const getPublicBranding = async (req, res) => {
  try {
    let settingsDoc = null;
    if (mongoose.connection.readyState === 1) {
      try {
        settingsDoc = await CompanySettings.findOne().lean();
      } catch (dbErr) {
        console.warn("[CompanyController] DB query warning for public branding:", dbErr.message);
      }
    }

    const companyName = settingsDoc?.companyName || DEFAULT_BRANDING.companyName;
    const logo = settingsDoc?.logoUrl || DEFAULT_BRANDING.logoUrl;
    const logoUrl = settingsDoc?.logoUrl || DEFAULT_BRANDING.logoUrl;
    const welcomeBackgroundUrl = settingsDoc?.welcomeBackgroundUrl || DEFAULT_BRANDING.welcomeBackgroundUrl;
    const primaryColor = settingsDoc?.primaryColor || DEFAULT_BRANDING.primaryColor;
    const themeColors = {
      primary: primaryColor,
      accent: "#ff5500",
    };
    const contactEmail = settingsDoc?.contactEmail || DEFAULT_BRANDING.contactEmail;
    const isConfigured = Boolean(settingsDoc?.isConfigured);

    const company = {
      companyName,
      logo,
      logoUrl,
      welcomeBackgroundUrl,
      primaryColor,
      themeColors,
      contactEmail,
      isConfigured,
      name: companyName,
      backgroundUrl: welcomeBackgroundUrl,
      themeColor: primaryColor,
    };

    return res.status(200).json({
      success: true,
      name: companyName,
      companyName,
      logo,
      logoUrl,
      backgroundUrl: welcomeBackgroundUrl,
      welcomeBackgroundUrl,
      themeColor: primaryColor,
      primaryColor,
      themeColors,
      company,
      isConfigured,
    });
  } catch (error) {
    console.error("[CompanyController] Error in getPublicBranding:", error);
    return res.status(200).json({
      success: true,
      name: DEFAULT_BRANDING.companyName,
      companyName: DEFAULT_BRANDING.companyName,
      logo: DEFAULT_BRANDING.logoUrl,
      logoUrl: DEFAULT_BRANDING.logoUrl,
      backgroundUrl: "",
      welcomeBackgroundUrl: "",
      themeColor: DEFAULT_BRANDING.primaryColor,
      primaryColor: DEFAULT_BRANDING.primaryColor,
      themeColors: {
        primary: DEFAULT_BRANDING.primaryColor,
        accent: "#ff5500",
      },
      company: DEFAULT_BRANDING,
      isConfigured: false,
    });
  }
};

/**
 * POST /api/company/upload-assets
 * Processes, optimizes with Sharp, and stores brand assets to the designated path.
 */
export const uploadBrandAssets = async (req, res) => {
  try {
    const logoFile = req.files?.logo?.[0];
    const bgFile = req.files?.welcomeBackground?.[0];

    if (!logoFile && !bgFile) {
      return res.status(400).json({
        success: false,
        message: "No brand assets were provided for upload.",
      });
    }

    const assets = {};
    if (logoFile) {
      assets.logoUrl = buildAssetUrl(logoFile);
      assets.logo = assets.logoUrl;
    }
    if (bgFile) {
      assets.welcomeBackgroundUrl = buildAssetUrl(bgFile);
    }

    return res.status(200).json({
      success: true,
      message: "Brand assets successfully processed, optimized, and saved.",
      assets,
    });
  } catch (error) {
    console.error("[CompanyController] Error in uploadBrandAssets:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process brand asset upload.",
      error: error.message,
    });
  }
};

/**
 * GET /api/company/status
 * Checks if the organization has completed initial onboarding/setup.
 */
export const getCompanyStatus = async (req, res) => {
  try {
    let isConfigured = false;
    let hasAdmin = false;
    let companyData = { ...DEFAULT_BRANDING };

    if (mongoose.connection.readyState === 1) {
      const [settingsDoc, adminCount] = await Promise.all([
        CompanySettings.findOne().lean(),
        Admin.countDocuments(),
      ]);

      hasAdmin = adminCount > 0;
      isConfigured = Boolean(settingsDoc?.isConfigured && hasAdmin);

      if (settingsDoc) {
        companyData = {
          companyName: settingsDoc.companyName || DEFAULT_BRANDING.companyName,
          logoUrl: settingsDoc.logoUrl || DEFAULT_BRANDING.logoUrl,
          welcomeBackgroundUrl: settingsDoc.welcomeBackgroundUrl || DEFAULT_BRANDING.welcomeBackgroundUrl,
          primaryColor: settingsDoc.primaryColor || DEFAULT_BRANDING.primaryColor,
          contactEmail: settingsDoc.contactEmail || DEFAULT_BRANDING.contactEmail,
          isConfigured,
        };
      }
    }

    return res.status(200).json({
      success: true,
      isConfigured,
      requiresSetup: !isConfigured,
      hasAdmin,
      company: companyData,
    });
  } catch (error) {
    console.error("[CompanyController] Error checking company status:", error);
    return res.status(200).json({
      success: true,
      isConfigured: false,
      requiresSetup: true,
      hasAdmin: false,
      company: DEFAULT_BRANDING,
    });
  }
};

/**
 * GET /api/company/init-status
 * Public system status check endpoint.
 * Returns:
 * {
 *   hasExistingCompany: true/false,
 *   companyName: "...",
 *   isConfigured: true/false
 * }
 */
export const getInitStatus = async (req, res) => {
  try {
    let hasExistingCompany = false;
    let isConfigured = false;
    let companyName = "";
    let logoUrl = DEFAULT_BRANDING.logoUrl;
    let welcomeBackgroundUrl = "";

    if (mongoose.connection.readyState === 1) {
      const [settingsDoc, adminCount] = await Promise.all([
        CompanySettings.findOne().lean(),
        Admin.countDocuments(),
      ]);

      const hasAdmin = adminCount > 0;
      isConfigured = Boolean(settingsDoc?.isConfigured && hasAdmin);
      hasExistingCompany = isConfigured;
      companyName = settingsDoc?.companyName || (isConfigured ? "Enterprise Organization" : "");
      if (settingsDoc?.logoUrl) logoUrl = settingsDoc.logoUrl;
      if (settingsDoc?.welcomeBackgroundUrl) welcomeBackgroundUrl = settingsDoc.welcomeBackgroundUrl;
    }

    return res.status(200).json({
      success: true,
      hasExistingCompany,
      companyName,
      isConfigured,
      requiresSetup: !hasExistingCompany,
      logoUrl,
      welcomeBackgroundUrl,
    });
  } catch (error) {
    console.error("[CompanyController] Error in getInitStatus:", error);
    return res.status(200).json({
      success: true,
      hasExistingCompany: false,
      companyName: "",
      isConfigured: false,
      requiresSetup: true,
      logoUrl: DEFAULT_BRANDING.logoUrl,
      welcomeBackgroundUrl: "",
    });
  }
};

/**
 * POST /api/company/register-organization
 * Handles multipart/form-data with fields:
 * companyName, adminName, adminEmail, password, logo, welcomeBackground, contactEmail, contactPhone
 */
export const registerOrganization = async (req, res) => {
  try {
    const {
      companyName,
      adminName,
      adminFullName,
      fullName,
      adminEmail,
      email,
      password,
      adminPassword,
      contactEmail,
      contactPhone,
      phone,
      primaryColor,
      logoUrl: explicitLogoUrl,
      welcomeBackgroundUrl: explicitBgUrl,
    } = req.body;

    const finalCompanyName = (companyName || "").trim();
    const finalAdminName = (adminName || adminFullName || fullName || "").trim();
    const finalAdminEmail = (adminEmail || email || "").toLowerCase().trim();
    const finalPassword = password || adminPassword;
    const finalContactEmail = (contactEmail || finalAdminEmail).toLowerCase().trim();
    const finalPhone = (contactPhone || phone || "").trim();

    if (!finalCompanyName) {
      return res.status(400).json({
        success: false,
        message: "Company / Organization name is required.",
      });
    }

    if (!finalAdminName || !finalAdminEmail || !finalPassword) {
      return res.status(400).json({
        success: false,
        message: "Master administrator full name, email, and password are required.",
      });
    }

    if (finalPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Admin password must be at least 6 characters long.",
      });
    }

    // 1. Validate that the admin email is unique
    const existingAdmin = await Admin.findOne({ email: finalAdminEmail });
    const existingUser = await User.findOne({ email: finalAdminEmail });
    if (existingAdmin || existingUser) {
      return res.status(400).json({
        success: false,
        message: "An account with this email address already exists. Please sign in or use another email.",
      });
    }

    // 2. Process and save uploaded logo and background files
    const logoFile = req.files?.logo?.[0];
    const bgFile = req.files?.welcomeBackground?.[0];

    let finalLogoUrl = explicitLogoUrl || DEFAULT_BRANDING.logoUrl;
    if (logoFile) {
      finalLogoUrl = buildAssetUrl(logoFile);
    }

    let finalBgUrl = explicitBgUrl || "";
    if (bgFile) {
      finalBgUrl = buildAssetUrl(bgFile);
    }

    // 3. Create or update the CompanySettings document
    let settingsDoc = await CompanySettings.findOne();
    if (!settingsDoc) {
      settingsDoc = new CompanySettings();
    }

    settingsDoc.companyName = finalCompanyName;
    settingsDoc.logoUrl = finalLogoUrl;
    settingsDoc.welcomeBackgroundUrl = finalBgUrl;
    settingsDoc.contactEmail = finalContactEmail;
    settingsDoc.contactPhone = finalPhone;
    if (primaryColor) {
      settingsDoc.primaryColor = primaryColor.trim();
    }
    settingsDoc.isConfigured = true;
    settingsDoc.updatedAt = new Date();

    const savedSettings = await settingsDoc.save();

    // 4. Hash password with bcrypt and create the master User and Admin with role: 'admin'
    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    const createdAdmin = await Admin.create({
      full_name: finalAdminName,
      fullName: finalAdminName,
      email: finalAdminEmail,
      password_hash: hashedPassword,
      role: "admin",
      profile_image_url: "",
    });

    let createdUser;
    try {
      createdUser = await User.create({
        fullName: finalAdminName,
        email: finalAdminEmail,
        password: hashedPassword,
        role: "admin",
        status: "active",
        isActive: true,
      });
    } catch (userErr) {
      console.warn("[CompanyController] Warning creating User record:", userErr.message);
    }

    // Also sync adminSettingsModel
    try {
      await Settings.findOneAndUpdate(
        {},
        {
          company_name: finalCompanyName,
          companyName: finalCompanyName,
          isConfigured: true,
        },
        { upsert: true, new: true }
      );
    } catch (sErr) {
      console.warn("[CompanyController] Sync adminSettings notice:", sErr.message);
    }

    // 5. Issue the secure HTTP-only authentication cookie
    const token = jwt.sign(
      {
        id: createdAdmin._id.toString(),
        userId: createdUser ? createdUser._id.toString() : createdAdmin._id.toString(),
        email: createdAdmin.email,
        role: "admin",
        fullName: createdAdmin.full_name,
      },
      getJwtSecret(),
      { expiresIn: "7d" }
    );

    const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https" || process.env.NODE_ENV === "production";
    const cookieOptions = {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    };
    res.cookie("auth_token", token, cookieOptions);
    res.cookie("token", token, cookieOptions);

    // Audit log
    try {
      await AuditLog.create({
        action: "INITIAL_TENANT_SETUP",
        category: "Admin Settings",
        performedBy: {
          id: createdAdmin._id.toString(),
          name: createdAdmin.full_name,
          email: createdAdmin.email,
          role: "admin",
        },
        details: `Organization '${finalCompanyName}' registered and master administrator initialized.`,
        targetModel: "CompanySettings",
      });
    } catch (auditErr) {
      console.warn("[CompanyController] Audit log creation notice:", auditErr.message);
    }

    const safeUser = {
      _id: createdAdmin._id.toString(),
      id: createdAdmin._id.toString(),
      fullName: createdAdmin.full_name,
      email: createdAdmin.email,
      role: "admin",
      department: "Executive Management",
      position: "Master Administrator",
    };

    return res.status(201).json({
      success: true,
      message: "Organization registered and master administrator initialized successfully.",
      token,
      user: safeUser,
      admin: safeUser,
      companySettings: savedSettings,
      company: savedSettings,
    });
  } catch (error) {
    console.error("[CompanyController] Error in registerOrganization:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to register organization.",
    });
  }
};

/**
 * POST /api/company/setup
 * First-run initial setup wizard to register company profile, logo, welcome background,
 * and the initial master administrator credentials.
 */
export const setupInitialCompany = async (req, res) => {
  try {
    const {
      companyName,
      adminFullName,
      adminEmail,
      adminPassword,
      primaryColor,
      contactEmail,
      logoUrl: explicitLogoUrl,
      welcomeBackgroundUrl: explicitBgUrl,
    } = req.body;

    const trimmedCompanyName = (companyName || "").trim();
    if (!trimmedCompanyName) {
      return res.status(400).json({
        success: false,
        message: "Company / Organization Name is required to initialize the system.",
      });
    }

    // Check if an admin already exists
    const adminCount = await Admin.countDocuments();
    let adminUser = null;
    let token = null;

    if (adminCount === 0) {
      // Require admin credentials if no admin exists yet
      const fullName = (adminFullName || "").trim();
      const email = (adminEmail || "").toLowerCase().trim();
      const password = adminPassword || "";

      if (!fullName || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "Master administrator Full Name, Email, and Password are required.",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Admin password must be at least 6 characters long.",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      adminUser = await Admin.create({
        full_name: fullName,
        fullName: fullName,
        email,
        password_hash: hashedPassword,
        role: "admin",
      });

      token = jwt.sign(
        {
          id: adminUser._id.toString(),
          email: adminUser.email,
          role: "admin",
          fullName: adminUser.full_name || adminUser.fullName,
        },
        getJwtSecret(),
        { expiresIn: "7d" }
      );
    } else {
      // Admin already exists in DB. Check authentication or verify credentials
      const existingSettings = await CompanySettings.findOne().lean();
      let isAuthenticated = false;

      const authHeader = req.headers.authorization || req.headers["x-admin-token"];
      if (authHeader) {
        try {
          const rawToken = authHeader.replace("Bearer ", "");
          const decoded = jwt.verify(rawToken, getJwtSecret());
          if (decoded && decoded.role === "admin") {
            isAuthenticated = true;
            token = rawToken;
            adminUser = await Admin.findById(decoded.id).select("-password_hash");
          }
        } catch (e) {
          // Token invalid or expired
        }
      }

      // Check if credentials match existing admin
      if (!isAuthenticated && adminEmail && adminPassword) {
        const cleanAdminEmail = adminEmail.toLowerCase().trim();
        const foundAdmin = await Admin.findOne({ email: cleanAdminEmail });
        if (foundAdmin) {
          const storedHash = foundAdmin.password_hash || foundAdmin.password;
          if (storedHash) {
            const isMatch = await bcrypt.compare(adminPassword, storedHash);
            if (isMatch) {
              adminUser = foundAdmin;
              token = jwt.sign(
                {
                  id: adminUser._id.toString(),
                  email: adminUser.email,
                  role: "admin",
                  fullName: adminUser.full_name || adminUser.fullName,
                },
                getJwtSecret(),
                { expiresIn: "7d" }
              );
              isAuthenticated = true;
            }
          }
        } else if (!existingSettings?.isConfigured) {
          // If setup was not completed and this is a new admin email, create the admin
          const hashedPassword = await bcrypt.hash(adminPassword, 10);
          adminUser = await Admin.create({
            full_name: (adminFullName || "Administrator").trim(),
            fullName: (adminFullName || "Administrator").trim(),
            email: cleanAdminEmail,
            password_hash: hashedPassword,
            role: "admin",
          });
          token = jwt.sign(
            {
              id: adminUser._id.toString(),
              email: adminUser.email,
              role: "admin",
              fullName: adminUser.full_name || adminUser.fullName,
            },
            getJwtSecret(),
            { expiresIn: "7d" }
          );
          isAuthenticated = true;
        }
      }

      // If the company is already fully configured, disallow unauthenticated reconfiguration
      if (!isAuthenticated && existingSettings?.isConfigured) {
        return res.status(403).json({
          success: false,
          message: "The organization has already been configured. Master setup is locked. Please log in to Management Settings to update branding.",
        });
      }
    }

    // Resolve uploaded files or fallback URLs
    const uploadedLogo = req.files?.logo?.[0];
    const uploadedBg = req.files?.welcomeBackground?.[0];

    const finalLogoUrl = uploadedLogo
      ? buildAssetUrl(uploadedLogo)
      : explicitLogoUrl?.trim() || "/eyenit_logo.png";

    const finalBgUrl = uploadedBg
      ? buildAssetUrl(uploadedBg)
      : explicitBgUrl?.trim() || "";

    const finalPrimaryColor = primaryColor?.trim() || "#0B1E48";
    const finalContactEmail = contactEmail?.trim() || adminEmail?.trim() || "admin@company.com";

    // Update or create CompanySettings singleton
    const companyDoc = await CompanySettings.findOneAndUpdate(
      {},
      {
        $set: {
          companyName: trimmedCompanyName,
          logoUrl: finalLogoUrl,
          welcomeBackgroundUrl: finalBgUrl,
          primaryColor: finalPrimaryColor,
          contactEmail: finalContactEmail,
          isConfigured: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Synchronize with general admin Settings model
    try {
      await Settings.findOneAndUpdate(
        {},
        {
          $set: {
            "company.companyName": trimmedCompanyName,
            "company.logo": finalLogoUrl,
            "company.email": finalContactEmail,
          },
        },
        { upsert: true }
      );
    } catch (syncErr) {
      console.warn("[CompanyController] Settings model sync notice:", syncErr.message);
    }

    // Record audit log
    try {
      await AuditLog.create({
        action: "INITIAL_TENANT_SETUP",
        category: "Admin Settings",
        performedBy: {
          id: adminUser ? adminUser._id.toString() : "setup_wizard",
          name: adminUser ? (adminUser.full_name || adminUser.fullName || "Administrator") : "Master Setup",
          email: adminUser ? adminUser.email : finalContactEmail,
          role: "admin",
        },
        target: "Company Profile",
        summary: `Initialized Organization Profile: "${trimmedCompanyName}"`,
        createdAt: new Date(),
      });
    } catch (auditErr) {
      console.warn("[CompanyController] Audit log creation notice:", auditErr.message);
    }

    if (token) {
      const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https" || process.env.NODE_ENV === "production";
      const cookieOptions = {
        httpOnly: true,
        secure: isHttps,
        sameSite: isHttps ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      };
      res.cookie("auth_token", token, cookieOptions);
      res.cookie("token", token, cookieOptions);
    }

    return res.status(200).json({
      success: true,
      message: "Organization profile and white-label branding initialized successfully.",
      company: {
        companyName: companyDoc.companyName,
        logoUrl: companyDoc.logoUrl,
        welcomeBackgroundUrl: companyDoc.welcomeBackgroundUrl,
        primaryColor: companyDoc.primaryColor,
        contactEmail: companyDoc.contactEmail,
        isConfigured: true,
      },
      token,
      admin: adminUser
        ? {
            id: adminUser._id.toString(),
            fullName: adminUser.full_name || adminUser.fullName,
            email: adminUser.email,
            role: "admin",
          }
        : null,
    });
  } catch (error) {
    console.error("[CompanyController] Setup initial company error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to initialize company profile.",
    });
  }
};

/**
 * GET /api/company/branding
 * Protected admin endpoint to retrieve complete branding settings
 */
export const getAdminBranding = async (req, res) => {
  try {
    const settingsDoc = await CompanySettings.findOne().lean();
    return res.status(200).json({
      success: true,
      company: {
        companyName: settingsDoc?.companyName || DEFAULT_BRANDING.companyName,
        logoUrl: settingsDoc?.logoUrl || DEFAULT_BRANDING.logoUrl,
        welcomeBackgroundUrl: settingsDoc?.welcomeBackgroundUrl || DEFAULT_BRANDING.welcomeBackgroundUrl,
        primaryColor: settingsDoc?.primaryColor || DEFAULT_BRANDING.primaryColor,
        contactEmail: settingsDoc?.contactEmail || DEFAULT_BRANDING.contactEmail,
        isConfigured: Boolean(settingsDoc?.isConfigured),
      },
    });
  } catch (error) {
    console.error("[CompanyController] Error in getAdminBranding:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve company branding.",
    });
  }
};

/**
 * PUT /api/company/branding
 * Protected admin endpoint to dynamically update company name, logo, background,
 * primary brand color, and contact email.
 */
export const updateBranding = async (req, res) => {
  try {
    const {
      companyName,
      primaryColor,
      contactEmail,
      removeLogo,
      removeWelcomeBackground,
      logoUrl: manualLogoUrl,
      welcomeBackgroundUrl: manualBgUrl,
    } = req.body;

    const updateFields = {};

    if (companyName && companyName.trim()) {
      updateFields.companyName = companyName.trim();
    }

    if (primaryColor && primaryColor.trim()) {
      updateFields.primaryColor = primaryColor.trim();
    }

    if (contactEmail && contactEmail.trim()) {
      updateFields.contactEmail = contactEmail.trim();
    }

    // Handle uploaded files
    const uploadedLogo = req.files?.logo?.[0];
    const uploadedBg = req.files?.welcomeBackground?.[0];

    if (uploadedLogo) {
      updateFields.logoUrl = buildAssetUrl(uploadedLogo);
    } else if (manualLogoUrl !== undefined && manualLogoUrl !== null && manualLogoUrl !== "") {
      updateFields.logoUrl = manualLogoUrl.trim();
    } else if (removeLogo === "true" || removeLogo === true) {
      updateFields.logoUrl = "/default-logo.png";
    }

    if (uploadedBg) {
      updateFields.welcomeBackgroundUrl = buildAssetUrl(uploadedBg);
    } else if (manualBgUrl !== undefined && manualBgUrl !== null && manualBgUrl !== "") {
      updateFields.welcomeBackgroundUrl = manualBgUrl.trim();
    } else if (removeWelcomeBackground === "true" || removeWelcomeBackground === true) {
      updateFields.welcomeBackgroundUrl = "";
    }

    const updatedDoc = await CompanySettings.findOneAndUpdate(
      {},
      { $set: updateFields },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Sync with general admin Settings
    try {
      const syncObj = {};
      if (updateFields.companyName) syncObj["company.companyName"] = updateFields.companyName;
      if (updateFields.logoUrl) syncObj["company.logo"] = updateFields.logoUrl;
      if (updateFields.contactEmail) syncObj["company.email"] = updateFields.contactEmail;

      if (Object.keys(syncObj).length > 0) {
        await Settings.findOneAndUpdate({}, { $set: syncObj });
      }
    } catch (syncErr) {
      console.warn("[CompanyController] Settings model sync notice:", syncErr.message);
    }

    // Record audit log
    const adminUser = req.admin || {};
    try {
      await AuditLog.create({
        action: "UPDATE_BRANDING",
        category: "Admin Settings",
        performedBy: {
          id: String(adminUser.id || adminUser._id || "admin"),
          name: adminUser.fullName || adminUser.full_name || "Administrator",
          email: adminUser.email || "admin@company.com",
          role: "admin",
        },
        target: "Company Branding",
        summary: `Updated White-Label Brand Assets: ${updateFields.companyName || "Assets changed"}`,
        changes: Object.keys(updateFields).map((k) => ({
          field: k,
          label: k,
          oldValue: "Previous",
          newValue: String(updateFields[k]),
        })),
        createdAt: new Date(),
      });
    } catch (auditErr) {
      console.warn("[CompanyController] Audit log creation notice:", auditErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Company branding updated successfully.",
      company: {
        companyName: updatedDoc.companyName,
        logoUrl: updatedDoc.logoUrl,
        welcomeBackgroundUrl: updatedDoc.welcomeBackgroundUrl,
        primaryColor: updatedDoc.primaryColor,
        contactEmail: updatedDoc.contactEmail,
        isConfigured: updatedDoc.isConfigured,
      },
    });
  } catch (error) {
    console.error("[CompanyController] Error updating branding:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update branding settings.",
    });
  }
};
