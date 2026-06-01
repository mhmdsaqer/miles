// ✅ beauty-store/middleware/upload.js - النسخة النهائية 100% ✅
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;

// تهيئة Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ ✅ ✅ دالة slugify المُحسّنة جذرياً - لإزالة الأحرف العربية والتشكيل
const slugify = (str) => {
  if (!str) return "";
  
  return str
    .toString()
    .toLowerCase()
    .trim()
    // ✅ 1. فصل الأحرف عن التشكيل (NFD Normalization)
    .normalize('NFD')
    // ✅ 2. إزالة جميع الأحرف العربية + التشكيل
    .replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g, '') // إزالة العربية
    .replace(/[\u0300-\u036f\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]/g, '') // إزالة التشكيل
    // ✅ 3. إزالة أي أحرف غير إنجليزية/أرقام/شرطات
    .replace(/[^a-z0-9\s\-_]/g, '')
    // ✅ 4. تنظيف المسافات والشرطات المتعددة
    .replace(/[\s_-]+/g, '-')
    // ✅ 5. إزالة الشرطات من البداية والنهاية
    .replace(/^-+|-+$/g, '')
    // ✅ 6. Fallback آمن إذا كانت النتيجة فارغة
    .replace(/[^a-z0-9\-]/g, '') || `img-${Date.now()}`;
};

// ✅ دالة مساعدة لتنظيف الـ SKU بشكل صارم (للـ Products فقط)
const cleanSKU = (sku) => {
  if (!sku) return "";
  return sku
    .toUpperCase()           // تحويل لأحرف كبيرة
    .trim()                  // إزالة المسافات
    .normalize('NFD')        // فصل التشكيل
    .replace(/[\u0300-\u036f]/g, '')  // إزالة علامات التشكيل
    .replace(/[^A-Z0-9\-]/g, '');     // ✅ إبقاء فقط: أرقام، حروف إنجليزية، وشرطات
};

// دالة جلب Slug البراند
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

