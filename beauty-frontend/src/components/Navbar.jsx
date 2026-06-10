// src/components/Navbar.jsx - النسخة المُحسّنة مع padding أنيق ✨
import { Link, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useLang } from "../context/LanguageContext";
import { useState, useEffect, useMemo, useCallback } from "react";

const LOGO_URL = "https://res.cloudinary.com/dvd2u8csu/image/upload/v1780130628/logo_pykvwk.png";

const Navbar = () => {
  const { cartItems, cartCount } = useCart();
  const { lang, toggleLang, t } = useLang();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);

  // ✅ حساب إجمالي قيمة السلة
  const cartTotal = useMemo(() => {
    return cartItems.reduce((total, item) => {
      const price = item.selectedVariant?.price ?? item.price;
      return total + price * item.quantity;
    }, 0);
  }, [cartItems]);

  // ✅ تأثير السكرول
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

  // ✅ روابط التنقل
  const navLinks = useMemo(() => [
    { name: t('home'), path: "/" },
    { name: t('brands'), path: "/brands" },
    { name: t('shop'), path: "/shop" }
  ], [t]);

  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);

  return (
    <>
      <nav 
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 px-3 md:px-5 py-2 pointer-events-none ${
          isScrolled ? "translate-y-2" : "translate-y-0"
        }`} 
        dir={lang === "ar" ? "rtl" : "ltr"}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className={`max-w-[1400px] mx-auto transition-all duration-500 rounded-[2rem] pointer-events-auto ${
          isScrolled 
            ? "bg-white/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-gray-100/50 py-2" 
            : "bg-white/60 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.05)] border border-white/30 py-2.5"
        }`}>
          <div className="px-4 md:px-6 flex justify-between items-center">
            
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
                  <span className={`w-full h-0.5 bg-gray-800 rounded-full transition-all duration-300 ${isMobileMenuOpen ? "rotate-45 translate-y-2" : ""}`}></span>
                  <span className={`w-full h-0.5 bg-gray-800 rounded-full transition-all duration-300 ${isMobileMenuOpen ? "opacity-0 scale-0" : ""}`}></span>
                  <span className={`w-full h-0.5 bg-gray-800 rounded-full transition-all duration-300 ${isMobileMenuOpen ? "-rotate-45 -translate-y-2" : ""}`}></span>
                </div>
              </button>

              {/* إجمالي السلة */}
              <div className="flex items-center gap-2 bg-gradient-to-br from-gray-50 to-gray-100/50 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-gray-200/60 shadow-sm">
                <span className="text-pink-600 font-black text-lg">₪</span>
                <span className="text-gray-900 font-black text-sm tabular-nums min-w-[45px] text-right">
                  {cartTotal.toFixed(2)}
                </span>
              </div>

              {/* أيقونة السلة */}
              <Link to="/cart" className="relative group p-2.5" aria-label={`${t('cart')} - ${cartCount} ${t('items')}`}>
                <div className="absolute inset-0 bg-pink-50 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500"></div>
                <svg className="h-6 w-6 text-gray-800 relative z-10 transition-colors group-hover:text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-pink-600 text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </Link>

              {/* زر تبديل اللغة - ديسكتوب */}
              <button
                onClick={toggleLang}
                className="hidden md:flex items-center gap-2 bg-gradient-to-br from-gray-50 to-gray-100/50 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-gray-200/60 hover:border-pink-300 transition-all group shadow-sm"
                aria-label={`Switch language to ${lang === "ar" ? "English" : "Arabic"}`}
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-600 group-hover:text-pink-600 transition-colors">
                  {lang === "ar" ? "EN" : "ع"}
                </span>
                <span className="w-px h-4 bg-gray-300"></span>
                <span className="text-[10px] font-bold text-gray-700 group-hover:text-gray-900 transition-colors">
                  {lang === "ar" ? "English" : "العربية"}
                </span>
              </button>
            </div>

            {/* ===== المنتصف: الروابط (ديسكتوب) ===== */}
            <div className="hidden md:flex items-center gap-8 lg:gap-12">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`group relative text-base lg:text-lg font-black uppercase tracking-wider transition-all duration-500 hover:scale-110 ${
                    location.pathname === link.path 
                      ? "text-pink-600" 
                      : "text-gray-700 hover:text-pink-600"
                  }`}
                  aria-current={location.pathname === link.path ? "page" : undefined}
                >
                  {/* ✅ النص مع تأثير gradient عند الـ hover */}
                  <span className={`relative z-10 transition-all duration-500 ${
                    location.pathname === link.path 
                      ? "bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent" 
                      : "group-hover:bg-gradient-to-r group-hover:from-pink-600 group-hover:to-purple-600 group-hover:bg-clip-text group-hover:text-transparent"
                  }`}>
                    {link.name}
                  </span>
                  
                  {/* ✅ خط سفلي متحرك إبداعي */}
                  <span className={`absolute -bottom-2 left-0 h-[3px] bg-gradient-to-r from-pink-600 via-purple-500 to-pink-600 rounded-full transition-all duration-500 ${
                    location.pathname === link.path 
                      ? "w-full opacity-100" 
                      : "w-0 opacity-0 group-hover:w-full group-hover:opacity-100"
                  }`}></span>
                  
                  {/* ✅ نقطة مضيئة متحركة عند الـ hover */}
                  <span className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-2 h-2 bg-pink-500 rounded-full shadow-lg shadow-pink-500/50 transition-all duration-500 ${
                    location.pathname === link.path 
                      ? "opacity-100 scale-100 animate-pulse" 
                      : "opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-100"
                  }`}></span>
                  
                  {/* ✅ هالة خلفية ناعمة عند الـ hover */}
                  <span className="absolute inset-0 -mx-4 -my-2 bg-gradient-to-r from-pink-500/0 via-pink-500/5 to-pink-500/0 rounded-2xl scale-0 group-hover:scale-100 transition-transform duration-500 -z-0"></span>
                </Link>
              ))}
            </div>

            {/* ===== الجانب الأيسر: شعار الشركة الفاخر ===== */}
            <div className="flex-shrink-0">
              <Link 
                to="/" 
                className="group relative flex items-center justify-center"
                aria-label={t('home')}
              >
                {/* ✅ حاوية الشعار مع أنيميشن عائم فاخر */}
                <div className="relative z-10 animate-float-luxury">
                  
                  {/* ✅ هالة متوهجة متحركة حول الشعار */}
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-500/30 via-purple-500/30 to-pink-500/30 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 animate-pulse-slow pointer-events-none"></div>
                  
                  {/* ✅ إطار ذهبي ناعم يظهر عند التحويم */}
                  <div className="absolute -inset-2 rounded-full border-2 border-transparent group-hover:border-pink-300/50 transition-all duration-700 opacity-0 group-hover:opacity-100 pointer-events-none"></div>
                  
                  {/* ✅ الشعار - حجم كبير */}
                  <img
                    src={LOGO_URL}
                    alt="Company Logo"
                    className={`
                      relative z-10 
                      h-24 md:h-28 lg:h-32 xl:h-36 
                      w-auto object-contain
                      drop-shadow-[0_10px_30px_rgba(0,0,0,0.15)]
                      transition-all duration-700 ease-out
                      ${logoLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
                      group-hover:drop-shadow-[0_20px_50px_rgba(236,72,153,0.4)]
                      group-hover:scale-105
                    `}
                    onLoad={() => setLogoLoaded(true)}
                    onError={(e) => {
                      console.warn("Failed to load logo");
                      e.target.style.display = 'none';
                    }}
                    loading="eager"
                  />
                  
                  {/* ✅ Loading Spinner أنيق أثناء التحميل */}
                  {!logoLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative">
                        <div className="w-16 h-16 md:w-20 md:h-20 border-2 border-gray-200 border-t-pink-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 border-2 border-pink-200 rounded-full animate-ping opacity-30"></div>
                      </div>
                    </div>
                  )}
                  
                  {/* ✅ نقاط مضيئة تدور حول الشعار */}
                  <div className="absolute -inset-4 pointer-events-none">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-pink-400 rounded-full opacity-0 group-hover:opacity-100 animate-orbit-1"></div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-purple-400 rounded-full opacity-0 group-hover:opacity-100 animate-orbit-2"></div>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1 bg-pink-300 rounded-full opacity-0 group-hover:opacity-100 animate-orbit-3"></div>
                  </div>
                </div>
                
                {/* ✅ تأثير وميض خفيف على الحواف */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none animate-shimmer"></div>
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
        {/* Header - مع الشعار */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <Link to="/" onClick={closeMobileMenu} className="flex items-center gap-3">
            <img
              src={LOGO_URL}
              alt="Logo"
              className="h-8 w-auto object-contain"
              loading="lazy"
              onError={(e) => e.target.style.display = 'none'}
            />
          </Link>
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
                  ? "bg-gradient-to-r from-pink-600 to-pink-500 text-white shadow-lg" 
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              }`}
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Language Toggle in Mobile */}
        <div className="px-6 py-4 border-t border-gray-100">
          <button
            onClick={() => { toggleLang(); closeMobileMenu(); }}
            className="w-full flex items-center justify-between px-5 py-3 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 hover:from-pink-50 hover:to-pink-100/50 border border-gray-200/60 transition-all group"
          >
            <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900">
              {lang === "ar" ? "English" : "العربية"}
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 group-hover:text-pink-600">
              {lang === "ar" ? "EN" : "ع"}
            </span>
          </button>
        </div>

        {/* Cart Summary in Mobile */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-100 bg-gradient-to-br from-gray-50 to-white">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-gray-600">{t('cartTotal')}</span>
            <span className="text-2xl font-black text-gray-900 tabular-nums">
              ₪{cartTotal.toFixed(2)}
            </span>
          </div>
          <Link
            to="/cart"
            onClick={closeMobileMenu}
            className="w-full bg-gradient-to-r from-gray-900 to-gray-800 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:from-pink-600 hover:to-pink-500 transition-all flex items-center justify-center gap-3 shadow-lg"
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
