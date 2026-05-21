// src/pages/admin/AdminOrders.jsx - النسخة مع نظام الصلاحيات + دعم الوضع الليلي
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLang } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext"; // ✅ إضافة جديدة
import { toast } from "sonner";
import { io } from "socket.io-client";
import { adminApi } from "../../utils/adminAuth";

const API_URL = "http://localhost:3000";
const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || "http://localhost:3000";


// ✅ دالة تصدير Excel - مع دعم اللغة والوضع الليلي
const exportOrdersToExcel = (orders, lang, isDark) => {
  try {
    const headers = [
      lang === "ar" ? "رقم الطلب" : "Order ID",
      lang === "ar" ? "التاريخ" : "Date",
      lang === "ar" ? "العميل" : "Customer",
      lang === "ar" ? "الهاتف" : "Phone",
      lang === "ar" ? "المدينة" : "City",
      lang === "ar" ? "العنوان" : "Address",
      lang === "ar" ? "المنتجات" : "Items",
      lang === "ar" ? "المجموع" : "Subtotal",
      lang === "ar" ? "التوصيل" : "Delivery",
      lang === "ar" ? "الإجمالي" : "Total",
      lang === "ar" ? "الدفع" : "Payment",
      lang === "ar" ? "الحالة" : "Status",
      lang === "ar" ? "ملاحظات" : "Notes"
    ];
    const rows = orders.map(order => [
      `#${order.id.toString().slice(-6)}`,
      new Date(order.receivedAt).toLocaleString(lang === "ar" ? "ar-PS" : "en-US"),
      order.fullName,
      order.phone,
      order.city,
      order.address,
      order.items.map(i => `${i.name} x${i.qty}`).join(" | "),
      order.subtotal?.toFixed(2),
      order.deliveryFee?.toFixed(2),
      order.total?.toFixed(2),
      order.paymentMethod === "cod" 
        ? (lang === "ar" ? "نقداً" : "Cash") 
        : (lang === "ar" ? "إلكتروني" : "Electronic"),
      order.status,
      order.adminNotes || ""
    ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","));
    
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `miles-orders-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(
      <div className="flex items-center gap-3">
        <span className="text-xl">📊</span>
        <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {lang === "ar" ? "تم تصدير الطلبات" : "Orders exported"}
        </span>
      </div>,
      { duration: 3000 }
    );
  } catch (err) {
    console.error("Export error:", err);
    toast.error(
      <div className="flex items-center gap-3">
        <span className="text-xl">❌</span>
        <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Export failed</span>
      </div>
    );
  }
};

// ✅ دالة طباعة طلب فردي - مع دعم اللغة الكامل
const printOrder = (order, lang) => {
  const isRTL = lang === "ar";
  const win = window.open("", "_blank", "width=800,height=900");
  win.document.write(`
    <html dir="${isRTL ? "rtl" : "ltr"}" lang="${lang}"><head><title>${isRTL ? "طلب" : "Order"} #${order.id}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 30px; color: #333; line-height: 1.6; }
      .header { border-bottom: 3px solid #ec4899; padding-bottom: 20px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; }
      .logo { font-size: 28px; font-weight: 900; color: #ec4899; letter-spacing: -1px; }
      .meta { text-align: ${isRTL ? "right" : "left"}; font-size: 14px; }
      .meta strong { color: #666; }
      table { width: 100%; border-collapse: collapse; margin: 25px 0; font-size: 14px; }
      th { background: #f8f8f8; padding: 12px 10px; text-align: ${isRTL ? "right" : "left"}; border-bottom: 2px solid #ddd; font-weight: 700; color: #555; }
      td { padding: 12px 10px; border-bottom: 1px solid #eee; }
      tr:last-child td { border-bottom: none; }
      .total-row { font-weight: 700; font-size: 16px; background: #f0fdf4; }
      .grand-total { font-size: 20px; background: #ecfdf5 !important; }
      .footer { margin-top: 50px; border-top: 2px dashed #ccc; padding-top: 20px; text-align: center; font-size: 12px; color: #777; }
      @media print { body { margin: 0; padding: 20px; } .no-print { display: none !important; } table { page-break-inside: avoid; } }
    </style></head><body>
    <div class="header">
      <div class="logo">MILES BEAUTY</div>
      <div class="meta">
        <div>📅 ${new Date(order.receivedAt).toLocaleString(isRTL ? "ar-PS" : "en-US")}</div>
        <div>📋 #${order.id.toString().slice(-6)}</div>
        <div>📦 ${order.status}</div>
      </div>
    </div>
    <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:20px; margin-bottom:25px;">
      <div class="meta"><strong>👤 ${isRTL ? "العميل" : "Customer"}:</strong><br>${order.fullName}<br>📞 ${order.phone}${order.email ? `<br>📧 ${order.email}` : ""}</div>
      <div class="meta"><strong>📍 ${isRTL ? "العنوان" : "Address"}:</strong><br>${order.city}<br>${order.address}</div>
      <div class="meta"><strong>💳 ${isRTL ? "الدفع" : "Payment"}:</strong><br>${order.paymentMethod === "cod" ? (isRTL ? "نقداً عند الاستلام" : "Cash on Delivery") : (isRTL ? "إلكتروني" : "Electronic")}<br>${order.notes ? `<strong>📝 ${isRTL ? "ملاحظات" : "Notes"}:</strong><br>${order.notes}` : ""}</div>
    </div>
    <table>
      <thead><tr><th>${isRTL ? "المنتج" : "Product"}</th><th>${isRTL ? "الكمية" : "Qty"}</th><th>${isRTL ? "السعر" : "Price"}</th><th>${isRTL ? "الإجمالي" : "Total"}</th></tr></thead>
      <tbody>
        ${order.items.map(i => `<tr><td>${i.name}${i.variant ? ` (${i.variant})` : ""}</td><td>${i.qty}</td><td>₪${i.price.toFixed(2)}</td><td>₪${(i.qty*i.price).toFixed(2)}</td></tr>`).join("")}
        <tr class="total-row"><td colspan="3" style="text-align:${isRTL ? "left" : "right"}">${isRTL ? "المجموع الفرعي" : "Subtotal"}</td><td>₪${order.subtotal.toFixed(2)}</td></tr>
        <tr class="total-row"><td colspan="3" style="text-align:${isRTL ? "left" : "right"}">${isRTL ? "رسوم التوصيل" : "Delivery"}</td><td>₪${order.deliveryFee.toFixed(2)}</td></tr>
        <tr class="total-row grand-total"><td colspan="3" style="text-align:${isRTL ? "left" : "right"}">${isRTL ? "الإجمالي النهائي" : "Grand Total"}</td><td>₪${order.total.toFixed(2)}</td></tr>
      </tbody>
    </table>
    <div class="footer">
      <div>🌹 ${isRTL ? "شكراً لتسوقك من MILES Beauty Store" : "Thank you for shopping with MILES Beauty Store"}</div>
      <div style="margin-top:8px;">${isRTL ? "جميع الحقوق محفوظة ©" : "©"} ${new Date().getFullYear()}</div>
      <div style="margin-top:8px; font-size:10px; color:#999;">${isRTL ? "تم طباعة هذا المستند تلقائياً من لوحة التحكم" : "This document was auto-generated from admin panel"}</div>
    </div>
    </body></html>
  `);
  win.document.close();
  setTimeout(() => { win.print(); }, 300);
};

// ✅ دالة طباعة جميع الطلبات - مع دعم اللغة
const printAllOrders = (orders, lang) => {
  const isRTL = lang === "ar";
  if (!orders || orders.length === 0) return toast.warning(isRTL ? "لا توجد طلبات للطباعة" : "No orders to print");
  
  const win = window.open("", "_blank", "width=1000,height=800");
  win.document.write(`
    <html dir="${isRTL ? "rtl" : "ltr"}" lang="${lang}"><head><title>${isRTL ? "تقرير الطلبات" : "Orders Report"}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 20px; color: #333; }
      .header { display:flex; justify-content:space-between; border-bottom:3px solid #ec4899; padding-bottom:15px; margin-bottom:20px; }
      .title { font-size:22px; font-weight:900; color:#1a1a1a; }
      .info { text-align: ${isRTL ? "right" : "left"}; font-size:13px; color:#666; }
      table { width:100%; border-collapse:collapse; font-size:13px; }
      th { background:#f8f8f8; padding:10px; text-align: ${isRTL ? "right" : "left"}; border-bottom:2px solid #ddd; font-weight:700; }
      td { padding:10px; border-bottom:1px solid #eee; }
      .status { padding:3px 8px; border-radius:4px; font-size:11px; font-weight:700; }
      .status.pending { background:#fef3c7; color:#92400e; }
      .status.confirmed { background:#dbeafe; color:#1e40af; }
      .status.shipped { background:#ede9fe; color:#5b21b6; }
      .status.delivered { background:#dcfce7; color:#166534; }
      .status.cancelled { background:#fee2e2; color:#991b1b; }
      .footer { margin-top:30px; text-align:center; font-size:11px; color:#888; border-top:1px dashed #ccc; padding-top:15px; }
      @media print { .no-print { display:none !important; } }
    </style></head><body>
    <div class="header">
      <div class="title">📦 ${isRTL ? "تقرير طلبات MILES Beauty" : "MILES Beauty Orders Report"}</div>
      <div class="info">
        <div>📅 ${new Date().toLocaleDateString(isRTL ? "ar-PS" : "en-US")} | ${new Date().toLocaleTimeString(isRTL ? "ar-PS" : "en-US")}</div>
        <div>📊 ${orders.length} ${isRTL ? "طلب" : "orders"}</div>
      </div>
    </div>
    <table>
      <thead><tr><th>ID</th><th>${isRTL ? "التاريخ" : "Date"}</th><th>${isRTL ? "العميل" : "Customer"}</th><th>${isRTL ? "المدينة" : "City"}</th><th>${isRTL ? "المنتجات" : "Items"}</th><th>${isRTL ? "الإجمالي" : "Total"}</th><th>${isRTL ? "الحالة" : "Status"}</th></tr></thead>
      <tbody>
        ${orders.map(o => `<tr>
          <td style="font-family:monospace">#${o.id.toString().slice(-6)}</td>
          <td>${new Date(o.receivedAt).toLocaleDateString(isRTL ? "ar-PS" : "en-US")}</td>
          <td>${o.fullName}<br><small style="color:#888">${o.phone}</small></td>
          <td>${o.city}</td>
          <td>${o.items.length} ${isRTL ? "صنف" : "item(s)"}</td>
          <td style="font-weight:700">₪${o.total.toFixed(2)}</td>
          <td><span class="status ${o.status}">${o.status}</span></td>
        </tr>`).join("")}
      </tbody>
    </table>
    <div class="footer">
      <div>✨ ${isRTL ? "تم التوليد تلقائياً من لوحة التحكم" : "Auto-generated from admin dashboard"}</div>
      <div style="margin-top:5px;">MILES Beauty Store • ${new Date().getFullYear()}</div>
    </div>
    </body></html>
  `);
  win.document.close();
  setTimeout(() => { win.print(); }, 300);
};

const AdminOrders = () => {
  const { lang, t } = useLang();
  const { user, hasPermission } = useAuth();
  const { isDark } = useTheme(); // ✅ إضافة جديدة
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, total: 0 });
  
  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState({ from: "", to: "" });
  
  // UI State
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [newOrderNotification, setNewOrderNotification] = useState(null);
  
  const socketRef = useRef(null);
  const isRTL = lang === "ar";

  // ✅ دوال التحقق من الصلاحيات
  const canRead = useMemo(() => hasPermission("orders:read"), [hasPermission]);
  const canUpdateStatus = useMemo(() => hasPermission("orders:update_status"), [hasPermission]);
  const canAddNotes = useMemo(() => hasPermission("orders:add_notes"), [hasPermission]);
  const canDelete = useMemo(() => hasPermission("orders:delete"), [hasPermission]);
  const canExport = useMemo(() => hasPermission("reports:export_data"), [hasPermission]);

  // ✅ مناطق التوصيل - مع دعم اللغة
  const DELIVERY_CITIES = useMemo(() => [
    { id: "all", name: lang === "ar" ? "كل المدن" : "All Cities" },
    { id: "nablus", name: lang === "ar" ? "نابلس" : "Nablus" },
    { id: "ramallah", name: lang === "ar" ? "رام الله والبيرة" : "Ramallah & Al-Bireh" },
    { id: "jenin", name: lang === "ar" ? "جنين" : "Jenin" },
    { id: "tulkarm", name: lang === "ar" ? "طولكرم" : "Tulkarm" },
    { id: "qalqilya", name: lang === "ar" ? "قلقيلية" : "Qalqilya" },
    { id: "salfit", name: lang === "ar" ? "سلفيت" : "Salfit" },
    { id: "tubas", name: lang === "ar" ? "طوباس والأغوار" : "Tubas & Jordan Valley" },
    { id: "jericho", name: lang === "ar" ? "أريحا" : "Jericho" },
    { id: "bethlehem", name: lang === "ar" ? "بيت لحم" : "Bethlehem" },
    { id: "hebron", name: lang === "ar" ? "الخليل" : "Hebron" },
    { id: "jerusalem", name: lang === "ar" ? "القدس" : "Jerusalem" },
    { id: "inside48", name: lang === "ar" ? "الداخل المحتل (48)" : "Inside 1948 Territories" },
  ], [lang]);

  // ✅ فلترة الطلبات
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (search) {
        const q = search.toLowerCase();
        const matchSearch = 
          order.fullName?.toLowerCase().includes(q) ||
          order.phone?.includes(q) ||
          order.city?.toLowerCase().includes(q) ||
          order.items?.some(i => i.name?.toLowerCase().includes(q) || i.sku?.toLowerCase().includes(q));
        if (!matchSearch) return false;
      }
      if (statusFilter !== "all" && order.status !== statusFilter) return false;
      if (cityFilter !== "all" && order.city !== cityFilter) return false;
      if (dateFilter.from || dateFilter.to) {
        const orderDate = new Date(order.receivedAt);
        if (dateFilter.from && orderDate < new Date(dateFilter.from)) return false;
        if (dateFilter.to && orderDate > new Date(dateFilter.to + "T23:59:59")) return false;
      }
      return true;
    });
  }, [orders, search, statusFilter, cityFilter, dateFilter]);

  // ✅ جلب الطلبات
  const fetchOrders = useCallback(async (page = 1, reset = false) => {
    if (!canRead) {
      toast.error(
        <div className="flex items-center gap-3">
          <span className="text-xl">❌</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {lang === "ar" ? "غير مصرح بعرض الطلبات" : "Forbidden - No read permission"}
          </span>
        </div>,
        { duration: 4000 }
      );
      return;
    }
    try {
      if (reset) setLoading(true); else setLoadingMore(true);
      const params = {
        page, limit: 20,
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(cityFilter !== "all" && { city: cityFilter }),
        ...(search && { search }),
        ...(dateFilter.from && { startDate: dateFilter.from }),
        ...(dateFilter.to && { endDate: dateFilter.to })
      };
      const res = await adminApi.get("/whatsapp-orders", { params });
      if (reset) setOrders(res.data.orders); else setOrders(prev => [...prev, ...res.data.orders]);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      toast.error(
        <div className="flex items-center gap-3">
          <span className="text-xl">❌</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {lang === "ar" ? "فشل تحميل الطلبات" : "Failed to load orders"}
          </span>
        </div>,
        { duration: 4000 }
      );
    } finally { setLoading(false); setLoadingMore(false); }
  }, [statusFilter, cityFilter, search, dateFilter, lang, canRead, isDark]);

  // ✅ Socket.io
  useEffect(() => {
    if (!canRead) return;
    if (socketRef.current?.connected) return;
    socketRef.current = io(SOCKET_URL, { transports: ["websocket", "polling"], reconnection: true, reconnectionAttempts: 5 });
    socketRef.current.on("connect", () => console.log("✅ Socket connected:", socketRef.current?.id));
    socketRef.current.on("new-order", (order) => {
      setOrders(prev => { 
        if (prev.some(o => o.id === order.id)) return prev; 
        return [order, ...prev]; 
      });
      
      setPagination(prev => ({
        ...prev,
        total: prev.total + 1,
        totalPages: Math.ceil((prev.total + 1) / 20)
      }));
      
      setNewOrderNotification({ id: order.id, name: order.fullName, total: order.total, time: new Date() });
      try { 
        const audio = new Audio("/notification-sound.mp3"); 
        audio.volume = 0.3; 
        audio.play().catch(() => {}); 
      } catch (e) {}
      
      toast.success(
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${isDark ? 'bg-green-900/30' : 'bg-green-100'}`}>🔔</div>
          <div>
            <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
              🎉 {lang === "ar" ? "طلب جديد!" : "New Order!"}
            </p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {order.fullName} • ₪{order.total?.toFixed(2)}
            </p>
          </div>
        </div>, 
        { duration: 6000, position: "top-center" }
      );
      
      setTimeout(() => setNewOrderNotification(null), 5000);
    });
    socketRef.current.on("order-updated", ({ id, status }) => {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status, updatedAt: new Date() } : o));
      toast.info(
        <div className="flex items-center gap-3">
          <span className="text-xl">📦</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Order #{id.toString().slice(-6)} → {status}
          </span>
        </div>
      );
    });
    return () => { if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; } };
  }, [lang, canRead, isDark]);

  useEffect(() => { 
    if (canRead) {
      const timer = setTimeout(() => fetchOrders(1, true), 300); 
      return () => clearTimeout(timer); 
    }
  }, [fetchOrders, canRead]);

  // ✅ تحديث الحالة
  const updateStatus = useCallback(async (id, newStatus) => {
    if (!canUpdateStatus) {
      toast.error(
        <div className="flex items-center gap-3">
          <span className="text-xl">❌</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {lang === "ar" ? "غير مصرح بتحديث حالة الطلبات" : "Forbidden - No update status permission"}
          </span>
        </div>,
        { duration: 4000 }
      );
      return;
    }
    try {
      await adminApi.put(`/whatsapp-orders/${id}`, { status: newStatus });
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus, updatedAt: new Date() } : o));
      toast.success(
        <div className="flex items-center gap-3">
          <span className="text-xl">✅</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {lang === "ar" ? "تم تحديث الحالة" : "Status updated"}
          </span>
        </div>,
        { duration: 3000 }
      );
    } catch (err) { 
      toast.error(
        <div className="flex items-center gap-3">
          <span className="text-xl">❌</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Failed to update status</span>
        </div>
      ); 
    }
  }, [lang, canUpdateStatus, isDark]);

  // ✅ حفظ الملاحظة
  const saveNote = useCallback(async (id) => {
    if (!canAddNotes) {
      toast.error(
        <div className="flex items-center gap-3">
          <span className="text-xl">❌</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {lang === "ar" ? "غير مصرح بإضافة ملاحظات" : "Forbidden - No add notes permission"}
          </span>
        </div>,
        { duration: 4000 }
      );
      return;
    }
    try {
      await adminApi.put(`/whatsapp-orders/${id}`, { adminNotes: noteText });
      setOrders(prev => prev.map(o => o.id === id ? { ...o, adminNotes: noteText, updatedAt: new Date() } : o));
      setEditingNoteId(null); setNoteText("");
      toast.success(
        <div className="flex items-center gap-3">
          <span className="text-xl">✅</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {lang === "ar" ? "تم حفظ الملاحظة" : "Note saved"}
          </span>
        </div>,
        { duration: 3000 }
      );
    } catch (err) { 
      toast.error(
        <div className="flex items-center gap-3">
          <span className="text-xl">❌</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Failed to save note</span>
        </div>
      ); 
    }
  }, [noteText, lang, canAddNotes, isDark]);

  const formatDate = useCallback((iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString(lang === "ar" ? "ar-PS" : "en-US", { timeZone: "Asia/Hebron", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }, [lang]);

  const getStatusStyle = useCallback((status) => ({
    pending: isDark ? "bg-amber-900/30 text-amber-400 border-amber-800" : "bg-amber-50 text-amber-700 border-amber-200",
    confirmed: isDark ? "bg-blue-900/30 text-blue-400 border-blue-800" : "bg-blue-50 text-blue-700 border-blue-200",
    shipped: isDark ? "bg-purple-900/30 text-purple-400 border-purple-800" : "bg-purple-50 text-purple-700 border-purple-200",
    delivered: isDark ? "bg-green-900/30 text-green-400 border-green-800" : "bg-green-50 text-green-700 border-green-200",
    cancelled: isDark ? "bg-red-900/30 text-red-400 border-red-800" : "bg-red-50 text-red-700 border-red-200"
  }[status] || (isDark ? "bg-gray-700 text-gray-300 border-gray-600" : "bg-gray-50 text-gray-700 border-gray-200")), [isDark]);

  const getStatusLabel = useCallback((status) => ({
    pending: lang === "ar" ? "⏳ قيد الانتظار" : "⏳ Pending",
    confirmed: lang === "ar" ? "✅ مؤكد" : "✅ Confirmed",
    shipped: lang === "ar" ? "🚚 تم الشحن" : "🚚 Shipped",
    delivered: lang === "ar" ? "📦 تم التسليم" : "📦 Delivered",
    cancelled: lang === "ar" ? "❌ ملغي" : "❌ Cancelled"
  }[status] || status), [lang]);

  const copySku = useCallback((sku) => { if (!sku) return; navigator.clipboard.writeText(sku); toast.success("📋 SKU copied"); }, []);
  
  const copyAddress = useCallback((order) => {
  // 1️⃣ ترجمة اسم المدينة تلقائياً من مصفوفة DELIVERY_CITIES
    const cityObj = DELIVERY_CITIES.find(c => c.id === order.city);
    const cityName = cityObj ? cityObj.name : order.city;

    // 2️⃣ تنسيق النص للنسخ (اسم + هاتف + مدينة + عنوان تفصيلي)
//const fullAddress = `👤 ${order.fullName}\n📞 ${order.phone}\n🏙️ ${cityName}\n📍 ${order.address}`;
    const fullAddress = ` ${cityName}\n📍 ${order.address}`;

    // 3️⃣ النسخ للحافظة
    navigator.clipboard.writeText(fullAddress);

    // 4️⃣ إشعار النجاح
    toast.success(
      <div className="flex items-center gap-3">
        <span className="text-xl">📍</span>
        <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {lang === "ar" ? "تم نسخ العنوان " : "Address & details copied"}
        </span>
      </div>,
      { duration: 3000 }
    );
  }, [lang, isDark, DELIVERY_CITIES]); // ✅ أضف DELIVERY_CITIES للـ dependencies

  // ✅ حذف طلب
  const deleteOrder = useCallback(async (id) => {
    if (!canDelete) {
      toast.error(
        <div className="flex items-center gap-3">
          <span className="text-xl">❌</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {lang === "ar" ? "غير مصرح بحذف الطلبات" : "Forbidden - No delete permission"}
          </span>
        </div>,
        { duration: 4000 }
      );
      return;
    }
    if (!window.confirm(lang === "ar" ? "حذف هذا الطلب؟" : "Delete this order?")) return;
    try {
      await adminApi.delete(`/whatsapp-orders/${id}`);
      setOrders(prev => prev.filter(o => o.id !== id));
      setPagination(prev => {
        const newTotal = Math.max(0, prev.total - 1);
        return { ...prev, total: newTotal, totalPages: Math.ceil(newTotal / 20) };
      });
      toast.success(
        <div className="flex items-center gap-3">
          <span className="text-xl">🗑️</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Deleted</span>
        </div>
      );
    } catch (err) { 
      console.error("Delete error:", err);
      toast.error(
        <div className="flex items-center gap-3">
          <span className="text-xl">❌</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Delete failed</span>
        </div>
      ); 
    }
  }, [lang, canDelete, isDark]);

  const toggleExpand = useCallback((id) => setExpandedOrderId(prev => prev === id ? null : id), []);
  const clearAllFilters = useCallback(() => { setSearch(""); setStatusFilter("all"); setCityFilter("all"); setDateFilter({ from: "", to: "" }); fetchOrders(1, true); }, [fetchOrders]);
  const handleLoadMore = useCallback(() => { if (!loadingMore && pagination.currentPage < pagination.totalPages) fetchOrders(pagination.currentPage + 1, false); }, [loadingMore, pagination, fetchOrders]);

  // ✅ حالة عدم وجود صلاحية القراءة
  if (!canRead) {
    return (
      <div className={`flex items-center justify-center min-h-[60vh] text-center transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'bg-white'}`} dir={isRTL ? "rtl" : "ltr"}>
        <div className="space-y-4">
          <div className="text-6xl">🔒</div>
          <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {lang === "ar" ? "وصول مرفوض" : "Access Denied"}
          </h2>
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            {lang === "ar" ? "لا تملك صلاحية عرض الطلبات" : "You don't have permission to view orders"}
          </p>
        </div>
      </div>
    );
  }

  if (loading && orders.length === 0) return (
    <div className={`flex justify-center p-12 font-bold transition-colors duration-300 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
      {lang === "ar" ? "جاري التحميل..." : "Loading..."}
    </div>
  );

  return (
    <div className={`space-y-6 transition-colors duration-300 ${isDark ? 'dark bg-gray-900' : ''}`} dir={isRTL ? "rtl" : "ltr"}>
      {/* إشعار طلب جديد */}
      {newOrderNotification && (
        <div className={`fixed top-20 ${isRTL ? 'right-6' : 'left-6'} z-50 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl animate-slideIn flex items-center gap-4`}>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">🎉</div>
          <div className={isRTL ? "text-right" : "text-left"}>
            <p className="font-black text-sm">{lang === "ar" ? "طلب جديد!" : "New Order Received!"}</p>
            <p className="text-xs opacity-90">{newOrderNotification.name} • ₪{newOrderNotification.total?.toFixed(2)}</p>
          </div>
          <button onClick={() => setNewOrderNotification(null)} className="ml-2 hover:opacity-70 transition">✕</button>
        </div>
      )}

      {/* ✅ Header & Filters & Print Buttons */}
      <div className={`rounded-[2rem] p-6 border shadow-sm space-y-4 transition-colors duration-300 ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className={isRTL ? "text-right" : "text-left"}>
            <h1 className={`text-3xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {lang === "ar" ? "طلبات الواتساب" : "WhatsApp Orders"}
            </h1>
            <p className={`text-sm mt-1 font-bold ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
              {pagination.total} {lang === "ar" ? "طلب" : "orders"}
              {(search || statusFilter !== "all" || cityFilter !== "all") && ` • ${lang === "ar" ? "بعد الفلترة" : "filtered"}: ${filteredOrders.length}`}
            </p>
          </div>
          <div className={`flex gap-2 ${isRTL ? "" : "flex-row-reverse"}`}>
            {canExport && (
              <>
                <button onClick={() => printAllOrders(filteredOrders, lang)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
                  isDark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-800 text-white hover:bg-gray-900'
                }`}>
                  🖨️ {lang === "ar" ? "طباعة الكل" : "Print All"}
                </button>
                <button onClick={() => exportOrdersToExcel(filteredOrders, lang, isDark)} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-green-700 transition">
                  📊 Excel
                </button>
              </>
            )}
          </div>
        </div>

        {/* فلاتر - مع دعم اللغة والوضع الليلي */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          <input 
            type="text" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder={lang === "ar" ? "🔍 بحث..." : "🔍 Search..."} 
            className={`rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-pink-500/30 transition-colors ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
            }`} 
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-pink-500/30 transition-colors ${
            isDark 
              ? 'bg-gray-700 border-gray-600 text-gray-100' 
              : 'bg-gray-50 border border-gray-200 text-gray-900'
          }`}>
            <option value="all">📋 {lang === "ar" ? "كل الحالات" : "All Status"}</option>
            <option value="pending">⏳ {lang === "ar" ? "قيد الانتظار" : "Pending"}</option>
            <option value="confirmed">✅ {lang === "ar" ? "مؤكد" : "Confirmed"}</option>
            <option value="shipped">🚚 {lang === "ar" ? "تم الشحن" : "Shipped"}</option>
            <option value="delivered">📦 {lang === "ar" ? "تم التسليم" : "Delivered"}</option>
            <option value="cancelled">❌ {lang === "ar" ? "ملغي" : "Cancelled"}</option>
          </select>
          <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className={`rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-pink-500/30 transition-colors ${
            isDark 
              ? 'bg-gray-700 border-gray-600 text-gray-100' 
              : 'bg-gray-50 border border-gray-200 text-gray-900'
          }`}>
            {DELIVERY_CITIES.map(city => (<option key={city.id} value={city.id}>{city.name}</option>))}
          </select>
          <input type="date" value={dateFilter.from} onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))} className={`rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-pink-500/30 transition-colors ${
            isDark 
              ? 'bg-gray-700 border-gray-600 text-gray-100' 
              : 'bg-gray-50 border border-gray-200 text-gray-900'
          }`} />
          <div className="flex gap-2">
            <input type="date" value={dateFilter.to} onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))} className={`flex-1 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-pink-500/30 transition-colors ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-gray-100' 
                : 'bg-gray-50 border border-gray-200 text-gray-900'
            }`} />
            <button onClick={clearAllFilters} className={`px-4 py-2.5 rounded-xl text-sm font-bold transition ${
              isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`} title={lang === "ar" ? "مسح الفلاتر" : "Clear filters"}>🔄</button>
          </div>
        </div>
      </div>

      {/* ✅ Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 && !loading ? (
          <div className={`text-center p-12 rounded-[2rem] border transition-colors duration-300 ${
            isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
          }`}>
            <p className={`font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{lang === "ar" ? "لا توجد طلبات مطابقة" : "No matching orders"}</p>
            <button onClick={clearAllFilters} className="text-pink-600 font-bold text-sm mt-2 hover:underline">{lang === "ar" ? "مسح الفلاتر" : "Clear filters"}</button>
          </div>
        ) : (
          filteredOrders.map(order => {
            const isExpanded = expandedOrderId === order.id;
            return (
              <div key={order.id} className={`rounded-[2rem] border shadow-sm overflow-hidden transition-all hover:shadow-md ${
                isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
              }`}>
                {/* Header */}
                <div className={`p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-50'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={isRTL ? "text-right" : "text-left"}>
                        <div className={`font-mono text-xs ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>#{order.id.toString().slice(-6)}</div>
                        <div className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{formatDate(order.receivedAt)}</div>
                      </div>
                      {canUpdateStatus ? (
                        <select value={order.status} onChange={(e) => updateStatus(order.id, e.target.value)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border outline-none cursor-pointer ${getStatusStyle(order.status)}`}>
                          <option value="pending">{getStatusLabel("pending")}</option>
                          <option value="confirmed">{getStatusLabel("confirmed")}</option>
                          <option value="shipped">{getStatusLabel("shipped")}</option>
                          <option value="delivered">{getStatusLabel("delivered")}</option>
                          <option value="cancelled">{getStatusLabel("cancelled")}</option>
                        </select>
                      ) : (
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${getStatusStyle(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      )}
                    </div>
                    <div className={`flex items-center gap-3 ${isRTL ? "" : "flex-row-reverse"}`}>
                      <div className={isRTL ? "text-right" : "text-left"}>
                        <div className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{order.fullName}</div>
                        <div className={`text-xs font-mono ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>{order.phone}</div>
                      </div>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${isDark ? 'bg-pink-900/30' : 'bg-pink-50'}`}>👤</div>
                    </div>
                    <div className={`flex items-center gap-4 ${isRTL ? "" : "flex-row-reverse"}`}>
                      <div className={isRTL ? "text-left" : "text-right"}>
                        <div className={`text-2xl font-black tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>₪{order.total?.toFixed(2)}</div>
                      </div>
                      <button onClick={() => toggleExpand(order.id)} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all hover:bg-gray-50 ${
                        isExpanded 
                          ? (isDark ? 'bg-gray-700 border-gray-600 rotate-180' : 'bg-gray-100 border-gray-200 rotate-180') 
                          : (isDark ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50')
                      }`}>
                        <svg className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* ✅ Expanded Details - مع تبسيط العنوان */}
                {isExpanded && (
                  <div className={`p-6 space-y-6 animate-fadeIn ${isDark ? 'bg-gray-750' : 'bg-gray-50/50'}`}>
                    {/* ✅ ✅ العنوان المبسط: المدينة + العنوان الكامل فقط */}
                    <div className={`rounded-xl p-4 border transition-colors duration-300 ${
                      isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
                    }`}>
                      <h4 className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isRTL ? "text-right" : "text-left"} ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                        📍 {lang === "ar" ? "عنوان التوصيل" : "Delivery Address"}
                      </h4>
                      <div className={`space-y-2 text-sm ${isRTL ? "text-right" : "text-left"}`}>
                        <div>
                          <span className={`text-[9px] block uppercase ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{lang === "ar" ? "المدينة" : "City"}</span>
                            <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {DELIVERY_CITIES.find(c => c.id === order.city)?.name || order.city}
                          </span>
                        </div>
                        <div>
                          <span className={`text-[9px] block uppercase ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{lang === "ar" ? "العنوان التفصيلي" : "Full Address"}</span>
                          <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{order.address}</span>
                        </div>
                      </div>
                      <button onClick={() => copyAddress(order)} className={`mt-3 text-[10px] hover:underline ${isRTL ? "text-right" : "text-left"} ${isDark ? 'text-gray-400 hover:text-pink-400' : 'text-gray-400 hover:text-pink-600'}`}>
                        📋 {lang === "ar" ? "نسخ العنوان" : "Copy Address"}
                      </button>
                    </div>

                    {/* Items */}
                    <div className={`rounded-xl p-4 border transition-colors duration-300 ${
                      isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
                    }`}>
                      <h4 className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isRTL ? "text-right" : "text-left"} ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                        📦 {lang === "ar" ? "تفاصيل الطلب" : "Order Items"}
                      </h4>
                      <div className="grid gap-3">
                        {order.items?.map((item, i) => (
                          <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${isRTL ? "flex-row-reverse" : ""} ${
                            isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border border-gray-100'
                          }`}>
                            <div className={`flex-1 min-w-0 ${isRTL ? "text-right" : "text-left"}`}>
                              <div className={`font-bold text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.name}</div>
                              {item.variant && <div className={`text-[10px] mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>🔹 {item.variant}</div>}
                            </div>
                            <div className={`flex items-center gap-3 ${isRTL ? "" : "flex-row-reverse"}`}>
                              {item.sku && <button onClick={() => copySku(item.sku)} className={`px-3 py-1.5 rounded-lg text-[9px] font-mono font-bold transition ${
                                isDark ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}>{item.sku}</button>}
                              <div className={isRTL ? "text-left" : "text-right"}>
                                <div className={`text-sm font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>×{item.qty}</div>
                                <div className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>₪{item.price}</div>
                              </div>
                              <div className={`text-sm font-bold min-w-[70px] ${isRTL ? "text-left" : "text-right"} ${isDark ? 'text-white' : 'text-gray-900'}`}>₪{(item.qty * item.price).toFixed(2)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Summary */}
                    <div className={`rounded-xl p-4 border transition-colors duration-300 ${
                      isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
                    }`}>
                      <h4 className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isRTL ? "text-right" : "text-left"} ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                        💰 {lang === "ar" ? "الملخص المالي" : "Payment Summary"}
                      </h4>
                      <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 text-sm ${isRTL ? "" : "text-right"}`}>
                        <div className={isRTL ? "text-right" : "text-left"}>
                          <span className={`text-[9px] block uppercase ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{lang === "ar" ? "المجموع" : "Subtotal"}</span>
                          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>₪{order.subtotal?.toFixed(2)}</span>
                        </div>
                        <div className={isRTL ? "text-right" : "text-left"}>
                          <span className={`text-[9px] block uppercase ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{lang === "ar" ? "التوصيل" : "Delivery"}</span>
                          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>₪{order.deliveryFee?.toFixed(2)}</span>
                        </div>
                        <div className={isRTL ? "text-right" : "text-left"}>
                          <span className={`text-[9px] block uppercase ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{lang === "ar" ? "الدفع" : "Payment"}</span>
                          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{order.paymentMethod === "cod" ? (lang === "ar" ? "نقداً" : "Cash") : (lang === "ar" ? "إلكتروني" : "Electronic")}</span>
                        </div>
                        <div className={`rounded-lg p-2 ${isRTL ? "text-right" : "text-left"} ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                          <span className={`text-[9px] block uppercase ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{lang === "ar" ? "الإجمالي" : "Total"}</span>
                          <span className={`font-black text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>₪{order.total?.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className={`rounded-xl p-4 border transition-colors duration-300 ${
                      isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
                    }`}>
                      <h4 className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isRTL ? "text-right" : "text-left"} ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                        📝 {lang === "ar" ? "الملاحظات" : "Notes"}
                      </h4>
                      <div className="space-y-3">
                        {order.notes && (
                          <div className={`p-3 rounded-lg border ${isRTL ? "text-right" : "text-left"} ${
                            isDark ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border border-amber-100'
                          }`}>
                            <span className={`text-[9px] font-bold uppercase block mb-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                              {lang === "ar" ? "ملاحظات العميل" : "Customer Notes"}
                            </span>
                            <p className={`text-sm ${isDark ? 'text-amber-200' : 'text-amber-800'}`}>{order.notes}</p>
                          </div>
                        )}
                        {canAddNotes ? (
                          editingNoteId === order.id ? (
                            <div className={`flex gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                              <input type="text" value={noteText} onChange={(e) => setNoteText(e.target.value)} className={`flex-1 rounded-lg px-3 py-2 text-sm outline-none ${isRTL ? "text-right" : "text-left"} ${
                                isDark 
                                  ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:ring-pink-500/30' 
                                  : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-pink-500/30'
                              }`} autoFocus placeholder={lang === "ar" ? "أضف ملاحظة..." : "Add note..."} />
                              <button onClick={() => saveNote(order.id)} className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-bold">{lang === "ar" ? "حفظ" : "Save"}</button>
                            </div>
                          ) : (
                            <button onClick={() => { setEditingNoteId(order.id); setNoteText(order.adminNotes || ""); }} className={`text-sm transition ${isRTL ? "text-right" : "text-left"} ${
                              isDark ? 'text-gray-400 hover:text-pink-400' : 'text-gray-400 hover:text-pink-600'
                            }`}>
                              ✏️ {order.adminNotes || (lang === "ar" ? "أضف ملاحظة إدارية" : "Add admin note")}
                            </button>
                          )
                        ) : (
                          <p className={`text-sm ${isRTL ? "text-right" : "text-left"} ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{order.adminNotes || "—"}</p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className={`flex flex-wrap gap-2 pt-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <a href={`https://wa.me/${order.phone}?text=${encodeURIComponent(lang === "ar" ? `مرحباً ${order.fullName}` : `Hello ${order.fullName}`)}`} target="_blank" rel="noopener noreferrer" className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                        isDark ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50' : 'bg-green-50 text-green-700 hover:bg-green-100'
                      }`}>
                        💬 {lang === "ar" ? "مراسلة" : "Message"}
                      </a>
                      <button onClick={() => printOrder(order, lang)} className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                        isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}>
                        🖨️ {lang === "ar" ? "طباعة الطلب" : "Print Order"}
                      </button>
                      {canDelete && (
                        <button onClick={() => deleteOrder(order.id)} className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                          isDark ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-red-50 text-red-700 hover:bg-red-100'
                        }`}>
                          🗑️ {lang === "ar" ? "حذف" : "Delete"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Load More */}
        {pagination.currentPage < pagination.totalPages && (
          <div className="text-center">
            <button onClick={handleLoadMore} disabled={loadingMore} className={`px-6 py-3 rounded-xl text-sm font-bold transition disabled:opacity-50 ${
              isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}>
              {loadingMore ? (lang === "ar" ? "جاري التحميل..." : "Loading...") : (lang === "ar" ? "عرض المزيد" : "Load More")}
            </button>
          </div>
        )}
      </div>

      {/* Stats Footer - مع دعم اللغة والوضع الليلي */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { key: "pending", label: lang === "ar" ? "قيد الانتظار" : "Pending", color: isDark ? "bg-amber-900/30 text-amber-400" : "bg-amber-100 text-amber-800" },
          { key: "confirmed", label: lang === "ar" ? "مؤكد" : "Confirmed", color: isDark ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-800" },
          { key: "shipped", label: lang === "ar" ? "تم الشحن" : "Shipped", color: isDark ? "bg-purple-900/30 text-purple-400" : "bg-purple-100 text-purple-800" },
          { key: "delivered", label: lang === "ar" ? "تم التسليم" : "Delivered", color: isDark ? "bg-green-900/30 text-green-400" : "bg-green-100 text-green-800" },
          { key: "cancelled", label: lang === "ar" ? "ملغي" : "Cancelled", color: isDark ? "bg-red-900/30 text-red-400" : "bg-red-100 text-red-800" }
        ].map(stat => (
          <div key={stat.key} className={`p-4 rounded-2xl text-center ${stat.color} transition-colors duration-300`}>
            <div className="text-2xl font-black">{orders.filter(o => o.status === stat.key).length}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest mt-1">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminOrders;
