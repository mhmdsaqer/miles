// beauty-store/middleware/upload.js - النسخة المُصححة نهائيًا ✅
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

// ✅ ✅ ✅ دالة مساعدة لاستخراج الـ public_id من رابط Cloudinary
const extractPublicIdFromUrl = (url) => {
  if (!url?.startsWith("https://res.cloudinary.com/")) return null;
  
  try {
    // إزالة البادئة: https://res.cloudinary.com/{cloud_name}/image/upload/
    const afterBase = url.replace(/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//, '');
    
    // إزالة الإصدار: v1779105168/
    const withoutVersion = afterBase.replace(/^v\d+\//, '');
    
    // إزالة امتداد الملف
    const publicId = withoutVersion.replace(/\.[^/.]+$/, "");
    
    return publicId || null;
  } catch (err) {
    console.error("❌ Error extracting publicId:", err);
    return null;
  }
};

// ✅ إعداد التخزين في Cloudinary - مع دعم resourceType + Logging للتشخيص
const storage = new CloudinaryStorage({
  cloudinary,
	// ✅ middleware/upload.js - النسخة المُصححة نهائياً ✅
	params: async (req, file) => {
	  const baseUrl = process.env.CLOUDINARY_UPLOAD_FOLDER || "miles-beauty";
	  
	  // ✅ قراءة resourceType من عدة مصادر (مهم جداً!)
	  const resourceType = (
	    req.body?.resourceType || 
	    req.query?.resourceType ||
	    "assets"
	  ).toLowerCase().trim();
	  
	  let resourceFolder = "assets";
	  let subFolder = "";
	  let filename = "";

	  // ✅ Logging للتشخيص - سيساعدك في معرفة ما يصل من الفرونت إند
	  console.log("🔍 Upload Debug:", {
	    resourceType,
	    bodyKeys: Object.keys(req.body || {}),
	    fileName: file?.originalname,
	    hasName: !!req.body?.name,
	    hasNameAr: !!req.body?.name_ar,
	    hasNameEn: !!req.body?.name_en
	  });

	  // 🔹 تحديد نوع المورد وبناء المجلدات
	  if (resourceType === "brands") {
	    resourceFolder = "brands";
	    const brandName = req.body?.name || req.body?.name_en || req.body?.name_ar;
	    if (brandName) {
	      // ✅ للبراندات: الاسم هو الـ filename مباشرة (بدون subFolder منفصل)
	      filename = slugify(brandName);
	    }
	  }
	  else if (resourceType === "categories") {
	    resourceFolder = "categories";
	    const categoryName = req.body?.name_ar || req.body?.name_en || req.body?.name || "category";
	    // ✅ للتصنيفات: نفس منطق البراندات
	    filename = slugify(categoryName);
	  }
	  else if (resourceType === "products") {
	    resourceFolder = "products";
	    // ✅ للمنتجات: نستخدم subFolder لاسم البراند
	    if (req.body?.brand_id) {
	      const brandSlug = await getBrandSlugById(req.body.brand_id);
	      if (brandSlug) subFolder = brandSlug;
	    }
	    // ✅ توليد filename من SKU أو اسم المنتج
	    if (req.body?.sku?.trim()) {
	      filename = req.body.sku.toUpperCase().trim();
	    } else if (req.body?.name_en || req.body?.name_ar) {
	      filename = slugify(req.body.name_en || req.body.name_ar);
	    } else {
	      filename = `product-${Date.now()}`;
	    }
	  }

	  // ✅ Fallback آمن للاسم (منع القيم الفارغة أو "-")
	  if (!filename || filename === "-" || filename.trim() === "") {
	    filename = `img-${Date.now()}`;
	  }

	  // ✅ ✅ ✅ بناء المسار النهائي مطابقاً لسكربت الترحيل
	  // الهيكلية المطلوبة: miles-beauty/{folder}/{folder}/{subFolder}/{filename}
	  // folder في Cloudinary: miles-beauty/{folder}
	  // public_id: {folder}/{subFolder}/{filename}
	  
	  const finalFolder = `${baseUrl}/${resourceFolder}`;
	  
	  let finalPublicId = `${resourceFolder}`; // نبدأ بـ: brands أو categories أو products
	  if (subFolder) finalPublicId += `/${subFolder}`; // للمنتجات فقط: amazing-shine
	  finalPublicId += `/${filename}`; // الاسم النهائي: famous أو AMZ001

	  console.log("📁 Cloudinary Upload Path:", {
	    folder: finalFolder,
	    public_id: finalPublicId,
	    fullUrl: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${finalFolder}/${finalPublicId}`
	  });

	  return {
	    folder: finalFolder,        // مثال: miles-beauty/brands
	    format: "webp",
	    public_id: finalPublicId,   // مثال: brands/famous
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
          filename: req.file.filename,
          folder: req.file.folder,
          public_id: req.file.public_id
        });

        req.uploadedPath = req.file.path;
        req.cloudinaryPublicId = req.file.filename;
        req.cloudinaryInfo = {
          public_id: req.file.public_id,
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

// 🗑️ ✅ ✅ ✅ دالة لحذف صورة من Cloudinary - النسخة المُحسّنة
const deleteFromCloudinary = async (imageUrlOrPublicId) => {
  try {
    if (!imageUrlOrPublicId) return false;
    
    // ✅ استخراج public_id سواء كان رابطاً أو public_id مباشر
    let publicId = imageUrlOrPublicId;
    
    if (imageUrlOrPublicId.startsWith("https://res.cloudinary.com/")) {
      publicId = extractPublicIdFromUrl(imageUrlOrPublicId);
      if (!publicId) {
        console.warn("⚠️ Could not extract publicId from URL:", imageUrlOrPublicId);
        return false;
      }
    }
    
    // ✅ التأكد من أن public_id يحتوي على المجلد الأساسي
    const baseUrl = process.env.CLOUDINARY_UPLOAD_FOLDER || "miles-beauty";
    if (!publicId.startsWith(baseUrl)) {
      publicId = `${baseUrl}/${publicId}`;
    }
    
    console.log(`🗑️ Attempting to delete from Cloudinary: ${publicId}`);
    
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === "ok" || result.result === "deleted") {
      console.log(`✅ Successfully deleted: ${publicId}`);
      return true;
    } else if (result.result === "not found") {
      console.warn(`⚠️ Image not found in Cloudinary: ${publicId}`);
      return true; // نعتبرها محذوفة لتجنب الأخطاء
    }
    
    console.warn(`⚠️ Delete result: ${result.result}`);
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
  getBrandSlugById,
  extractPublicIdFromUrl // ✅ تصدير الدالة الجديدة للاستخدام في أماكن أخرى
};