// دالة استخراج public_id من الرابط
// ✅ ✅ ✅ الدالة المُصححة لاستخراج public_id
// ✅ ✅ ✅ الدالة المُحدّثة مع خيار إزالة baseUrl
const extractPublicIdFromUrl = (url, removeBaseUrl = false) => {
  if (!url?.startsWith("https://res.cloudinary.com/")) return null;
  try {
    const afterBase = url.replace(/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//, '');
    const withoutVersion = afterBase.replace(/^v\d+\//, '');
    let publicId = withoutVersion.replace(/\.[^/.]+$/, "") || null;
    
    if (!publicId) return null;
    
    // ✅ إذا طُلب، نزيل الـ baseUrl من الـ public_id
    if (removeBaseUrl) {
      const baseUrl = process.env.CLOUDINARY_UPLOAD_FOLDER || "miles-beauty";
      if (publicId.startsWith(`${baseUrl}/`)) {
        publicId = publicId.replace(`${baseUrl}/`, '');
      }
    }
    
    return publicId;
  } catch (err) {
    console.error("❌ Error extracting publicId:", err);
    return null;
  }
};
// ✅ ✅ ✅ الدالة الرئيسية للرفع اليدوي لـ Cloudinary
const uploadToCloudinary = async (fileBuffer, originalName, uploadParams) => {
  const {
    resourceType = "assets",
    baseUrl = process.env.CLOUDINARY_UPLOAD_FOLDER || "miles-beauty",
    brandName,
    categoryName,
    brandId,
    sku,
    productName
  } = uploadParams;

  // تحديد المجلد الرئيسي
  let resourceFolder = "assets";
  let subFolder = "";
  let filename = "";

  if (resourceType === "brands") {
    resourceFolder = "brands";
    if (brandName) filename = slugify(brandName);
  }
  else if (resourceType === "categories") {
    resourceFolder = "categories";
    if (categoryName) filename = slugify(categoryName);
  }
  else if (resourceType === "products") {
    resourceFolder = "products";
    
    // جلب Slug البراند للمجلد الفرعي
    if (brandId) {
      const brandSlug = await getBrandSlugById(brandId);
      if (brandSlug) subFolder = brandSlug;
    }
    
    // ✅ ✅ ✅ تحديد اسم الملف - مع تطبيق cleanSKU على الـ SKU
    if (sku?.trim()) {
      // ✅ الإصلاح الجذري: تنظيف الـ SKU قبل الاستخدام
      const cleanedSku = cleanSKU(sku);
      filename = cleanedSku || `product-${Date.now()}`;
      
          // ✅ Logging للتأكد من تطابق الـ SKU
    console.log("🔍 Variant SKU Debug:", {
      originalSku: sku,
      cleanedSku: cleanedSku,
      filename: filename,
      isVariant: uploadParams.isVariant
    });
    } else if (productName) {
      filename = slugify(productName);
    } else {
      filename = `product-${Date.now()}`;
    }
  }

  // Fallback لاسم الملف
  if (!filename || filename === "-" || filename.trim() === "") {
    filename = `img-${Date.now()}`;
  }

  // ✅ ✅ ✅ بناء المسار النهائي (بدون تكرار!)
  // الهيكلية: miles-beauty/{resourceFolder}/{subFolder?}/{filename}
  const cloudinaryFolder = `${baseUrl}/${resourceFolder}`;
  
  // public_id يبدأ من ما بعد resourceFolder فقط
  let publicId = "";
  if (subFolder) publicId += `${subFolder}/`;
  publicId += filename;

  console.log("📁 Cloudinary Upload Params:", {
    resourceType,
    folder: cloudinaryFolder,
    public_id: publicId,
    expectedUrl: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${cloudinaryFolder}/${publicId}`
  });

  // ✅ الرفع الفعلي لـ Cloudinary
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: cloudinaryFolder,
        public_id: publicId,
        format: "webp",
        resource_type: "image",
        transformation: [
          { width: 1200, height: 1200, crop: "limit" },
          { quality: "auto:good" },
          { fetch_format: "auto" }
        ]
      },
      (error, result) => {
        if (error) {
          console.error("❌ Cloudinary upload error:", error);
          reject(error);
        } else {
          console.log("✅ Cloudinary upload success:", result.secure_url);
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
            folder: result.folder,
            format: result.format
          });
        }
      }
    );
    uploadStream.end(fileBuffer);
  });
};

// ✅ Middleware للتعامل مع FormData واستخراج البيانات قبل الرفع
const parseFormData = (req, res, next) => {
  // إذا كان Content-Type ليس multipart/form-data، نمرر مباشرة
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    return next();
  }

  // نستخدم multer مع memoryStorage لقراءة الـ body والـ file معاً
  const upload = multer({ storage: multer.memoryStorage() });
  
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error("❌ FormData parse error:", err);
      return next(err);
    }
    
    // ✅ الآن لدينا الوصول الكامل لـ req.body و req.file
    // نحفظ البيانات في req._uploadData للاستخدام لاحقاً
    req._uploadData = {
      resourceType: (req.body?.resourceType || "assets").toLowerCase().trim(),
      brandName: req.body?.name || req.body?.name_en || req.body?.name_ar,
      categoryName: req.body?.name_ar || req.body?.name_en,
      brandId: req.body?.brand_id,
      sku: req.body?.sku,
      productName: req.body?.name_en || req.body?.name_ar,
      file: req.file  // الملف في الذاكرة
    };
    
    console.log("📦 FormData parsed:", {
      resourceType: req._uploadData.resourceType,
      hasFile: !!req.file,
      fileSize: req.file?.size
    });
    
    next();
  });
};

// ✅ ✅ ✅ Middleware النهائي للرفع - يتعامل مع الملفات والروابط ✅
const uploadCompressed = (fieldName = "image", { required = true } = {}) => {
  return async (req, res, next) => {
    try {
      // 1️⃣ أولاً: نحلل الـ FormData فقط إذا كان Content-Type مناسباً
      const contentType = req.headers['content-type'] || '';
      
      if (contentType.includes('multipart/form-data')) {
        await new Promise((resolve, reject) => {
          parseFormData(req, res, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
      
      // 2️⃣ ✅ إذا كان هناك ملف، نرفعه لـ Cloudinary
      if (req._uploadData?.file) {
        const { file, resourceType, brandName, categoryName, brandId, sku, productName } = req._uploadData;
        
        const uploadResult = await uploadToCloudinary(
          file.buffer,
          file.originalname,
          { resourceType, brandName, categoryName, brandId, sku, productName }
        );
        
        req.uploadedPath = uploadResult.secure_url;
        req.cloudinaryPublicId = uploadResult.public_id;
        req.isNewImageUploaded = true; 
        console.log("✅ File uploaded:", req.uploadedPath);
        return next();
      }
      
      // 3️⃣ ✅ ✅ ✅ إذا لم يكن هناك ملف، ولكن هناك رابط صورة صحيح في الـ body، نستخدمه
      if (req.body?.image && /^https:\/\//i.test(req.body.image)) {
        console.log("✅ Using existing image URL from body:", req.body.image);
        req.uploadedPath = req.body.image;
        req.isNewImageUploaded = false;
        return next();
      }
      
      // 4️⃣ ✅ إذا كان الحقل اختياريًا، نمرر بدون صورة
      if (!required) {
        console.log("✅ Image is optional, proceeding without image");
        return next();
      }
      
      // 5️⃣ ❌ إذا وصلنا هنا، يعني لا يوجد ملف ولا رابط صحيح
      console.warn("⚠️ No image provided:", {
        hasBodyImage: !!req.body?.image,
        isHttps: req.body?.image?.startsWith('https://'),
        hasFormData: !!req._uploadData?.file
      });
      
      return res.status(400).json({
        message: "❌ No image provided - please upload a file or provide a valid HTTPS image URL"
      });
      
    } catch (err) {
      console.error("❌ Upload middleware error:", err);
      return res.status(500).json({
        message: "❌ Upload failed",
        error: err.message
      });
    }
  };
};

// ✅ دالة الحذف من Cloudinary
const deleteFromCloudinary = async (imageUrlOrPublicId) => {
  try {
    if (!imageUrlOrPublicId) return false;
    
    let publicId = imageUrlOrPublicId;
    
    // إذا كان رابطاً، نستخرج الـ public_id
    if (imageUrlOrPublicId.startsWith("https://res.cloudinary.com/")) {
      publicId = extractPublicIdFromUrl(imageUrlOrPublicId);
      if (!publicId) return false;
    }

    console.log(`🗑️ Deleting from Cloudinary: ${publicId}`);
    const result = await cloudinary.uploader.destroy(publicId);
    
    return result.result === "ok" || result.result === "deleted" || result.result === "not found";
  } catch (err) {
    console.error("❌ Error deleting from Cloudinary:", err.message);
    return false;
  }
};

// ✅ التصدير
module.exports = {
  uploadCompressed,
  uploadCloudinary: uploadCompressed,
  cloudinary,
  deleteFromCloudinary,
  slugify,
  cleanSKU,  // ✅ تصدير دالة cleanSKU للاستخدام الخارجي إذا لزم
  getBrandSlugById,
  extractPublicIdFromUrl,
  uploadToCloudinary
};
