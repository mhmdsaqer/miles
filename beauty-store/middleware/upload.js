// ✅ beauty-store/middleware/upload.js - النسخة النهائية 100% ✅
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
    return brand?.name ? slugify(brand.name) : null;
  } catch (err) {
    console.warn("⚠️ Could not fetch brand:", err.message);
    return null;
  }
};

const extractPublicIdFromUrl = (url) => {
  if (!url?.startsWith("https://res.cloudinary.com/")) return null;
  try {
    const afterBase = url.replace(/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//, '');
    const withoutVersion = afterBase.replace(/^v\d+\//, '');
    return withoutVersion.replace(/\.[^/.]+$/, "") || null;
  } catch (err) {
    console.error("❌ Error extracting publicId:", err);
    return null;
  }
};

// ✅ ✅ ✅ إعداد التخزين - النسخة المُصححة نهائياً
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const baseUrl = process.env.CLOUDINARY_UPLOAD_FOLDER || "miles-beauty";
    
    // ✅ قراءة resourceType من المصدر الصحيح (قبل معالجة multer)
    const rawType = req._resourceType || req.body?.resourceType || req.query?.resourceType;
    const resourceType = rawType?.toLowerCase()?.trim() || "assets";
    
    let resourceFolder = "assets";
    let subFolder = "";
    let filename = "";

    // 🔹 تحديد نوع المورد والمجلد
    if (resourceType === "brands") {
      resourceFolder = "brands";
      const brandName = req.body?.name || req.body?.name_en || req.body?.name_ar || req._name;
      if (brandName) filename = slugify(brandName);
    }
    else if (resourceType === "categories") {
      resourceFolder = "categories";
      const catName = req.body?.name_ar || req.body?.name_en || req.body?.name || req._name_ar || "category";
      filename = slugify(catName);
    }
    else if (resourceType === "products") {
      resourceFolder = "products";
      
      // الحصول على Slug للبراند لإنشاء مجلد فرعي
      if (req.body?.brand_id || req._brand_id) {
        const brandId = req.body?.brand_id || req._brand_id;
        const brandSlug = await getBrandSlugById(brandId);
        if (brandSlug) subFolder = brandSlug;
      }
      
      // تحديد اسم الملف
      if (req.body?.sku?.trim() || req._sku?.trim()) {
        filename = (req.body?.sku || req._sku).toUpperCase().trim();
      } else if (req.body?.name_en || req.body?.name_ar || req._name_en || req._name_ar) {
        filename = slugify(req.body?.name_en || req._name_en || req.body?.name_ar || req._name_ar);
      } else {
        filename = `product-${Date.now()}`;
      }
    }

    // ✅ Fallback آمن لاسم الملف
    if (!filename || filename === "-" || filename.trim() === "") {
      filename = `img-${Date.now()}`;
    }

    // ✅ ✅ ✅ بناء المسار الصحيح - بدون تكرار
    // الهيكلية المطلوبة: miles-beauty/{resourceFolder}/{subFolder?}/{filename}
    const finalFolder = `${baseUrl}/${resourceFolder}`;
    
    // ✅ public_id يجب أن يبدأ من ما بعد resourceFolder لتجنب التكرار
    let finalPublicId = "";
    if (subFolder) finalPublicId += `${subFolder}/`;
    finalPublicId += filename;

    console.log("📁 Cloudinary Upload Debug:", {
      resourceType,
      folder: finalFolder,
      public_id: finalPublicId,
      expectedUrl: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${finalFolder}/${finalPublicId}`
    });

    return {
      folder: finalFolder,           // مثال: miles-beauty/brands
      format: "webp",
      public_id: finalPublicId,      // ✅ مثال: brand-name (بدون تكرار)
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
  if (ext && mime) cb(null, true);
  else cb(new Error("⚠️ فقط صور JPG, PNG, WebP, GIF مسموحة"), false);
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
          public_id: req.file.public_id
        });
        req.uploadedPath = req.file.path;
        req.cloudinaryPublicId = req.file.public_id;
      }
      next();
    });
  };
};

const deleteFromCloudinary = async (imageUrlOrPublicId) => {
  try {
    if (!imageUrlOrPublicId) return false;
    let publicId = imageUrlOrPublicId;
    if (imageUrlOrPublicId.startsWith("https://res.cloudinary.com/")) {
      publicId = extractPublicIdFromUrl(imageUrlOrPublicId);
      if (!publicId) return false;
    }
    const baseUrl = process.env.CLOUDINARY_UPLOAD_FOLDER || "miles-beauty";
    if (!publicId.startsWith(baseUrl)) publicId = `${baseUrl}/${publicId}`;
    
    console.log(`🗑️ Deleting from Cloudinary: ${publicId}`);
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === "ok" || result.result === "deleted" || result.result === "not found";
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
  getBrandSlugById,
  extractPublicIdFromUrl
};
