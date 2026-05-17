import { createContext, useState, useContext, useEffect, useMemo, useCallback } from "react";

const CartContext = createContext();

// ✅ ثابت مفاتيح التخزين لتجنب الأخطاء
const STORAGE_KEY = "beauty_cart";

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      const savedCart = localStorage.getItem(STORAGE_KEY);
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
      console.error("Error loading cart from localStorage:", error);
      return [];
    }
  });

  // 🔄 حفظ السلة في الـ localStorage مع Debounce بسيط
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
    } catch (error) {
      console.error("Error saving cart to localStorage:", error);
    }
  }, [cartItems]);

  // ➕ إضافة منتج للسلة (مع دعم الكمية والمتغيرات)
  const addToCart = useCallback((product, variant = null, quantity = 1) => {
    if (!product?.id) {
      console.error("Invalid product:", product);
      return;
    }
    
    setCartItems((prev) => {
      const isExist = prev.find(
        (item) => item.id === product.id && item.selectedVariant?.id === variant?.id
      );

      if (isExist) {
        return prev.map((item) =>
          item.id === product.id && item.selectedVariant?.id === variant?.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { ...product, selectedVariant: variant, quantity }];
    });
  }, []);

  // ❌ حذف منتج من السلة
  const removeFromCart = useCallback((id, variantId) => {
    setCartItems((prev) =>
      prev.filter((item) => !(item.id === id && item.selectedVariant?.id === variantId))
    );
  }, []);

  // 🔄 تحديث كمية منتج
  const updateQuantity = useCallback((id, variantId, newQty) => {
    if (newQty < 1) {
      removeFromCart(id, variantId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === id && item.selectedVariant?.id === variantId
          ? { ...item, quantity: newQty }
          : item
      )
    );
  }, [removeFromCart]);

  // 🗑️ تفريغ السلة بالكامل
  const clearCart = useCallback(() => {
    setCartItems([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // ✅ حساب إجمالي القطع (مُحسّن بـ useMemo)
  const cartCount = useMemo(
    () => cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0),
    [cartItems]
  );

  // ✅ حساب إجمالي القيمة (مع دعم المتغيرات)
  const cartTotal = useMemo(
    () =>
      cartItems.reduce((total, item) => {
        const price = item.selectedVariant?.price ?? item.price ?? 0;
        return total + price * (item.quantity || 1);
      }, 0),
    [cartItems]
  );

  // 📦 الحصول على منتج معين من السلة
  const getCartItem = useCallback((id, variantId) => {
    return cartItems.find(
      (item) => item.id === id && item.selectedVariant?.id === variantId
    );
  }, [cartItems]);

  // 📊 التحقق إذا كان المنتج في السلة
  const isInCart = useCallback((id, variantId) => {
    return cartItems.some(
      (item) => item.id === id && item.selectedVariant?.id === variantId
    );
  }, [cartItems]);

  const value = useMemo(() => ({
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartItem,
    isInCart,
    cartCount,
    cartTotal,
  }), [cartItems, addToCart, removeFromCart, updateQuantity, clearCart, getCartItem, isInCart, cartCount, cartTotal]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

// ✅ Custom Hook مع تحقق من السياق
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider. Wrap your app with <CartProvider>.");
  }
  return context;
};

export default CartContext;