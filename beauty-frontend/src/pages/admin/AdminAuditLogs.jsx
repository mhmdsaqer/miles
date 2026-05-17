// src/pages/admin/AdminAuditLogs.jsx - النسخة مع دعم الوضع الليلي
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { adminApi } from "../../utils/adminAuth";
import { useLang } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext"; // ✅ إضافة جديدة
import { toast } from "sonner";

const AdminAuditLogs = () => {
  const { lang, t } = useLang();
  const { user, hasPermission } = useAuth();
  const { isDark } = useTheme(); // ✅ إضافة جديدة
  
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    action: "",
    resource: "",
    userId: "",
    dateRange: { from: "", to: "" },
    lang: ""
  });
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, total: 0 });
  
  const isRTL = lang === "ar";
  
  // ✅ ✅ إصلاح: استخدام useRef لتجنب مشكلة الـ TDZ
  const fetchLogsRef = useRef(null);
  
  // ✅ التحقق من الصلاحية
  if (!hasPermission("settings:read") && user?.role !== "super_admin") {
    return (
      <div className={`text-center py-20 transition-colors duration-300 ${isDark ? 'dark bg-gray-900' : ''}`} dir={isRTL ? "rtl" : "ltr"}>
        <div className="text-6xl mb-4">🔒</div>
        <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {lang === "ar" ? "وصول مرفوض" : "Access Denied"}
        </h2>
        <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
          {lang === "ar" 
            ? "هذه الصفحة متاحة للمدير العام فقط" 
            : "This page is available for Super Admin only"}
        </p>
      </div>
    );
  }
  
  // ✅ ✅ ✅ دالة fetchLogs - مُعرّفة أولاً باستخدام useRef
  const fetchLogs = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 10,
        ...filters.search && { search: filters.search },
        ...filters.action && { action: filters.action },
        ...filters.resource && { resource: filters.resource },
        ...filters.lang && { lang: filters.lang },
        ...filters.dateRange.from && { startDate: filters.dateRange.from },
        ...filters.dateRange.to && { endDate: filters.dateRange.to }
      };
      
      const res = await adminApi.get("/audit-logs", { params });
      setLogs(res.data.logs);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error("Failed to fetch logs:", err);
      toast.error(
        <div className="flex items-center gap-3">
          <span className="text-xl">❌</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {lang === "ar" ? "فشل تحميل السجلات" : "Failed to load logs"}
          </span>
        </div>,
        { duration: 4000 }
      );
    } finally {
      setLoading(false);
    }
  }, [filters, lang, isDark]);
  
  // ✅ تحديث الـ ref عند تغيير الدالة
  useEffect(() => {
    fetchLogsRef.current = fetchLogs;
  }, [fetchLogs]);
  
  // ✅ ✅ ✅ استدعاء الدالة عبر الـ ref لتجنب مشكلة الـ initialization
  useEffect(() => {
    fetchLogsRef.current?.(1);
  }, []); // ← لا نضع fetchLogs في الاعتماديات هنا!
  
  // ✅ معالجة تغيير الفلاتر
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);
  
  // ✅ ✅ ✅ دالة مسح الفلاتر - تستخدم الـ ref
  const clearFilters = useCallback(() => {
    setFilters({
      search: "",
      action: "",
      resource: "",
      userId: "",
      dateRange: { from: "", to: "" },
      lang: ""
    });
    // ✅ استخدام الـ ref بدلاً من الدالة المباشرة
    setTimeout(() => fetchLogsRef.current?.(1), 0);
  }, []);
  
  // ✅ ✅ ✅ دالة حذف سجل - تستخدم الـ ref
  const handleDeleteLog = useCallback(async (logId) => {
    const isSuperAdmin = user?.role === "super_admin" || hasPermission("*");
    if (!isSuperAdmin) {
      toast.error(
        <div className="flex items-center gap-3">
          <span className="text-xl">❌</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {lang === "ar" ? "فقط المدير العام يمكنه حذف السجلات" : "Only Super Admin can delete logs"}
          </span>
        </div>,
        { duration: 4000 }
      );
      return;
    }
    
    if (!window.confirm(lang === "ar" ? "⚠️ هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع!" : "⚠️ Are you sure you want to delete this log? This cannot be undone!")) {
      return;
    }
    
    try {
      await adminApi.delete(`/audit-logs/${logId}`);
      toast.success(
        <div className="flex items-center gap-3">
          <span className="text-xl">✅</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {lang === "ar" ? "تم حذف السجل بنجاح" : "Log deleted successfully"}
          </span>
        </div>,
        { duration: 3000 }
      );
      // ✅ إعادة التحميل عبر الـ ref
      fetchLogsRef.current?.(pagination.currentPage);
    } catch (err) {
      console.error("Delete log error:", err);
      toast.error(
        <div className="flex items-center gap-3">
          <span className="text-xl">❌</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {err.response?.data?.message || (lang === "ar" ? "فشل حذف السجل" : "Failed to delete log")}
          </span>
        </div>,
        { duration: 4000 }
      );
    }
  }, [user, hasPermission, lang, pagination.currentPage, isDark]);
  
  // ✅ ✅ ✅ دوال المساعدة - لا تعتمد على fetchLogs مباشرة
  
    // ✅ دالة عرض الوصف حسب اللغة - داخل المكون
  const getLogDescription = useCallback((log) => {
    // ✅ أولاً: حاول استخدام الوصف المترجم من الـ metadata
    if (log.metadata?.description_en && log.metadata?.description_ar) {
      return lang === "ar" ? log.metadata.description_ar : log.metadata.description_en;
    }
    
    // ✅ ثانياً: إذا كان هناك اسم العنصر، اعرضه حسب اللغة
    const metadataName = lang === "ar" 
      ? (log.metadata?.itemName_ar || log.metadata?.itemName) 
      : (log.metadata?.itemName_en || log.metadata?.itemName);
    
    if (metadataName && metadataName !== "N/A" && String(metadataName).trim() !== "") {
      // ✅ ترجم نوع النشاط والمورد
      const actionText = {
        create: lang === "ar" ? "تم إنشاء" : "Created",
        update: lang === "ar" ? "تم تعديل" : "Updated", 
        delete: lang === "ar" ? "تم حذف" : "Deleted",
        login: lang === "ar" ? "تسجيل دخول" : "Login",
        logout: lang === "ar" ? "تسجيل خروج" : "Logout",
        status_change: lang === "ar" ? "تغيير حالة" : "Status changed"
      }[log.action] || log.action;
      
      const resourceText = {
        product: lang === "ar" ? "منتج" : "Product",
        brand: lang === "ar" ? "براند" : "Brand",
        category: lang === "ar" ? "تصنيف" : "Category",
        order: lang === "ar" ? "طلب" : "Order",
        user: lang === "ar" ? "مستخدم" : "User"
      }[log.resource] || log.resource;
      
      return `${actionText} ${resourceText}: ${metadataName.trim()}`;
    }
    
    // ✅ ثالثاً: حاول استخراج الاسم من الوصف الأصلي
    const match = log.description?.match(/:\s*([^:]+)$/);
    if (match && match[1]) {
      const extracted = match[1].trim();
      if (extracted && extracted !== "N/A") {
        const actionText = {
          create: lang === "ar" ? "تم إنشاء" : "Created",
          update: lang === "ar" ? "تم تعديل" : "Updated",
          delete: lang === "ar" ? "تم حذف" : "Deleted"
        }[log.action] || log.action;
        
        const resourceText = {
          product: lang === "ar" ? "منتج" : "Product",
          brand: lang === "ar" ? "براند" : "Brand",
          category: lang === "ar" ? "تصنيف" : "Category"
        }[log.resource] || log.resource;
        
        return `${actionText} ${resourceText}: ${extracted}`;
      }
    }
    
    // ✅ رابعاً: fallback للوصف الأصلي
    return log.description || (lang === "ar" ? "بدون وصف" : "No description");
  }, [lang]);
  
  // ✅ دالة عرض اسم المورد
  const getResourceDisplayName = useCallback((resource, log) => {
    const baseLabels = {
      user: lang === "ar" ? "👤 مستخدم" : "👤 User",
      product: lang === "ar" ? "📦 منتج" : "📦 Product",
      brand: lang === "ar" ? "🏷️ براند" : "🏷️ Brand",
      category: lang === "ar" ? "🗂️ تصنيف" : "🗂️ Category",
      variant: lang === "ar" ? "🔀 متغير" : "🔀 Variant",
      order: lang === "ar" ? "📋 طلب" : "📋 Order",
      settings: lang === "ar" ? "⚙️ إعدادات" : "⚙️ Settings",
      system: lang === "ar" ? "💻 نظام" : "💻 System",
      audit_log: lang === "ar" ? "📋 سجل" : "📋 Audit Log"
    };
    
    const baseLabel = baseLabels[resource] || resource;
    const metadataName = lang === "ar" 
      ? (log.metadata?.itemName_ar || log.metadata?.itemName) 
      : (log.metadata?.itemName_en || log.metadata?.itemName);
    
    if (metadataName && metadataName !== "N/A") {
      return `${baseLabel}: ${metadataName}`;
    }
    
    return baseLabel;
  }, [lang]);
  
  // ✅ ترجمة نوع النشاط - مع دعم metadata.action
  const getActionLabel = useCallback((log) => {
    const metaAction = log.metadata?.action;
    if (metaAction && metaAction !== log.action) {
      const metaLabels = {
        login: lang === "ar" ? "🔐 تسجيل دخول" : "🔐 Login",
        logout: lang === "ar" ? "🚪 تسجيل خروج" : "🚪 Logout",
        failed_login: lang === "ar" ? "❌ دخول فاشل" : "❌ Failed Login",
        login_denied: lang === "ar" ? "🚫 دخول مرفوض" : "🚫 Login Denied"
      };
      if (metaLabels[metaAction]) return metaLabels[metaAction];
    }
    
    const actionLabels = {
      login: lang === "ar" ? "🔐 تسجيل دخول" : "🔐 Login",
      logout: lang === "ar" ? "🚪 تسجيل خروج" : "🚪 Logout",
      create: lang === "ar" ? "➕ إنشاء" : "➕ Create",
      update: lang === "ar" ? "✏️ تعديل" : "✏️ Update",
      delete: lang === "ar" ? "🗑️ حذف" : "🗑️ Delete",
      status_change: lang === "ar" ? "🔄 تغيير حالة" : "🔄 Status Change",
      failed_login: lang === "ar" ? "❌ دخول فاشل" : "❌ Failed Login",
      permission_change: lang === "ar" ? "🔑 تغيير صلاحيات" : "🔑 Permission Change",
      export_data: lang === "ar" ? "📤 تصدير بيانات" : "📤 Export Data",
      settings_change: lang === "ar" ? "⚙️ تغيير إعدادات" : "⚙️ Settings Change"
    };
    
    return actionLabels[log.action] || log.action;
  }, [lang]);
  
  // ✅ ترجمة نوع المورد
  const getResourceLabel = useCallback((resource) => ({
    user: lang === "ar" ? "👤 مستخدم" : "👤 User",
    product: lang === "ar" ? "📦 منتج" : "📦 Product",
    brand: lang === "ar" ? "🏷️ براند" : "🏷️ Brand",
    category: lang === "ar" ? "🗂️ تصنيف" : "🗂️ Category",
    variant: lang === "ar" ? "🔀 متغير" : "🔀 Variant",
    order: lang === "ar" ? "📋 طلب" : "📋 Order",
    settings: lang === "ar" ? "⚙️ إعدادات" : "⚙️ Settings",
    system: lang === "ar" ? "💻 نظام" : "💻 System",
    audit_log: lang === "ar" ? "📋 سجل" : "📋 Audit Log"
  }[resource] || resource), [lang]);
  
  // ✅ ألوان حسب نوع النشاط
  const getActionStyle = useCallback((action) => ({
    login: isDark ? "bg-green-900/30 text-green-400 border-green-800" : "bg-green-100 text-green-700 border-green-200",
    logout: isDark ? "bg-gray-700 text-gray-300 border-gray-600" : "bg-gray-100 text-gray-700 border-gray-200",
    create: isDark ? "bg-blue-900/30 text-blue-400 border-blue-800" : "bg-blue-100 text-blue-700 border-blue-200",
    update: isDark ? "bg-amber-900/30 text-amber-400 border-amber-800" : "bg-amber-100 text-amber-700 border-amber-200",
    delete: isDark ? "bg-red-900/30 text-red-400 border-red-800" : "bg-red-100 text-red-700 border-red-200",
    status_change: isDark ? "bg-purple-900/30 text-purple-400 border-purple-800" : "bg-purple-100 text-purple-700 border-purple-200",
    failed_login: isDark ? "bg-red-900/40 text-red-300 border-red-700" : "bg-red-200 text-red-800 border-red-300",
    permission_change: isDark ? "bg-indigo-900/30 text-indigo-400 border-indigo-800" : "bg-indigo-100 text-indigo-700 border-indigo-200",
    export_data: isDark ? "bg-cyan-900/30 text-cyan-400 border-cyan-800" : "bg-cyan-100 text-cyan-700 border-cyan-200",
    settings_change: isDark ? "bg-pink-900/30 text-pink-400 border-pink-800" : "bg-pink-100 text-pink-700 border-pink-200"
  }[action] || (isDark ? "bg-gray-700 text-gray-300 border-gray-600" : "bg-gray-100 text-gray-700 border-gray-200")), [isDark]);
  
  // ✅ تنسيق التاريخ
  const formatDate = useCallback((date) => 
    new Date(date).toLocaleString(lang === "ar" ? "ar-PS" : "en-US", {
      timeZone: "Asia/Hebron",
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    }), [lang]);
  
  // ✅ خيارات الفلترة
  const actionOptions = useMemo(() => [
    { value: "", label: lang === "ar" ? "كل الأنشطة" : "All Actions" },
    { value: "create", label: lang === "ar" ? "➕ إنشاء" : "➕ Create" },
    { value: "update", label: lang === "ar" ? "✏️ تعديل" : "✏️ Update" },
    { value: "delete", label: lang === "ar" ? "🗑️ حذف" : "🗑️ Delete" },
    { value: "login", label: lang === "ar" ? "🔐 تسجيل دخول" : "🔐 Login" },
    { value: "status_change", label: lang === "ar" ? "🔄 تغيير حالة" : "🔄 Status Change" }
  ], [lang]);
  
  const resourceOptions = useMemo(() => [
    { value: "", label: lang === "ar" ? "كل الموارد" : "All Resources" },
    { value: "product", label: lang === "ar" ? "📦 منتج" : "📦 Product" },
    { value: "order", label: lang === "ar" ? "📋 طلب" : "📋 Order" },
    { value: "user", label: lang === "ar" ? "👤 مستخدم" : "👤 User" },
    { value: "brand", label: lang === "ar" ? "🏷️ براند" : "🏷️ Brand" },
    { value: "category", label: lang === "ar" ? "🗂️ تصنيف" : "🗂️ Category" }
  ], [lang]);
  
  const languageOptions = useMemo(() => [
    { value: "", label: lang === "ar" ? "كل اللغات" : "All Languages" },
    { value: "ar", label: "🇵🇸 العربية" },
    { value: "en", label: "🇬🇧 English" }
  ], [lang]);
  
  // ✅ التحقق إذا كان المستخدم مدير عام
  const isSuperAdmin = useMemo(() => 
    user?.role === "super_admin" || hasPermission("*"), 
    [user, hasPermission]
  );
  
  // ✅ عند تغيير الفلاتر، نعيد التحميل عبر الـ ref
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogsRef.current?.(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search, filters.action, filters.resource, filters.lang, filters.dateRange]);
  
  return (
    <div className={`space-y-6 transition-colors duration-300 ${isDark ? 'dark' : ''}`} dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-3xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {lang === "ar" ? "📋 سجل النشاطات" : "📋 Activity Logs"}
          </h1>
          <p className={`text-sm mt-1 font-bold ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
            {pagination.total} {lang === "ar" ? "سجل" : "records"}
          </p>
        </div>
        <button 
          onClick={() => fetchLogsRef.current?.(1)}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
            isDark 
              ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          🔄 {lang === "ar" ? "تحديث" : "Refresh"}
        </button>
      </div>
      
      {/* Filters */}
      <div className={`p-4 rounded-2xl border transition-colors ${
        isDark 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-100'
      } grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3`}>
        <input
          type="text"
          placeholder={lang === "ar" ? "🔍 بحث..." : "🔍 Search..."}
          value={filters.search}
          onChange={(e) => handleFilterChange("search", e.target.value)}
          className={`rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-pink-500/30 transition-colors ${
            isDark 
              ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
              : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
          }`}
        />
        <select
          value={filters.action}
          onChange={(e) => handleFilterChange("action", e.target.value)}
          className={`rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-pink-500/30 transition-colors ${
            isDark 
              ? 'bg-gray-700 border-gray-600 text-gray-100' 
              : 'bg-gray-50 border border-gray-200 text-gray-900'
          }`}
        >
          {actionOptions.map(opt => (
            <option key={opt.value} value={opt.value} className={isDark ? 'bg-gray-800' : ''}>{opt.label}</option>
          ))}
        </select>
        <select
          value={filters.resource}
          onChange={(e) => handleFilterChange("resource", e.target.value)}
          className={`rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-pink-500/30 transition-colors ${
            isDark 
              ? 'bg-gray-700 border-gray-600 text-gray-100' 
              : 'bg-gray-50 border border-gray-200 text-gray-900'
          }`}
        >
          {resourceOptions.map(opt => (
            <option key={opt.value} value={opt.value} className={isDark ? 'bg-gray-800' : ''}>{opt.label}</option>
          ))}
        </select>
        <select
          value={filters.lang}
          onChange={(e) => handleFilterChange("lang", e.target.value)}
          className={`rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-pink-500/30 transition-colors ${
            isDark 
              ? 'bg-gray-700 border-gray-600 text-gray-100' 
              : 'bg-gray-50 border border-gray-200 text-gray-900'
          }`}
        >
          {languageOptions.map(opt => (
            <option key={opt.value} value={opt.value} className={isDark ? 'bg-gray-800' : ''}>{opt.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={filters.dateRange.from}
          onChange={(e) => handleFilterChange("dateRange", { ...filters.dateRange, from: e.target.value })}
          className={`rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-pink-500/30 transition-colors ${
            isDark 
              ? 'bg-gray-700 border-gray-600 text-gray-100' 
              : 'bg-gray-50 border border-gray-200 text-gray-900'
          }`}
        />
        <div className="flex gap-2">
          <input
            type="date"
            value={filters.dateRange.to}
            onChange={(e) => handleFilterChange("dateRange", { ...filters.dateRange, to: e.target.value })}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-pink-500/30 transition-colors ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-gray-100' 
                : 'bg-gray-50 border border-gray-200 text-gray-900'
            }`}
          />
          <button 
            onClick={clearFilters}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition ${
              isDark 
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
            title={lang === "ar" ? "مسح الفلاتر" : "Clear filters"}
          >
            🔄
          </button>
        </div>
      </div>
      
      {/* Logs Table */}
      <div className={`rounded-2xl border overflow-hidden transition-colors ${
        isDark 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-100'
      }`}>
        {loading ? (
          <div className={`p-12 text-center font-bold animate-pulse ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
            {lang === "ar" ? "جاري التحميل..." : "Loading..."}
          </div>
        ) : logs.length === 0 ? (
          <div className={`p-12 text-center font-bold ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
            {lang === "ar" ? "لا توجد سجلات مطابقة" : "No matching logs"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={`border-b ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                <tr>
                  <th className={`px-4 py-3 font-black uppercase tracking-widest text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'} ${isRTL ? "text-right" : "text-left"}`}>
                    {lang === "ar" ? "الوقت" : "Time"}
                  </th>
                  <th className={`px-4 py-3 font-black uppercase tracking-widest text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'} ${isRTL ? "text-right" : "text-left"}`}>
                    {lang === "ar" ? "المستخدم" : "User"}
                  </th>
                  <th className={`px-4 py-3 font-black uppercase tracking-widest text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'} ${isRTL ? "text-right" : "text-left"}`}>
                    {lang === "ar" ? "النشاط" : "Action"}
                  </th>
                  <th className={`px-4 py-3 font-black uppercase tracking-widest text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'} ${isRTL ? "text-right" : "text-left"}`}>
                    {lang === "ar" ? "الوصف" : "Description"}
                  </th>
                  <th className={`px-4 py-3 font-black uppercase tracking-widest text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'} ${isRTL ? "text-right" : "text-left"}`}>
                    {lang === "ar" ? "IP" : "IP"}
                  </th>
                  {isSuperAdmin && (
                    <th className={`px-4 py-3 font-black uppercase tracking-widest text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'} ${isRTL ? "text-right" : "text-left"}`}>
                      {lang === "ar" ? "إجراءات" : "Actions"}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-50'}`}>
                {logs.map(log => (
                  <tr key={log._id} className={`transition-colors ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'} group`}>
                    <td className={`px-4 py-3 text-xs font-mono whitespace-nowrap ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{log.userName}</div>
                      <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>{log.userRole} • {log.userEmail}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${getActionStyle(log.action)}`}>
                        {getActionLabel(log)}
                      </span>
                      <div className={`text-xs mt-1 truncate max-w-[150px] ${isDark ? 'text-gray-400' : 'text-gray-400'}`} title={getResourceDisplayName(log.resource, log)}>
                        {getResourceDisplayName(log.resource, log)}
                      </div>
                    </td>
                    <td className={`px-4 py-3 max-w-xs truncate ${isDark ? 'text-gray-300' : 'text-gray-600'}`} title={getLogDescription(log)}>
                      {getLogDescription(log)}
                    </td>
                    <td className={`px-4 py-3 text-xs font-mono ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                      {log.ipAddress || "—"}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteLog(log._id)}
                          className={`opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                            isDark 
                              ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' 
                              : 'bg-red-50 text-red-600 hover:bg-red-100'
                          }`}
                          title={lang === "ar" ? "حذف هذا السجل" : "Delete this log"}
                        >
                          🗑️ {lang === "ar" ? "حذف" : "Delete"}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
            const page = i + 1;
            return (
              <button
                key={page}
                onClick={() => fetchLogsRef.current?.(page)}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition ${
                  pagination.currentPage === page 
                    ? (isDark ? 'bg-gray-700 text-white' : 'bg-gray-900 text-white')
                    : (isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700')
                }`}
              >
                {page}
              </button>
            );
          })}
          {pagination.totalPages > 5 && (
            <span className={`px-3 py-1.5 text-sm ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>...</span>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminAuditLogs;