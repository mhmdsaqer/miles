// src/utils/imageUtils.js
const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000";
const CLOUDINARY_PREFIX = "https://res.cloudinary.com/";

/**
 * دالة ذكية لمعالجة مسار الصورة - تدعم Cloudinary والمسار المحلي
 * @param {string} imagePath - مسار الصورة من الداتابيس
 * @returns {string} - الرابط النهائي للصورة
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return "";
  
  // ✅ إذا كان رابط Cloudinary، نستخدمه مباشرة
  if (imagePath.startsWith(CLOUDINARY_PREFIX)) {
    return imagePath;
  }
  
  // ✅ fallback للمسار المحلي (assets/...)
  const cleanPath = imagePath.replace(/^assets\//i, "");
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
