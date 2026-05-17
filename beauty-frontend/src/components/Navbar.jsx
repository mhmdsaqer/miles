// src/components/Navbar.jsx - النسخة المُحسَّنة (اختيارية)
import { Link, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useLang } from "../context/LanguageContext";
import { useState, useEffect, useMemo, useCallback } from "react";

const Navbar = () => {
  const { cartItems, cartCount } = useCart();
  const { lang, toggleLang, t } = useLang();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // ✅ حساب إجمالي قيمة السلة - محفوظ بـ useMemo
  const cartTotal = useMemo(() => {
    return cartItems.reduce((total, item) => {
      const price = item.selectedVariant?.price ?? item.price;
      return total + price * item.quantity;
    }, 0);
  }, [cartItems]);

  // ✅ تأثير السكرول للـ Navbar
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ✅ إغلاق القائمة عند تغيير الصفحة
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // ✅ منع التمرير عند فتح القائمة
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [isMobileMenuOpen]);

  // ✅ روابط التنقل مع الترجمة - محفوظة بـ useMemo
  const navLinks = useMemo(() => [
    { name: t('home'), path: "/" },
    { name: t('brands'), path: "/brands" },
    { name: t('shop'), path: "/shop" }
  ], [t]);

  // ✅ دالة إغلاق القائمة - محفوظة بـ useCallback
  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  return (
    <>
      <nav 
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 px-4 md:px-8 py-4 pointer-events-none ${
          isScrolled ? "translate-y-2" : "translate-y-0"
        }`} 
        dir={lang === "ar" ? "rtl" : "ltr"}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className={`max-w-[1400px] mx-auto transition-all duration-500 rounded-[2rem] pointer-events-auto ${
          isScrolled 
            ? "bg-white/80 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white/20 py-3" 
            : "bg-transparent py-5"
        }`}>
          <div className="px-6 md:px-10 flex justify-between items-center">
            
            {/* ===== الجانب الأيمن: أيقونات التحكم ===== */}
            <div className="flex items-center gap-3">
              
              {/* زر القائمة للموبايل */}
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden relative p-2.5 group"
                aria-label={t('menu')}
                aria-expanded={isMobileMenuOpen}
              >
                <div className="absolute inset-0 bg-pink-50 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500"></div>
                <div className="relative z-10 w-6 h-5 flex flex-col justify-center gap-1.5">
                  <span className={`w-full h-0.5 bg-gray-900 rounded-full transition-all duration-300 ${isMobileMenuOpen ? "rotate-45 translate-y-2" : ""}`}></span>
                  <span className={`w-full h-0.5 bg-gray-900 rounded-full transition-all duration-300 ${isMobileMenuOpen ? "opacity-0 scale-0" : ""}`}></span>
                  <span className={`w-full h-0.5 bg-gray-900 rounded-full transition-all duration-300 ${isMobileMenuOpen ? "-rotate-45 -translate-y-2" : ""}`}></span>
                </div>
              </button>

              {/* إجمالي السلة */}
              <div className="flex items-center gap-2 bg-gray-50/80 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-gray-100">
                <span className="text-pink-500 font-black text-lg">₪</span>
                <span className="text-gray-900 font-black text-sm tabular-nums min-w-[45px] text-right">
                  {cartTotal.toFixed(2)}
                </span>
              </div>

              {/* أيقونة السلة */}
              <Link to="/cart" className="relative group p-2.5" aria-label={`${t('cart')} - ${cartCount} ${t('items')}`}>
                <div className="absolute inset-0 bg-pink-50 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500"></div>
                <svg className="h-6 w-6 text-gray-900 relative z-10 transition-colors group-hover:text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-black text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white animate-pulse">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </Link>

              {/* ✅ زر تبديل اللغة - ديسكتوب */}
              <button
                onClick={toggleLang}
                className="hidden md:flex items-center gap-2 bg-gray-50/80 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-gray-100 hover:border-pink-200 transition-all group"
                aria-label={`Switch language to ${lang === "ar" ? "English" : "Arabic"}`}
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 group-hover:text-pink-600">
                  {lang === "ar" ? "EN" : "ع"}
                </span>
                <span className="w-px h-4 bg-gray-200"></span>
                <span className="text-[10px] font-bold text-gray-700">
                  {lang === "ar" ? "English" : "العربية"}
                </span>
              </button>
            </div>

            {/* ===== المنتصف: الروابط (ديسكتوب) ===== */}
            <div className="hidden md:flex items-center gap-10">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-300 hover:text-pink-600 ${
                    location.pathname === link.path ? "text-pink-600" : "text-gray-400"
                  }`}
                  aria-current={location.pathname === link.path ? "page" : undefined}
                >
                  {link.name}
                  {location.pathname === link.path && (
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-pink-600 rounded-full"></span>
                  )}
                </Link>
              ))}
            </div>

            {/* ===== الجانب الأيسر: الشعار ===== */}
            <div className="flex-shrink-0">
              <Link to="/" className="group flex flex-col items-end" aria-label={t('home')}>
                <span className="text-xl md:text-2xl font-black tracking-[-0.05em] text-gray-900 group-hover:text-pink-600 transition-colors duration-500">
                  MILES<span className="text-pink-600 group-hover:text-black">.</span>
                </span>
                <span className="text-[7px] font-bold tracking-[0.4em] text-gray-300 -mt-1 group-hover:text-gray-900 transition-color">
                  BEAUTY STORE
                </span>
              </Link>
            </div>

          </div>
        </div>
      </nav>

      {/* ===== Mobile Menu Overlay ===== */}
      <div 
        className={`fixed inset-0 z-[99] bg-black/40 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeMobileMenu}
        aria-hidden="true"
      />

      {/* ===== Mobile Menu Drawer ===== */}
      <div 
        className={`fixed top-0 right-0 z-[100] w-[85%] max-w-sm h-full bg-white shadow-[0_20px_80px_rgba(0,0,0,0.15)] transition-transform duration-500 ease-out md:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
        dir={lang === "ar" ? "rtl" : "ltr"}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile menu"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <span className="text-lg font-black text-gray-900">{t('menu')}</span>
          <button 
            onClick={closeMobileMenu}
            className="p-2 hover:bg-gray-50 rounded-xl transition-colors"
            aria-label={t('close')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Nav Links */}
        <nav className="p-6 space-y-2">
          {navLinks.map((link, index) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={closeMobileMenu}
              className={`block w-full text-right px-5 py-4 rounded-2xl text-lg font-bold transition-all duration-300 ${
                location.pathname === link.path 
                  ? "bg-gray-900 text-white" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* ✅ Language Toggle in Mobile */}
        <div className="px-6 py-4 border-t border-gray-50">
          <button
            onClick={() => { toggleLang(); closeMobileMenu(); }}
            className="w-full flex items-center justify-between px-5 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="text-sm font-bold text-gray-700">
              {lang === "ar" ? "English" : "العربية"}
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              {lang === "ar" ? "EN" : "ع"}
            </span>
          </button>
        </div>

        {/* Cart Summary in Mobile */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-50 bg-gray-50/50">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-gray-500">{t('cartTotal')}</span>
            <span className="text-2xl font-black text-gray-900 tabular-nums">
              ₪{cartTotal.toFixed(2)}
            </span>
          </div>
          <Link
            to="/cart"
            onClick={closeMobileMenu}
            className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-pink-600 transition-all flex items-center justify-center gap-3"
          >
            {t('viewCart')} ({cartCount})
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>
      </div>
    </>
  );
};

export default Navbar;