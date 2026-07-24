// src/context/LanguageContext.jsx
import { createContext, useState, useContext, useEffect, useMemo, useCallback , useRef } from "react";

const LanguageContext = createContext();

// ✅ فصل كائن الترجمات خارج المكون لتحسين الأداء
const TRANSLATIONS = {

readOnly  : { ar: " ", en: " " },
// في كائن TRANSLATIONS
outOfStock: { ar: "نفذت الكمية", en: "Out of Stock" },
unavailable: { ar: "غير متوفر", en: "Unavailable" },
brandsAndcategories:{ar : "الماركات والأصناف",en :"Brands and Categories"},
// داخل كائن TRANSLATIONS في src/context/LanguageContext.jsx
mainCategories: { ar: "الأقسام الرئيسية", en: "Main Categories" },
exploreCategory: { ar: "تصفح المنتجات", en: "Explore Products" },
allCategories: { ar: "جميع الأقسام", en: "All Categories" },
// === Admin Orders ===
whatsappOrders: { ar: "طلبات الواتساب", en: "WhatsApp Orders" },
allStatus: { ar: "كل الحالات", en: "All Status" },
pending: { ar: "قيد الانتظار", en: "Pending" },
confirmed: { ar: "مؤكد", en: "Confirmed" },
shipped: { ar: "تم الشحن", en: "Shipped" },
delivered: { ar: "تم التسليم", en: "Delivered" },
cancelled: { ar: "ملغي", en: "Cancelled" },
deliveryAddress: { ar: "عنوان التوصيل", en: "Delivery Address" },
city: { ar: "المدينة", en: "City" },
fullAddress: { ar: "العنوان التفصيلي", en: "Full Address" },
copyAddress: { ar: "نسخ العنوان", en: "Copy Address" },
orderItems: { ar: "تفاصيل الطلب", en: "Order Items" },
paymentSummary: { ar: "الملخص المالي", en: "Payment Summary" },
subtotal: { ar: "المجموع", en: "Subtotal" },
delivery: { ar: "التوصيل", en: "Delivery" },
payment: { ar: "الدفع", en: "Payment" },
total: { ar: "الإجمالي", en: "Total" },
notes: { ar: "الملاحظات", en: "Notes" },
customerNotes: { ar: "ملاحظات العميل", en: "Customer Notes" },
addNote: { ar: "أضف ملاحظة", en: "Add note" },
save: { ar: "حفظ", en: "Save" },
message: { ar: "مراسلة", en: "Message" },
printOrder: { ar: "طباعة الطلب", en: "Print Order" },
delete: { ar: "حذف", en: "Delete" },
loadMore: { ar: "عرض المزيد", en: "Load More" },
noMatchingOrders: { ar: "لا توجد طلبات مطابقة", en: "No matching orders" },
clearFilters: { ar: "مسح الفلاتر", en: "Clear filters" },
searchPlaceholder: { ar: "🔍 بحث...", en: "🔍 Search..." },
  // === Admin Products Filters & Display ===
allBrands: { ar: "كل البراندات", en: "All Brands" },
allCategories: { ar: "كل التصنيفات", en: "All Categories" },
selectBrand: { ar: "اختر البراند", en: "Select Brand" },
selectCategory: { ar: "اختر التصنيف", en: "Select Category" },
allVariants: { ar: "كل المنتجات", en: "All Products" },
withVariants: { ar: "مع متغيرات", en: "With Variants" },
withoutVariants: { ar: "بدون متغيرات", en: "Without Variants" },
productImage: { ar: "صورة المنتج", en: "Product Image" },
manageVariants: { ar: "إدارة المتغيرات", en: "Manage Variants" },
addVariant: { ar: "إضافة متغير", en: "Add Variant" },
attributes: { ar: "الخصائص", en: "Attributes" },
variant: { ar: "متغير", en: "Variant" },
multiple: { ar: "متعدد", en: "Multiple" },
add: { ar: "إضافة", en: "Add" },
edit: { ar: "تعديل", en: "Edit" },
delete: { ar: "حذف", en: "Delete" },
cancel: { ar: "إلغاء", en: "Cancel" },
update: { ar: "تحديث", en: "Update" },
added: { ar: "تمت الإضافة بنجاح", en: "Added Successfully" },
updated: { ar: "تم التحديث بنجاح", en: "Updated Successfully" },
deleted: { ar: "تم الحذف بنجاح", en: "Deleted Successfully" },
confirmDelete: { ar: "هل أنت متأكد من الحذف؟", en: "Are you sure you want to delete?" },
fillRequired: { ar: "يرجى تعبئة الحقول الإلزامية", en: "Please fill required fields" },
saveFailed: { ar: "فشل في الحفظ", en: "Save Failed" },
noResults: { ar: "لا توجد نتائج", en: "No Results" },
relatedProducts: { ar: "منتجات ذات صلة", en: "Related Products" },

// === Admin Orders Print ===
printOrder: { ar: "طباعة الطلب", en: "Print Order" },
printAll: { ar: "طباعة الكل", en: "Print All" },
  // === Admin Dashboard ===
  // أضف هذه الأسطر في كائن TRANSLATIONS
  adminPanel: { ar: "لوحة التحكم", en: "Admin Panel" },
  storeOverview: { ar: "نظرة عامة على المتجر ", en: " Executive Summary" },
  whatsappOrders: { ar: "طلبات الواتساب", en: "WhatsApp Orders" },
  menu: { ar: "القائمة", en: "Menu" },
  close: { ar: "إغلاق", en: "Close" },
  logout: { ar: "تسجيل الخروج", en: "Logout" },
  dashboard: { ar: "لوحة المعلومات", en: "Dashboard" },
  brands: { ar: "البراندات", en: "Brands" },
  products: { ar: "المنتجات", en: "Products" },
  categories: { ar: "التصنيفات", en: "Categories" },
  variants: { ar: "المتغيرات", en: "Variants" },
  globalBrand: { ar: "ماركة عالمية", en: "Global Brand" },
  availableProduct: { ar: "منتج متاح", en: "Available Product" },
  mainCategory: { ar: "فئة رئيسية", en: "Main Category" },
  availableOption: { ar: "خيار متاح", en: "Available Option" },
  quickActions: { ar: "خطوات سريعة", en: "Quick Actions" },
  addNewProduct: { ar: "إضافة منتج جديد", en: "Add New Product" },
  createProductWithVariants: { ar: "إنشاء منتج مع متغيراته", en: "Create product with variants" },
  reviewOrders: { ar: "مراجعة الطلبات", en: "Review Orders" },
  manageWhatsAppOrders: { ar: "إدارة طلبات الواتساب", en: "Manage WhatsApp orders" },
  exportData: { ar: "تصدير البيانات", en: "Export Data" },
  downloadBackup: { ar: "تحميل نسخة احتياطية", en: "Download backup copy" },
  lastUpdated: { ar: "آخر تحديث", en: "Last updated" },
  refreshData: { ar: "تحديث البيانات", en: "Refresh data" },
  refresh: { ar: "تحديث", en: "Refresh" },
  systemStatus: { ar: "حالة النظام", en: "System Status" },
  serverConnected: { ar: "السيرفر متصل", en: "Server Connected" },
  mongodbActive: { ar: "MongoDB نشط", en: "MongoDB Active" },
  ordersLocalStorage: { ar: "الطلبات: محلي", en: "Orders: LocalStorage" },
  confirmLogout: { ar: "هل أنت متأكد من تسجيل الخروج؟", en: "Are you sure you want to logout?" },
  logout: { ar: "تسجيل الخروج", en: "Logout" },
  // === Checkout Page ===
  checkout: { ar: "إتمام الطلب", en: "Checkout" },
  contactInfo: { ar: "معلومات الاتصال", en: "Contact Information" },
  shippingAddress: { ar: "عنوان التوصيل", en: "Shipping Address" },
  paymentMethod: { ar: "طريقة الدفع", en: "Payment Method" },
  orderSummary: { ar: "ملخص الطلب", en: "Order Summary" },
  
  // Form Labels
  fullName: { ar: "الاسم الكامل *", en: "Full Name *" },
  phone: { ar: "رقم التواصل *", en: "Phone Number *" },
  altPhone: { ar: "رقم بديل (اختياري)", en: "Alt. Phone (Optional)" },
  email: { ar: "البريد الإلكتروني", en: "Email Address" },
  selectCity: { ar: "المنطقة / المدينة", en: "Region / City" },
  detailedAddress: { ar: "العنوان التفصيلي *", en: "Detailed Address *" },
  additionalNotes: { ar: "ملاحظات إضافية (اختياري)", en: "Additional Notes (Optional)" },
  
  // Payment Methods
  cashOnDelivery: { ar: "الدفع عند الاستلام", en: "Cash on Delivery" },
  electronicPayment: { ar: "الدفع الإلكتروني", en: "Electronic Payment" },
  comingSoon: { ar: "قريباً", en: "Coming Soon" },
  
  // Order Summary
  subtotal: { ar: "المجموع الفرعي", en: "Subtotal" },
  deliveryFee: { ar: "رسوم التوصيل", en: "Delivery Fee" },
  grandTotal: { ar: "الإجمالي النهائي", en: "Grand Total" },
  
  // Success Page
  orderReceived: { ar: "تم استلام طلبك بنجاح!", en: "Order Received Successfully!" },
  
  // Trust Badges
  securePayment: { ar: "دفع آمن", en: "Secure Payment" },
  
  // Buttons & Actions
  sendViaWhatsApp: { ar: "إرسال عبر الواتساب", en: "Send via WhatsApp" },
  sending: { ar: "جاري الإرسال...", en: "Sending..." },
  cartItems: { ar: "منتجات السلة", en: "Cart Items" },
  productOptions: { ar: "خصائص المنتج", en: "Product Options" },
  price: { ar: "السعر", en: "Price" },
  totalPrice: { ar: "السعر الإجمالي", en: "Total Price" },
  quantity: { ar: "الكمية", en: "Quantity" },
  decreaseQuantity: { ar: "تقليل الكمية", en: "Decrease quantity" },
  increaseQuantity: { ar: "زيادة الكمية", en: "Increase quantity" },
  remove: { ar: "حذف", en: "Remove" },
  fromCart: { ar: "من السلة", en: "from cart" },
  
  // === Order Summary ===
  orderSummary: { ar: "ملخص الطلب", en: "Order Summary" },
  summary: { ar: "ملخص", en: "Summary" },
  yourOrder: { ar: "طلبك", en: "Your Order" },
  subtotal: { ar: "المجموع", en: "Subtotal" },
  total: { ar: "الإجمالي", en: "Total" },
  taxIncluded: { ar: "شامل الضريبة", en: "Tax Included" },
  checkout: { ar: "إتمام الطلب", en: "Checkout" },
  proceedToCheckout: { ar: "الانتقال لإتمام الطلب", en: "Proceed to checkout" },
  
  // === Trust Badges ===
  cashOnDelivery: { ar: "دفع عند الاستلام", en: "Cash on Delivery" },
  shippingAvailable: { ar: "شحن متاح", en: "Shipping Available" },
  freeReturns: { ar: "إرجاع مجاني", en: "Free Returns" },
  // === Navbar ===
  home: { ar: "الرئيسية", en: "Home" },
  brands: { ar: "الماركات", en: "Brands" },
  shop: { ar: "المتجر", en: "Shop" },
  cart: { ar: "حقيبتك", en: "Your Bag" },
  menu: { ar: "القائمة", en: "Menu" },
  close: { ar: "إغلاق", en: "Close" },
  
  // === Cart ===
  cartTotal: { ar: "إجمالي السلة", en: "Cart Total" },
  subtotal: { ar: "المجموع الفرعي", en: "Subtotal" },
  viewCart: { ar: "عرض الحقيبة", en: "View Bag" },
  yourCart: { ar: "حقيبتك", en: "Your Cart" },
  item: { ar: "عنصر", en: "Item" },
  items: { ar: "عناصر", en: "Items" },
  total: { ar: "الإجمالي", en: "Total" },
  taxIncluded: { ar: "شامل الضريبة", en: "Tax Included" },
  remove: { ar: "حذف", en: "Remove" },
  update: { ar: "تحديث", en: "Update" },
  addToCart: { ar: "أضف للحقيبة", en: "Add to Bag" },
  addToBag: { ar: "أضف للحقيبة", en: "Add to Bag" },
  checkout: { ar: "إتمام الطلب", en: "Checkout" },
  emptyCart: { ar: "حقيبتك فارغة", en: "Your bag is empty" },
  continueShopping: { ar: "مواصلة التسوق", en: "Continue Shopping" },
  
  // === Search & Filters ===
  searchPlaceholder: { ar: "ابحث عن منتج...", en: "Search products..." },
  sortBy: { ar: "ترتيب حسب", en: "Sort By" },
  priceAsc: { ar: "السعر: من الأقل", en: "Price: Low to High" },
  priceDesc: { ar: "السعر: من الأعلى", en: "Price: High to Low" },
  nameAsc: { ar: "الاسم: أ → ي", en: "Name: A → Z" },
  nameDesc: { ar: "الاسم: ي → أ", en: "Name: Z → A" },
  default: { ar: "الأحدث", en: "Latest" },
  filter: { ar: "تصفية", en: "Filter" },
  clearAll: { ar: "مسح الكل", en: "Clear All" },
  categories: { ar: "التصنيفات", en: "Categories" },
  priceRange: { ar: "نطاق السعر", en: "Price Range" },
  from: { ar: "من", en: "From" },
  to: { ar: "إلى", en: "To" },
  resetPrice: { ar: "إعادة تعيين السعر", en: "Reset Price" },
  
  // === Shop Page ===
  allProducts: { ar: "المجموعة الكاملة", en: "All Products" },
  productsAvailable: { ar: "منتج متاح", en: "products available" },
  productAvailable: { ar: "منتج متاح", en: "product available" },
  detailedView: { ar: "عرض مفصّل", en: "Detailed View" },
  loadMore: { ar: "عرض المزيد", en: "Load More" },
  noMatchingResults: { ar: "لا توجد نتائج مطابقة", en: "No matching results" },
  tryAdjustingFilters: { ar: "جرب تعديل معايير البحث أو الفلاتر", en: "Try adjusting your search or filters" },
  exploreCategories: { ar: "استكشف تصنيفات أخرى", en: "Explore other categories" },
  quickTip: { ar: "معلومة سريعة", en: "Quick Tip" },
  allProductsOriginal: { ar: "جميع منتجاتنا أصلية 100%", en: "All products 100% original" },
  qualityGuarantee: { ar: "ضمان الجودة", en: "Quality Guarantee" },
  shippingAvailable: { ar: "شحن متاح", en: "Shipping Available" },
  
  // === Product Details ===
  back: { ar: "العودة", en: "Back" },
  availableForShipping: { ar: "متاح للشحن", en: "Available for Shipping" },
  available: { ar: "✅ متاح للشحن", en: "✅ In Stock" },
  outOfStock: { ar: "❌ غير متاح", en: "❌ Out of Stock" },
  chooseVariant: { ar: "اخترِ النوع", en: "Choose Variant" },
  options: { ar: "خيارات", en: "Options" },
  singleOption: { ar: "خيار واحد", en: "Single Option" },
  quantity: { ar: "الكمية", en: "Quantity" },
  description: { ar: "الوصف", en: "Description" },
  ingredients: { ar: "المكونات", en: "Ingredients" },
  howToUse: { ar: "طريقة الاستخدام", en: "How to Use" },
  usage: { ar: "طريقة الاستخدام", en: "How to Use" },
  ingredientsOnPackaging: { 
    ar: "المكونات متوفرة على عبوة المنتج. جميع منتجاتنا خالية من البارابين والكبريتات الضارة.", 
    en: "Ingredients listed on product packaging. All our products are paraben & sulfate-free." 
  },
  applyOnCleanSkin: { 
    ar: "يُطبق على البشرة النظيفة والجافة. يُستخدم يومياً صباحاً ومساءً للحصول على أفضل النتائج.", 
    en: "Apply to clean, dry skin. Use daily morning and evening for best results." 
  },
  reviews: { ar: "التقييمات", en: "Reviews" },
  relatedProducts: { ar: "منتجات ذات صلة", en: "Related Products" },
  fromCollection: { ar: "من مجموعة", en: "From" },
  youMayAlsoLike: { ar: "قد يعجبكِ أيضاً", en: "You May Also Like" },
  curatedForYou: { ar: "مختارات خاصة لكِ", en: "Curated For You" },
  
  // === Trust Badges ===
  original: { ar: "أصلي 100%", en: "100% Original" },
  "100PercentOriginal": { ar: "أصلي 100%", en: "100% Original" },
  freeReturn: { ar: "إرجاع مجاني", en: "Free Returns" },
  freeReturns: { ar: "إرجاع مجاني", en: "Free Returns" },
  securePayment: { ar: "دفع آمن", en: "Secure Payment" },
  fastShipping: { ar: "شحن سريع", en: "Fast Shipping" },
  
  // === Home Page ===
  exclusiveAgent: { 
    ar: "وكيل حصري لـ 10 ماركات عالمية", 
    en: "Exclusive Agent for 10 Global Brands" 
  },
  beautyDestination: { 
    ar: "وجهتك الأولى للمنتجات العالمية في العناية والجمال. نجمع لكِ أفضل الماركات في مكان واحد.", 
    en: "Your first destination for global beauty and care products. We bring you the finest brands in one place." 
  },
  shopNow: { ar: "تسوقي الآن", en: "Shop Now" },
  exploreBrands: { ar: "استكشف الماركات", en: "Explore Brands" },
  aboutUs: { ar: "من نحن", en: "About Us" },
  beautyLeader: { 
    ar: "رائدة الجمال والعناية في فلسطين", 
    en: "Leading Beauty & Care Store in Palestine" 
  },
  originalProducts: { ar: "منتجات أصلية", en: "Original Products" },
  yearsExperience: { ar: "سنوات خبرة", en: "Years of Experience" },
  globalBrands: { ar: "ماركة عالمية", en: "Global Brand" },
  diverseProducts: { ar: "منتج متنوع", en: "Diverse Product" },
  productCategories: { ar: "فئة منتجات", en: "Product Category" },
  availableOptions: { ar: "خيار متاح", en: "Available Option" },
  ourBrands: { ar: "ماركاتنا", en: "Our Brands" },
  topGlobalBrands: { ar: "أبرز الماركات العالمية", en: "Top Global Brands" },
  discoverMore: { ar: "اكتشفي المزيد", en: "Discover More" },
  viewAllBrands: { ar: "عرض جميع الماركات", en: "View All Brands" },
  startYourBeauty: { ar: "ابدئي رحلة جمالك", en: "Start Your Beauty Journey" },
  contactUs: { ar: "تواصلي معنا", en: "Contact Us" },
  haveQuestion: { ar: "هل لديكِ سؤال؟", en: "Have a Question?" },
  browseProducts: { ar: "تصفحي المنتجات", en: "Browse Products" },
  
  // === Brand Details Page ===
  brandNotFound: { ar: "الماركة غير موجودة", en: "Brand Not Found" },
  backToBrands: { ar: "العودة للماركات", en: "Back to Brands" },
  productsInCollection: { ar: "منتج في مجموعتنا", en: "products in our collection" },
  showing: { ar: "عرض", en: "Showing" },
  noProducts: { ar: "لا توجد منتجات", en: "No Products" },
  noProductsForBrand: { ar: "لم تُضف منتجات لهذه الماركة بعد", en: "No products added for this brand yet" },
  otherBrands: { ar: "ماركات أخرى", en: "Other Brands" },
  
  // === Misc ===
  loading: { ar: "جاري التحميل...", en: "Loading..." },
  noResults: { ar: "لا توجد نتائج", en: "No Results" },
  tryAgain: { ar: "حاولي مرة أخرى", en: "Try Again" },
  error: { ar: "حدث خطأ", en: "An Error Occurred" },
  products: { ar: "منتجات", en: "Products" },
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("miles_lang");
      return saved || "ar";
    }
    return "ar";
  });
   const isSwitchingRef = useRef(false);

  // حفظ اللغة وتحديث اتجاه الصفحة
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("miles_lang", lang);
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    }
  }, [lang]);

  const toggleLang = useCallback(() => {
  // ✅ منع النقر المتكرر السريع (Debounce بسيط)
	  if (isSwitchingRef.current) return;
	  isSwitchingRef.current = true;
	  
	  // ✅ إضافة تأثير بصري ناعم قبل التغيير
	  if (typeof document !== "undefined") {
	    document.documentElement.style.transition = "opacity 0.15s ease";
	    document.documentElement.style.opacity = "0.85";
	  }
	  
	  // ✅ تأخير بسيط 180 ميلي ثانية للإحساس بالتفاعل
	  setTimeout(() => {
	    setLang((prev) => (prev === "ar" ? "en" : "ar"));
	    
	    // ✅ إعادة الـ opacity بعد التغيير
	    setTimeout(() => {
	      if (typeof document !== "undefined") {
		document.documentElement.style.opacity = "1";
	      }
	      // ✅ إعادة تفعيل التبديل بعد 300 ميلي ثانية
	      setTimeout(() => {
		isSwitchingRef.current = false;
	      }, 120);
	    }, 150);
	  }, 180);
	}, []);

  // ✅ دالة الترجمة مُحسّنة بـ useMemo
  const t = useCallback((key) => {
    return TRANSLATIONS[key]?.[lang] || key;
  }, [lang]);

  // ✅ قيمة السياق مُحسّنة لتجنب إعادة الإنشاء غير الضروري
  const value = useMemo(() => ({
    lang,
    toggleLang,
    t,
  }), [lang, toggleLang, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLang = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLang must be used within a LanguageProvider");
  }
  return context;
};
