// beauty-store/middleware/authorize.js

/**
 * تعريف جميع الصلاحيات المتاحة في النظام
 */
const PERMISSIONS = {
  // 📦 Products
  PRODUCTS: {
    CREATE: "products:create",
    READ: "products:read",
    UPDATE: "products:update",
    DELETE: "products:delete",
    ALL: "products:*"
  },
  // 🏷️ Brands
  BRANDS: {
    CREATE: "brands:create",
    READ: "brands:read",
    UPDATE: "brands:update",
    DELETE: "brands:delete",
    ALL: "brands:*"
  },
  // 🗂️ Categories
  CATEGORIES: {
    CREATE: "categories:create",
    READ: "categories:read",
    UPDATE: "categories:update",
    DELETE: "categories:delete",
    ALL: "categories:*"
  },
  // 📋 Orders
  ORDERS: {
    READ: "orders:read",
    UPDATE_STATUS: "orders:update_status",
    ADD_NOTES: "orders:add_notes",
    DELETE: "orders:delete",
    ALL: "orders:*"
  },
  // 👥 Users
  USERS: {
    CREATE: "users:create",
    READ: "users:read",
    UPDATE: "users:update",
    DELETE: "users:delete",
    ALL: "users:*"
  },
  // ⚙️ Settings
  SETTINGS: {
    READ: "settings:read",
    UPDATE: "settings:update",
    ALL: "settings:*"
  },
  // 📊 Reports
  REPORTS: {
    VIEW_SALES: "reports:view_sales",
    EXPORT_DATA: "reports:export_data",
    VIEW_ANALYTICS: "reports:view_analytics",
    ALL: "reports:*"
  }
};

/**
 * الصلاحيات الافتراضية لكل دور
 */
const ROLE_PERMISSIONS = {
  super_admin: ["*"], // كل الصلاحيات
  
  admin: [
    PERMISSIONS.PRODUCTS.ALL,
    PERMISSIONS.BRANDS.ALL,
    PERMISSIONS.CATEGORIES.ALL,
    PERMISSIONS.ORDERS.READ,
    PERMISSIONS.ORDERS.UPDATE_STATUS,
    PERMISSIONS.ORDERS.ADD_NOTES,
    PERMISSIONS.REPORTS.VIEW_SALES,
    PERMISSIONS.REPORTS.EXPORT_DATA
  ],
  
  order_manager: [
    PERMISSIONS.ORDERS.READ,
    PERMISSIONS.ORDERS.UPDATE_STATUS,
    PERMISSIONS.ORDERS.ADD_NOTES,
    PERMISSIONS.PRODUCTS.READ,
    PERMISSIONS.BRANDS.READ,
    PERMISSIONS.CATEGORIES.READ
  ],
  
  content_manager: [
    PERMISSIONS.PRODUCTS.CREATE,
    PERMISSIONS.PRODUCTS.READ,
    PERMISSIONS.PRODUCTS.UPDATE,
    PERMISSIONS.BRANDS.READ,
    PERMISSIONS.BRANDS.UPDATE,
    PERMISSIONS.CATEGORIES.READ,
    PERMISSIONS.CATEGORIES.UPDATE
  ],
  
  viewer: [
    PERMISSIONS.PRODUCTS.READ,
    PERMISSIONS.BRANDS.READ,
    PERMISSIONS.CATEGORIES.READ,
    PERMISSIONS.ORDERS.READ
  ]
};

/**
 * Middleware للتحقق من أن المستخدم لديه الصلاحية المطلوبة
 * @param {string|string[]} requiredPermission - الصلاحية المطلوبة أو مصفوفة صلاحيات
 * @param {boolean} requireAll - إذا كان true، يحتاج كل الصلاحيات في المصفوفة
 */
const checkPermission = (requiredPermission, requireAll = false) => {
  return (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "❌ Authentication required" });
      }
      
      // ✅ 1. Super Admin أو صلاحية * تعني وصول كامل
      if (user.role === "super_admin" || user.permissions?.includes("*")) {
        return next();
      }
      
      // ✅ 2. جمع كل الصلاحيات المتاحة للمستخدم:
      //    - الصلاحيات الافتراضية للدور
      //    - الصلاحيات المخصصة المخزنة في الداتابيس
      const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
      const customPermissions = user.permissions || [];
      const allUserPermissions = [...new Set([...rolePermissions, ...customPermissions])];
      
      // تحويل المدخل لمصفوفة
      const permissionsToCheck = Array.isArray(requiredPermission) 
        ? requiredPermission 
        : [requiredPermission];
      
      // دالة للتحقق من صلاحية واحدة
      const hasSinglePermission = (perm) => {
        // ✅ أ) تحقق من كل صلاحيات المستخدم (الافتراضية + المخصصة)
        if (allUserPermissions.includes(perm)) return true;
        
        // ✅ ب) تحقق من النمط: products:* يغطي products:create, products:read, إلخ
        const [resource] = perm.split(":");
        if (allUserPermissions.includes(`${resource}:*`)) return true;
        
        return false;
      };
      
      // التحقق حسب المطلوب (أي صلاحية أو كل الصلاحيات)
      const hasAccess = requireAll
        ? permissionsToCheck.every(hasSinglePermission)
        : permissionsToCheck.some(hasSinglePermission);
      
      if (!hasAccess) {
        console.warn(`⚠️ Permission denied: User ${user.email} tried to access ${requiredPermission}`);
        console.warn(`📋 User permissions:`, allUserPermissions);
        return res.status(403).json({ 
          message: "❌ Forbidden - Insufficient permissions",
          required: requiredPermission,
          userRole: user.role,
          userPermissions: allUserPermissions // ✅ مفيد للـ Debug
        });
      }
      
      next();
    } catch (err) {
      console.error("Authorize middleware error:", err);
      return res.status(500).json({ message: "❌ Server error" });
    }
  };
};

// ✅ تصدير كل ما نحتاجه
module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  checkPermission
};
