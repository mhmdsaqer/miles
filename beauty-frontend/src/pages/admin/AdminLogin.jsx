// src/pages/admin/AdminLogin.jsx - النسخة المُحسّنة
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { adminAuth } from "../../utils/adminAuth";
import { useLang } from "../../context/LanguageContext";
import { useTheme } from "../../context/ThemeContext"; // ✅ إضافة جديدة

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // ✅ إضافة جديدة
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { lang } = useLang();
  const { isDark } = useTheme(); // ✅ إضافة جديدة
  
  const isRTL = lang === "ar";

  // ✅ التوجيه إذا كان مسجل دخوله مسبقاً
  useEffect(() => {
    if (adminAuth.isAuthenticated()) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await adminAuth.login(email, password);
      if (result.success) {
        // ✅ إضافة تأثير بسيط قبل التوجيه
        await new Promise(resolve => setTimeout(resolve, 300));
        navigate("/admin/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || (lang === "ar" 
        ? "❌ بيانات غير صحيحة أو السيرفر غير متصل" 
        : "❌ Invalid credentials or server unreachable"));
    } finally {
      setLoading(false);
    }
  }, [email, password, lang, navigate]);

  // ✅ دعم الضغط على Enter
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !loading) {
      handleSubmit(e);
    }
  }, [loading, handleSubmit]);

  return (
    <div 
      className={`min-h-screen flex items-center justify-center p-4 sm:p-6 transition-colors duration-300 ${
        isDark 
          ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
          : 'bg-gradient-to-br from-gray-900 via-gray-800 to-pink-900'
      }`}
      dir={isRTL ? "rtl" : "ltr"}
      lang={lang}
      onKeyDown={handleKeyDown}
    >
      {/* ✅ تأثيرات خلفية جمالية */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/4 ${isRTL ? 'right-1/4' : 'left-1/4'} w-72 h-72 ${isDark ? 'bg-pink-900/20' : 'bg-pink-500/20'} rounded-full blur-[100px] animate-pulse`}></div>
        <div className={`absolute bottom-1/4 ${isRTL ? 'left-1/4' : 'right-1/4'} w-96 h-96 ${isDark ? 'bg-purple-900/20' : 'bg-purple-500/20'} rounded-full blur-[120px] animate-pulse delay-1000`}></div>
      </div>

      {/* ✅ بطاقة تسجيل الدخول */}
      <div className={`relative w-full max-w-md ${
        isDark 
          ? 'bg-gray-800/95 border-gray-700' 
          : 'bg-white/95 border-white/20'
      } backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-8 shadow-2xl border transition-colors duration-300`}>
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>
            MILES <span className="text-pink-500">Admin</span>
          </h1>
          <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {lang === "ar" ? "لوحة التحكم الداخلية" : "Admin Panel"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          
          {/* Email Field */}
          <div>
            <label 
              htmlFor="email"
              className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              {lang === "ar" ? "البريد الإلكتروني" : "Email"}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              className={`w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-500/30 transition-colors ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-pink-500' 
                  : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-pink-300'
              }`}
              placeholder="admin@miles.ps"
              required
              autoComplete="email"
              aria-label={lang === "ar" ? "أدخل بريدك الإلكتروني" : "Enter your email"}
            />
          </div>

          {/* Password Field with Toggle */}
          <div>
            <label 
              htmlFor="password"
              className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              {lang === "ar" ? "كلمة المرور" : "Password"}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                className={`w-full rounded-xl px-4 py-3 pr-12 text-sm outline-none focus:ring-2 focus:ring-pink-500/30 transition-colors ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-pink-500' 
                    : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-pink-300'
                }`}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                aria-label={lang === "ar" ? "أدخل كلمة المرور" : "Enter your password"}
              />
              {/* 👁️ Toggle Password Visibility */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors ${
                  isDark 
                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-600' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
                aria-label={showPassword 
                  ? (lang === "ar" ? "إخفاء كلمة المرور" : "Hide password") 
                  : (lang === "ar" ? "إظهار كلمة المرور" : "Show password")}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error Message - Improved */}
          {error && (
            <div 
              className={`flex items-center gap-3 p-3 rounded-xl text-xs font-bold transition-all ${
                isDark 
                  ? 'bg-red-900/30 text-red-300 border border-red-800' 
                  : 'bg-red-50 text-red-600 border border-red-100'
              }`}
              role="alert"
              aria-live="polite"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !email || !password}
            className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              loading || !email || !password
                ? (isDark ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed')
                : (isDark 
                    ? 'bg-gray-700 text-white hover:bg-pink-600 shadow-lg hover:shadow-pink-500/25' 
                    : 'bg-gray-900 text-white hover:bg-pink-600 shadow-lg hover:shadow-pink-500/25')
            }`}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <span>{lang === "ar" ? "جاري الدخول..." : "Signing in..."}</span>
              </>
            ) : (
              <>
                <span>{lang === "ar" ? "دخول" : "Sign In"}</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* ✅ Footer Links (اختياري - إذا كان الـ Backend يدعمها) */}
        <div className={`mt-6 pt-6 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'} text-center`}>
          {/* <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {lang === "ar" ? "هل نسيت كلمة المرور؟" : "Forgot password?"}{" "}
            <button className="text-pink-500 hover:text-pink-400 font-bold hover:underline">
              {lang === "ar" ? "استعادة" : "Reset"}
            </button>
          </p> */}
        </div>

        {/* ✅ Security Badge */}
        <div className={`mt-4 flex items-center justify-center gap-2 text-[9px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          <span>{lang === "ar" ? "اتصال آمن ومشفّر" : "Secure & Encrypted Connection"}</span>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;