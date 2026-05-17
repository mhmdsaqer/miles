// src/pages/Checkout.jsx - النسخة النهائية مع إصلاحات كاملة
import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import axios from "axios"; // ✅ استيراد axios لإرسال الطلب للـ Backend
import { useCart } from "../context/CartContext";
import { useLang } from "../context/LanguageContext";

// ===== إعدادات النظام =====
const WHATSAPP_NUMBER = "970595761050";
const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000";

// ✅ دالة مساعدة عادية (ليست هوك) - يمكن تعريفها خارج المكون
const extractSkuFromImage = (imagePath) => {
  if (!imagePath) return null;
  const fileName = imagePath.split('/').pop();
  return fileName?.replace(/\.(png|jpg|jpeg|webp|gif)$/i, '').toUpperCase() || null;
};

// ✅ دالة عادية لعرض خصائص المتغير (ليست هوك)
const getVariantText = (attributes) => {
  if (!attributes) return "";
  if (Array.isArray(attributes)) {
    return attributes
      .filter(attr => attr?.key?.trim())
      .map(attr => String(attr.value ?? ""))
      .slice(0, 2)
      .join(" / ");
  }
  return Object.entries(attributes)
    .map(([_, value]) => String(value))
    .slice(0, 2)
    .join(" / ");
};

// مناطق التوصيل والأسعار
const DELIVERY_ZONES = [
  { id: "nablus", name: { ar: "نابلس", en: "Nablus" }, fee: 20 },
  { id: "ramallah", name: { ar: "رام الله والبيرة", en: "Ramallah & Al-Bireh" }, fee: 20 },
  { id: "jenin", name: { ar: "جنين", en: "Jenin" }, fee: 25 },
  { id: "tulkarm", name: { ar: "طولكرم", en: "Tulkarm" }, fee: 25 },
  { id: "qalqilya", name: { ar: "قلقيلية", en: "Qalqilya" }, fee: 25 },
  { id: "salfit", name: { ar: "سلفيت", en: "Salfit" }, fee: 25 },
  { id: "tubas", name: { ar: "طوباس والأغوار", en: "Tubas & Jordan Valley" }, fee: 30 },
  { id: "jericho", name: { ar: "أريحا", en: "Jericho" }, fee: 30 },
  { id: "bethlehem", name: { ar: "بيت لحم", en: "Bethlehem" }, fee: 30 },
  { id: "hebron", name: { ar: "الخليل", en: "Hebron" }, fee: 30 },
  { id: "jerusalem", name: { ar: "القدس", en: "Jerusalem" }, fee: 35 },
  { id: "inside48", name: { ar: "الداخل المحتل (48)", en: "Inside 1948 Territories" }, fee: 40 },
];

// ✅ مخطط التحقق بـ Zod (دالة عادية)
const createCheckoutSchema = (lang) => z.object({
  fullName: z.string().min(2, lang === "ar" ? "الاسم يجب أن يكون حرفين على الأقل" : "Name must be at least 2 characters"),
  phone: z.string().regex(/^05[6-9]\d{7}$/, lang === "ar" ? "رقم هاتف فلسطيني صحيح (059xxxxxxx)" : "Valid Palestinian phone (059xxxxxxx)"),
  altPhone: z.string().regex(/^05[6-9]\d{7}$/, lang === "ar" ? "رقم هاتف فلسطيني صحيح" : "Valid phone").optional().or(z.literal("")),
  email: z.string().email(lang === "ar" ? "بريد إلكتروني غير صحيح" : "Invalid email").optional().or(z.literal("")),
  city: z.string().min(1, lang === "ar" ? "يرجى اختيار المدينة" : "Please select a city"),
  address: z.string()
    .min(15, lang === "ar" 
      ? "العنوان يجب أن يكون 15 حرفاً على الأقل" 
      : "Address must be at least 15 characters")
    .max(500, lang === "ar" 
      ? "العنوان طويل جداً" 
      : "Address is too long"),
  notes: z.string().max(500).optional(),
  paymentMethod: z.enum(["cod", "electronic"], { 
    errorMap: () => ({ message: lang === "ar" ? "يرجى اختيار طريقة الدفع" : "Please select a payment method" }) 
  })
});

