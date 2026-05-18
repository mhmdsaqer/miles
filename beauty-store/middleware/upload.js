// beauty-store/middleware/upload.js - النسخة مع Logging ومعالجة أخطاء محسّنة
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const path = require("path");

// ✅ تهيئة Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ دالة مساعدة: تحويل النص إلى slug
const slugify = (str) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// ✅ دالة مساعدة: جلب اسم البراند وتحويله لـ slug
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

// ✅ إعداد التخزين في Cloudinary - مع تنظيم المجلدات
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    console.log("📤 Cloudinary upload params called:", {
      originalname: file.originalname,
      mimetype: file.mimetype,
      url: req.originalUrl,
      body: req.body
    });

    const baseUrl = process.env.CLOUDINARY_UPLOAD_FOLDER || "miles-beauty-store";
    let resourceFolder = "assets";
    let subFolder = "";
    let filename = "";

    const url = req.originalUrl || req.url || "";

    if (url.includes("/brands")) {
      resourceFolder = "brands";
      if (req.body?.name) subFolder = slugify(req.body.name);
      filename = req.body?.name ? slugify(req.body.name) : "brand";
    } else if (url.includes("/categories")) {
      resourceFolder = "categories";
      const categoryName = req.body?.name_ar || req.body?.name_en || "category";
      subFolder = slugify(categoryName);
      filename = slugify(categoryName);
    } else if (url.includes("/products")) {
      resourceFolder = "products";
      if (req.body?.brand_id) {
        const brandSlug = await getBrandSlugById(req.body.brand_id);
        if (brandSlug) subFolder = brandSlug;
      }
      if (req.body?.sku) {
        filename = req.body.sku.toUpperCase().trim();
      } else if (req.body?.name_en) {
        filename = `${slugify(req.body.name_en)}-${Date.now()}`;
      } else if (req.body?.name_ar) {
        filename = `${slugify(req.body.name_ar)}-${Date.now()}`;
      } else {
        filename = `product-${Date.now()}`;
      }
    }

    let finalFolder = `${baseUrl}/${resourceFolder}`;
    if (subFolder) finalFolder += `/${subFolder}`;

    if (!req.body?.sku) {
      filename = `${filename}-${Date.now()}`;
    }

    console.log("✅ Cloudinary params result:", {
      folder: finalFolder,
      public_id: filename,
      format: "webp"
    });

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

// ✅ فلتر أنواع الملفات المسموحة
const fileFilter = (req, file, cb) => {
  console.log("🔍 fileFilter:", { originalname: file.originalname, mimetype: file.mimetype });
  const allowed = /jpeg|jpg|png|webp|gif/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);

  if (ext && mime) {
    cb(null, true);
  } else {
    console.warn("⚠️ File rejected by filter:", { ext, mime });
    cb(new Error("⚠️ فقط صور JPG, PNG, WebP, GIF مسموحة"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// 🎯 ✅ Middleware للرفع إلى Cloudinary
const uploadCompressed = (fieldName) => {
  return (req, res, next) => {
    console.log("📤 uploadCompressed called with fieldName:", fieldName);
    console.log("📋 req.body:", req.body);
    console.log("📋 req.file (before):", req.file);

    upload.single(fieldName)(req, res, async (err) => {
      console.log("📋 req.file (after):", req.file);
      console.log("📋 Error:", err);

      if (err) {
        console.error("❌ Multer/Cloudinary error:", err);
        if (err instanceof multer.MulterError) {
          return res.status(400).json({ message: `❌ Upload error: ${err.message}` });
        }
        return res.status(400).json({ message: `❌ ${err.message}` });
      }

      if (req.file) {
        console.log("✅ File uploaded successfully:", {
          secure_url: req.file.secure_url,
          public_id: req.file.public_id,
          folder: req.file.folder
        });

        req.uploadedPath = req.file.secure_url;
        req.cloudinaryPublicId = req.file.public_id;
        req.cloudinaryInfo = {
          public_id: req.file.public_id,
          secure_url: req.file.secure_url,
          width: req.file.width,
          height: req.file.height,
          format: req.file.format,
          folder: req.file.folder
        };
      } else {
        console.warn("⚠️ No file in req.file after upload");
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
      const folder = process.env.CLOUDINARY_UPLOAD_FOLDER || "miles-beauty-store";
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

// ✅ ✅ ✅ التصدير
module.exports = {
  uploadCompressed,
  uploadCloudinary: uploadCompressed,
  cloudinary,
  deleteFromCloudinary,
  slugify,
  getBrandSlugById
};
