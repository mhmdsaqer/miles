// beauty-store/utils/auditLogger.js
const AuditLog = require("../models/AuditLog");

// ✅ قاموس الترجمات للأوصاف الشائعة
const ACTION_TRANSLATIONS = {
  create: { ar: "تم إنشاء", en: "Created" },
  update: { ar: "تم تعديل", en: "Updated" },
  delete: { ar: "تم حذف", en: "Deleted" },
  login: { ar: "تسجيل دخول ناجح", en: "Successful login" },
  logout: { ar: "تسجيل خروج", en: "Logout" },
  failed_login: { ar: "محاولة دخول فاشلة", en: "Failed login attempt" },
  status_change: { ar: "تم تغيير حالة", en: "Status changed" },
  permission_change: { ar: "تم تغيير صلاحيات", en: "Permissions changed" },
  export_data: { ar: "تم تصدير بيانات", en: "Data exported" },
  settings_change: { ar: "تم تغيير الإعدادات", en: "Settings changed" }
};

const RESOURCE_TRANSLATIONS = {
  product: { ar: "منتج", en: "Product" },
  brand: { ar: "براند", en: "Brand" },
  category: { ar: "تصنيف", en: "Category" },
  variant: { ar: "متغير", en: "Variant" },
  order: { ar: "طلب", en: "Order" },
  user: { ar: "مستخدم", en: "User" },
  settings: { ar: "إعدادات", en: "Settings" },
  system: { ar: "نظام", en: "System" },
  audit_log: { ar: "سجل نشاط", en: "Audit Log" }
};

// ✅ دالة مساعدة لاستخراج اللغة من الـ Request
const getLang = (req) => {
  return req?.query?.lang || 
         req?.headers?.['accept-language']?.split(',')[0]?.split('-')[0] || 
         "ar";
};

// ✅ ✅ ✅ دالة تنظيف الكائنات لإزالة المراجع الدائرية قبل التخزين في MongoDB
const cleanForBSON = (obj) => {
  if (!obj) return {};
  try {
    // 1️⃣ تحويل إلى كائن عادي أولاً إذا كان Mongoose Document
    const plainObj = typeof obj?.toObject === 'function' 
      ? obj.toObject({ virtuals: false, getters: false }) 
      : obj;
    
    // 2️⃣ إزالة المراجع الدائرية عبر التحويل لـ JSON والعودة
    return JSON.parse(JSON.stringify(plainObj));
  } catch (e) {
    console.warn("⚠️ Failed to clean object for BSON:", e.message);
    // Fallback: إرجاع كائن بسيط بدلاً من إيقاف التطبيق
    return { cleaned: true, originalType: typeof obj };
  }
};

// ✅ ✅ ✅ دالة مساعدة لتنظيف الحقول الكبيرة غير الضرورية في الـ Audit
const sanitizeForAudit = (obj, fieldsToOmit = []) => {
  if (!obj) return {};
  const cleaned = cleanForBSON(obj);
  
  // إزالة الحقول غير الضرورية لتقليل حجم السجل
  if (typeof cleaned === 'object') {
    fieldsToOmit.forEach(field => {
      if (cleaned[field]) delete cleaned[field];
    });
  }
  
  return cleaned;
};

