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
  
  name_ar: { type: String, required: true },
  name_en: { type: String, required: true },
  description_ar: { type: String, required: true },
  description_en: { type: String, required: true },
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

module.exports = mongoose.model("Product", productSchema);
