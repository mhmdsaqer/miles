// scripts/addIsAvailableField.js
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Product = require("../models/Product");
const Variant = require("../models/Variant");

async function addIsAvailableField() {
  try {
    await connectDB();
    console.log("🔄 جاري إضافة حقل isAvailable للمستندات القديمة...\n");

    // تحديث المنتجات التي لا تحتوي على الحقل
    const productsResult = await Product.updateMany(
      { isAvailable: { $exists: false } },
      { $set: { isAvailable: true } }
    );
    console.log(`✅ Products: ${productsResult.modifiedCount} updated`);

    // تحديث المتغيرات التي لا تحتوي على الحقل
    const variantsResult = await Variant.updateMany(
      { isAvailable: { $exists: false } },
      { $set: { isAvailable: true } }
    );
    console.log(`✅ Variants: ${variantsResult.modifiedCount} updated`);

    console.log("\n🎉 تم بنجاح! كل المستندات الآن تحتوي على isAvailable: true");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

addIsAvailableField();
