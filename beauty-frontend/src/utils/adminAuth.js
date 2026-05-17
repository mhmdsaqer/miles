// src/utils/adminAuth.js
import axios from "axios";

const STORAGE_KEY = "miles_admin_token";
const USER_DATA_KEY = "miles_user_data";
const API_URL = "http://localhost:3000";

// ✅ الـ baseURL يبقى خاص بصفحات الأدمن
export const adminApi = axios.create({
  baseURL: `${API_URL}/api/admin`,
  timeout: 15000,
});

// ✅ إرفاق الـ Token تلقائياً
adminApi.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(STORAGE_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ✅ معالجة أخطاء 401
adminApi.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.clear();
      if (window.location.pathname !== "/admin/login") {
        window.location.href = "/admin/login";
      }
    }
    return Promise.reject(error);
  }
);

// ✅ ✅ دوال مساعدة للتحقق من الصلاحيات
const checkUserPermission = (user, permission) => {
  if (!user) return false;
  
  // Super admin أو صلاحية * تعني وصول كامل
  if (user.role === "super_admin" || user.permissions?.includes("*")) {
    return true;
  }
  
  // تحقق مباشر من الصلاحية
  if (user.permissions?.includes(permission)) {
    return true;
  }
  
  // تحقق من النمط: products:* يغطي products:create, products:read, إلخ
  const [resource] = permission.split(":");
  if (user.permissions?.includes(`${resource}:*`)) {
    return true;
  }
  
  return false;
};

export const adminAuth = {
  // ✅ تسجيل الدخول بالنظام الجديد
  login: async (email, password) => {
    const response = await axios.post(`${API_URL}/api/auth/login`, { email, password });
    const { token, user } = response.data;
    sessionStorage.setItem(STORAGE_KEY, token);
    sessionStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
    return { success: true, user };
  },
  
  logout: () => {
    sessionStorage.clear();
    window.location.href = "/admin/login";
  },
  
  isAuthenticated: () => !!sessionStorage.getItem(STORAGE_KEY),
  
  getCurrentUser: () => {
    try { 
      return JSON.parse(sessionStorage.getItem(USER_DATA_KEY)); 
    } catch { 
      return null; 
    }
  },
  
  // ✅ ✅ إضافة دالة التحقق من صلاحية واحدة
  hasPermission: (permission) => {
    try {
      const user = adminAuth.getCurrentUser();
      return checkUserPermission(user, permission);
    } catch {
      return false;
    }
  },
  
  // ✅ ✅ إضافة دالة التحقق من عدة صلاحيات
  hasPermissions: (permissions, requireAll = false) => {
    if (!Array.isArray(permissions)) {
      return adminAuth.hasPermission(permissions);
    }
    
    if (requireAll) {
      return permissions.every(p => adminAuth.hasPermission(p));
    }
    return permissions.some(p => adminAuth.hasPermission(p));
  }
};