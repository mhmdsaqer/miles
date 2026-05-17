// beauty-store/models/Order.js
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    // ✅ معرف فريد للطلب (يمكن استخدامه في الواتساب)
    id: { type: Number, required: true, unique: true, index: true },
    
    // ✅ معلومات العميل
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    altPhone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, default: "" },
    
    // ✅ عنوان التوصيل
    city: { type: String, required: true, trim: true, index: true },
    address: { type: String, required: true, trim: true },
    notes: { type: String, trim: true, default: "" },
    
    // ✅ تفاصيل الدفع
    paymentMethod: { 
      type: String, 
      enum: ["cod", "electronic"], 
      default: "cod" 
    },
    
    // ✅ عناصر الطلب
    items: [{
      name: { type: String, required: true },
      sku: { type: String, required: true },
      variant: { type: String, default: "" },
      qty: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true, min: 0 }
    }],
    
    // ✅ الملخص المالي
    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    
    // ✅ حالة الطلب
    status: { 
      type: String, 
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
      index: true
    },
    
    // ✅ ملاحظات الأدمن
    adminNotes: { type: String, trim: true, default: "" },
    
    // ✅ تواريخ النظام
    receivedAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ✅ فهرس مركب للبحث السريع
orderSchema.index({ phone: 1, receivedAt: -1 });
orderSchema.index({ status: 1, receivedAt: -1 });
orderSchema.index({ city: 1, status: 1 });

// ✅ Virtual لحساب عدد العناصر
orderSchema.virtual("itemsCount").get(function() {
  return this.items.reduce((sum, item) => sum + item.qty, 0);
});

module.exports = mongoose.model("Order", orderSchema);
