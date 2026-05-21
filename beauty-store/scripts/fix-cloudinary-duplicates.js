// beauty-store/scripts/fix-specific-products.js
// ✅ سكربت بسيط لإصلاح مسارات 4 منتجات محددة فقط
// 🎯 يحذف المسار الخاطئ + يرفع الصحيح + يحدّث الداتابيس

require("dotenv").config();
const cloudinary = require("cloudinary").v2;
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs").promises;

// ✅ تهيئة Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ القائمة: المنتجات الأربعة التي تحتاج إصلاح
const FILES_TO_FIX = [
  "/products/face-facts/FF000000035691.png",
  "/products/face-facts/FF000000035752.png",
  "/products/face-facts/FF000000037312.png",
  "/products/face-facts/FF000000041074.png"
];

const ASSETS_DIR = path.join(__dirname, "../data/assets");
const BASE_URL = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;

// ✅ دالة رفع ملف لـ Cloudinary بالمسار الصحيح
const uploadToCloudinary = async (localPath, sku) => {
  const buffer = await fs.readFile(localPath);
  
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "miles-beauty/products/face-facts",  // ✅ المسار الصحيح: بدون تكرار
        public_id: sku,                               // ✅ فقط الـ SKU
        overwrite: true,
        resource_type: "image"
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
};

// ✅ دالة حذف من Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === "ok" || result.result === "deleted" || result.result === "not found";
  } catch (err) {
    console.warn(`⚠️ Delete warning: ${err.message}`);
    return false;
  }
};

// ✅ دالة تحديث الداتابيس
const updateDatabase = async (oldUrl, newUrl) => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    
    const Product = require("../models/Product");
    const Variant = require("../models/Variant");
    
    // تحديث المنتجات
    const prodResult = await Product.updateMany(
      { image: oldUrl },
      { $set: { image: newUrl } }
    );
    
    // تحديث المتغيرات
    const varResult = await Variant.updateMany(
      { image: oldUrl },
      { $set: { image: newUrl } }
    );
    
    await mongoose.disconnect();
    return (prodResult.modifiedCount || 0) + (varResult.modifiedCount || 0);
  } catch (err) {
    console.error(`❌ DB Error: ${err.message}`);
    try { await mongoose.disconnect(); } catch {}
    return 0;
  }
};

// ✅ الدالة الرئيسية: إصلاح ملف واحد
const fixFile = async (relativePath) => {
  const sku = path.basename(relativePath, ".png");
  const localPath = path.join(ASSETS_DIR, relativePath);
  
  console.log(`\n🔧 Fixing: ${sku}`);
  
  // 1. التحقق من وجود الملف محلياً
  try {
    await fs.access(localPath);
  } catch {
    console.error(`❌ Local file not found: ${localPath}`);
    return false;
  }
  
  // 2. المسارات القديمة والجديدة
  const oldPublicId = `miles-beauty/products/products/face-facts/${sku}`;  // ❌ خاطئ
  const newUrl = `${BASE_URL}/miles-beauty/products/face-facts/${sku}.png`; // ✅ صحيح
  
  // 3. حذف المسار القديم من Cloudinary
  console.log(`🗑️ Deleting old: ${oldPublicId}`);
  await deleteFromCloudinary(oldPublicId);
  
  // 4. رفع الملف بالمسار الصحيح
  console.log(`📤 Uploading to: ${newUrl}`);
  try {
    const uploadedUrl = await uploadToCloudinary(localPath, sku);
    console.log(`✅ Uploaded: ${uploadedUrl}`);
    
    // 5. تحديث الداتابيس
    console.log(`🔄 Updating database...`);
    const updated = await updateDatabase(
      `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/miles-beauty/products/products/face-facts/${sku}.png`,
      uploadedUrl
    );
    console.log(`📊 DB updated: ${updated} record(s)`);
    
    return true;
  } catch (err) {
    console.error(`❌ Upload failed: ${err.message}`);
    return false;
  }
};

// ✅ التشغيل
const main = async () => {
  console.log("🚀 Starting fix for 4 specific products...\n");
  
  let success = 0;
  let failed = 0;
  
  for (const file of FILES_TO_FIX) {
    const result = await fixFile(file);
    if (result) success++; else failed++;
    
    // تأخير بسيط لتجنب Rate Limit
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log("\n" + "=".repeat(50));
  console.log(`✅ Fixed: ${success} | ❌ Failed: ${failed}`);
  console.log("=".repeat(50));
  
  process.exit(failed > 0 ? 1 : 0);
};

main();
