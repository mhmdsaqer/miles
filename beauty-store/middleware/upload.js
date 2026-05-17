// beauty-store/middleware/upload.js
const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

// 📁 تحديد مسار الحفظ
const uploadDir = path.join(__dirname, "../data/assets/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ⚙️ إعداد تخزين multer
const storage = multer.memoryStorage(); // نحفظ في الذاكرة أولاً للضغط

// 🎯 فلتر أنواع الملفات المسموحة
const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  
  if (ext && mime) {
    cb(null, true);
  } else {
    cb(new Error("⚠️ فقط صور JPG, PNG, WebP مسموحة"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB كحد أقصى
});

// 🗜️ دالة ضغط الصورة قبل الحفظ
const compressImage = async (buffer, filename, maxWidth = 800) => {
  const metadata = await sharp(buffer).metadata();
  const width = Math.min(maxWidth, metadata.width || maxWidth);
  
  return sharp(buffer)
    .resize(width, null, { 
      fit: "inside", 
      withoutEnlargement: true 
    })
    .toFormat("webp", { quality: 80 }) // تحويل لـ WebP بجودة 80%
    .toBuffer();
};

// 🎯 Middleware للرفع والضغط
const uploadCompressed = (fieldName) => async (req, res, next) => {
  upload.single(fieldName)(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: `❌ ${err.message}` });
    }
    
    if (!req.file) return next();
    
    try {
      // ضغط الصورة
      const compressed = await compressImage(
        req.file.buffer, 
        req.file.originalname
      );
      
      // إنشاء اسم فريد للملف
      const timestamp = Date.now();
      const ext = path.extname(req.file.originalname);
      const filename = `${fieldName}-${timestamp}${ext}`;
      const filepath = path.join(uploadDir, filename);
      
      // حفظ الصورة المضغوطة
      await sharp(compressed).toFile(filepath);
      
      // ✅ إضافة مسار الصورة للـ Request لاستخدامه لاحقاً
      req.uploadedPath = `assets/uploads/${filename}`;
      
      next();
    } catch (compressErr) {
      console.error("Compression error:", compressErr);
      res.status(500).json({ message: "❌ فشل في معالجة الصورة" });
    }
  });
};

module.exports = { uploadCompressed, uploadDir };
