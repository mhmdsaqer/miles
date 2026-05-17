// src/pages/admin/AdminLayout.jsx - النسخة المُصححة نهائياً 🌙
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback, useMemo } from "react";
import { adminAuth } from "../../utils/adminAuth";
import { useLang } from "../../context/LanguageContext";
import { useTheme } from "../../context/ThemeContext";

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, toggleLang, t } = useLang();
  const { isDark, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isRTL = lang === "ar";

  // ✅ حماية المسار
  useEffect(() => {
    if (!adminAuth.isAuthenticated()) {
      navigate("/admin/login", { replace: true });
    }
  }, [navigate]);

  // ✅ إغلاق القائمة عند تغيير المسار
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // ✅ منع التمرير عند فتح القائمة
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  if (!adminAuth.isAuthenticated()) return null;

  // ✅ عناصر القائمة
  const navItems = useMemo(() => {
    const items = [
      { path: "/admin/dashboard", label: t('dashboard'), icon: "📊" },
      { path: "/admin/products", label: t('products'), icon: "📦" },
      { path: "/admin/brands", label: t('brands'), icon: "🏷️" },
      { path: "/admin/categories", label: t('categories'), icon: "🗂️" },
      { path: "/admin/orders", label: t('whatsappOrders'), icon: "💬" },
    ];
    
    if (adminAuth.getCurrentUser()?.role === "super_admin") {
      items.push(
        { path: "/admin/users", label: lang === "ar" ? "المستخدمين" : "Users", icon: "👥" },
        { path: "/admin/audit-logs", label: lang === "ar" ? "سجل النشاطات" : "Activity Logs", icon: "📋" }
      );
    }
    
    return items;
  }, [t, lang]);

  // ✅ مكون Toggle Switch للوضع الليلي (قابل لإعادة الاستخدام)
  const ThemeToggle = useCallback(({ isMobile = false }) => (
    <button
      onClick={toggleTheme}
      className={`
        relative w-full flex items-center justify-between px-4 py-3 rounded-xl 
        transition-all duration-300 group
        ${isDark 
          ? 'bg-gray-700/50 hover:bg-gray-700 border border-gray-600' 
          : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
        }
      `}
      title={isDark 
        ? (lang === "ar" ? "تفعيل الوضع النهاري ☀️" : "Switch to Light Mode ☀️") 
        : (lang === "ar" ? "تفعيل الوضع الليلي 🌙" : "Switch to Dark Mode 🌙")
      }
    >
      {/* ✅ أيقونة + نص */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* ✅ أيقونة متحركة */}
        <div className={`
          relative w-8 h-8 rounded-lg flex items-center justify-center 
          transition-all duration-500 transform group-hover:scale-110
          ${isDark 
            ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/25' 
            : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
          }
        `}>
          <span className={`
            text-lg transition-transform duration-500 
            ${isDark ? 'rotate-0' : 'rotate-180'}
          `}>
            {isDark ? "☀️" : "🌙"}
          </span>
          {/* ✅ تأثير وميض خفيف */}
          <span className={`
            absolute inset-0 rounded-lg animate-ping opacity-20
            ${isDark ? 'bg-amber-400' : 'bg-indigo-500'}
          `}></span>
        </div>
        
        {/* ✅ النص */}
        <span className={`
          text-sm font-bold truncate transition-colors
          ${isDark ? 'text-gray-200' : 'text-gray-700'}
        `}>
          {isDark 
            ? (lang === "ar" ? "الوضع النهاري" : "Light Mode") 
            : (lang === "ar" ? "الوضع الليلي" : "Dark Mode")
          }
        </span>
      </div>

      {/* ✅ Toggle Switch أنيق */}
      <div className={`
        relative inline-flex h-6 w-11 items-center rounded-full 
        transition-colors duration-300 flex-shrink-0
        ${isDark ? 'bg-amber-500' : 'bg-gray-300'}
      `}>
        <span className={`
          inline-block h-4 w-4 transform rounded-full bg-white 
          transition-transform duration-300 shadow-sm
          ${isDark 
            ? (isRTL ? 'translate-x-1' : 'translate-x-6') 
            : (isRTL ? 'translate-x-6' : 'translate-x-1')
          }
        `} />
        {/* ✅ مؤشر صغير داخل الـ Toggle */}
        <span className={`
          absolute inset-0 flex items-center justify-center text-[8px] font-black
          transition-opacity duration-300
          ${isDark ? 'text-amber-900 opacity-100' : 'text-gray-500 opacity-0'}
        `}>
          {isRTL ? "ن" : "L"}
        </span>
        <span className={`
          absolute inset-0 flex items-center justify-center text-[8px] font-black
          transition-opacity duration-300
          ${isDark ? 'text-white opacity-0' : 'text-gray-700 opacity-100'}
        `}>
          {isRTL ? "ل" : "D"}
        </span>
      </div>
    </button>
  ), [isDark, isRTL, lang, toggleTheme]);

  return (
    <div 
      className={`min-h-screen transition-colors duration-300 ${isDark ? 'dark bg-gray-900' : 'bg-gray-50'}`}
      dir={isRTL ? "rtl" : "ltr"}
      lang={lang}
    >
      {/* ===== Overlay للموبايل ===== */}
      {sidebarOpen && (
        <div 
          className={`fixed inset-0 z-40 lg:hidden transition-colors duration-300 ${isDark ? 'bg-black/60' : 'bg-black/40'} backdrop-blur-sm`}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ===== Mobile Sidebar (Drawer) ===== */}
      <aside 
        className={`
          fixed top-0 right-0 z-50 h-screen shadow-2xl
          transition-all duration-300 ease-out
          lg:hidden
          w-[85%] max-w-sm
          ${sidebarOpen ? "translate-x-0" : "translate-x-full"}
          ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}
          border-l
        `}
      >
        <div className="flex flex-col h-full p-6">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className={`text-2xl font-black tracking-tighter truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                MILES<span className="text-pink-600">.</span>
              </h2>
              <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 truncate ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                {t('adminPanel')}
              </p>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              aria-label={t('close')}
            >
              <span className={isDark ? 'text-white' : 'text-gray-900'}>✕</span>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all
                    ${isActive 
                      ? "bg-pink-500/10 text-pink-500 border border-pink-500/20" 
                      : `${isDark ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`
                    }
                  `}
                >
                  <span className="text-lg flex-shrink-0">{item.icon}</span>
                  <span className="truncate flex-1">{item.label}</span>
                  {isActive && <span className="w-2 h-2 rounded-full bg-pink-500 flex-shrink-0"></span>}
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className={`mt-auto pt-4 border-t space-y-3 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
            {/* ✅ Toggle Switch للوضع الليلي - موبايل */}
            <ThemeToggle isMobile={true} />

            {/* زر تبديل اللغة */}
            <button
              onClick={toggleLang}
              className={`
                w-full flex items-center justify-between px-4 py-3 rounded-xl 
                transition-all text-sm font-bold
                ${isDark 
                  ? 'bg-gray-700/50 hover:bg-gray-700 border border-gray-600 text-gray-200' 
                  : 'bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700'
                }
              `}
            >
              <span className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
                  <span className="text-sm font-black">{lang === "ar" ? "ع" : "🌍"}</span>
                </div>
                {/* ✅ ✅ ✅ الإصلاح هنا: استخدام isDark بدلاً من dark: */}
                <span className={`truncate ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                  {lang === "ar" ? "English" : "العربية"}
                </span>
              </span>
              <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {lang === "ar" ? "EN" : "AR"}
              </span>
            </button>

            {/* زر تسجيل الخروج */}
            <button
              onClick={() => {
                if (window.confirm(lang === "ar" 
                  ? "⚠️ هل أنت متأكد من تسجيل الخروج؟" 
                  : "⚠️ Are you sure you want to logout?"
                )) {
                  adminAuth.logout();
                }
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-200 dark:hover:border-red-800"
            >
              <span className="flex-shrink-0 text-lg">🚪</span>
              <span className="truncate flex-1">{t('logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ===== Desktop Sidebar ===== */}
      <aside className={`
        hidden lg:flex flex-col
        fixed top-0 h-screen
        ${isRTL ? "right-0 border-l" : "left-0 border-r"}
        w-72 xl:w-80 p-6
        transition-colors duration-300
        ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}
        border-gray-100
      `}>
        {/* Header */}
        <div className="mb-8">
          <h2 className={`text-2xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>
            MILES<span className="text-pink-600">.</span>
          </h2>
          <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
            {t('adminPanel')}
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all
                  ${isActive 
                    ? "bg-pink-500/10 text-pink-500 border border-pink-500/20" 
                    : `${isDark ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`
                  }
                `}
              >
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                <span className="truncate flex-1">{item.label}</span>
                {isActive && (
                  <span className={`w-2 h-2 rounded-full bg-pink-500 flex-shrink-0 ${isRTL ? "mr-auto" : "ml-auto"}`}></span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={`mt-auto pt-4 border-t space-y-3 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
          {/* ✅ Toggle Switch للوضع الليلي - ديسكتوب */}
          <ThemeToggle />

          {/* زر تبديل اللغة - ديسكتوب */}
          <button
            onClick={toggleLang}
            className={`
              w-full flex items-center justify-between px-4 py-3 rounded-xl 
              transition-all text-sm font-bold
              ${isDark 
                ? 'bg-gray-700/50 hover:bg-gray-700 border border-gray-600 text-gray-200' 
                : 'bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700'
              }
            `}
          >
            <span className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
                <span className="text-sm font-black">{lang === "ar" ? "ع" : "🌍"}</span>
              </div>
              {/* ✅ ✅ ✅ ✅ الإصلاح النهائي: استخدام isDark بدلاً من dark: */}
              <span className={`truncate ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                {lang === "ar" ? "English" : "العربية"}
              </span>
            </span>
            <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {lang === "ar" ? "EN" : "AR"}
            </span>
          </button>

          {/* زر تسجيل الخروج */}
          <button
            onClick={() => {
              if (window.confirm(lang === "ar" 
                ? "⚠️ هل أنت متأكد من تسجيل الخروج؟" 
                : "⚠️ Are you sure you want to logout?"
              )) {
                adminAuth.logout();
              }
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-200 dark:hover:border-red-800"
          >
            <span className="flex-shrink-0 text-lg">🚪</span>
            <span className="truncate flex-1">{t('logout')}</span>
          </button>
        </div>
      </aside>

      {/* ===== Main Content ===== */}
      <div className={`
        min-h-screen
        lg:${isRTL ? "mr-72 xl:mr-80" : "ml-72 xl:ml-80"}
        transition-all duration-300
        ${isDark ? 'dark' : ''}
      `}>
        {/* Top Bar (Mobile Only) */}
        <header className={`lg:hidden sticky top-0 z-30 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between transition-colors duration-300 ${
          isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-white/80 border-gray-100'
        }`}>
          <button 
            onClick={() => setSidebarOpen(true)}
            className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            aria-label={t('menu')}
          >
            <svg className={`w-6 h-6 ${isDark ? 'text-white' : 'text-gray-900'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className={`text-lg font-black truncate flex-1 text-center px-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {navItems.find(i => i.path === location.pathname)?.label || t('dashboard')}
          </h1>
          
          {/* ✅ زر الوضع الليلي السريع للموبايل في الـ Header */}
          <button
            onClick={toggleTheme}
            className={`
              p-2 rounded-xl transition-all duration-300
              ${isDark 
                ? 'bg-gray-700 hover:bg-gray-600 text-amber-400' 
                : 'bg-gray-100 hover:bg-gray-200 text-indigo-600'
              }
            `}
            title={isDark 
              ? (lang === "ar" ? "الوضع النهاري ☀️" : "Light Mode ☀️") 
              : (lang === "ar" ? "الوضع الليلي 🌙" : "Dark Mode 🌙")
            }
          >
            <span className={`text-lg transition-transform duration-500 ${isDark ? 'rotate-0' : 'rotate-180'}`}>
              {isDark ? "☀️" : "🌙"}
            </span>
          </button>
        </header>

        {/* Page Content */}
        <main className={`p-4 lg:p-10 overflow-y-auto ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;