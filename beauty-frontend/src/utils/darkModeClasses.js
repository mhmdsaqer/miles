// src/utils/darkModeClasses.js

// ✅ دالة مساعدة لدمج الـ classes مع دعم dark mode
export const dm = (light, dark) => `${light} ${dark ? `dark:${dark}` : ''}`;

// ✅ قوالب جاهزة للاستخدام
export const classes = {
  // الخلفيات
  bg: {
    primary: "bg-white dark:bg-gray-900",
    secondary: "bg-gray-50 dark:bg-gray-800",
    accent: "bg-pink-50 dark:bg-pink-900/20",
  },
  // النصوص
  text: {
    primary: "text-gray-900 dark:text-white",
    secondary: "text-gray-500 dark:text-gray-400",
    accent: "text-pink-600 dark:text-pink-400",
  },
  // الحدود
  border: {
    light: "border-gray-100 dark:border-gray-800",
    medium: "border-gray-200 dark:border-gray-700",
  },
  // الجداول
  table: {
    header: "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700",
    row: "border-gray-50 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/50",
  },
  // الحقول
  input: "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500",
};
