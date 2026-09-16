// beauty-store/models/Variant.js
const mongoose = require("mongoose");
const variantSchema = new mongoose.Schema(
{
  id: { type: Number, required: true, unique: true },
  product_id: { type: Number, required: true, index: true },
  
  // ✅ SKU للمتغير (فريد ضمن المنتج فقط)
  sku: { 
    type: String, 
    required: true, 
    trim: true,
    uppercase: true
  },
  
  price: { type: Number, required: true },
  image: { type: String, required: true },
  attributes: { type: mongoose.Schema.Types.Mixed, default: {} },
  isAvailable: { type: Boolean, default: true, index: true }
},
{ timestamps: true }
);

// ✅ Index مركب: يمنع تكرار الـ SKU لنفس المنتج فقط
variantSchema.index({ product_id: 1, sku: 1 }, { unique: true });

module.exports = mongoose.model("Variant", variantSchema);
