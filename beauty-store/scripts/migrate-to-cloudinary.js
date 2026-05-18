// beauty-store/scripts/migrate-to-cloudinary.js - النسخة المُحسّنة
require("dotenv").config();
const cloudinary = require("cloudinary").v2;
const fs = require("fs").promises;
const path = require("path");
const mongoose = require("mongoose");

// ✅ تهيئة Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ مجلد الـ assets
const ASSETS_DIR = path.join(__dirname, "../data/assets");
const MAPPING_FILE = path.join(__dirname, "cloudinary-mapping.json");

// ✅ إعدادات الأداء
const CONFIG = {
  concurrency: 5,           // عدد العمليات المتوازية
  delayMs: 50,              // تأخير بين كل عملية (أقل = أسرع)
  skipExisting: true,       // تخطي الصور المرفوعة مسبقاً
  checkCloudinaryFirst: true // التحقق من Cloudinary قبل الرفع
};

// ✅ إحصائيات
const stats = {
  total: 0,
  uploaded: 0,
  skipped: 0,
  failed: 0,
  alreadyExists: 0
};

// ✅ خريطة الروابط
const urlMapping = {
  brands: {},
  categories: {},
  products: {}
};

// ✅ تحميل الخريطة السابقة إن وُجدت
async function loadExistingMapping() {
  try {
    const data = await fs.readFile(MAPPING_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return { brands: {}, categories: {}, products: {} };
  }
}

// ✅ دالة التحقق إذا كانت الصورة موجودة في Cloudinary
async function imageExistsInCloudinary(publicId) {
  if (!CONFIG.checkCloudinaryFirst) return false;
  
  try {
    const result = await cloudinary.api.resource(publicId, { type: "upload" });
    return result && result.public_id === publicId;
  } catch {
    return false; // غير موجود أو خطأ في التحقق
  }
}

// ✅ دالة رفع ملف واحد
async function uploadFile(filePath, folder) {
  const relativePath = path.relative(ASSETS_DIR, filePath);
  const publicId = relativePath.replace(/\.[^/.]+$/, "").replace(/\\/g, "/");
  const oldPath = `assets/${relativePath}`;
  
  // ✅ التحقق إذا كان موجوداً مسبقاً في الخريطة
  const existingMapping = await loadExistingMapping();
  const allMapped = {
    ...existingMapping.brands,
    ...existingMapping.categories,
    ...existingMapping.products
  };
  
  if (CONFIG.skipExisting && allMapped[oldPath]) {
    return {
      success: true,
      skipped: true,
      oldPath,
      newPath: allMapped[oldPath],
      publicId
    };
  }
  
  // ✅ التحقق من Cloudinary مباشرة
  if (CONFIG.skipExisting && await imageExistsInCloudinary(`miles-beauty/${folder}/${publicId}`)) {
    const url = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/v1/${folder}/${publicId}`;
    return {
      success: true,
      skipped: true,
      alreadyExists: true,
      oldPath,
      newPath: url,
      publicId: `miles-beauty/${folder}/${publicId}`
    };
  }
  
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `miles-beauty/${folder}`,
      public_id: publicId,
      overwrite: false,
      resource_type: "auto",
      transformation: [
        { width: 1200, height: 1200, crop: "limit", quality: "auto:good" }
      ]
    });
    
    return {
      success: true,
      skipped: false,
      oldPath,
      newPath: result.secure_url,
      publicId: result.public_id
    };
  } catch (error) {
    // إذا كان الخطأ "already exists"، نعتبره نجاحاً
    if (error.message?.includes("already exists") || error.http_code === 409) {
      const url = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${folder}/${publicId}`;
      return {
        success: true,
        skipped: true,
        alreadyExists: true,
        oldPath,
        newPath: url,
        publicId: `miles-beauty/${folder}/${publicId}`
      };
    }
    
    console.error(`❌ فشل رفع ${relativePath}:`, error.message);
    return { success: false, oldPath, error: error.message };
  }
}

