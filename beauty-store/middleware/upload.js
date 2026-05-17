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
    const fieldName = req.body.fieldName || file.fieldname || "upload";
    const filename = `${fieldName}-${uniqueSuffix}`;
    
    return {
      folder,
      format: "webp", // ✅ تحويل تلقائي لـ WebP لتقليل الحجم
      public_id: filename,
      resource_type: resourceType,
      transformation: [
        { width: 1200, height: 1200, crop: "limit" }, // ✅ حد أقصى للأبعاد
        { quality: "auto:good" }, // ✅ ضغط ذكي للجودة
        { fetch_format: "auto" } // ✅ تنسيق تلقائي حسب المتصفح
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

// 🎯 ✅ Middleware للرفع إلى Cloudinary - مُصدّر كـ uploadCompressed للتوافق
const uploadCompressed = (fieldName) => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        // التعامل مع أخطاء multer
        if (err instanceof multer.MulterError) {
          return res.status(400).json({ message: `❌ Upload error: ${err.message}` });
        }
        return res.status(400).json({ message: `❌ ${err.message}` });
      }
      
      // ✅ إذا تم رفع ملف، نضيف رابط Cloudinary للـ request
      if (req.file) {
        // Cloudinary يعيد الرابط الآمن في secure_url
        req.uploadedPath = req.file.secure_url || req.file.path;
        // نحفظ الـ public_id للحذف لاحقاً إذا لزم
        req.cloudinaryPublicId = req.file.filename;
        // نحفظ المعلومات الإضافية للاستخدام لاحقاً
        req.cloudinaryInfo = {
          public_id: req.file.filename,
          secure_url: req.file.secure_url,
          width: req.file.width,
          height: req.file.height,
          format: req.file.format
        };
      }
      
      next();
    });
  };
};

// 🗑️ دالة لحذف صورة من Cloudinary (اختياري - للاستخدام عند حذف المنتج)
const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return false;
    
    // استخراج public_id من الرابط إذا كان كاملاً
    let id = publicId;
    if (publicId.includes('/')) {
      id = publicId.split('/').pop().split('.')[0];
    }
    
    const folder = process.env.CLOUDINARY_UPLOAD_FOLDER || "miles-beauty-store";
    const fullId = `${folder}/${id}`;
    
    const result = await cloudinary.uploader.destroy(fullId);
    
    if (result.result === "ok") {
      console.log(`🗑️ Deleted from Cloudinary: ${fullId}`);
      return true;
    }
    return false;
  } catch (err) {
    console.error("❌ Error deleting from Cloudinary:", err.message);
    return false;
  }
};

// ✅ ✅ ✅ التصدير - مع دعم كلا الاسمين للتوافق
module.exports = { 
  uploadCompressed,              // ✅ الاسم المطلوب في admin.js
  uploadCloudinary: uploadCompressed, // ✅ للتوافق مع الأسماء القديمة
  cloudinary,                    // ✅ للوصول المباشر لـ Cloudinary إذا لزم
  deleteFromCloudinary          // ✅ لحذف الصور عند الحاجة
};
