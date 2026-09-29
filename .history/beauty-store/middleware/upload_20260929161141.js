// ✅ beauty-store/middleware/upload.js - النسخة النهائية الذكية ✅
const cloudinary = require("cloudinary").v2;
const multer = require("multer");

// تهيئة Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ دالة slugify المُحسّنة - لإزالة الأحرف العربية والتشكيل
const slugify = (str) => {
  if (!str) return "";
  return str
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g, '') 
    .replace(/[\u0300-\u036f\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]/g, '') 
    .replace(/[^a-z0-9\s\-_]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/[^a-z0-9\-]/g, '') || `img-${Date.now()}`;
};

// ✅ دالة مساعدة لتنظيف الـ SKU بشكل صارم
const cleanSKU = (sku) => {
  if (!sku) return "";
  return sku
    .toUpperCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9\-]/g, '');
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
const extractPublicIdFromUrl = (url, removeBaseUrl = false) => {
  if (!url?.startsWith("https://res.cloudinary.com/")) return null;
  try {
    const afterBase = url.replace(/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//, '');
    const withoutVersion = afterBase.replace(/^v\d+\//, '');
    let publicId = withoutVersion.replace(/\.[^/.]+$/, "") || null;
    
    if (!publicId) return null;
    
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

// ✅ ✅ ✅ الدالة الرئيسية للرفع اليدوي لـ Cloudinary (مُحدّثة)
const uploadToCloudinary = async (fileBuffer, originalName, uploadParams) => {
  const {
    resourceType = "assets",
    baseUrl = process.env.CLOUDINARY_UPLOAD_FOLDER || "miles-beauty",
    brandName,
    categoryName,
    brandId,
    isHeader,
    sku,
    productName,
    imageType = "main",      // ✅ الجديد: نوع الصورة
    imageIndex = 1,          // ✅ الجديد: رقم الصورة الاختيارية
    isVariant = false        // ✅ الجديد: هل هي صورة متغير؟
  } = uploadParams;

  let resourceFolder = "assets";
  let subFolder = "";
  let filename = "";

  if (resourceType === "brands") {
    resourceFolder = "brands";
    if (brandName) {
      filename = slugify(brandName);
      if (isHeader) filename += "-header";
    }
  }
  else if (resourceType === "categories") {
    resourceFolder = "categories";
    if (categoryName) filename = slugify(categoryName);
  }
  else if (resourceType === "products") {
    resourceFolder = "products";
    
    if (brandId) {
      const brandSlug = await getBrandSlugById(brandId);
      if (brandSlug) subFolder = brandSlug;
    }
    
    // ✅ ✅ ✅ المنطق الذكي الجديد لتحديد اسم الملف
    if (sku?.trim()) {
      const cleanedSku = cleanSKU(sku);
      
      if (imageType === "optional") {
        // للصور الاختيارية: SKU_opt1, SKU_opt2, إلخ
        filename = `${cleanedSku}_opt${imageIndex}`;
      } else if (isVariant) {
        // للمتغيرات: نستخدم الـ SKU الخاص بالمتغير كما هو
        filename = cleanedSku;
      } else {
        // للمنتج الرئيسي: الـ SKU الأساسي
        filename = cleanedSku;
      }
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

  const cloudinaryFolder = `${baseUrl}/${resourceFolder}`;
  
  let publicId = "";
  if (subFolder) publicId += `${subFolder}/`;
  publicId += filename;

  console.log("📁 Cloudinary Upload Params:", {
    resourceType,
    folder: cloudinaryFolder,
    public_id: publicId,
    imageType,
    expectedUrl: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${cloudinaryFolder}/${publicId}`
  });

  // ✅ الرفع الفعلي لـ Cloudinary
  return new Promise((resolve, reject) => {
    const isHeaderImage = uploadParams.isHeader === true || uploadParams.isHeader === "true";
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: cloudinaryFolder,
        public_id: publicId,
        resource_type: "image",
        overwrite: true, // ✅ ضمان استبدال الصورة القديمة إذا كان الـ public_id متطابقاً
        invalidate: true, // ✅ إبطال الـ Cache فوراً ليظهر التحديث في المتجر
        transformation: isHeaderImage 
          ? [] 
          : [
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
          // ✅ ✅ ✅ تنظيف الرابط من رقم الإصدار (Version) قبل الحفظ
          // يحول: .../upload/v123456/miles-beauty/... إلى .../upload/miles-beauty/...
          const cleanUrl = result.secure_url.replace(/\/v\d+\//, '/');
          
          console.log("✅ Cloudinary upload success (Cleaned):", cleanUrl);
          
          resolve({
            secure_url: cleanUrl, // ✅ نرسل الرابط النظيف
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
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    return next();
  }

  const upload = multer({ storage: multer.memoryStorage() });
  
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error("❌ FormData parse error:", err);
      return next(err);
    }
    
    req._uploadData = {
      resourceType: (req.body?.resourceType || "assets").toLowerCase().trim(),
      brandName: req.body?.name || req.body?.name_en || req.body?.name_ar,
      categoryName: req.body?.name_ar || req.body?.name_en,
      brandId: req.body?.brand_id,
      sku: req.body?.sku,
      imageType: req.body?.imageType || "main",       // ✅ استخراج نوع الصورة
      imageIndex: req.body?.imageIndex ? Number(req.body.imageIndex) : 1, // ✅ استخراج رقم الصورة
      productName: req.body?.name_en || req.body?.name_ar,
      isHeader: req.body?.isHeader === "true" || req.body?.isHeader === true,
      isVariant: req.body?.isVariant === "true" || req.body?.isVariant === true, // ✅ استخراج حالة المتغير
      file: req.file
    };
    
    next();
  });
};

// ✅ ✅ ✅ Middleware النهائي للرفع
const uploadCompressed = (fieldName = "image", { required = true } = {}) => {
  return async (req, res, next) => {
    try {
      const contentType = req.headers['content-type'] || '';
      
      if (contentType.includes('multipart/form-data')) {
        await new Promise((resolve, reject) => {
          parseFormData(req, res, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
      
      if (req._uploadData?.file) {
        const { 
          file, resourceType, brandName, categoryName, brandId, sku, 
          productName, isHeader, imageType, imageIndex, isVariant 
        } = req._uploadData;
        
        const uploadResult = await uploadToCloudinary(
          file.buffer,
          file.originalname,
          { 
            resourceType, brandName, categoryName, brandId, sku, 
            productName, isHeader, imageType, imageIndex, isVariant // ✅ تمرير المعاملات الجديدة
          }
        );
        
        req.uploadedPath = uploadResult.secure_url;
        req.cloudinaryPublicId = uploadResult.public_id;
        req.isNewImageUploaded = true; 
        return next();
      }
      
      if (req.body?.image && /^https:\/\//i.test(req.body.image)) {
        req.uploadedPath = req.body.image;
        req.isNewImageUploaded = false;
        return next();
      }
      
      if (!required) {
        return next();
      }
      
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
  cleanSKU,
  getBrandSlugById,
  extractPublicIdFromUrl,
  uploadToCloudinary
};