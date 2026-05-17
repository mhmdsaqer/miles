// src/App.jsx
import { Toaster } from "sonner";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Shop from "./pages/Shop";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import Brands from "./pages/Brands";
import BrandDetails from "./pages/BrandDetails";
import Home from "./pages/Home";
import Checkout from "./pages/Checkout";


// ✅ استيراد صفحات الـ Admin
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminBrands from "./pages/admin/AdminBrands";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminOrders from "./pages/admin/AdminOrders";

import AdminUsers from "./pages/admin/AdminUsers";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";


// ✅ مكون داخلي للتحكم في عرض الـ Navbar بناءً على المسار
const AppContent = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <div className="min-h-screen bg-white">
      {/* ✅ إخفاء الـ Navbar الرئيسي تلقائياً عند الدخول لصفحات الأدمن */}
      {!isAdminRoute && <Navbar />}
      
      <Routes>
        {/* === Public Routes === */}
        <Route path="/"            element={<Home />} />
        <Route path="/shop"        element={<Shop />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/cart"        element={<Cart />} />
        <Route path="/brands"      element={<Brands />} />
        <Route path="/brands/:id"  element={<BrandDetails />} />
        <Route path="/checkout"    element={<Checkout />} />

        {/* === Admin Routes === */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin"       element={<AdminLayout />}>
          <Route path="dashboard"  element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="brands" element={<AdminBrands />} />
            <Route path="categories" element={<AdminCategories />} /> 
            <Route path="orders" element={<AdminOrders />} />
            <Route path="users" element={<AdminUsers />} /> {/* ✅ هذا السطر الجديد */}
            <Route path="audit-logs" element={<AdminAuditLogs />} />
        </Route>
      </Routes>
      {/* ✅ 2. أضف هذا المكون في نهاية AppContent */}
      <Toaster position="top-right" richColors closeButton duration={4000} />
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
