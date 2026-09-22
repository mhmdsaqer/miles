// src/components/SkuBarcodeToggle.jsx - النسخة الفاخرة الجديدة ✨
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

  // ✅ الوضع التفاعلي: كلاهما موجود - التصميم الفاخر
  return (
    <div className="flex items-center justify-center py-4" dir={isRTL ? "rtl" : "ltr"}>
      <div className="relative flex items-center gap-3">
        
        {/* ===== بطاقة SKU ===== */}
        <div
          onMouseEnter={() => setHoveredItem('sku')}
          onMouseLeave={() => setHoveredItem(null)}
          className={`
            relative group cursor-pointer
            transition-all duration-700 ease-out
            ${hoveredItem === 'sku' ? 'scale-110 z-20' : 'scale-100 z-10'}
            ${hoveredItem === 'barcode' ? 'scale-95 opacity-60' : 'opacity-100'}
          `}
        >
          <div className={`
            bg-gradient-to-br from-white to-gray-50 
            border-2 rounded-2xl px-5 py-4 
            shadow-lg hover:shadow-xl
            transition-all duration-500
            ${hoveredItem === 'sku' 
              ? 'border-pink-400 shadow-pink-500/20' 
              : 'border-gray-200'}
          `}>
            <div className="flex items-center gap-3">
              <div className={`
                w-11 h-11 rounded-xl flex items-center justify-center
                transition-all duration-500
                ${hoveredItem === 'sku'
                  ? 'bg-gradient-to-br from-pink-500 to-pink-600 shadow-lg shadow-pink-500/40 scale-110'
                  : 'bg-gradient-to-br from-gray-100 to-gray-200'}
              `}>
                <svg 
                  className={`w-5 h-5 transition-colors duration-500 ${
                    hoveredItem === 'sku' ? 'text-white' : 'text-gray-600'
                  }`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div className="text-right">
                <span className={`
                  text-[9px] font-black uppercase tracking-[0.2em] block mb-1
                  transition-colors duration-500
                  ${hoveredItem === 'sku' ? 'text-pink-600' : 'text-gray-400'}
                `}>
                  SKU
                </span>
                <span className={`
                  text-sm font-mono font-bold tracking-wide
                  transition-colors duration-500
                  ${hoveredItem === 'sku' ? 'text-gray-900' : 'text-gray-600'}
                `}>
                  {sku}
                </span>
              </div>
            </div>
          </div>
          
          {/* تأثير الهالة */}
          <div className={`
            absolute inset-0 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-pink-500/20 
            rounded-2xl blur-xl -z-10
            transition-opacity duration-500
            ${hoveredItem === 'sku' ? 'opacity-100' : 'opacity-0'}
          `} />
        </div>

        {/* ===== الفاصل المتحرك ===== */}
        <div className={`
          w-px h-12 bg-gradient-to-b from-transparent via-gray-300 to-transparent
          transition-all duration-500
          ${hoveredItem ? 'opacity-30' : 'opacity-100'}
        `} />

        {/* ===== بطاقة الباركود ===== */}
        <div
          onMouseEnter={() => setHoveredItem('barcode')}
          onMouseLeave={() => setHoveredItem(null)}
          className={`
            relative group cursor-pointer
            transition-all duration-700 ease-out
            ${hoveredItem === 'barcode' ? 'scale-110 z-20' : 'scale-100 z-10'}
            ${hoveredItem === 'sku' ? 'scale-95 opacity-60' : 'opacity-100'}
          `}
        >
          <div className={`
            bg-gradient-to-br from-gray-900 to-gray-800
            border-2 rounded-2xl px-5 py-4
            shadow-lg hover:shadow-xl
            transition-all duration-500
            ${hoveredItem === 'barcode'
              ? 'border-gray-700 shadow-gray-900/30'
              : 'border-gray-800'}
          `}>
            <div className="flex items-center gap-3">
              {/* الباركود البصري المتحرك */}
              <div className="flex items-end gap-0.5 h-10 bg-white/10 px-2 py-1.5 rounded-lg backdrop-blur-sm">
                {barcodeLines.map((line, idx) => (
                  <div
                    key={line.key}
                    className={`${line.width} ${line.height} bg-gradient-to-b from-white to-gray-300 rounded-sm transition-all duration-300 group-hover:from-pink-400 group-hover:to-pink-600`}
                    style={{ 
                      animationDelay: `${idx * 30}ms`,
                      transition: 'all 0.3s ease'
                    }}
                  />
                ))}
              </div>
              <div className="text-right">
                <span className={`
                  text-[9px] font-black uppercase tracking-[0.2em] block mb-1
                  transition-colors duration-500
                  ${hoveredItem === 'barcode' ? 'text-pink-400' : 'text-gray-400'}
                `}>
                  Barcode
                </span>
                <span className={`
                  text-sm font-mono font-bold tracking-wider
                  transition-colors duration-500
                  ${hoveredItem === 'barcode' ? 'text-white' : 'text-gray-300'}
                `}>
                  {barcode}
                </span>
              </div>
            </div>
          </div>
          
          {/* تأثير الهالة الداكنة */}
          <div className={`
            absolute inset-0 bg-gradient-to-r from-gray-900/40 via-gray-800/40 to-gray-900/40
            rounded-2xl blur-xl -z-10
            transition-opacity duration-500
            ${hoveredItem === 'barcode' ? 'opacity-100' : 'opacity-0'}
          `} />
        </div>

        {/* ===== المؤشرات السفلية ===== */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <div className={`
            w-2 h-2 rounded-full transition-all duration-500
            ${hoveredItem === 'sku' 
              ? 'bg-pink-500 scale-125 shadow-lg shadow-pink-500/50' 
              : 'bg-gray-300'}
          `} />
          <div className={`
            w-2 h-2 rounded-full transition-all duration-500
            ${hoveredItem === 'barcode' 
              ? 'bg-gray-800 scale-125 shadow-lg shadow-gray-900/50' 
              : 'bg-gray-300'}
          `} />
        </div>
      </div>
    </div>
  );
};

export default SkuBarcodeToggle;