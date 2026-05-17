// src/context/AuthContext.jsx
import { createContext, useState, useContext, useEffect, useMemo, useCallback } from "react";
import { adminAuth } from "../utils/adminAuth";

// ✅ ثوابت مفاتيح التخزين (للاستخدام في المراقبة)
const STORAGE_KEY = "miles_admin_token";
const USER_DATA_KEY = "miles_user_data";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ تحميل بيانات المستخدم عند بدء التطبيق
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const currentUser = adminAuth.getCurrentUser();
        if (currentUser && adminAuth.isAuthenticated()) {
          setUser(currentUser);
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
        setError("فشل تحميل بيانات المستخدم");
      } finally {
        setLoading(false);
      }
    };
    
    initializeAuth();
  }, []);

  // ✅ ✅ ✅ إضافة جديدة: مراقبة تغييرات الـ sessionStorage + مزامنة دورية
  useEffect(() => {
    // ✅ دالة التعامل مع تغييرات الـ storage (عند التحديث من تبويب آخر)
    const handleStorageChange = (e) => {
      if (e.key === USER_DATA_KEY || e.key === STORAGE_KEY) {
        const currentUser = adminAuth.getCurrentUser();
        setUser(currentUser);
      }
    };
    
    // ✅ تحقق دوري كل 2 ثانية لضمان المزامنة (حتى بدون تغييرات خارجية)
    const syncInterval = setInterval(() => {
      const currentUser = adminAuth.getCurrentUser();
      const isAuthenticated = adminAuth.isAuthenticated();
      
      // إذا كان هناك user في الـ storage لكن ليس في الـ state، حدّثه
      if (isAuthenticated && currentUser && (!user || user.id !== currentUser.id)) {
        console.log("🔄 Auth sync: Updating user from storage");
        setUser(currentUser);
      }
      
      // إذا كان الـ state يحتوي على user لكن الـ storage فارغ، سجّل خروج
      if (!isAuthenticated && user) {
        console.log("🔄 Auth sync: Clearing user (logged out elsewhere)");
        setUser(null);
      }
    }, 2000); // ✅ كل 2 ثانية
    
    // ✅ تسجيل مستمع حدث الـ storage
    window.addEventListener("storage", handleStorageChange);
    
    // ✅ دالة التنظيف عند فك المكون
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(syncInterval);
    };
  }, [user]); // ✅ يعتمد على user الحالي لتحديث المزامنة

  // ✅ تسجيل الدخول
  const login = useCallback(async (email, password, useLegacy = false) => {
    setError(null);
    setLoading(true);
    
    try {
      const result = useLegacy 
        ? await adminAuth.loginLegacy(password)
        : await adminAuth.login(email, password);
      
      if (result.success) {
        setUser(result.user);
        return { success: true };
      } else {
        setError(result.message);
        return { success: false, message: result.message };
      }
    } catch (err) {
      setError("حدث خطأ غير متوقع");
      return { success: false, message: "حدث خطأ غير متوقع" };
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ تسجيل الخروج
  const logout = useCallback(() => {
    adminAuth.logout();
    setUser(null);
  }, []);

  // ✅ التحقق من الصلاحيات
  const hasPermission = useCallback((permission) => {
    return adminAuth.hasPermission(permission);
  }, []);

  const hasPermissions = useCallback((permissions, requireAll = false) => {
    return adminAuth.hasPermissions(permissions, requireAll);
  }, []);

  // ✅ القيم المُصدرة
  const value = useMemo(() => ({
    user,
    loading,
    error,
    login,
    logout,
    hasPermission,
    hasPermissions,
    isAuthenticated: !!user,
    role: user?.role || null,
    permissions: user?.permissions || []
  }), [user, loading, error, login, logout, hasPermission, hasPermissions]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// ✅ Custom Hook للاستخدام في المكونات
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;