// beauty-store/middleware/upload.js
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

// ✅ دالة مساعدة: تحويل النص إلى slug (لإنشاء أسماء مجلدات صديقة للـ URL)
const slugify = (str) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')          // إزالة الرموز الخاصة
    .replace(/[\s_-]+/g, '-')          // استبدال المسافات والشرطات المتعددة بشرطة واحدة
    .replace(/^-+|-+$/g, '');          // إزالة الشرطات من البداية والنهاية
};

// ✅ دالة مساعدة: جلب اسم البراند وتحويله لـ slug بناءً على brand_id
const getBrandSlugById = async (brandId) => {
  try {
    if (!brandId) return null;
    const Brand = require("../models/Brand");
    
    // البحث عن البراند باستخدام الـ id الرقمي (كما هو مخزن في الداتابيس)
    const brand = await Brand.findOne({ id: Number(brandId) }).select("name").lean();
    
    if (brand?.name) {
      return slugify(brand.name);  // تحويل "Amazing Shine" → "amazing-shine"
    }
    return null;
  } catch (err) {
    console.warn("⚠️ Could not fetch brand for folder organization:", err.message);
    return null;
  }
};

// ✅ إعداد التخزين في Cloudinary - مع تنظيم المجلدات حسب نوع المورد
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const baseUrl = process.env.CLOUDINARY_UPLOAD_FOLDER || "miles-beauty-store";
    let resourceFolder = "assets";
    let subFolder = "";
    let filename = "";
    
    // 🔍 تحديد نوع المورد من مسار الـ API
    const url = req.originalUrl || req.url || "";
    
    // === 🏷️ حالة البراندات ===
    if (url.includes("/brands")) {
      resourceFolder = "brands";
      // استخدام اسم البراند من الـ body لإنشاء مجلد فرعي
      if (req.body?.name) {
        subFolder = slugify(req.body.name);
      }
      // اسم الملف: اسم البراند + وقت
      filename = req.body?.name ? slugify(req.body.name) : "brand";
    }
    
    // === 🗂️ حالة التصنيفات ===
    else if (url.includes("/categories")) {
      resourceFolder = "categories";
      // استخدام الاسم العربي أولاً، ثم الإنجليزي
      const categoryName = req.body?.name_ar || req.body?.name_en || "category";
      subFolder = slugify(categoryName);
      filename = slugify(categoryName);
    }
    
    // === 📦 حالة المنتجات ===
    else if (url.includes("/products")) {
      resourceFolder = "products";
      
      // 1️⃣ الحصول على slug البراند من الـ brand_id
      if (req.body?.brand_id) {
        const brandSlug = await getBrandSlugById(req.body.brand_id);
        if (brandSlug) {
          subFolder = brandSlug;  // amazing-shine, urban-care, etc.
        }
      }
      
      // 2️⃣ تحديد اسم الملف: أولوية لـ SKU، ثم اسم المنتج، ثم وقت
      if (req.body?.sku) {
        filename = req.body.sku.toUpperCase().trim();  // AMZ00000000060
      } else if (req.body?.name_en) {
        filename = `${slugify(req.body.name_en)}-${Date.now()}`;
      } else if (req.body?.name_ar) {
        filename = `${slugify(req.body.name_ar)}-${Date.now()}`;
      } else {
        filename = `product-${Date.now()}`;
      }
    }
    
    // 🎯 بناء المسار النهائي في Cloudinary
    let finalFolder = `${baseUrl}/${resourceFolder}`;
    if (subFolder) {
      finalFolder += `/${subFolder}`;
    }
    
    // ✅ إضافة طابع زمني لاسم الملف لتجنب التكرار (إلا إذا كان SKU)
    if (!req.body?.sku) {
      filename = `${filename}-${Date.now()}`;
    }
    
    return {
      folder: finalFolder,                    // miles-beauty-store/products/amazing-shine
      format: "webp",                         // ✅ تحويل تلقائي لـ WebP
      public_id: filename,                    // AMZ00000000060 (بدون امتداد)
      resource_type: file.mimetype.startsWith("image/") ? "image" : "raw",
      transformation: [
        { width: 1200, height: 1200, crop: "limit" },  // ✅ حد أقصى للأبعاد
        { quality: "auto:good" },                       // ✅ ضغط ذكي
        { fetch_format: "auto" }                        // ✅ تنسيق تلقائي
      ],
    };
  },
});

// ✅ فلتر أنواع الملفات المسموحة
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
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB كحد أقصى
});

// 🎯 ✅ Middleware للرفع إلى Cloudinary
const uploadCompressed = (fieldName) => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          return res.status(400).json({ message: `❌ Upload error: ${err.message}` });
        }
        return res.status(400).json({ message: `❌ ${err.message}` });
      }
      
      if (req.file) {
        // ✅ الرابط الآمن من Cloudinary
        req.uploadedPath = req.file.secure_url;
        
        // ✅ public_id الكامل مع المجلد: "miles-beauty-store/products/amazing-shine/AMZ00000000060"
        req.cloudinaryPublicId = req.file.public_id;
        
        // ✅ معلومات إضافية للاستخدام لاحقاً
        req.cloudinaryInfo = {
          public_id: req.file.public_id,      // مع المجلد الكامل
          secure_url: req.file.secure_url,    // الرابط النهائي
          width: req.file.width,
          height: req.file.height,
          format: req.file.format,
          folder: req.file.folder             // المجلد فقط
        };
      }
      
      next();
    });
  };
};

// 🗑️ دالة لحذف صورة من Cloudinary - تدعم المجلدات المتداخلة
const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return false;
    
    // ✅ publicId قد يكون:
    // - كامل: "miles-beauty-store/products/amazing-shine/AMZ00000000060"
    // - أو اسم الملف فقط: "AMZ00000000060"
    
    let fullPublicId = publicId;
    
    // إذا لم يحتوي على "/"، نعتبره اسم ملف فقط ونضيف المجلد الافتراضي
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
  uploadCompressed,              // ✅ الاسم المستخدم في admin.js
  uploadCloudinary: uploadCompressed, // ✅ للتوافق
  cloudinary,                    // ✅ للوصول المباشر
  deleteFromCloudinary,          // ✅ للحذف
  slugify,                       // ✅ دالة مساعدة خارجية
  getBrandSlugById               // ✅ دالة مساعدة خارجية
};
