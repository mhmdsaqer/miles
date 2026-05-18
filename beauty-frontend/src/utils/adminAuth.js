// src/utils/adminAuth.js - النسخة المُصححة ✅
import axios from "axios";

const STORAGE_KEY = "miles_admin_token";
const USER_DATA_KEY = "miles_user_data";

// ✅ ✅ ✅ استخدم المتغير من الـ env مع fallback محلي
const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000";

// ✅ الـ baseURL يستخدم الـ API_URL الديناميكي
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

// ✅ دوال التحقق من الصلاحيات (نفسها - ما تغيرت)
const checkUserPermission = (user, permission) => {
  if (!user) return false;
  if (user.role === "super_admin" || user.permissions?.includes("*")) return true;
  if (user.permissions?.includes(permission)) return true;
  const [resource] = permission.split(":");
  if (user.permissions?.includes(`${resource}:*`)) return true;
  return false;
};

export const adminAuth = {
  login: async (email, password) => {
    // ✅ ✅ ✅ استخدم API_URL الديناميكي هنا أيضاً
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
  
  hasPermission: (permission) => {
    try {
      const user = adminAuth.getCurrentUser();
      return checkUserPermission(user, permission);
    } catch {
      return false;
    }
  },
  
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
