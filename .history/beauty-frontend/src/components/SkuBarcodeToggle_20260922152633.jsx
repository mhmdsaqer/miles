// src/components/SkuBarcodeToggle.jsx - النسخة الاحترافية الفاخرة 🎨
import { useState, useMemo } from "react";
import { useLang } from "../context/LanguageContext";

const SkuBarcodeToggle = ({ sku, barcode }) => {
  const { lang } = useLang();
  const [activeItem, setActiveItem] = useState(null); // 'sku' | 'barcode' | null
  const isRTL = lang === "ar";

  // التحقق من وجود البيانات
  const hasSku = sku && String(sku).trim();
  const hasBarcode = barcode && String(barcode).trim();
  const hasBoth = hasSku && hasBarcode;

  // توليد خطوط الباركود بشكل احترافي
  const barcodeLines = useMemo(() => {
    if (!hasBarcode) return [];
    const lines = [];
    const code = String(barcode).trim();
    
    for (let i = 0; i < code.length; i++) {
      const digit = parseInt(code[i]) || 0;
      const widths = ["w-[2px]", "w-[3px]", "w-[2px]", "w-[4px]", "w-[2px]", "w-[3px]", "w-[2px]", "w-[4px]", "w-[3px]", "w-[2px]"];
      const heights = ["h-6", "h-8", "h-6", "h-10", "h-6", "h-8", "h-6", "h-10", "h-8", "h-6"];
      
      lines.push({
        width: widths[digit] || "w-[2px]",
        height: heights[digit] || "h-6",
        key: i,
        digit
      });
    }
    return lines;
  }, [barcode, hasBarcode]);

  // إذا لا يوجد شيء للعرض
  if (!hasSku && !hasBarcode) return null;

  // إذا يوجد واحد فقط - عرض بسيط أنيق
  if (!hasBoth) {
    return (
      <div className="flex items-center justify-center py-2">
        <div className="group relative bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl px-5 py-3 shadow-sm hover:shadow-md transition-all duration-500 hover:border-pink-300 hover:scale-[1.02]">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-500" />
          
          {hasBarcode ? (
            <div className="flex items-center gap-3 relative z-10">
              <div className="flex items-end gap-[2px] h-8">
                {barcodeLines.map((line) => (
                  <div
                    key={line.key}
                    className={`${line.width} ${line.height} bg-gradient-to-b from-gray-800 to-gray-900 rounded-[1px] transition-all duration-300 group-hover:from-pink-600 group-hover:to-pink-700`}
                  />
                ))}
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Barcode</span>
                <span className="text-xs font-mono font-bold text-gray-900 tracking-wider">{barcode}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center shadow-lg shadow-pink-500/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-widest text-pink-600">SKU</span>
                <span className="text-xs font-mono font-bold text-gray-900">{sku}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // الوضع التفاعلي: كلاهما موجود - التصميم الاحترافي
  return (
    <div className="flex items-center justify-center py-3" dir={isRTL ? "rtl" : "ltr"}>
      <div className="relative flex items-center gap-2">
        
        {/* ===== بطاقة SKU ===== */}
        <div
          onMouseEnter={() => setActiveItem("sku")}
          onMouseLeave={() => setActiveItem(null)}
          className={`
            relative overflow-hidden cursor-pointer
            transition-all duration-700 ease-out
            ${activeItem === "sku" ? "flex-[2.5]" : "flex-1"}
            ${activeItem === "barcode" ? "opacity-60 scale-95" : "opacity-100 scale-100"}
          `}
        >
          <div className={`
            h-14 rounded-2xl border-2 
            flex items-center justify-between px-4
            transition-all duration-700
            ${activeItem === "sku"
              ? "bg-gradient-to-br from-pink-500 to-pink-600 border-pink-500 shadow-xl shadow-pink-500/30"
              : "bg-white border-gray-200 hover:border-pink-300"
            }
          `}>
            <div className="flex items-center gap-3">
              {/* أيقونة SKU */}
              <div className={`
                w-9 h-9 rounded-xl flex items-center justify-center
                transition-all duration-500
                ${activeItem === "sku"
                  ? "bg-white/20 backdrop-blur-sm scale-110"
                  : "bg-gradient-to-br from-pink-100 to-pink-200"
                }
              `}>
                <svg 
                  className={`w-5 h-5 transition-all duration-500 ${
                    activeItem === "sku" ? "text-white rotate-0" : "text-pink-600"
                  }`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              
              {/* المحتوى - يظهر فقط عند التحويم */}
              <div className={`
                overflow-hidden transition-all duration-700
                ${activeItem === "sku" ? "max-w-[200px] opacity-100" : "max-w-0 opacity-0"}
              `}>
                <div className="whitespace-nowrap">
                  <span className={`text-[8px] font-black uppercase tracking-widest block ${
                    activeItem === "sku" ? "text-white/80" : "text-gray-400"
                  }`}>
                    SKU
                  </span>
                  <span className={`text-sm font-mono font-bold tracking-wide ${
                    activeItem === "sku" ? "text-white" : "text-gray-900"
                  }`}>
                    {sku}
                  </span>
                </div>
              </div>
            </div>
            
            {/* سهم التوسيع */}
            <div className={`
              transition-all duration-700
              ${activeItem === "sku" ? "opacity-0 -translate-x-4" : "opacity-100 translate-x-0"}
            `}>
              <svg 
                className={`w-4 h-4 ${activeItem === "sku" ? "text-white" : "text-gray-400"}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* ===== الفاصل المتحرك ===== */}
        <div className={`
          w-px h-8 bg-gradient-to-b from-transparent via-gray-300 to-transparent
          transition-all duration-700
          ${activeItem ? "opacity-20" : "opacity-100"}
        `} />

        {/* ===== بطاقة الباركود ===== */}
        <div
          onMouseEnter={() => setActiveItem("barcode")}
          onMouseLeave={() => setActiveItem(null)}
          className={`
            relative overflow-hidden cursor-pointer
            transition-all duration-700 ease-out
            ${activeItem === "barcode" ? "flex-[2.5]" : "flex-1"}
            ${activeItem === "sku" ? "opacity-60 scale-95" : "opacity-100 scale-100"}
          `}
        >
          <div className={`
            h-14 rounded-2xl border-2
            flex items-center justify-between px-4
            transition-all duration-700
            ${activeItem === "barcode"
              ? "bg-gradient-to-br from-gray-800 to-gray-900 border-gray-800 shadow-xl shadow-gray-900/30"
              : "bg-white border-gray-200 hover:border-gray-400"
            }
          `}>
            {/* الباركود البصري */}
            <div className={`
              flex items-end gap-[2px] transition-all duration-700
              ${activeItem === "barcode" ? "h-10" : "h-6"}
            `}>
              {barcodeLines.map((line, idx) => (
                <div
                  key={line.key}
                  className={`${line.width} ${line.height} rounded-[1px] transition-all duration-500 ${
                    activeItem === "barcode"
                      ? "bg-gradient-to-b from-white to-gray-300"
                      : "bg-gradient-to-b from-gray-400 to-gray-500"
                  }`}
                  style={{ 
                    animationDelay: `${idx * 20}ms`,
                    transition: "all 0.5s ease"
                  }}
                />
              ))}
            </div>
            
            {/* المحتوى - يظهر فقط عند التحويم */}
            <div className={`
              overflow-hidden transition-all duration-700 ml-3
              ${activeItem === "barcode" ? "max-w-[200px] opacity-100" : "max-w-0 opacity-0"}
            `}>
              <div className="whitespace-nowrap">
                <span className={`text-[8px] font-black uppercase tracking-widest block ${
                  activeItem === "barcode" ? "text-gray-400" : "text-gray-400"
                }`}>
                  Barcode
                </span>
                <span className={`text-sm font-mono font-bold tracking-wider ${
                  activeItem === "barcode" ? "text-white" : "text-gray-900"
                }`}>
                  {barcode}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ===== المؤشرات السفلية ===== */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <div className={`
            w-1.5 h-1.5 rounded-full transition-all duration-500
            ${activeItem === "sku" 
              ? "bg-pink-500 scale-125 shadow-lg shadow-pink-500/50" 
              : "bg-gray-300"}
          `} />
          <div className={`
            w-1.5 h-1.5 rounded-full transition-all duration-500
            ${activeItem === "barcode" 
              ? "bg-gray-800 scale-125 shadow-lg shadow-gray-900/50" 
              : "bg-gray-300"}
          `} />
        </div>
      </div>
    </div>
  );
};

export default SkuBarcodeToggle;