// ✅ المكون الرئيسي - جميع الـ Hooks يجب أن تكون داخله
const Checkout = () => {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { lang, t } = useLang();
  const navigate = useNavigate();
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [formValues, setFormValues] = useState({});

  // ✅ دالة معالجة مسار الصورة (داخل المكون - هوك)
  const getImageUrl = useCallback((imagePath) => {
    if (!imagePath) return "";
    const cleanPath = imagePath.replace(/^assets\//i, "");
    return `${API_URL}/assets/${cleanPath}`;
  }, []);

  // ✅ إعداد الـ Form
  const schema = useMemo(() => createCheckoutSchema(lang), [lang]);
  const {
    register,
    handleSubmit: handleFormSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
    reset
  } = useForm({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      fullName: "", phone: "", altPhone: "", email: "",
      city: "", address: "", notes: "", paymentMethod: "cod"
    }
  });

  // ✅ مراقبة تغييرات النموذج
  useEffect(() => {
    const subscription = watch((value) => setFormValues({ ...value }));
    return () => subscription.unsubscribe();
  }, [watch]);

  // ✅ حساب رسوم التوصيل
  useEffect(() => {
    if (formValues.city) {
      const zone = DELIVERY_ZONES.find((z) => z.id === formValues.city);
      setDeliveryFee(zone ? zone.fee : 0);
    } else {
      setDeliveryFee(0);
    }
  }, [formValues.city]);

  // ✅ ✅ إصلاح: نقل شرط التوجيه الفارغ للسلة إلى useEffect (بدلاً من الـ Render المباشر)
  useEffect(() => {
    if (cartItems.length === 0 && !orderSuccess) {
      navigate("/cart", { replace: true });
    }
  }, [cartItems.length, orderSuccess, navigate]);

  // ✅ معالجة طريقة الدفع
  const handlePaymentMethodChange = useCallback((method) => {
    if (method === "electronic") {
      toast.warning(
        <div className="flex items-center gap-2">
          <span>💳</span>
          <p className="font-medium">{lang === "ar" ? "قيد التطوير حالياً، يرجى اختيار الدفع عند الاستلام." : "Under development. Please select Cash on Delivery."}</p>
        </div>,
        { duration: 3500 }
      );
      return;
    }
    setValue("paymentMethod", method, { shouldValidate: true });
  }, [lang, setValue]);

  // ✅ دوال المساعدة (داخل المكون - هوكس)
  const getProductName = useCallback((item) => 
    item[lang === "ar" ? "name_ar" : "name_en"] || item.name_ar, 
  [lang]);

  // ✅ دالة جلب SKU - مُصححة (داخل المكون)
  const getProductSku = useCallback((item) => {
    // 1️⃣ أولوية: SKU المتغير
    if (item.selectedVariant?.sku) {
      return item.selectedVariant.sku.toUpperCase();
    }
    // 2️⃣ ثانيًا: SKU المنتج
    if (item.sku) {
      return item.sku.toUpperCase();
    }
    // 3️⃣ fallback: استخراج من الصورة
    return extractSkuFromImage(item.selectedVariant?.image || item.image) || 'N/A';
  }, []);

  // ✅ تنسيق رسالة الواتساب
  const whatsappMessage = useMemo(() => {
    const { fullName, phone, city, address, notes, paymentMethod, altPhone, email } = formValues;
    const cityName = DELIVERY_ZONES.find(z => z.id === city)?.name[lang] || city;
    const isAr = lang === "ar";
    
    let message = isAr ? `🛍️ *طلب جديد من MILES Beauty*\n` : `🛍️ *New Order from MILES Beauty*\n`;
    message += isAr ? `👤 *معلومات العميل:*\n` : `👤 *Customer Info:*\n`;
    message += isAr ? `الاسم: ${fullName}\nالهاتف: ${phone}\n` : `Name: ${fullName}\nPhone: ${phone}\n`;
    if (altPhone) message += isAr ? `هاتف بديل: ${altPhone}\n` : `Alt. Phone: ${altPhone}\n`;
    if (email) message += isAr ? `البريد: ${email}\n` : `Email: ${email}\n`;
    message += isAr 
      ? `📍 *عنوان التوصيل:* ${address}\n` 
      : `📍 *Delivery Address:* ${address}\n`;
    if (notes) message += isAr ? `ملاحظات: ${notes}\n` : `Notes: ${notes}\n`;
    
    message += `\n${isAr ? '📦 *تفاصيل الطلب:*\n' : '📦 *Order Details:*\n'}`;
    
    cartItems.forEach((item, index) => {
      const price = item.selectedVariant?.price ?? item.price;
      const productName = getProductName(item);
      const sku = getProductSku(item);
      const skuText = sku && sku !== 'N/A' ? ` [SKU: ${sku}]` : '';
      const variantInfo = item.selectedVariant && item.selectedVariant.attributes
        ? ` | ${getVariantText(item.selectedVariant.attributes)}`
        : '';
        
      message += `${index + 1}. ${productName}${skuText}${variantInfo}\n`;
      message += isAr 
        ? `   الكمية: ${item.quantity} × ₪${price} = ₪${(price * item.quantity).toFixed(2)}\n`
        : `   Qty: ${item.quantity} × ₪${price} = ₪${(price * item.quantity).toFixed(2)}\n`;
    });
    
    const grandTotal = cartTotal + deliveryFee;
    message += `\n${isAr ? '💰 *الملخص المالي:*\n' : '💰 *Payment Summary:*\n'}`;
    message += isAr 
      ? `المجموع الفرعي: ₪${cartTotal.toFixed(2)}\nرسوم التوصيل: ₪${deliveryFee.toFixed(2)}\n*الإجمالي النهائي: ₪${grandTotal.toFixed(2)}*\n`
      : `Subtotal: ₪${cartTotal.toFixed(2)}\nDelivery Fee: ₪${deliveryFee.toFixed(2)}\n*Grand Total: ₪${grandTotal.toFixed(2)}*\n`;
    
    const paymentText = paymentMethod === "cod" 
      ? (isAr ? "نقداً عند الاستلام" : "Cash on Delivery")
      : (isAr ? "إلكتروني (قيد التطوير)" : "Electronic (Under Development)");
    
    message += `\n${isAr ? '💳 *طريقة الدفع:*' : '💳 *Payment Method:*'} ${paymentText}\n📅 ${new Date().toLocaleString(lang === "ar" ? "ar-PS" : "en-US", { timeZone: "Asia/Hebron" })}`;
    
    return encodeURIComponent(message);
  }, [formValues, cartItems, cartTotal, deliveryFee, lang, getProductName, getProductSku]);

  // ✅ الإجمالي النهائي
  const grandTotal = useMemo(() => cartTotal + deliveryFee, [cartTotal, deliveryFee]);

// ✅ دالة إرسال الطلب - النسخة النهائية (بدون localStorage)
    const onSubmit = useCallback(async (data) => {
      setIsSubmitting(true);
      try {
        const orderId = Date.now();
        const orderItems = cartItems.map(item => ({
          name: getProductName(item),
          sku: getProductSku(item) || 'N/A',
          variant: item.selectedVariant ? getVariantText(item.selectedVariant.attributes) : '',
          qty: item.quantity,
          price: item.selectedVariant?.price ?? item.price
        }));
        
        const newOrder = {
          id: orderId,
          receivedAt: new Date().toISOString(),
          fullName: data.fullName,
          phone: data.phone,
          altPhone: data.altPhone || '',
          email: data.email || '',
          city: data.city,
          address: data.address,
          notes: data.notes || '',
          paymentMethod: data.paymentMethod,
          items: orderItems,
          subtotal: cartTotal,
          deliveryFee: deliveryFee,
          total: grandTotal,
          status: "pending",
          adminNotes: ""
        };
        
      // ✅ ✅ ✅ إرسال الطلب للـ Backend (الـ endpoint العام)
        try {
          await axios.post(`${API_URL}/api/orders`, newOrder, {
            timeout: 5000
          });
          console.log("✅ Order saved to MongoDB with real-time notification");
        } catch (err) {
          // ⚠️ لا نوقف العملية إذا فشل الإرسال للسيرفر
          console.warn("⚠️ Failed to save order to backend:", err.message);
          toast.warning(
            lang === "ar" 
              ? "⚠️ فشل الاتصال بالسيرفر، لكن سيتم إرسال تفاصيل طلبك عبر الواتساب" 
              : "⚠️ Server connection failed, but order details will be sent via WhatsApp"
          );
        }
        
        // فتح الواتساب
        const whatsappURL = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`;
        const whatsappWindow = window.open(whatsappURL, "_blank");
        
        toast.success(
          <div className="space-y-1">
            <p className="font-bold text-lg">{t("orderReceived")}</p>
            <p className="text-sm text-gray-500">{lang === "ar" ? "جاري تحويلك للواتساب لإكمال الطلب..." : "Redirecting to WhatsApp to complete order..."}</p>
          </div>,
          { duration: 4500 }
        );
        
        setTimeout(() => {
          clearCart();
          setOrderSuccess(true);
          reset();
        }, 1200);
        
        if (!whatsappWindow || whatsappWindow.closed || typeof whatsappWindow.closed === 'undefined') {
          toast.warning(lang === "ar" 
            ? "⚠️ لم يفتح الواتساب. يرجى السماح بالنوافذ المنبثقة وإعادة المحاولة." 
            : "⚠️ WhatsApp didn't open. Please allow pop-ups."
          );
        }
      } catch (err) {
        console.error("❌ Checkout Error:", err);
        toast.error(<p className="font-medium">{lang === "ar" ? "❌ حدث خطأ أثناء الإرسال. يرجى التحقق من البيانات." : "❌ Error sending order. Please verify data."}</p>, { duration: 5000 });
      } finally {
        setIsSubmitting(false);
      }
    }, [formValues, cartItems, cartTotal, deliveryFee, grandTotal, clearCart, lang, reset, whatsappMessage, getProductName, getProductSku, t]);

  // ===== Order Success State =====
  if (orderSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFDFD] pt-32 px-6 animate-fadeIn" dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
        <div className={`text-center space-y-6 max-w-md ${lang === "ar" ? "" : "text-left"}`}>
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter">{t('orderReceived')}</h1>
          <p className="text-gray-500 font-medium">
            {formValues.paymentMethod === "cod" 
              ? (lang === "ar" ? "سيتم التواصل معك لتأكيد الطلب وترتيب الشحن." : "We will contact you to confirm your order.")
              : (lang === "ar" ? "سيتم التواصل معك قريباً." : "We will contact you shortly.")
            }
          </p>
          <p className="text-sm text-pink-600 font-bold">
            📱 {lang === "ar" ? "تم تحويلك للواتساب لإرسال تفاصيل طلبك" : "Redirected to WhatsApp"}
          </p>
          <button 
            onClick={() => navigate("/shop")} 
            className="mt-6 bg-gray-900 text-white px-8 py-4 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-pink-600 transition-all"
          >
            {t('continueShopping')}
          </button>
        </div>
      </div>
    );
  }

  // ===== Checkout Form =====
  return (
    <div className={`min-h-screen bg-[#FDFDFD] pt-32 pb-20 ${lang === "ar" ? "font-arabic" : "font-latin"} animate-fadeIn`} dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className={`mb-12 ${lang === "ar" ? "text-right" : "text-left"}`}>
          <nav className={`flex items-center gap-2 text-[10px] font-bold text-pink-500 uppercase tracking-[0.2em] mb-4 ${lang === "ar" ? "flex-row" : "flex-row-reverse"}`}>
            <button onClick={() => navigate("/cart")} className="hover:text-black transition-colors">{t('cart')}</button>
            <span className="text-gray-200">/</span>
            <span className="text-gray-900">{t('checkout')}</span>
          </nav>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter">{t('checkout')}</h1>
        </div>

        {/* ✅ نموذج محسّن */}
        <form onSubmit={handleFormSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* ===== Right Column: Forms ===== */}
          <div className={`space-y-8 ${lang === "ar" ? "" : "lg:order-2"}`}>
            {/* Contact Info */}
            <section className="bg-white rounded-[2.5rem] p-8 border border-gray-50 shadow-sm space-y-6">
              <h2 className={`text-lg font-black text-gray-900 flex items-center gap-3 ${lang === "ar" ? "" : "flex-row-reverse"}`}>
                <span className="w-1.5 h-6 bg-pink-500 rounded-full"></span>
                {t('contactInfo')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <InputWithValidation label={t('fullName')} name="fullName" type="text" register={register} error={errors.fullName} lang={lang} />
                <InputWithValidation label={t('phone')} name="phone" type="tel" register={register} error={errors.phone} lang={lang} />
                <InputWithValidation label={t('altPhone')} name="altPhone" type="tel" register={register} error={errors.altPhone} lang={lang} />
                <InputWithValidation label={t('email')} name="email" type="email" register={register} error={errors.email} lang={lang} />
              </div>
            </section>

            {/* Shipping Info */}
            <section className="bg-white rounded-[2.5rem] p-8 border border-gray-50 shadow-sm space-y-6">
              <h2 id="shipping-heading" className={`text-lg font-black text-gray-900 flex items-center gap-3 ${lang === "ar" ? "" : "flex-row-reverse"}`}>
                <span className="w-1.5 h-6 bg-pink-500 rounded-full"></span>
                {t('shippingAddress')}
              </h2>
              <div className="space-y-5">
                <div>
                  <label htmlFor="city" className={`block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 ${lang === "ar" ? "" : "text-left"}`}>
                    {t('selectCity')} *
                  </label>
                  <select
                    id="city" {...register("city")}
                    className={`w-full appearance-none bg-gray-50 border rounded-xl px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-pink-500/20 outline-none cursor-pointer ${
                      errors.city ? "border-red-300 bg-red-50" : "border-gray-100"
                    }`}
                  >
                    <option value="">{lang === "ar" ? "اختر المدينة..." : "Select city..."}</option>
                    {DELIVERY_ZONES.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name[lang]} (₪{zone.fee})
                      </option>
                    ))}
                  </select>
                  {errors.city && (
                    <p className="mt-1 text-[10px] text-red-500 font-medium flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                      </svg>
                      {errors.city.message}
                    </p>
                  )}
                </div>
                <TextareaWithValidation
                  label={t('detailedAddress')} 
                  name="address"
                  register={register} 
                  error={errors.address} 
                  rows="3"
                  placeholder={lang === "ar" 
                    ? "اكتبي العنوان بالتفصيل أو قرب معلم مميز (مثال: قرب مسجد الرحمن، بجانب مول المدينة)" 
                    : "Enter detailed address or near a landmark (e.g., Near Al-Rahman Mosque, Next to City Mall)"}
                  lang={lang}
                />
                <TextareaWithValidation
                  label={t('additionalNotes')} name="notes"
                  register={register} error={errors.notes} rows="2"
                  placeholder={lang === "ar" ? "أي تعليمات خاصة للتوصيل..." : "Any special delivery instructions..."}
                  lang={lang}
                />
              </div>
            </section>

            {/* 💳 Payment Method */}
            <section className="bg-white rounded-[2.5rem] p-8 border border-gray-50 shadow-sm space-y-6">
              <h2 className={`text-lg font-black text-gray-900 flex items-center gap-3 ${lang === "ar" ? "" : "flex-row-reverse"}`}>
                <span className="w-1.5 h-6 bg-pink-500 rounded-full"></span>
                {t('paymentMethod')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cash on Delivery */}
                <button
                  type="button" onClick={() => handlePaymentMethodChange("cod")}
                  className={`relative p-5 rounded-2xl border-2 ${lang === "ar" ? "text-right" : "text-left"} transition-all duration-300 ${
                    formValues.paymentMethod === "cod"
                      ? "border-pink-500 bg-pink-50/50 shadow-md"
                      : "border-gray-100 bg-gray-50 hover:border-gray-200"
                  }`}
                >
                  <div className={`flex items-start gap-4 ${lang === "ar" ? "" : "flex-row-reverse"}`}>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      formValues.paymentMethod === "cod" ? "border-pink-500 bg-pink-500" : "border-gray-300"
                    }`}>
                      {formValues.paymentMethod === "cod" && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="font-black text-gray-900 text-sm">💵 {t('cashOnDelivery')}</p>
                      <p className="text-[10px] text-gray-400 mt-1 font-medium">
                        {lang === "ar" ? "ادفع نقداً أو بالبطاقة عند الاستلام" : "Pay with cash or card upon delivery"}
                      </p>
                    </div>
                  </div>
                </button>

                {/* Electronic Payment (Disabled) */}
                <button
                  type="button" onClick={() => handlePaymentMethodChange("electronic")}
                  className={`relative p-5 rounded-2xl border-2 border-gray-100 bg-gray-50 ${lang === "ar" ? "text-right" : "text-left"} transition-all duration-300 hover:border-gray-200 opacity-75 cursor-not-allowed`}
                  aria-disabled="true"
                  title={lang === "ar" ? "قيد التطوير" : "Under Development"}
                >
                  <div className={`flex items-start gap-4 ${lang === "ar" ? "" : "flex-row-reverse"}`}>
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                      <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-black text-gray-400 text-sm">💳 {t('electronicPayment')}</p>
                      <p className={`text-[10px] text-gray-300 mt-1 font-medium flex items-center ${lang === "ar" ? "" : "flex-row-reverse"} gap-1`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                        {t('comingSoon')}
                      </p>
                    </div>
                  </div>
                  <span className={`absolute top-3 ${lang === "ar" ? "left-3" : "right-3"} text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100`}>
                    {t('comingSoon')}
                  </span>
                </button>
              </div>
              {errors.paymentMethod && (
                <p className="mt-1 text-[10px] text-red-500 font-medium flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                  {errors.paymentMethod.message}
                </p>
              )}
            </section>
          </div>

          {/* ===== Left Column: Order Summary ===== */}
          <div className={`lg:sticky lg:top-40 space-y-6 ${lang === "ar" ? "" : "lg:order-1"}`}>
            <div className="bg-white rounded-[2.5rem] border border-gray-50 overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.05)]">
              <div className="bg-gray-900 px-8 py-6 text-right">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.4em] mb-1">{t('orderSummary')}</p>
                <h2 className="text-2xl font-black text-white tracking-tighter">{cartItems.length} {t('items')}</h2>
              </div>
              <div className="px-8 py-6 space-y-4 max-h-64 overflow-y-auto scrollbar-hide">
                {cartItems.map((item) => {
                  const price = item.selectedVariant?.price ?? item.price;
                  const productName = getProductName(item);
                  return (
                    <div key={`${item.id}-${item.selectedVariant?.id}`} className={`flex justify-between items-center ${lang === "ar" ? "text-right" : "text-left"} border-b border-gray-50 pb-3 last:border-0 last:pb-0`}>
                      <div className={`${lang === "ar" ? "text-right" : "text-left"} max-w-[70%]`}>
                        <p className="text-sm font-bold text-gray-900 truncate">{productName}</p>
                        <p className="text-[10px] text-gray-400 font-medium">× {item.quantity}</p>
                      </div>
                      <span className="text-base font-black text-gray-900 tabular-nums">₪{(price * item.quantity).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="px-8 py-5 space-y-3 bg-gray-50/50">
                <div className={`flex justify-between text-sm ${lang === "ar" ? "" : "flex-row-reverse"}`}>
                  <span className="font-medium text-gray-600">{t('subtotal')}</span>
                  <span className="font-black text-gray-900 tabular-nums">₪{cartTotal.toFixed(2)}</span>
                </div>
                <div className={`flex justify-between text-sm ${lang === "ar" ? "" : "flex-row-reverse"}`}>
                  <span className="font-medium text-gray-600">{t('deliveryFee')}</span>
                  <span className={`font-black tabular-nums ${deliveryFee > 0 ? "text-pink-600" : "text-gray-400"}`}>
                    {deliveryFee > 0 ? `₪${deliveryFee.toFixed(2)}` : (lang === "ar" ? "يُحسب لاحقاً" : "Calculated later")}
                  </span>
                </div>
                <div className="h-px bg-gray-200 my-2"></div>
                <div className={`flex justify-between items-center ${lang === "ar" ? "" : "flex-row-reverse"}`}>
                  <span className="text-lg font-black text-gray-900 tabular-nums">₪{grandTotal.toFixed(2)}</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('grandTotal')}</span>
                </div>
              </div>
              <div className="px-8 pb-8 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting || !isValid}
                  className={`group w-full py-5 rounded-[2rem] font-black text-base uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-4 ${lang === "ar" ? "" : "flex-row-reverse"}
                    ${isSubmitting || !isValid
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-gray-900 text-white hover:bg-pink-600 shadow-[0_20px_60px_rgba(0,0,0,0.2)] hover:shadow-[0_20px_60px_rgba(236,72,153,0.35)] active:scale-[0.98]"
                    }`}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {lang === "ar" ? "جاري الإرسال..." : "Sending..."}
                    </>
                  ) : (
                    <>
                      {lang === "ar" ? "إرسال عبر الواتساب" : "Send via WhatsApp"} • ₪{grandTotal.toFixed(2)}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={lang === "en" ? "rotate-180" : ""}>
                        <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                      </svg>
                    </>
                  )}
                </button>
                <p className={`text-[9px] text-center text-gray-400 mt-4 font-bold uppercase tracking-widest ${lang === "ar" ? "" : "flex items-center justify-center gap-2"}`}>
                  🔒 {t('securePayment')} • 📦 {lang === "ar" ? "شحن خلال 24-48 ساعة" : "Shipping within 24-48 hours"}
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// ===== Sub-components (عادية - ليست هوكس) =====
const InputWithValidation = ({ label, name, type, register, error, placeholder, lang = "ar" }) => (
  <div>
    <label htmlFor={name} className={`block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 ${lang === "ar" ? "" : "text-left"}`}>
      {label}
    </label>
    <input
      id={name} type={type} {...register(name)} placeholder={placeholder}
      dir={lang === "ar" ? "auto" : "ltr"}
      className={`w-full bg-gray-50 border rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:ring-2 focus:ring-pink-500/20 outline-none transition-all ${
        error ? "border-red-300 bg-red-50 focus:ring-red-200" : "border-gray-100 focus:border-pink-200"
      }`}
    />
    {error && (
      <p className="mt-1 text-[10px] text-red-500 font-medium flex items-center gap-1">
        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
        </svg>
        {error.message}
      </p>
    )}
  </div>
);

const TextareaWithValidation = ({ label, name, register, error, rows = 3, placeholder, lang = "ar" }) => (
  <div>
    <label htmlFor={name} className={`block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 ${lang === "ar" ? "" : "text-left"}`}>
      {label}
    </label>
    <textarea
      id={name} {...register(name)} rows={rows} placeholder={placeholder}
      dir={lang === "ar" ? "auto" : "ltr"}
      className={`w-full bg-gray-50 border rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:ring-2 focus:ring-pink-500/20 outline-none transition-all resize-none ${
        error ? "border-red-300 bg-red-50 focus:ring-red-200" : "border-gray-100 focus:border-pink-200"
      }`}
    />
    {error && (
      <p className="mt-1 text-[10px] text-red-500 font-medium flex items-center gap-1">
        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
        </svg>
        {error.message}
      </p>
    )}
  </div>
);

export default Checkout;
