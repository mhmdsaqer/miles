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

// ✅ إعداد التخزين في Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const folder = process.env.CLOUDINARY_UPLOAD_FOLDER || "miles-beauty-store";
    const resourceType = file.mimetype.startsWith("image/") ? "image" : "raw";
    
    // توليد اسم فريد للملف
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const filename = `${req.body.fieldName || "upload"}-${uniqueSuffix}`;
    
    return {
      folder,
      format: "webp", // ✅ تحويل تلقائي لـ WebP لتقليل الحجم
      public_id: filename,
      resource_type: resourceType,
      transformation: [
        { width: 1200, height: 1200, crop: "limit" }, // ✅ حد أقصى للأبعاد
        { quality: "auto:good" }, // ✅ ضغط ذكي للجودة
      ],
    };
  },
});

// ✅ فلتر أنواع الملفات
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

// 🎯 Middleware جاهز للاستخدام
const uploadCloudinary = (fieldName) => upload.single(fieldName);

// 🗑️ دالة لحذف صورة من Cloudinary (اختياري)
const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return;
    // استخراج public_id من الرابط إذا كان كاملاً
    const id = publicId.split("/").pop().split(".")[0];
    await cloudinary.uploader.destroy(`${process.env.CLOUDINARY_UPLOAD_FOLDER}/${id}`);
    console.log(`🗑️ Deleted from Cloudinary: ${id}`);
  } catch (err) {
    console.error("❌ Error deleting from Cloudinary:", err.message);
  }
};

module.exports = { 
  uploadCloudinary, 
  cloudinary,
  deleteFromCloudinary 
};
