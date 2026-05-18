// beauty-store/middleware/upload.js - النسخة المُصححة ✅
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const path = require("path");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const slugify = (str) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const getBrandSlugById = async (brandId) => {
  try {
    if (!brandId) return null;
    const Brand = require("../models/Brand");
    const brand = await Brand.findOne({ id: Number(brandId) }).select("name").lean();
    if (brand?.name) {
      return slugify(brand.name);
    }
    return null;
  } catch (err) {
    console.warn("⚠️ Could not fetch brand for folder:", err.message);
    return null;
  }
};

// ✅ إعداد التخزين في Cloudinary - مع دعم resourceType من الـ Frontend
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const baseUrl = process.env.CLOUDINARY_UPLOAD_FOLDER || "miles-beauty";
    let resourceFolder = "assets";
    let subFolder = "";
    let filename = "";

    // ✅ 1. قراءة resourceType من الـ body (من الفرونت إند)
    const resourceType = req.body.resourceType;

    if (resourceType === "brands") {
      resourceFolder = "brands";
      if (req.body?.name) subFolder = slugify(req.body.name);
      filename = req.body?.name ? slugify(req.body.name) : "brand";
    } 
    else if (resourceType === "categories") {
      resourceFolder = "categories";
      const categoryName = req.body?.name_ar || req.body?.name_en || "category";
      subFolder = slugify(categoryName);
      filename = slugify(categoryName);
    } 
    else if (resourceType === "products") {
      resourceFolder = "products";
      if (req.body?.brand_id) {
        const brandSlug = await getBrandSlugById(req.body.brand_id);
        if (brandSlug) subFolder = brandSlug;
      }
      if (req.body?.sku) {
        filename = req.body.sku.toUpperCase().trim();
      } else {
        filename = `product-${Date.now()}`;
      }
    }

    // ✅ بناء المسار النهائي
    let finalFolder = `${baseUrl}/${resourceFolder}`;
    if (subFolder) finalFolder += `/${subFolder}`;
    if (!req.body?.sku) {
      filename = `${filename}-${Date.now()}`;
    }

    return {
      folder: finalFolder,
      format: "webp",
      public_id: filename,
      resource_type: file.mimetype.startsWith("image/") ? "image" : "raw",
      transformation: [
        { width: 1200, height: 1200, crop: "limit" },
        { quality: "auto:good" },
        { fetch_format: "auto" }
      ],
    };
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) {
    cb(null, true);
  } else {
    cb(new Error("⚠️ فقط صور JPG, PNG, WebP, GIF مسموحة"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

const uploadCompressed = (fieldName) => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, async (err) => {
      if (err) {
        console.error("❌ Multer error:", err);
        if (err instanceof multer.MulterError) {
          return res.status(400).json({ message: `❌ Upload error: ${err.message}` });
        }
        return res.status(400).json({ message: `❌ ${err.message}` });
      }

      if (req.file) {
        console.log("✅ File uploaded:", {
          path: req.file.path,
          filename: req.file.filename
        });

        req.uploadedPath = req.file.path;
        req.cloudinaryPublicId = req.file.filename;
        req.cloudinaryInfo = {
          public_id: req.file.filename,
          secure_url: req.file.path,
          width: req.file.width,
          height: req.file.height,
          format: req.file.format,
          folder: req.file.folder
        };
      }

      next();
    });
  };
};

// 🗑️ دالة لحذف صورة من Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return false;
    let fullPublicId = publicId;
    if (!publicId.includes("/")) {
      const folder = process.env.CLOUDINARY_UPLOAD_FOLDER || "miles-beauty";
      fullPublicId = `${folder}/${publicId}`;
    }
    const result = await cloudinary.uploader.destroy(fullPublicId);
    if (result.result === "ok") {
      console.log(`🗑️ Deleted from Cloudinary: ${fullPublicId}`);
      return true;
    }
    return false;
  } catch (err) {
    console.error("❌ Error deleting from Cloudinary:", err.message);
    return false;
  }
};

module.exports = { 
  uploadCompressed,
  uploadCloudinary: uploadCompressed,
  cloudinary,
  deleteFromCloudinary,
  slugify,
  getBrandSlugById
};
