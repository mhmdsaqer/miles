// src/pages/Cart.jsx
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useLang } from "../context/LanguageContext";
import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { getImageUrl } from "../utils/imageUtils";

const Cart = () => {
  const { cartItems, removeFromCart, updateQuantity, cartCount, cartTotal } = useCart();
  const { lang, t } = useLang();
  const navigate = useNavigate();
  const [removingId, setRemovingId] = useState(null);
  const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000";


  const total = useMemo(() => cartTotal, [cartTotal]);

  const handleRemove = (id, variantId) => {
    const key = `${id}-${variantId}`;
    setRemovingId(key);
    const item = cartItems.find(i => i.id === id && i.selectedVariant?.id === variantId);
    const prodName = item ? (item[lang === "ar" ? "name_ar" : "name_en"] || item.name_ar) : t("product");
    setTimeout(() => {
      removeFromCart(id, variantId);
      setRemovingId(null);
      toast.info(
        <div className="flex items-center gap-2">
          <span className="text-lg">🗑️</span>
          <div>
            <p className="font-bold text-gray-900 text-sm">{t("removedFromCart")}</p>
            <p className="text-xs text-gray-500 truncate max-w-[200px]">{prodName}</p>
          </div>
        </div>,
        { duration: 3000 }
      );
    }, 400);
  };

  if (cartItems.length === 0) { /* ... (نفس كود الحالة الفارغة) ... */ return ( <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center" dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}><div className="text-center space-y-10 px-6 animate-fadeIn"><div className="relative inline-flex items-center justify-center w-40 h-40 mx-auto"><div className="absolute inset-0 bg-pink-50 rounded-full animate-ping opacity-20"></div><div className="absolute inset-4 bg-pink-50 rounded-full"></div><svg className="w-16 h-16 text-pink-300 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg></div><div className="space-y-3"><h1 className="text-4xl font-black text-gray-900 tracking-tighter">{t('emptyCart')}</h1><p className="text-gray-400 text-sm font-medium max-w-xs mx-auto leading-relaxed">{lang === "ar" ? "لم تضف أي منتجات بعد. اكتشف مجموعتنا الفاخرة واختر ما يناسبك." : "You haven't added any products yet. Explore our luxury collection and find what suits you."}</p></div><Link to="/shop" className={`inline-flex items-center gap-4 bg-gray-900 text-white px-10 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-pink-600 transition-all duration-500 shadow-[0_20px_60px_rgba(0,0,0,0.15)] hover:shadow-[0_20px_60px_rgba(236,72,153,0.3)] ${lang === "ar" ? "flex-row" : "flex-row-reverse"}`}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={lang === "en" ? "rotate-180" : ""}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>{t('continueShopping')}</Link></div></div> ); }

  return (
    <div className={`min-h-screen bg-[#FDFDFD] pt-32 pb-20 ${lang === "ar" ? "font-arabic" : "font-latin"}`} dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="mb-14 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-50 pb-10">
          <div className={`space-y-2 ${lang === "ar" ? "text-right" : "text-left"}`}>
            <nav className={`flex items-center gap-2 text-[10px] font-bold text-pink-500 uppercase tracking-[0.2em] ${lang === "ar" ? "flex-row" : "flex-row-reverse"}`} aria-label="Breadcrumb">
              <Link to="/shop" className="hover:text-black transition-colors">{t('shop')}</Link>
              <span className="text-gray-200" aria-hidden="true">/</span>
              <span className="text-gray-900" aria-current="page">{t('yourCart')}</span>
            </nav>
            <h1 className="text-5xl font-black text-gray-900 tracking-tighter">{t('yourCart')}<span className="text-pink-500 mx-2 md:mr-3 md:ml-0 text-3xl" aria-label={`عدد المنتجات: ${cartCount}`}>({cartCount})</span></h1>
          </div>
          <Link to="/shop" className={`group flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-all ${lang === "ar" ? "flex-row-reverse" : ""}`}>
            <span className={`w-9 h-9 rounded-full border border-gray-100 flex items-center justify-center group-hover:bg-black group-hover:text-white group-hover:border-black transition-all ${lang === "en" ? "rotate-180" : ""}`} aria-hidden="true">←</span>{t('continueShopping')}
          </Link>
        </div>
        <div className="flex flex-col lg:flex-row gap-12 items-start">
          <div className="flex-1 space-y-4" role="list" aria-label={t('cartItems')}>
            {cartItems.map((item, index) => {
              const price = item.selectedVariant?.price ?? item.price;
              const img = item.selectedVariant?.image ? getImageUrl(item.selectedVariant.image) : getImageUrl(item.image);
              const itemKey = `${item.id}-${item.selectedVariant?.id}`;
              const isRemoving = removingId === itemKey;
              const productName = item[lang === "ar" ? "name_ar" : "name_en"] || item.name_ar;
              return (
                <article key={itemKey} role="listitem" className={`group flex gap-6 bg-white rounded-[2.5rem] p-6 border border-gray-50 transition-all duration-500 ${isRemoving ? "opacity-0 scale-95 -translate-x-8" : "opacity-100 scale-100 translate-x-0"} hover:shadow-[0_20px_60px_rgba(0,0,0,0.06)] hover:border-gray-100`} style={{ transitionDelay: `${index * 30}ms` }}>
                  <Link to={`/product/${item.id}`} className="shrink-0" aria-label={`عرض تفاصيل ${productName}`}>
                    <div className="w-28 h-28 md:w-36 md:h-36 bg-[#F8F8F8] rounded-[1.8rem] overflow-hidden flex items-center justify-center p-3 hover:bg-[#F0F0F0] transition-colors">
                      <img src={img} alt={productName} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
                    </div>
                  </Link>
                  <div className={`flex-1 flex flex-col justify-between ${lang === "ar" ? "text-right" : "text-left"}`}>
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-pink-500 uppercase tracking-[0.3em]">{item.brand_name}</span>
                      <Link to={`/product/${item.id}`} className="block"><h3 className="font-bold text-gray-900 text-base leading-snug hover:text-pink-600 transition-colors">{productName}</h3></Link>
                          {item.selectedVariant && (
                            <div className={`flex flex-wrap gap-2 ${lang === "ar" ? "justify-end" : "justify-start"} mt-2`}>
                              {(() => {
                                const attrs = item.selectedVariant.attributes;
                                const entries = Array.isArray(attrs)
                                  ? attrs.filter(a => a?.key?.trim()).map(a => [a.key, a.value])
                                  : Object.entries(attrs || {});
                                
                                return entries.slice(0, 2).map(([key, val]) => (
                                  <span key={key} className="text-[9px] font-bold bg-gray-50 text-gray-500 px-3 py-1 rounded-full border border-gray-100">
                                    {String(val)}
                                  </span>
                                ));
                              })()}
                            </div>
                          )}
                    </div>
                    <div className="flex items-center justify-between mt-4 gap-4 flex-wrap">
                      <div className={lang === "ar" ? "text-right" : "text-left"}>
                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">{t('price')}</p>
                        <p className="text-2xl font-black text-gray-900 tracking-tighter" aria-label={`${t('totalPrice')}: ${(price * item.quantity).toFixed(2)}`}><span className="text-base" aria-hidden="true">₪</span>{(price * item.quantity).toFixed(2)}</p>
                        {item.quantity > 1 && <p className="text-[10px] text-gray-300 font-medium">₪{price} × {item.quantity}</p>}
                      </div>
                      <div className={`flex items-center gap-4 ${lang === "ar" ? "flex-row" : "flex-row-reverse"}`}>
                        <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-3 py-2 border border-gray-100" role="group" aria-label={t('quantity')}>
                          <button
                            onClick={() => {
                              const newQty = item.quantity - 1;
                              updateQuantity(item.id, item.selectedVariant?.id, newQty);
                              if (newQty < item.quantity) toast.info(`📦 ${productName}: ${newQty} ${t("item")}`, { duration: 2000 });
                            }}
                            disabled={item.quantity <= 1}
                            className="w-7 h-7 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-900 font-black text-sm hover:bg-pink-50 hover:border-pink-100 hover:text-pink-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                          ><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14" /></svg></button>
                          <span className="w-8 text-center text-sm font-black text-gray-900" aria-live="polite">{item.quantity}</span>
                          <button
                            onClick={() => {
                              const newQty = item.quantity + 1;
                              updateQuantity(item.id, item.selectedVariant?.id, newQty);
                              toast.success(`🛒 ${productName}: ${newQty} ${t("items")}`, { duration: 2000 });
                            }}
                            className="w-7 h-7 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-900 font-black text-sm hover:bg-pink-50 hover:border-pink-100 hover:text-pink-600 transition-all shadow-sm"
                          ><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg></button>
                        </div>
                        <button onClick={() => handleRemove(item.id, item.selectedVariant?.id)} className="w-9 h-9 rounded-2xl flex items-center justify-center text-gray-200 hover:text-red-400 hover:bg-red-50 transition-all border border-gray-100 hover:border-red-100" title={t('remove')} aria-label={`${t('remove')} ${productName} ${t('fromCart')}`}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg></button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <aside className="w-full lg:w-[380px] shrink-0 lg:sticky lg:top-40" aria-label={t('orderSummary')}>
            <div className="bg-white rounded-[2.5rem] border border-gray-50 overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.05)]">
              <div className="bg-gray-900 px-8 py-7 text-right"><p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.4em] mb-1">{t('summary')}</p><h2 className="text-2xl font-black text-white tracking-tighter">{t('yourOrder')}</h2></div>
              <div className="px-8 py-6 space-y-4 max-h-64 overflow-y-auto scrollbar-hide">
                {cartItems.map((item) => { const price = item.selectedVariant?.price ?? item.price; const productName = item[lang === "ar" ? "name_ar" : "name_en"] || item.name_ar; return (<div key={`${item.id}-${item.selectedVariant?.id}`} className={`flex justify-between items-center ${lang === "ar" ? "text-right" : "text-left"}`}><span className="text-base font-black text-gray-900 tabular-nums">₪{(price * item.quantity).toFixed(2)}</span><div className={`${lang === "ar" ? "text-left" : "text-right"} max-w-[180px]`}><p className="text-xs font-bold text-gray-700 truncate">{productName}</p><p className="text-[9px] text-gray-300 font-medium">× {item.quantity}</p></div></div>); })}
              </div>
              <div className="mx-8 border-t border-dashed border-gray-100" role="separator"></div>
              <div className="px-8 py-6 space-y-3"><div className={`flex justify-between items-center ${lang === "ar" ? "" : "flex-row-reverse"}`}><span className="text-lg font-black text-gray-900 tabular-nums">₪{total.toFixed(2)}</span><span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('subtotal')}</span></div></div>
              <div className="mx-8 border-t border-gray-50" role="separator"></div>
              <div className="px-8 py-6"><div className={`flex justify-between items-baseline ${lang === "ar" ? "" : "flex-row-reverse"}`}><div className={lang === "ar" ? "text-left" : "text-right"}><span className="text-3xl font-black text-gray-900 tracking-tighter tabular-nums"><span className="text-xl" aria-hidden="true">₪</span>{total.toFixed(2)}</span><p className="text-[9px] text-gray-300 font-bold uppercase tracking-widest mt-1">{t('taxIncluded')}</p></div><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('total')}</span></div></div>
              <div className="px-8 pb-8 space-y-3">
                <button onClick={() => navigate("/checkout")} className={`group w-full bg-gray-900 text-white py-6 rounded-[1.8rem] font-black text-sm uppercase tracking-[0.15em] transition-all hover:bg-pink-600 shadow-[0_20px_60px_rgba(0,0,0,0.2)] hover:shadow-[0_20px_60px_rgba(236,72,153,0.35)] flex items-center justify-center gap-4 active:scale-95 ${lang === "ar" ? "flex-row" : "flex-row-reverse"}`} aria-label={t('proceedToCheckout')}><span>{t('checkout')}</span><div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center group-hover:rotate-12 transition-transform" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={lang === "en" ? "rotate-180" : ""}><path d="M5 12h14M12 5l7 7-7 7" /></svg></div></button>
                <Link to="/shop" className={`flex items-center justify-center gap-2 w-full py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black transition-colors ${lang === "ar" ? "flex-row-reverse" : ""}`}>{lang === "ar" ? "←" : "→"} {t('continueShopping')}</Link>
              </div>
              <div className="border-t border-gray-50 px-8 py-5"><div className="grid grid-cols-3 gap-2 text-center">{[{ icon: "🔒", label: t('cashOnDelivery') }, { icon: "🚚", label: t('shippingAvailable') }, { icon: "↩️", label: t('freeReturns') }].map((badge) => (<div key={badge.label} className="flex flex-col items-center gap-1"><span className="text-lg" aria-hidden="true">{badge.icon}</span><span className="text-[8px] font-black text-gray-300 uppercase tracking-wide">{badge.label}</span></div>))}</div></div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
export default Cart;
