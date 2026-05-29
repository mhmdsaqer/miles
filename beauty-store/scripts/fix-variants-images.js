// beauty-store/scripts/fix-variants-images.js
// ✅ سكربت بسيط: إصلاح روابط الصور في جدول variants فقط
// 🎯 يحول: /products/products/brand/xxx → /products/brand/xxx

require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");

async function fixVariantsImages() {
  console.log("🚀 Starting variants image URL fix...\n");
  
  try {
    // 1️⃣ الاتصال بـ MongoDB
    await connectDB();
    console.log("✅ Connected to MongoDB\n");
    
    // 2️⃣ استيراد موديل Variant
    const Variant = require("../models/Variant");
    
    // 3️⃣ البحث عن جميع الـ variants التي تحتوي على مسار مكرر
    const regex = /\/products\/products\//;
    const brokenVariants = await Variant.find({ image: regex });
    
    console.log(`🔍 Found ${brokenVariants.length} variants with duplicate path\n`);
    
    if (brokenVariants.length === 0) {
      console.log("✅ All variant image URLs are correct!");
      process.exit(0);
    }
    
    // 4️⃣ إصلاح كل سجل
    let fixed = 0;
    let failed = 0;
    
    for (const variant of brokenVariants) {
      const oldUrl = variant.image;
      
      // ✅ إصلاح المسار: استبدال /products/products/ بـ /products/
      const newUrl = oldUrl.replace(/\/products\/products\//, '/products/');
      
      try {
        // تحديث السجل
        await Variant.updateOne(
          { _id: variant._id },
          { $set: { image: newUrl } }
        );
        
        console.log(`✅ Fixed #${variant.id}:`);
        console.log(`   Old: ${oldUrl}`);
        console.log(`   New: ${newUrl}\n`);
        
        fixed++;
      } catch (err) {
        console.error(`❌ Failed to fix variant #${variant.id}:`, err.message);
        failed++;
      }
    }
    
    // 5️⃣ الإحصائيات النهائية
    console.log("=".repeat(60));
    console.log("📊 Final Stats:");
    console.log("=".repeat(60));
    console.log(`✅ Fixed:  ${fixed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📦 Total:  ${brokenVariants.length}`);
    console.log("=".repeat(60));
    
    // 6️⃣ تحقق نهائي
    const remaining = await Variant.countDocuments({ image: regex });
    if (remaining === 0) {
      console.log("\n🎉 All variant image URLs are now correct! ✨");
    } else {
      console.warn(`\n⚠️  Warning: ${remaining} variants still have duplicate paths`);
    }
    
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
    
  } catch (err) {
    console.error("\n❌ Fatal error:", err.message);
    console.error(err.stack);
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
  }
}

// تشغيل السكربت
fixVariantsImages();
