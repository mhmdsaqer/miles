// src/components/ImageUploader.jsx - النسخة المُحدّثة لدعم الصور المتعددة والسحب والإفلات ✅
import { useState, useCallback, useRef, useEffect } from "react";
import { useLang } from "../context/LanguageContext";
import { toast } from "sonner";
import { getImageUrl as getPublicImageUrl } from "../utils/imageUtils";
import { adminApi } from "../utils/adminAuth";

const ImageUploader = ({
  onImageSelect,
  currentImage,
  currentImages = [],
  onImagesChange,
  label,
  accept = "image/*",
  maxSize = 5,
  isMultiple = false,
  maxImages = 1,
  resourceType = null,
  imageType = "main",       // ✅ جديد: 'main' | 'optional' | 'variant'
  imageIndex = 1,            // ✅ جديد: رقم الصورة الاختيارية
  resourceData = {}
}) => {
  const { lang } = useLang();
  const [preview, setPreview] = useState(currentImage || null);
  const [previews, setPreviews] = useState(currentImages || []);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const fileInputRef = useRef(null);

  // ✅ تحديث المعاينة عند تغيير البيانات من الخارج
  useEffect(() => {
    if (isMultiple) {
      setPreviews(currentImages || []);
    } else {
      setPreview(currentImage || null);
    }
  }, [currentImage, currentImages, isMultiple]);

  const generatePreview = useCallback((file) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (isMultiple) {
        setPreviews(prev => [...prev, e.target.result]);
      } else {
        setPreview(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  }, [isMultiple]);

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

  const cleanSKU = useCallback((sku) => {
    if (!sku) return "";
    return sku.toString().toUpperCase().trim().normalize('NFD')
      .replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g, '')
      .replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-')
      .replace(/[^A-Z0-9\-_.]/g, '').substring(0, 100);
  }, []);

  // ✅ معالجة رفع ملف واحد أو متعدد (مُحدّث لدعم imageType و imageIndex)
  const handleFileSelect = useCallback(async (files) => {
    const fileArray = Array.from(files);
    
    // التحقق من الحد الأقصى للصور المتعددة
    if (isMultiple && (previews.length + fileArray.length) > maxImages) {
      toast.error(lang === "ar" ? `⚠️ الحد الأقصى هو ${maxImages} صور` : `⚠️ Maximum ${maxImages} images allowed`);
      return;
    }

    const validFiles = fileArray.filter(validateFile);
    if (validFiles.length === 0) return;

    validFiles.forEach(generatePreview);
    setUploading(true);

    try {
      const uploadedUrls = [];
      
      // ✅ استخدام حلقة for تقليدية للوصول إلى الـ index الصحيح لكل صورة
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const formData = new FormData();
        formData.append("image", file);
        formData.append("resourceType", resourceType || "assets");
        
        // ✅ ✅ ✅ تمرير نوع الصورة ورقمها للـ Backend
        formData.append("imageType", imageType);
        
        // حساب الـ index الصحيح (خاصة عند رفع عدة صور اختيارية مرة واحدة)
        const currentIndex = imageType === "optional" ? (imageIndex + i) : imageIndex;
        formData.append("imageIndex", currentIndex);

        if (resourceData) {
          Object.entries(resourceData).forEach(([key, value]) => {
            if (value && String(value).trim()) {
              if (key === 'sku') {
                formData.append(key, cleanSKU(String(value)));
              } else {
                formData.append(key, String(value));
              }
            }
          });
        }
        if (resourceData?.isVariant) formData.append("isVariant", "true");

        const response = await adminApi.post("/upload", formData);
        uploadedUrls.push(response.data.path || response.data.secure_url);
      }

      if (isMultiple && onImagesChange) {
        const newImages = [...previews, ...uploadedUrls].slice(0, maxImages);
        onImagesChange(newImages);
      } else if (!isMultiple && onImageSelect) {
        onImageSelect(uploadedUrls[0]);
      }

      toast.success(lang === "ar" ? `✅ تم رفع ${uploadedUrls.length} صورة بنجاح` : `✅ ${uploadedUrls.length} image(s) uploaded`);
    } catch (err) {
      console.error("❌ Upload error:", err);
      toast.error(err.response?.data?.message || (lang === "ar" ? "❌ فشل الرفع" : "❌ Upload failed"));
    } finally {
      setUploading(false);
    }
  }, [
    validateFile, 
    generatePreview, 
    isMultiple, 
    maxImages, 
    previews, 
    onImagesChange, 
    onImageSelect, 
    lang, 
    resourceType, 
    resourceData, 
    cleanSKU, 
    imageType,    // ✅ تمت الإضافة
    imageIndex    // ✅ تمت الإضافة
  ]);

  // ✅ Drag & Drop handlers للمنطقة الرئيسية
  const handleDrag = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  // ✅ Drag & Drop handlers لإعادة ترتيب الصور (Reordering)
  const handleReorderDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleReorderDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleReorderDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    
    const newImages = [...previews];
    const draggedItem = newImages.splice(draggedIndex, 1)[0];
    newImages.splice(dropIndex, 0, draggedItem);
    
    setPreviews(newImages);
    if (onImagesChange) onImagesChange(newImages);
    setDraggedIndex(null);
  };

  const handleClick = () => fileInputRef.current?.click();
  
  const handleChange = (e) => {
    if (e.target.files?.length > 0) {
      handleFileSelect(e.target.files);
      e.target.value = ""; // Reset input to allow selecting the same file again
    }
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("blob:") || path.startsWith("data:")) return path;
    if (path.startsWith("https://res.cloudinary.com/")) return path;
    return getPublicImageUrl(path);
  };

  const removeImage = (indexToRemove) => {
    const newImages = previews.filter((_, idx) => idx !== indexToRemove);
    setPreviews(newImages);
    if (onImagesChange) onImagesChange(newImages);
  };

  // ==========================================
  // 🎨 واجهة المستخدم للصور المتعددة
  // ==========================================
  if (isMultiple) {
    return (
      <div className="space-y-3" dir={lang === "ar" ? "rtl" : "ltr"}>
        {label && (
          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500">
            {label} <span className="text-pink-500">({previews.length}/{maxImages})</span>
          </label>
        )}
        
        {/* 📦 منطقة الرفع */}
        <div
          onClick={previews.length < maxImages ? handleClick : undefined}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all
            ${dragActive ? "border-pink-500 bg-pink-50/50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}
            ${uploading || previews.length >= maxImages ? "opacity-70 pointer-events-none" : ""}
          `}
        >
          <input ref={fileInputRef} type="file" accept={accept} onChange={handleChange} className="hidden" multiple disabled={uploading || previews.length >= maxImages} />
          
          <div className="space-y-2">
            <div className="w-10 h-10 mx-auto rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-xs font-bold text-gray-700">
              {previews.length >= maxImages 
                ? (lang === "ar" ? `تم الوصول للحد الأقصى (${maxImages})` : `Max limit reached (${maxImages})`)
                : (lang === "ar" ? "اسحب صوراً إضافية هنا أو انقر" : "Drag additional images or click")}
            </p>
          </div>
        </div>

        {/* 🖼️ شبكة عرض الصور مع إعادة الترتيب */}
        {previews.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {previews.map((img, index) => (
              <div
                key={index}
                draggable
                onDragStart={(e) => handleReorderDragStart(e, index)}
                onDragOver={handleReorderDragOver}
                onDrop={(e) => handleReorderDrop(e, index)}
                className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50 cursor-move hover:border-pink-300 transition-all"
              >
                <img src={getImageUrl(img)} alt={`Preview ${index}`} className="w-full h-full object-contain p-2" loading="lazy" />
                
                {/* أيقونة السحب */}
                <div className="absolute top-1 left-1 bg-white/80 backdrop-blur-sm p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                  <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                </div>

                {/* زر الحذف */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                  className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                
                {/* رقم الترتيب */}
                <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // 🎨 واجهة المستخدم للصورة الواحدة (الأصلية)
  // ==========================================
  return (
    <div className="space-y-3" dir={lang === "ar" ? "rtl" : "ltr"}>
      {label && <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500">{label}</label>}
      <div
        onClick={handleClick}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all
          ${dragActive ? "border-pink-500 bg-pink-50/50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}
          ${uploading ? "opacity-50 pointer-events-none" : ""}
        `}
      >
        <input ref={fileInputRef} type="file" accept={accept} onChange={handleChange} className="hidden" disabled={uploading} />
        {preview ? (
          <div className="space-y-3">
            <div className="relative inline-block">
              <img src={getImageUrl(preview)} alt="Preview" className="w-32 h-32 object-contain rounded-xl bg-gray-100" loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
              {uploading && <div className="absolute inset-0 bg-black/30 rounded-xl flex items-center justify-center"><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>}
            </div>
            <p className="text-xs text-gray-500">{lang === "ar" ? "انقر لتغيير الصورة" : "Click to change image"}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-bold text-gray-700">{lang === "ar" ? "اسحب الصورة هنا" : "Drag & drop image here"}</p>
            <p className="text-[10px] text-gray-400">{lang === "ar" ? "أو انقر للاختيار • الحد الأقصى 5MB" : "or click to browse • Max 5MB"}</p>
          </div>
        )}
      </div>
      {preview && !uploading && (
        <button type="button" onClick={(e) => { e.stopPropagation(); setPreview(null); onImageSelect(""); }} className="text-[10px] text-red-500 font-bold hover:underline">
          {lang === "ar" ? "إزالة الصورة" : "Remove image"}
        </button>
      )}
    </div>
  );
};

export default ImageUploader;