// ✅ دالة قراءة الملفات بشكل متكرر
async function getFilesRecursively(dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      const subFiles = await getFilesRecursively(fullPath);
      files.push(...subFiles);
    } else if (entry.isFile() && /\.(jpg|jpeg|png|webp|gif)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// ✅ دالة تحديد نوع المجلد
function getFolderType(filePath) {
  const relative = path.relative(ASSETS_DIR, filePath);
  const firstFolder = relative.split(path.sep)[0].toLowerCase();
  
  if (firstFolder === "brands") return "brands";
  if (firstFolder === "categories") return "categories";
  if (firstFolder === "products") return "products";
  
  return "assets";
}

// ✅ معالجة الملفات بشكل متوازٍ مع تحديد العدد
async function processFilesWithConcurrency(files, processor, concurrency) {
  const results = [];
  const queue = [...files];
  const inProgress = new Set();
  
  return new Promise((resolve) => {
    function processNext() {
      while (inProgress.size < concurrency && queue.length > 0) {
        const file = queue.shift();
        const promise = processor(file)
          .then(result => {
            results.push({ file, result });
            inProgress.delete(promise);
            processNext();
          })
          .catch(err => {
            results.push({ file, result: { success: false, error: err.message } });
            inProgress.delete(promise);
            processNext();
          });
        inProgress.add(promise);
      }
      
      if (inProgress.size === 0 && queue.length === 0) {
        resolve(results);
      }
    }
    processNext();
  });
}

// ✅ الدالة الرئيسية
async function migrateAssets() {
  console.log("🚀 بدء ترحيل الصور إلى Cloudinary (النسخة السريعة)...\n");
  
  try {
    // 1️⃣ التحقق من المجلد
    try {
      await fs.access(ASSETS_DIR);
    } catch {
      console.error(`❌ المجلد غير موجود: ${ASSETS_DIR}`);
      process.exit(1);
    }
    
    // 2️⃣ جلب الملفات
    console.log("📂 جاري البحث عن الصور...");
    const allFiles = await getFilesRecursively(ASSETS_DIR);
    stats.total = allFiles.length;
    
    console.log(`✅ تم العثور على ${stats.total} صورة`);
    
    if (stats.total === 0) {
      console.log("⚠️ لا توجد صور للترحيل");
      process.exit(0);
    }
    
    // 3️⃣ تحميل الخريطة السابقة
    const existingMapping = await loadExistingMapping();
    const alreadyMapped = Object.keys({
      ...existingMapping.brands,
      ...existingMapping.categories,
      ...existingMapping.products
    }).length;
    
    if (alreadyMapped > 0) {
      console.log(`📋 تم العثور على ${alreadyMapped} صورة مرفوعة مسبقاً في الخريطة`);
    }
    
    // 4️⃣ الرفع المتوازي
    console.log(`\n📤 بدء الرفع (توازي: ${CONFIG.concurrency})...\n`);
    
    let processed = 0;
    
    const results = await processFilesWithConcurrency(
      allFiles,
      async (file) => {
        const folderType = getFolderType(file);
        const relativePath = path.relative(ASSETS_DIR, file);
        
        const result = await uploadFile(file, folderType);
        
        // تحديث الإحصائيات
        if (result.success) {
          if (result.skipped) {
            if (result.alreadyExists) {
              stats.alreadyExists++;
            } else {
              stats.skipped++;
            }
          } else {
            stats.uploaded++;
            // حفظ في الخريطة
            if (folderType === "brands") {
              urlMapping.brands[result.oldPath] = result.newPath;
            } else if (folderType === "categories") {
              urlMapping.categories[result.oldPath] = result.newPath;
            } else if (folderType === "products") {
              urlMapping.products[result.oldPath] = result.newPath;
            }
          }
        } else {
          stats.failed++;
          console.error(`❌ ${relativePath}: ${result.error}`);
        }
        
        // شريط التقدم
        processed++;
        const percent = ((processed / stats.total) * 100).toFixed(1);
        process.stdout.write(`\r📊 ${percent}% | رفع: ${stats.uploaded} | تخطي: ${stats.skipped + stats.alreadyExists} | فشل: ${stats.failed}`);
        
        // تأخير بسيط
        await new Promise(resolve => setTimeout(resolve, CONFIG.delayMs));
        
        return result;
      },
      CONFIG.concurrency
    );
    
    console.log("\n");
    
    // 5️⃣ دمج وحفظ الخريطة
    const finalMapping = {
      brands: { ...existingMapping.brands, ...urlMapping.brands },
      categories: { ...existingMapping.categories, ...urlMapping.categories },
      products: { ...existingMapping.products, ...urlMapping.products }
    };
    
    await fs.writeFile(MAPPING_FILE, JSON.stringify(finalMapping, null, 2));
    console.log(`💾 تم حفظ/تحديث خريطة الروابط: ${MAPPING_FILE}`);
    
    // 6️⃣ عرض الإحصائيات
    console.log("\n📊 الإحصائيات النهائية:");
    console.log("=".repeat(60));
    console.log(`✅ رُفعت جديدة:      ${stats.uploaded}`);
    console.log(`⏭️  تخطي (موجودة):   ${stats.skipped + stats.alreadyExists}`);
    console.log(`❌ فشل:              ${stats.failed}`);
    console.log(`📦 المجموع:          ${stats.total}`);
    console.log("=".repeat(60));
    
    // 7️⃣ تحديث قاعدة البيانات
    const updateDB = process.argv.includes("--update-db");
    if (updateDB && stats.uploaded > 0) {
      console.log("\n🔄 جاري تحديث قاعدة البيانات...");
      await updateDatabase(finalMapping);
    } else if (updateDB) {
      console.log("\n⏭️  تخطي تحديث الداتابيس (لا توجد صور جديدة)");
    }
    
    console.log("\n🎉 اكتمل الترحيل بنجاح! ✨");
    
  } catch (error) {
    console.error("\n❌ خطأ فادح:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// ✅ دالة تحديث قاعدة البيانات (مُحسّنة)
async function updateDatabase(urlMap) {
  try {
    if (!process.env.MONGO_URI) {
      console.error("❌ MONGO_URI غير موجود في .env");
      return;
    }
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ متصل بقاعدة البيانات");
    
    // ✅ إضافة Indexes لتسريع التحديث (مرة واحدة فقط)
    const Brand = require("../models/Brand");
    const Category = require("../models/Category");
    const Product = require("../models/Product");
    const Variant = require("../models/Variant");
    
    try {
      await Brand.collection.createIndex({ image: 1 });
      await Category.collection.createIndex({ image: 1 });
      await Product.collection.createIndex({ image: 1 });
      await Variant.collection.createIndex({ image: 1 });
      console.log("✅ Indexes جاهزة للبحث السريع");
    } catch (e) {
      // indexes قد تكون موجودة مسبقاً
    }
    
    let updatedCount = 0;
    const BATCH_SIZE = 20; // تحديثات متوازية
    
    // دالة مساعدة للتحديث بالدفعة
    const updateInBatches = async (mapping, Model, label) => {
      const entries = Object.entries(mapping);
      if (entries.length === 0) return 0;
      
      let batchUpdated = 0;
      
      for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);
        const promises = batch.map(([oldPath, newPath]) =>
          Model.updateMany({ image: oldPath }, { $set: { image: newPath } })
        );
        
        const results = await Promise.all(promises);
        const batchCount = results.reduce((sum, r) => sum + (r.modifiedCount || 0), 0);
        batchUpdated += batchCount;
        
        console.log(`   🔄 ${label}: دفعة ${Math.floor(i/BATCH_SIZE) + 1} - ${batchCount} سجل`);
      }
      
      return batchUpdated;
    };
    
    // تحديث كل الجداول
    updatedCount += await updateInBatches(urlMap.brands, Brand, "🏷️ Brands");
    updatedCount += await updateInBatches(urlMap.categories, Category, "📂 Categories");
    updatedCount += await updateInBatches(urlMap.products, Product, "📦 Products");
    updatedCount += await updateInBatches(urlMap.products, Variant, "🔀 Variants");
    
    console.log(`\n✅ تم تحديث ${updatedCount} سجل في قاعدة البيانات`);
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error("❌ فشل تحديث قاعدة البيانات:", error.message);
  }
}

// تشغيل السكريبت
migrateAssets();
