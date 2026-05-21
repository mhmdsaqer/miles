// src/utils/imageUtils.js - النسخة المُصححة ✅
const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000";
const CLOUDINARY_PREFIX = "https://res.cloudinary.com/";

/**
* دالة ذكية لمعالجة مسار الصورة - تدعم Cloudinary والمسار المحلي + تصحيح المسارات المكررة
* @param {string} imagePath - مسار الصورة من الداتابيس
* @returns {string} - الرابط النهائي للصورة
*/
export const getImageUrl = (imagePath) => {
  if (!imagePath) return "";
  
  // ✅ ✅ ✅ إصلاح المسار إذا كان يحتوي على تكرار (مثل /products/products/)
  let fixedPath = imagePath;
  
  // تصحيح التكرار في المسارات
  fixedPath = fixedPath
    .replace(/\/products\/products\//g, '/products/')
    .replace(/\/brands\/brands\//g, '/brands/')
    .replace(/\/categories\/categories\//g, '/categories/');
  
  // ✅ إذا كان رابط Cloudinary، نستخدمه بعد الإصلاح
  if (fixedPath.startsWith(CLOUDINARY_PREFIX)) {
    return fixedPath;
  }
  
  // ✅ fallback للمسار المحلي (assets/...)
  const cleanPath = fixedPath.replace(/^assets\//i, "");
  return `${API_URL}/assets/${cleanPath}`;
};

/**
* دالة لتحسين صور Cloudinary (اختياري - للتحجيم والجودة)
* @param {string} url - رابط Cloudinary الأصلي
* @param {Object} options - خيارات التحسين
* @returns {string} - الرابط المُحسّن
*/
export const optimizeCloudinaryImage = (url, options = {}) => {
  if (!url?.startsWith(CLOUDINARY_PREFIX)) return url;
  
  const {
    width = 800,
    height = null,
    quality = 80,
    format = 'auto',
    crop = 'fill'
  } = options;
  
  // إدخال تحويلات Cloudinary قبل اسم الملف
  const transformations = [
    width && `w_${width}`,
    height && `h_${height}`,
    `q_${quality}`,
    `f_${format}`,
    crop && `c_${crop}`
  ].filter(Boolean).join(',');
  
  // إدخال التحويلات في الرابط
  return url.replace('/upload/', `/upload/${transformations}/`);
};
