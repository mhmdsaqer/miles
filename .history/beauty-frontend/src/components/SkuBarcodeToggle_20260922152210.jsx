// src/components/SkuBarcodeToggle.jsx - النسخة التفاعلية الجديدة 🎯
import { useState, useMemo } from "react";
import { useLang } from "../context/LanguageContext";

const SkuBarcodeToggle = ({ sku, barcode }) => {
  const { lang } = useLang();
  const [hoveredItem, setHoveredItem] = useState(null); // 'sku' | 'barcode' | null
  const isRTL = lang === "ar";

  // ✅ التحقق من وجود البيانات
  const hasSku = sku && String(sku).trim();
  const hasBarcode = barcode && String(barcode).trim();
  const hasBoth = hasSku && hasBarcode;

  // ✅ توليد خطوط الباركود بشكل ديناميكي
  const barcodeLines = useMemo(() => {
    if (!hasBarcode) return [];
    const lines = [];
    const code = String(barcode).trim();
    
    for (let i = 0; i < code.length; i++) {
      const digit = parseInt(code[i]) || 0;
      const width = digit % 3 === 0 ? "w-[4px]" : digit % 2 === 0 ? "w-[3px]" : "w-[2px]";
      const height = digit % 4 === 0 ? "h-10" : "h-8";
      lines.push({ width, height, key: i });
    }
    return lines;
  }, [barcode, hasBarcode]);

  // ✅ إذا لا يوجد شيء للعرض
  if (!hasSku && !hasBarcode) return null;

  // ✅ إذا يوجد واحد فقط
  if (!hasBoth) {
    return (
      <div className="flex items-center justify-center py-3">
        <div className="group relative bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl px-6 py-4 shadow-sm hover:shadow-md transition-all duration-500 hover:border-pink-200">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-pink-500/5 to-pink-500/0 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-500" />
          
          {hasBarcode ? (
            <div className="flex items-center gap-4 relative z-10">
              <div className="flex items-end gap-0.5 h-10">
                {barcodeLines.map((line, idx) => (
                  <div
                    key={line.key}
                    className={`${line.width} ${line.height} bg-gray-900 rounded-sm transition-all duration-300 group-hover:bg-gray-800`}
                    style={{ animationDelay: `${idx * 20}ms` }}
                  />
                ))}
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Barcode</span>
                <span className="text-sm font-mono font-bold text-gray-900 tracking-wider">{barcode}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center shadow-lg shadow-pink-500/30 group-hover:scale-110 transition-transform duration-500">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black uppercase tracking-widest text-pink-600 block mb-1">SKU</span>
                <span className="text-sm font-mono font-bold text-gray-900">{sku}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ✅ الوضع التفاعلي: كلاهما موجود - التصميم الجديد
  return (
    <div 
      className="flex items-center justify-center py-4"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div 
        className="relative w-full max-w-md"
        onMouseLeave={() => setHoveredItem(null)}
      >
        {/* ===== الحاوية الرئيسية ===== */}
        <div className="relative bg-gradient-to-br from-gray-50 via-white to-gray-50 border-2 border-gray-200 rounded-3xl px-6 py-5 shadow-lg overflow-hidden">
          
          {/* ===== الخلفية المتحركة ===== */}
          <div className={`
            absolute inset-0 transition-all duration-700 ease-out
            ${hoveredItem === 'sku' ? 'bg-gradient-to-br from-pink-50/50 via-white to-gray-50' : ''}
            ${hoveredItem === 'barcode' ? 'bg-gradient-to-br from-gray-900/5 via-white to-gray-900/5' : ''}
          `} />

          {/* ===== المنطقة الوسطى - العرض الرئيسي ===== */}
          <div className="relative z-10 flex items-center justify-between h-16">
            
            {/* ===== أيقونة الباركود (يسار) ===== */}
            <button
              onMouseEnter={() => setHoveredItem('barcode')}
              className={`
                relative flex items-center justify-center
                w-12 h-12 rounded-xl
                transition-all duration-700 ease-out
                ${hoveredItem === 'barcode' 
                  ? 'bg-gradient-to-br from-gray-900 to-gray-800 text-white scale-110 shadow-lg shadow-gray-900/30' 
                  : hoveredItem === 'sku'
                  ? 'bg-gray-100 text-gray-400 scale-90 opacity-50'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              <svg 
                className="w-6 h-6 transition-transform duration-500"
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>

            {/* ===== المحتوى الأوسط ===== */}
            <div className="flex-1 flex items-center justify-center px-4">
              {/* SKU Display */}
              <div className={`
                absolute transition-all duration-700 ease-out
                ${hoveredItem === 'sku' 
                  ? 'opacity-100 translate-x-0 scale-100' 
                  : 'opacity-0 -translate-x-8 scale-95 pointer-events-none'
                }
              `}>
                <div className="text-center">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-pink-600 block mb-1">SKU</span>
                  <span className="text-base font-mono font-bold text-gray-900 tracking-wide">{sku}</span>
                </div>
              </div>

              {/* Barcode Display */}
              <div className={`
                absolute transition-all duration-700 ease-out
                ${hoveredItem === 'barcode' 
                  ? 'opacity-100 translate-x-0 scale-100' 
                  : 'opacity-0 translate-x-8 scale-95 pointer-events-none'
                }
              `}>
                <div className="text-center">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-1">Barcode</span>
                  <span className="text-base font-mono font-bold text-gray-900 tracking-wider">{barcode}</span>
                </div>
              </div>

              {/* Default State - Show both icons in center */}
              <div className={`
                flex items-center gap-3 transition-all duration-700
                ${hoveredItem ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
              `}>
                <div className="flex items-end gap-0.5 h-8">
                  {barcodeLines.slice(0, 5).map((line, idx) => (
                    <div
                      key={line.key}
                      className={`${line.width} ${line.height} bg-gray-400 rounded-sm`}
                    />
                  ))}
                </div>
                <span className="text-xs font-bold text-gray-400">|</span>
                <div className="w-6 h-6 rounded-lg bg-pink-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* ===== أيقونة SKU (يمين) ===== */}
            <button
              onMouseEnter={() => setHoveredItem('sku')}
              className={`
                relative flex items-center justify-center
                w-12 h-12 rounded-xl
                transition-all duration-700 ease-out
                ${hoveredItem === 'sku' 
                  ? 'bg-gradient-to-br from-pink-500 to-pink-600 text-white scale-110 shadow-lg shadow-pink-500/30' 
                  : hoveredItem === 'barcode'
                  ? 'bg-gray-100 text-gray-400 scale-90 opacity-50'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              <svg 
                className="w-6 h-6 transition-transform duration-500"
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </button>
          </div>

          {/* ===== المؤشرات السفلية ===== */}
          <div className="relative z-10 flex justify-center gap-2 mt-3">
            <div className={`
              w-1.5 h-1.5 rounded-full transition-all duration-500
              ${hoveredItem === 'sku' ? 'bg-pink-500 scale-125' : 'bg-gray-300'}
            `} />
            <div className={`
              w-1.5 h-1.5 rounded-full transition-all duration-500
              ${hoveredItem === 'barcode' ? 'bg-gray-800 scale-125' : 'bg-gray-300'}
            `} />
          </div>
        </div>

        {/* ===== تأثيرات الهالة ===== */}
        <div className={`
          absolute -inset-1 rounded-3xl blur-xl -z-10 transition-all duration-700
          ${hoveredItem === 'sku' ? 'bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-pink-500/20 opacity-100' : 'opacity-0'}
        `} />
        <div className={`
          absolute -inset-1 rounded-3xl blur-xl -z-10 transition-all duration-700
          ${hoveredItem === 'barcode' ? 'bg-gradient-to-r from-gray-900/20 via-gray-800/20 to-gray-900/20 opacity-100' : 'opacity-0'}
        `} />
      </div>
    </div>
  );
};

export default SkuBarcodeToggle;