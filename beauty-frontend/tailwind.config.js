/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Almarai', 'Inter', 'system-ui', 'sans-serif'],
        arabic: ['Almarai', 'sans-serif'],
        latin: ['Inter', 'sans-serif'],
      },
      // ✅ إضافة ألوان مخصصة إذا لزم
      colors: {
        pink: {
          50: '#fdf2f8',
          100: '#fce7f3',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
        }
      },
      // ✅ تحسينات الـ Animation
      animation: {
        fadeIn: 'fadeIn 0.6s cubic-bezier(0.23, 1, 0.32, 1) forwards',
        slideIn: 'slideIn 0.3s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        }
      }
    },
  },
  // ✅ إزالة الـ Plugin المعطّل - لا نحتاجه مع نهجنا الحالي
  plugins: [],
  // ✅ دعم الـ Safe List للعناصر الديناميكية (اختياري)
  safelist: [
    'dir-rtl',
    'dir-ltr',
    'text-right',
    'text-left',
    'flex-row',
    'flex-row-reverse',
    'border-l',
    'border-r',
    'ml-2',
    'mr-2',
    'pl-4',
    'pr-4',
  ]
}