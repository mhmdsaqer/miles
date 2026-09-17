// beauty-store/models/Product.js
const mongoose = require("mongoose");
const productSchema = new mongoose.Schema(
{
  id: { type: Number, required: true, unique: true },
  brand_id: { type: Number, required: true, index: true },
  category_id: { type: Number, required: true, index: true },
  
  // ✅ إضافة حقل SKU أساسي للمنتج
  sku: { 
    type: String, 
    required: true, 
    unique: true,  // ✅ منع تكرار الـ SKU عالمياً
    trim: true,
    uppercase: true
  },
   // ✅ ✅ ✅ جديد: حقل الـ Barcode (فريد + يسمح بالفراغ)
  barcode: {
    type: String,
    default: null,       // ✅ null بدلاً من "" ليعمل مع sparse index
    trim: true,
    uppercase: true,
    sparse: true,        // ✅ يسمح بعدة قيم null/فارغة
    unique: true,        // ✅ فريد - يمنع التكرار على مستوى الداتابيس
    index: true          // ✅ فهرس للبحث السريع
  },
    // ✅ ✅ ✅ جديد: المكونات (اختياري)
  ingredients_ar: { type: String, default: null, trim: true },
  ingredients_en: { type: String, default: null, trim: true },
  // ✅ ✅ ✅ جديد: طريقة الاستخدام (اختياري)
  usage_ar: { type: String, default: null, trim: true },
  usage_en: { type: String, default: null, trim: true },
  name_ar: { type: String, required: true },
  name_en: { type: String, required: true },
  // واستبدلهما بـ:
  description_ar: { type: String, default: null, trim: true },
  description_en: { type: String, default: null, trim: true },
  image: { type: String, required: true },
  price: { type: Number, required: true, index: true },
  has_variants: { type: Boolean, default: false },
  isAvailable: { type: Boolean, default: true, index: true } 
},
{ timestamps: true }
);

// ✅ فهرس نصي للبحث السريع بالـ SKU
productSchema.index({ sku: "text" });
// ✅ فهرس للبحث بالاسم
productSchema.index({ name_ar: "text", name_en: "text" });
productSchema.index({ barcode: "text" }); // ✅ فهرس نصي للبحث بالـ barcode


module.exports = mongoose.model("Product", productSchema);
