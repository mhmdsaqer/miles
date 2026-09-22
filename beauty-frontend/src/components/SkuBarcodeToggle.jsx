// src/components/SkuBarcodeToggle.jsx
import { useState, useMemo } from "react";
import { useLang } from "../context/LanguageContext";

const SkuBarcodeToggle = ({ sku, barcode }) => {
  const { lang } = useLang();
  const [activeMode, setActiveMode] = useState(null); // 'sku' | 'barcode' | null
  const isRTL = lang === "ar";

  // ✅ التحقق من وجود البيانات
  const hasSku = sku && String(sku).trim();
  const hasBarcode = barcode && String(barcode).trim();
  const hasBoth = hasSku && hasBarcode;

  // ✅ تحويل الـ SKU إلى "باركود بصري" (خطوط عشوائية)
  const barcodeLines = useMemo(() => {
    if (!hasBarcode) return [];
    const lines = [];
    const code = String(barcode).trim();
    // توليد خطوط بناءً على أرقام الباركود (كل رقم = عرض مختلف)
    for (let i = 0; i < code.length; i++) {
      const digit = parseInt(code[i]) || 0;
      const width = digit % 2 === 0 ? "w-[3px]" : "w-[2px]";
      const gap = i < code.length - 1 ? "mr-[1px]" : "";
      lines.push({ width, gap, key: i });
    }
    return lines;
  }, [barcode, hasBarcode]);

  // ✅ إذا لا يوجد شيء للعرض
  if (!hasSku && !hasBarcode) return null;

  // ✅ إذا يوجد واحد فقط، اعرضه بشكل بسيط
  if (!hasBoth) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 hover:border-pink-300 transition-all group">
        {hasBarcode ? (
          <>
            <div className="flex items-end gap-[2px] h-6">
              {barcodeLines.map((line) => (
                <div
                  key={line.key}
                  className={`h-full bg-gray-900 ${line.width} ${line.gap}`}
                />
              ))}
            </div>
            <span className="text-xs font-mono font-bold text-gray-900 tracking-wider">
              {barcode}
            </span>
          </>
        ) : (
          <>
            <span className="text-[10px] font-black uppercase tracking-widest text-pink-600">
              SKU
            </span>
            <span className="text-xs font-mono font-bold text-gray-900">
              {sku}
            </span>
          </>
        )}
      </div>
    );
  }

  // ✅ الوضع التفاعلي: كلاهما موجود
  return (
    <div
      className={`relative w-full max-w-sm h-14 select-none ${
        isRTL ? "" : ""
      }`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* ===== الخلفية المشتركة ===== */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gray-50 via-white to-gray-100 border border-gray-200 shadow-sm overflow-hidden" />

      {/* ===== بطاقة الـ SKU (يمين في RTL) ===== */}
      <button
        type="button"
        onMouseEnter={() => setActiveMode("sku")}
        onMouseLeave={() => setActiveMode(null)}
        onFocus={() => setActiveMode("sku")}
        onBlur={() => setActiveMode(null)}
        className={`
          absolute inset-0 flex items-center justify-between px-5
          transition-all duration-500 ease-out cursor-pointer
          ${isRTL ? "right-0" : "left-0"}
          ${
            activeMode === "sku"
              ? "z-20 scale-100 opacity-100 bg-gradient-to-br from-pink-50 to-white shadow-lg border-pink-200"
              : "z-10 scale-95 opacity-70 hover:opacity-90"
          }
        `}
        style={{
          transformOrigin: isRTL ? "right center" : "left center",
        }}
        aria-label={`SKU: ${sku}`}
      >
        <div className="flex items-center gap-2.5">
          {/* أيقونة SKU */}
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-500 ${
              activeMode === "sku"
                ? "bg-pink-500 text-white shadow-md shadow-pink-500/30"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
          </div>
          <div className="flex flex-col items-start">
            <span
              className={`text-[9px] font-black uppercase tracking-[0.2em] transition-colors duration-500 ${
                activeMode === "sku" ? "text-pink-600" : "text-gray-400"
              }`}
            >
              SKU
            </span>
            <span
              className={`text-sm font-mono font-bold tracking-wide transition-colors duration-500 ${
                activeMode === "sku" ? "text-gray-900" : "text-gray-600"
              }`}
            >
              {sku}
            </span>
          </div>
        </div>
        {/* مؤشر التفاعل */}
        <div
          className={`transition-all duration-500 ${
            activeMode === "sku" ? "opacity-100 scale-100" : "opacity-0 scale-75"
          }`}
        >
          <svg
            className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </button>

      {/* ===== بطاقة الباركود (يسار في RTL) ===== */}
      <button
        type="button"
        onMouseEnter={() => setActiveMode("barcode")}
        onMouseLeave={() => setActiveMode(null)}
        onFocus={() => setActiveMode("barcode")}
        onBlur={() => setActiveMode(null)}
        className={`
          absolute inset-0 flex items-center justify-between px-5
          transition-all duration-500 ease-out cursor-pointer
          ${isRTL ? "left-0" : "right-0"}
          ${
            activeMode === "barcode"
              ? "z-20 scale-100 opacity-100 bg-gradient-to-br from-gray-900 to-gray-800 shadow-lg"
              : "z-10 scale-95 opacity-70 hover:opacity-90"
          }
        `}
        style={{
          transformOrigin: isRTL ? "left center" : "right center",
        }}
        aria-label={`Barcode: ${barcode}`}
      >
        <div className="flex items-center gap-3">
          {/* الباركود البصري */}
          <div className="flex items-end gap-[2px] h-8 bg-white px-2 py-1.5 rounded-md shadow-inner">
            {barcodeLines.map((line) => (
              <div
                key={line.key}
                className={`h-full bg-gray-900 ${line.width} ${line.gap}`}
              />
            ))}
          </div>
          <div className="flex flex-col items-start">
            <span
              className={`text-[9px] font-black uppercase tracking-[0.2em] transition-colors duration-500 ${
                activeMode === "barcode" ? "text-pink-400" : "text-gray-400"
              }`}
            >
              Barcode
            </span>
            <span
              className={`text-sm font-mono font-bold tracking-wider transition-colors duration-500 ${
                activeMode === "barcode" ? "text-white" : "text-gray-600"
              }`}
            >
              {barcode}
            </span>
          </div>
        </div>
        {/* مؤشر التفاعل */}
        <div
          className={`transition-all duration-500 ${
            activeMode === "barcode"
              ? "opacity-100 scale-100"
              : "opacity-0 scale-75"
          }`}
        >
          <svg
            className={`w-4 h-4 text-white ${isRTL ? "" : "rotate-180"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </button>

      {/* ===== مؤشر صغير أسفل البطاقة ===== */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
        <div
          className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
            activeMode === "sku" ? "bg-pink-500 scale-125" : "bg-gray-300"
          }`}
        />
        <div
          className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
            activeMode === "barcode" ? "bg-gray-900 scale-125" : "bg-gray-300"
          }`}
        />
      </div>
    </div>
  );
};

export default SkuBarcodeToggle;