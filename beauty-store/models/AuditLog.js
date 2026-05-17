// beauty-store/models/AuditLog.js
const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    // 👤 من قام بالنشاط؟
    userId: { 
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      required: true,
      index: true 
    },
    userEmail: { type: String, required: true, lowercase: true },
    userName: { type: String, required: true },
    userRole: { 
      type: String, 
      required: true,
      enum: ["super_admin", "admin", "order_manager", "content_manager", "viewer", "system"]
    },
    
    // 🎯 ماذا فعل؟
    action: { 
      type: String, 
      required: true,
      enum: [
        "login", "logout", "create", "update", "delete", 
        "status_change", "permission_change", "failed_login", 
        "export_data", "import_data", "settings_change"
      ],
      index: true
    },
    
    // 📦 على ماذا؟
    resource: { 
      type: String, 
      required: true,
      enum: [
        "user", "product", "brand", "category", "variant", 
        "order", "settings", "system", "audit_log"
      ],
      index: true
    },
    resourceId: { 
      type: mongoose.Schema.Types.Mixed,
      index: true 
    }, // يمكن أن يكون ID رقمي أو نصي
    
    // 📝 التفاصيل
    description: { type: String, trim: true },
    changes: {
      before: { type: mongoose.Schema.Types.Mixed },
      after: { type: mongoose.Schema.Types.Mixed }
    },
    
    // 💻 معلومات تقنية
    ipAddress: { type: String },
    userAgent: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed }, // بيانات إضافية حسب الحاجة
    
    // ⏰ التوقيت
    createdAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ✅ فهارس مركبة للبحث السريع
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1, action: 1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

// ✅ حذف السجلات القديمة تلقائياً (اختياري - بعد 365 يوم)
// ⚠️ تأكد من تفعيل TTL Index في MongoDB
auditLogSchema.index({ createdAt: 1 }, { 
  expireAfterSeconds: 365 * 24 * 60 * 60 // 365 يوم
});

// ✅ Virtual: رابط تفاصيل العنصر (اختياري)
auditLogSchema.virtual("resourceUrl").get(function() {
  const urls = {
    product: `/admin/products?id=${this.resourceId}`,
    brand: `/admin/brands?id=${this.resourceId}`,
    category: `/admin/categories?id=${this.resourceId}`,
    order: `/admin/orders?search=${this.resourceId}`,
    user: `/admin/users?id=${this.userId}`
  };
  return urls[this.resource] || null;
});

module.exports = mongoose.model("AuditLog", auditLogSchema);
