// src/components/ImageUploader.jsx - النسخة المُحدثة ✅
import { useState, useCallback, useRef, useEffect } from "react";
import { useLang } from "../context/LanguageContext";
import { toast } from "sonner";
import { getImageUrl as getPublicImageUrl } from "../utils/imageUtils";
import { adminApi } from "../utils/adminAuth"; // ✅ استخدام adminApi بدلاً من fetch

const ImageUploader = ({
  onImageSelect,
  currentImage,
  label,
  accept = "image/*",
  maxSize = 5, // MB
  resourceType = null, // ✅ جديد: 'brands' | 'categories' | 'products'
  resourceData = {} // ✅ جديد: بيانات إضافية لتحديد المجلد
}) => {
  const { lang, t } = useLang();
  const [preview, setPreview] = useState(currentImage || null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // ✅ توليد معاينة للصورة
  const generatePreview = useCallback((file) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  // ✅ التحقق من حجم الملف
  const validateFile = useCallback((file) => {
    if (!file.type.startsWith("image/")) {
      toast.error(lang === "ar" ? "⚠️ الملف يجب أن يكون صورة" : "⚠️ File must be an image");
      return false;
    }
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(lang === "ar" ? `⚠️ الحجم الأقصى ${maxSize}MB` : `⚠️ Max size is ${maxSize}MB`);
      return false;
    }
    return true;
  }, [maxSize, lang]);

  // ✅ معالجة اختيار الملف - مع دعم resourceType و resourceData
  const handleFileSelect = useCallback(async (file) => {
    if (!validateFile(file)) return;
    
    generatePreview(file);
    setUploading(true);
    
    try {
      // 📤 رفع الصورة باستخدام adminApi
      const formData = new FormData();
      formData.append("image", file);
      
      // ✅ إضافة resourceType وبيانات المورد إذا وجدت
      if (resourceType) {
        formData.append("resourceType", resourceType);
        Object.entries(resourceData || {}).forEach(([key, value]) => {
          if (value) formData.append(key, value);
        });
      }
      
      const response = await adminApi.post("/upload", formData);
      
      // ✅ إرجاع المسار الذي يرجعه الـ backend
      onImageSelect(response.data.path || response.data.secure_url);
      toast.success(lang === "ar" ? "✅ تم رفع الصورة" : "✅ Image uploaded");
      
    } catch (err) {
      console.error("Upload error:", err);
      const errorMsg = err.response?.data?.message || err.message || (lang === "ar" ? "❌ فشل الرفع" : "❌ Upload failed");
      toast.error(errorMsg);
    } finally {
      setUploading(false);
    }
  }, [validateFile, generatePreview, onImageSelect, lang, resourceType, resourceData]);

  // ✅ Drag & Drop handlers
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  const handleClick = () => fileInputRef.current?.click();
  
  const handleChange = (e) => {
    if (e.target.files?.[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // ✅ دالة معالجة مسار الصورة - تدعم Cloudinary والمسار المحلي
  const getImageUrl = (path) => {
    if (!path) return null;
    // ✅ إذا كانت معاينة محلية (blob/data)، اعرضها مباشرة
    if (path.startsWith("blob:") || path.startsWith("data:")) {
      return path;
    }
    // ✅ إذا كانت من Cloudinary، نرجعها كما هي
    if (path.startsWith("https://res.cloudinary.com/")) {
      return path;
    }
    // ✅ إذا كانت من الداتابيس، استخدم الدالة المركزية
    return getPublicImageUrl(path);
  };

  // ✅ تنظيف الـ preview URL عند الفك
  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  // ✅ تحديث المعاينة عند تغيير currentImage من الخارج
  useEffect(() => {
    if (currentImage && currentImage !== preview) {
      setPreview(currentImage);
    }
  }, [currentImage]);

  return (
    <div className="space-y-3" dir={lang === "ar" ? "rtl" : "ltr"}>
      {label && (
        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500">
          {label}
        </label>
      )}
      
      {/* 📦 منطقة الرفع */}
      <div
        onClick={handleClick}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all
          ${dragActive
            ? "border-pink-500 bg-pink-50/50"
            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          }
          ${uploading ? "opacity-50 pointer-events-none" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
          disabled={uploading}
        />
        
        {/* 🖼️ معاينة الصورة */}
        {preview ? (
          <div className="space-y-3">
            <div className="relative inline-block">
              <img
                src={getImageUrl(preview)}
                alt="Preview"
                className="w-32 h-32 object-contain rounded-xl bg-gray-100"
                loading="lazy"
                onError={(e) => {
                  console.warn("Preview load error");
                  e.target.style.display = 'none';
                }}
              />
              {uploading && (
                <div className="absolute inset-0 bg-black/30 rounded-xl flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {lang === "ar" ? "انقر لتغيير الصورة" : "Click to change image"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-bold text-gray-700">
              {lang === "ar" ? "اسحب الصورة هنا" : "Drag & drop image here"}
            </p>
            <p className="text-[10px] text-gray-400">
              {lang === "ar" ? "أو انقر للاختيار • الحد الأقصى 5MB" : "or click to browse • Max 5MB"}
            </p>
          </div>
        )}
      </div>
      
      {/* 🗑️ زر إزالة الصورة */}
      {preview && !uploading && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setPreview(null);
            onImageSelect("");
          }}
          className="text-[10px] text-red-500 font-bold hover:underline"
        >
          {lang === "ar" ? "إزالة الصورة" : "Remove image"}
        </button>
      )}
    </div>
  );
};

export default ImageUploader;
