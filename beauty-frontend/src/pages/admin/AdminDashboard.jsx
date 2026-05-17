// src/pages/admin/AdminDashboard.jsx - النسخة مع دعم الوضع الليلي 🌙
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "../../utils/adminAuth";
import { useLang } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext"; // ✅ إضافة جديدة
import { toast } from "sonner";

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { lang, t, toggleLang } = useLang();
  const { user, hasPermission } = useAuth();
  const { isDark } = useTheme(); // ✅ إضافة جديدة
  const navigate = useNavigate();
  const isRTL = lang === "ar";

  // ✅ ✅ ✅ دوال التحقق من الصلاحيات
  const canViewProducts = useMemo(() => hasPermission("products:read"), [hasPermission]);
  const canViewBrands = useMemo(() => hasPermission("brands:read"), [hasPermission]);
  const canViewCategories = useMemo(() => hasPermission("categories:read"), [hasPermission]);
  const canViewOrders = useMemo(() => hasPermission("orders:read"), [hasPermission]);
  const canCreateProducts = useMemo(() => hasPermission("products:create"), [hasPermission]);
  const canExportData = useMemo(() => hasPermission("reports:export_data"), [hasPermission]);
  const canViewAnalytics = useMemo(() => hasPermission("reports:view_analytics"), [hasPermission]);

  // ✅ ترحيب شخصي حسب الوقت
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const name = user?.name?.split(" ")[0] || (lang === "ar" ? "صديقي" : "Friend");
    
    if (hour >= 5 && hour < 12) return { ar: `صباح الخير، ${name} ☀️`, en: `Good morning, ${name} ☀️` };
    if (hour >= 12 && hour < 17) return { ar: `مساء النور، ${name} 🌤️`, en: `Good afternoon, ${name} 🌤️` };
    if (hour >= 17 && hour < 21) return { ar: `مساء الخير، ${name} 🌙`, en: `Good evening, ${name} 🌙` };
    return { ar: `أهلاً بك، ${name} ✨`, en: `Welcome, ${name} ✨` };
  }, [user, lang]);

  // ✅ دور المستخدم بصيغة جميلة
  const roleBadge = useMemo(() => {
    const roles = {
      super_admin: { ar: "مدير عام", en: "Super Admin", color: "bg-gradient-to-r from-purple-500 to-pink-500" },
      admin: { ar: "مدير", en: "Admin", color: "bg-gradient-to-r from-blue-500 to-cyan-500" },
      order_manager: { ar: "مدير طلبات", en: "Order Manager", color: "bg-gradient-to-r from-green-500 to-emerald-500" },
      content_manager: { ar: "مدير محتوى", en: "Content Manager", color: "bg-gradient-to-r from-amber-500 to-orange-500" },
      viewer: { ar: "مشاهد", en: "Viewer", color: "bg-gray-200 dark:bg-gray-600" } // ✅ دعم الوضع الليلي
    };
    return roles[user?.role] || roles.viewer;
  }, [user]);

  // ✅ جلب الإحصائيات
  useEffect(() => {
    const fetchStats = async () => {
      if (!canViewAnalytics && !canViewProducts && !canViewBrands && !canViewCategories) {
        setLoading(false);
        return;
      }
      try {
        const res = await adminApi.get("/stats");
        setStats(res.data);
      } catch (err) {
        console.error("Failed to fetch stats:", err);
        if (hasPermission("reports:view_analytics")) {
          toast.error(t('errorLoadingStats'));
        }
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [t, canViewAnalytics, canViewProducts, canViewBrands, canViewCategories, hasPermission]);

  // ✅ دوال الأزرار السريعة
  const handleAddProduct = useCallback(() => {
    if (!canCreateProducts) {
      toast.error(lang === "ar" ? "❌ غير مصرح بإضافة منتجات" : "❌ Forbidden");
      return;
    }
    navigate("/admin/products");
    toast.info(t('navigateToAddProduct'));
  }, [navigate, t, canCreateProducts, lang]);

  const handleReviewOrders = useCallback(() => {
    if (!canViewOrders) {
      toast.error(lang === "ar" ? "❌ غير مصرح بعرض الطلبات" : "❌ Forbidden");
      return;
    }
    navigate("/admin/orders");
  }, [navigate, canViewOrders, lang]);

  const handleExportData = useCallback(() => {
    if (!canExportData) {
      toast.error(lang === "ar" ? "❌ غير مصرح بتصدير البيانات" : "❌ Forbidden");
      return;
    }
    const data = { exportedAt: new Date().toISOString(), stats, note: t('exportNote') };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `miles-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('dataExported'));
  }, [stats, t, canExportData, lang]);

  // ✅ بطاقات الإحصائيات
  const cards = useMemo(() => {
    if (!stats) return [];
    const allCards = [
      { labelKey: "brands", value: stats.brands, color: "bg-pink-500", icon: "🏷️", descKey: "globalBrand", permission: "brands:read" },
      { labelKey: "products", value: stats.products, color: "bg-blue-500", icon: "📦", descKey: "availableProduct", permission: "products:read" },
      { labelKey: "categories", value: stats.categories, color: "bg-purple-500", icon: "🗂️", descKey: "mainCategory", permission: "categories:read" },
      { labelKey: "variants", value: stats.variants, color: "bg-green-500", icon: "🔀", descKey: "availableOption", permission: "products:read" },
    ];
    return allCards.filter(card => hasPermission(card.permission));
  }, [stats, hasPermission]);

  // ✅ أزرار الخطوات السريعة
  const quickActions = useMemo(() => {
    const actions = [];
    if (canCreateProducts) actions.push({ labelKey: "addNewProduct", descKey: "createProductWithVariants", icon: "➕", color: isDark ? "hover:bg-gray-700 hover:text-gray-200" : "hover:bg-pink-50 hover:text-pink-600", onClick: handleAddProduct });
    if (canViewOrders) actions.push({ labelKey: "reviewOrders", descKey: "manageWhatsAppOrders", icon: "💬", color: isDark ? "hover:bg-gray-700 hover:text-gray-200" : "hover:bg-blue-50 hover:text-blue-600", onClick: handleReviewOrders });
    if (canExportData) actions.push({ labelKey: "exportData", descKey: "downloadBackup", icon: "📥", color: isDark ? "hover:bg-gray-700 hover:text-gray-200" : "hover:bg-green-50 hover:text-green-600", onClick: handleExportData });
    if (actions.length === 0) actions.push({ labelKey: "browseStore", descKey: "viewPublicStore", icon: "🛍️", color: isDark ? "hover:bg-gray-700 hover:text-gray-200" : "hover:bg-gray-50 hover:text-gray-600", onClick: () => window.open("/", "_blank") });
    return actions;
  }, [canCreateProducts, canViewOrders, canExportData, handleAddProduct, handleReviewOrders, handleExportData, isDark]);

  // ✅ حالة النظام
  const systemStatus = useMemo(() => {
    if (!hasPermission("settings:read")) return [];
    return [
      { status: "green", labelKey: "serverConnected", pulse: true },
      { status: "green", labelKey: "mongodbActive", pulse: false },
      { status: "amber", labelKey: "ordersLocalStorage", pulse: false }
    ];
  }, [hasPermission]);

  // ✅ حالة عدم وجود صلاحيات
  if (!canViewAnalytics && !canViewProducts && !canViewBrands && !canViewCategories && !canViewOrders) {
    return (
      <div className={`flex items-center justify-center min-h-[60vh] text-center ${isDark ? 'bg-gray-900' : 'bg-white'}`} dir={isRTL ? "rtl" : "ltr"}>
        <div className="space-y-6 max-w-md">
          <div className="text-7xl">🔐</div>
          <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{lang === "ar" ? "مرحباً!" : "Welcome!"}</h2>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {lang === "ar" ? "ليس لديك صلاحيات لعرض لوحة التحكم حالياً. تواصل مع المدير العام للحصول على صلاحيات." : "You don't have permissions to view the dashboard. Contact Super Admin for access."}
          </p>
          <button onClick={() => window.open("/", "_blank")} className="bg-gray-900 dark:bg-gray-700 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-pink-600 transition-all">
            {lang === "ar" ? "← زيارة المتجر" : "Visit Store →"}
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-[60vh] ${isDark ? 'text-gray-400' : 'text-gray-400'} font-bold`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-gray-200 dark:border-gray-700 border-t-pink-500 rounded-full animate-spin"></div>
          <span>{t('loadingDashboard')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 lg:space-y-8 transition-colors duration-300 ${isDark ? 'dark' : ''}`} dir={isRTL ? "rtl" : "ltr"}>
      
      {/* ===== Header مع الترحيب الشخصي ===== */}
      <div className={`p-4 lg:p-6 rounded-2xl lg:rounded-[2rem] border shadow-sm transition-colors duration-300 ${
        isDark 
          ? 'bg-gradient-to-br from-gray-800 to-gray-750 border-gray-700' 
          : 'bg-gradient-to-br from-white to-gray-50 border-gray-100'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className={`space-y-2 ${isRTL ? "text-right" : "text-left"}`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-sm ${
                isDark ? 'bg-gradient-to-br from-pink-900/30 to-pink-800/30' : 'bg-gradient-to-br from-pink-100 to-pink-200'
              }`}>
                👋
              </div>
              <div>
                <h1 className={`text-xl lg:text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {greeting[lang]}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black text-white ${roleBadge.color}`}>
                    {roleBadge[lang]}
                  </span>
                  <span className={`text-[10px] font-mono ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                    {user?.email}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className={`flex flex-wrap items-center gap-3 ${isRTL ? "lg:flex-row-reverse" : ""}`}>
            {stats?.lastUpdated && (
              <span className={`text-xs font-bold whitespace-nowrap flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                {t('lastUpdated')}:{" "}
                {new Date(stats.lastUpdated).toLocaleString(isRTL ? "ar-PS" : "en-US", {
                  timeZone: "Asia/Hebron", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                })}
              </span>
            )}
            <button
              onClick={() => window.location.reload()}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                isDark 
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
              }`}
              title={t('refreshData')}
            >
              🔄 <span className="hidden sm:inline">{t('refresh')}</span>
            </button>
            <button
              onClick={toggleLang}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                isDark 
                  ? 'bg-pink-900/30 hover:bg-pink-800/40 text-pink-400' 
                  : 'bg-pink-50 hover:bg-pink-100 text-pink-600'
              }`}
              title={isRTL ? "Switch to English" : "التبديل للعربية"}
            >
              {isRTL ? "EN" : "ع"}
            </button>
          </div>
        </div>
      </div>

      {/* ===== Stats Cards ===== */}
      {cards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {cards.map((card, i) => (
            <div 
              key={i} 
              className={`p-5 lg:p-6 rounded-2xl lg:rounded-[2rem] border shadow-sm hover:shadow-md transition-all group cursor-default relative overflow-hidden ${
                isDark 
                  ? 'bg-gray-800 border-gray-700 hover:border-gray-600' 
                  : 'bg-white border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className={`absolute top-0 ${isRTL ? "left-0" : "right-0"} w-20 h-20 ${card.color} opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity`}></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xl lg:text-2xl group-hover:scale-110 transition-transform">{card.icon}</span>
                  <div className={`w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full ${card.color} shadow-sm`}></div>
                </div>
                <p className={`text-3xl lg:text-4xl font-black tracking-tighter tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {card.value.toLocaleString()}
                </p>
                <p className={`text-[10px] lg:text-xs font-bold uppercase tracking-widest mt-1 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                  {t(card.labelKey)}
                </p>
                <p className={`text-[9px] lg:text-[10px] mt-1 font-medium ${isDark ? 'text-gray-500' : 'text-gray-300'}`}>
                  {t(card.descKey)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== رسالة إذا لم تكن هناك بطاقات متاحة ===== */}
      {cards.length === 0 && stats && (
        <div className={`p-8 rounded-2xl border text-center ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className="text-4xl mb-3">📊</div>
          <p className={`font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {lang === "ar" ? "لا توجد إحصائيات متاحة لعرضها" : "No statistics available to display"}
          </p>
        </div>
      )}

      {/* ===== Quick Actions ===== */}
      {quickActions.length > 0 && (
        <div className={`p-5 lg:p-8 rounded-2xl lg:rounded-[2rem] border shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <h3 className={`text-base lg:text-lg font-black mb-4 lg:mb-6 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <span>🚀</span>
            {t('quickActions')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={action.onClick}
                className={`p-4 lg:p-5 rounded-xl lg:rounded-2xl text-sm font-bold transition-all border flex flex-col items-start gap-3 ${action.color} group ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-gray-200' 
                    : 'bg-gray-50 border-gray-100 text-gray-700'
                }`}
              >
                <span className="text-xl lg:text-2xl group-hover:scale-110 transition-transform">{action.icon}</span>
                <div className={isRTL ? "text-right" : "text-left"}>
                  <p className={`font-black text-sm lg:text-base transition-colors ${isDark ? 'text-white group-hover:text-gray-100' : 'text-gray-900 group-hover:text-gray-900'}`}>
                    {t(action.labelKey)}
                  </p>
                  <p className={`text-[9px] lg:text-[10px] mt-0.5 font-medium ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                    {t(action.descKey)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===== System Status ===== */}
      {systemStatus.length > 0 && (
        <div className={`p-4 lg:p-6 rounded-2xl lg:rounded-[2rem] border shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <h4 className={`text-[10px] font-black uppercase tracking-widest mb-4 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
            {t('systemStatus')}
          </h4>
          <div className="flex flex-wrap gap-4 lg:gap-6">
            {systemStatus.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  item.status === "green" ? "bg-green-500" : "bg-amber-500"
                } ${item.pulse ? "animate-pulse" : ""}`}></span>
                <span className={`font-bold text-xs lg:text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t(item.labelKey)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ✅ رسالة للمستخدمين ذوي الصلاحيات المحدودة */}
      {user?.role === "viewer" && (
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-amber-900/20 border-amber-800' : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-100'}`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div className={isRTL ? "text-right" : "text-left"}>
              <p className={`font-bold text-sm ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                {lang === "ar" ? "وضع العرض فقط" : "View-Only Mode"}
              </p>
              <p className={`text-[10px] mt-1 ${isDark ? 'text-amber-500/80' : 'text-amber-600'}`}>
                {lang === "ar" ? "يمكنك عرض البيانات فقط. لتعديل أي شيء، تواصل مع المدير." : "You can view data only. Contact admin to request edit permissions."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;