// ✅ الدوال الرئيسية لتسجيل النشاطات مع دعم اللغة
const audit = {
  create: async (user, resource, newData, req, extra = {}) => {
    try {
      const lang = getLang(req);
      const itemName = extra.itemName || newData;
      const actionText = ACTION_TRANSLATIONS.create?.[lang] || "Created";
      const resourceText = RESOURCE_TRANSLATIONS[resource]?.[lang] || resource;
      const name = itemName?.[`name_${lang}`] || itemName?.name || itemName || "N/A";
      
      // ✅ ✅ ✅ تنظيف البيانات قبل التخزين
      const cleanAfter = sanitizeForAudit(newData, ['description_ar', 'description_en', 'variants', 'options']);
      
      await new AuditLog({
        userId: user._id,
        userEmail: user.email,
        userName: user.name,
        userRole: user.role,
        action: "create",
        resource,
        resourceId: newData?.id || newData?._id,
        description: `${actionText} ${resourceText}: ${name}`,
        metadata: {
          ...extra,
          lang,
          itemName_ar: itemName?.name_ar || itemName?.name,
          itemName_en: itemName?.name_en || itemName?.name,
          before: null,
          after: cleanAfter  // ✅ بيانات نظيفة
        },
        ipAddress: req?.ip,
        userAgent: req?.get?.('user-agent')
      }).save();
    } catch (err) { 
      console.error("Audit create error:", err); 
    }
  },

  update: async (user, resource, oldData, newData, req, extra = {}) => {
    try {
      const lang = getLang(req);
      const itemName = extra.itemName || newData;
      const actionText = ACTION_TRANSLATIONS.update?.[lang] || "Updated";
      const resourceText = RESOURCE_TRANSLATIONS[resource]?.[lang] || resource;
      const name = itemName?.[`name_${lang}`] || itemName?.name || itemName || "N/A";
      
      // ✅ ✅ ✅ تنظيف البيانات قبل التخزين - مهم جداً!
      const cleanBefore = sanitizeForAudit(oldData, ['description_ar', 'description_en', 'variants', 'options']);
      const cleanAfter = sanitizeForAudit(newData, ['description_ar', 'description_en', 'variants', 'options']);
      
      await new AuditLog({
        userId: user._id,
        userEmail: user.email,
        userName: user.name,
        userRole: user.role,
        action: "update",
        resource,
        resourceId: newData?.id || newData?._id,
        description: `${actionText} ${resourceText}: ${name}`,
        metadata: {
          ...extra,
          lang,
          itemName_ar: itemName?.name_ar,
          itemName_en: itemName?.name_en,
          before: cleanBefore,  // ✅ بيانات نظيفة
          after: cleanAfter     // ✅ بيانات نظيفة
        },
        ipAddress: req?.ip,
        userAgent: req?.get?.('user-agent')
      }).save();
    } catch (err) { 
      console.error("Audit update error:", err); 
    }
  },

  delete: async (user, resource, deletedData, req, extra = {}) => {
    try {
      const lang = getLang(req);
      const itemName = extra.itemName || deletedData;
      const actionText = ACTION_TRANSLATIONS.delete?.[lang] || "Deleted";
      const resourceText = RESOURCE_TRANSLATIONS[resource]?.[lang] || resource;
      const name = itemName?.[`name_${lang}`] || itemName?.name || itemName || "N/A";
      
      // ✅ ✅ ✅ تنظيف البيانات قبل التخزين
      const cleanBefore = sanitizeForAudit(deletedData, ['description_ar', 'description_en', 'variants', 'options']);
      
      await new AuditLog({
        userId: user._id,
        userEmail: user.email,
        userName: user.name,
        userRole: user.role,
        action: "delete",
        resource,
        resourceId: deletedData?.id || deletedData?._id,
        description: `${actionText} ${resourceText}: ${name}`,
        metadata: {
          ...extra,
          lang,
          itemName_ar: itemName?.name_ar,
          itemName_en: itemName?.name_en,
          before: cleanBefore,  // ✅ بيانات نظيفة
          after: null
        },
        ipAddress: req?.ip,
        userAgent: req?.get?.('user-agent')
      }).save();
    } catch (err) { 
      console.error("Audit delete error:", err); 
    }
  },

  // ✅ دالة login المُعدّلة - مع وصف ثنائي اللغة
  login: async (user, req) => {
    try {
      const lang = getLang(req);
      const descriptions = {
        ar: "تسجيل دخول ناجح",
        en: "Successful login"
      };
      
      await new AuditLog({
        userId: user._id,
        userEmail: user.email,
        userName: user.name,
        userRole: user.role,
        action: "login",
        resource: "user",
        resourceId: user._id,
        description: descriptions[lang] || descriptions.en,
        metadata: {
          lang,
          action: "login",
          description_ar: descriptions.ar,
          description_en: descriptions.en,
          ipAddress: req?.ip,
          userAgent: req?.get?.('user-agent')
        },
        ipAddress: req?.ip,
        userAgent: req?.get?.('user-agent')
      }).save();
    } catch (err) { 
      console.error("Audit login error:", err); 
    }
  },

  failedLogin: async (email, req) => {
    try {
      const lang = getLang(req);
      await new AuditLog({
        userId: "system",
        userEmail: "system@miles.ps",
        userName: "System",
        userRole: "system",
        action: "failed_login",
        resource: "user",
        resourceId: null,
        description: lang === "ar" 
          ? `محاولة دخول فاشلة للبريد: ${email}` 
          : `Failed login attempt for: ${email}`,
        metadata: {
          lang,
          action: "failed_login",
          attemptedEmail: email,
          ipAddress: req?.ip,
          userAgent: req?.get?.('user-agent')
        },
        ipAddress: req?.ip,
        userAgent: req?.get?.('user-agent')
      }).save();
    } catch (err) { 
      console.error("Audit failedLogin error:", err); 
    }
  },

  statusChange: async (user, resource, data, oldStatus, newStatus, req, extra = {}) => {
    try {
      const lang = getLang(req);
      const itemName = extra.itemName || data;
      const actionText = ACTION_TRANSLATIONS.status_change?.[lang] || "Status changed";
      const resourceText = RESOURCE_TRANSLATIONS[resource]?.[lang] || resource;
      const name = itemName?.[`name_${lang}`] || itemName?.name || "N/A";
      const statusText = {
        ar: `من "${oldStatus}" إلى "${newStatus}"`,
        en: `from "${oldStatus}" to "${newStatus}"`
      };
      
      // ✅ تنظيف البيانات
      const cleanData = sanitizeForAudit(data, ['description_ar', 'description_en']);
      
      await new AuditLog({
        userId: user._id,
        userEmail: user.email,
        userName: user.name,
        userRole: user.role,
        action: "status_change",
        resource,
        resourceId: data?.id || data?._id,
        description: `${resourceText}: ${name} - ${statusText[lang]}`,
        metadata: {
          ...extra,
          lang,
          itemName_ar: itemName?.name_ar,
          itemName_en: itemName?.name_en,
          oldStatus,
          newStatus,
          before: { ...cleanData, status: oldStatus },
          after: { ...cleanData, status: newStatus }
        },
        ipAddress: req?.ip,
        userAgent: req?.get?.('user-agent')
      }).save();
    } catch (err) { 
      console.error("Audit statusChange error:", err); 
    }
  },

  permissionChange: async (user, targetUser, oldPerms, newPerms, req) => {
    try {
      const lang = getLang(req);
      await new AuditLog({
        userId: user._id,
        userEmail: user.email,
        userName: user.name,
        userRole: user.role,
        action: "permission_change",
        resource: "user",
        resourceId: targetUser?._id,
        description: lang === "ar" 
          ? `تم تعديل صلاحيات المستخدم: ${targetUser?.name}` 
          : `User permissions updated: ${targetUser?.name}`,
        metadata: {
          lang,
          targetUserId: targetUser?._id,
          targetUserName: targetUser?.name,
          oldPermissions: oldPerms,
          newPermissions: newPerms
        },
        ipAddress: req?.ip,
        userAgent: req?.get?.('user-agent')
      }).save();
    } catch (err) { 
      console.error("Audit permissionChange error:", err); 
    }
  }
};

module.exports = audit;
