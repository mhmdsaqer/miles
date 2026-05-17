// src/pages/admin/AdminUsers.jsx - النسخة مع دعم الوضع الليلي
import { useState, useEffect, useCallback, useMemo } from "react";
import { adminApi } from "../../utils/adminAuth";
import { useLang } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext"; // ✅ إضافة جديدة
import { toast } from "sonner";

const AdminUsers = () => {
  const { lang } = useLang();
  const { user: currentUser } = useAuth();
  const { isDark } = useTheme(); // ✅ إضافة جديدة
  
  // ✅ تعريف isRTL بشكل صحيح
  const isRTL = lang === "ar";
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // ✅ بيانات النموذج
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: "viewer",
    permissions: [],
    isActive: true
  });

  // ✅ قائمة الأدوار المتاحة
  const ROLES = useMemo(() => [
    { value: "admin", label: lang === "ar" ? "مدير المتجر" : "Store Admin" },
    { value: "order_manager", label: lang === "ar" ? "مدير الطلبات" : "Order Manager" },
    { value: "content_manager", label: lang === "ar" ? "مدير المحتوى" : "Content Manager" },
    { value: "viewer", label: lang === "ar" ? "مشاهد" : "Viewer" },
  ], [lang]);

  // ✅ ✅ قائمة الصلاحيات الافتراضية لكل دور (مطابقة لـ authorize.js في الـ Backend)
  const ROLE_DEFAULT_PERMISSIONS = useMemo(() => ({
    admin: [
      "products:create", "products:read", "products:update", "products:delete",
      "brands:create", "brands:read", "brands:update", "brands:delete",
      "categories:create", "categories:read", "categories:update", "categories:delete",
      "orders:read", "orders:update_status", "orders:add_notes",
      "reports:view_sales", "reports:export_data"
    ],
    order_manager: [
      "orders:read", "orders:update_status", "orders:add_notes",
      "products:read", "brands:read", "categories:read"
    ],
    content_manager: [
      "products:create", "products:read", "products:update",
      "brands:read", "brands:update",
      "categories:read", "categories:update",
    ],
    viewer: [
      "products:read", "brands:read", "categories:read", "orders:read"
    ]
  }), []);

  // ✅ قائمة الصلاحيات المتاحة للاختيار الإضافي (للعرض في الـ UI)
  const AVAILABLE_PERMISSIONS = useMemo(() => [
    { value: "products:create", label: lang === "ar" ? "إنشاء منتجات" : "Create Products" },
    { value: "products:update", label: lang === "ar" ? "تعديل منتجات" : "Update Products" },
    { value: "products:delete", label: lang === "ar" ? "حذف منتجات" : "Delete Products" },
    { value: "orders:update_status", label: lang === "ar" ? "تحديث حالة الطلب" : "Update Order Status" },
    { value: "reports:export_data", label: lang === "ar" ? "تصدير التقارير" : "Export Reports" },
    { value: "brands:create", label: lang === "ar" ? "إضافة براند" : "Create Brand" },
    { value: "brands:update", label: lang === "ar" ? "تعديل براند" : "Update Brand" },
    { value: "brands:delete", label: lang === "ar" ? "حذف براند" : "Delete Brand" },
    { value: "categories:create", label: lang === "ar" ? "إضافة تصنيف" : "Create Category" },
    { value: "categories:update", label: lang === "ar" ? "تعديل تصنيف" : "Update Category" },
    { value: "categories:delete", label: lang === "ar" ? "حذف تصنيف" : "Delete Category" },
  ], [lang]);

  // ✅ ✅ دالة حساب الصلاحيات المعروضة حسب الدور + الإضافات
  const getPermissionsForRole = useCallback((role, customPermissions = []) => {
    const defaultPerms = ROLE_DEFAULT_PERMISSIONS[role] || [];
    return [...new Set([...defaultPerms, ...customPermissions])];
  }, [ROLE_DEFAULT_PERMISSIONS]);

  // ✅ ✅ دالة تحديث الصلاحيات عند تغيير الدور (اقتراح دون فرض)
  const handleRoleChange = useCallback((newRole) => {
    const defaultPerms = ROLE_DEFAULT_PERMISSIONS[newRole] || [];
    const customPerms = formData.permissions.filter(p => 
      !ROLE_DEFAULT_PERMISSIONS[formData.role]?.includes(p)
    );
    
    setFormData(prev => ({
      ...prev,
      role: newRole,
      permissions: [...new Set([...defaultPerms, ...customPerms])]
    }));
  }, [ROLE_DEFAULT_PERMISSIONS, formData.permissions, formData.role]);

  // ✅ ✅ حماية: فقط Super Admin يمكنه الوصول
  useEffect(() => {
    if (currentUser?.role !== "super_admin") {
      toast.error(
        <div className="flex items-center gap-3">
          <span className="text-xl">❌</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {lang === "ar" ? "غير مصرح - هذه الصفحة للمدير العام فقط" : "Forbidden - Super Admin only"}
          </span>
        </div>,
        { duration: 4000 }
      );
      window.history.back();
    }
  }, [currentUser, lang, isDark]);

  // ✅ ✅ دالة مساعدة لقراءة الدور مباشرة من الـ sessionStorage
  const getRoleFromStorage = () => {
    try {
      const userData = sessionStorage.getItem("miles_user_data");
      if (!userData) return null;
      const parsed = JSON.parse(userData);
      return parsed?.role?.trim()?.toLowerCase();
    } catch {
      return null;
    }
  };

  // ✅ ✅ التحقق المزدوج: من الـ Context + من الـ Storage
  const userRole = currentUser?.role?.trim()?.toLowerCase() || getRoleFromStorage();
  const isSuperAdmin = userRole === "super_admin";

  // ✅ ✅ استخدام هذا للتحقق بدلاً من الاعتماد على الـ Context فقط
  useEffect(() => {
    console.log("🔐 AdminUsers Auth Check:", {
      fromContext: currentUser?.role,
      fromStorage: getRoleFromStorage(),
      finalRole: userRole,
      isSuperAdmin
    });
    
    if (!isSuperAdmin) {
      toast.error(
        <div className="flex items-center gap-3">
          <span className="text-xl">❌</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {lang === "ar" ? "غير مصرح - هذه الصفحة للمدير العام فقط" : "Forbidden - Super Admin only"}
          </span>
        </div>,
        { duration: 4000 }
      );
      window.history.back();
    }
  }, [isSuperAdmin, lang, currentUser?.role, isDark]);

  // ✅ ✅ في الـ render، استخدم isSuperAdmin بدلاً من currentUser?.role
  if (!isSuperAdmin) {
    return (
      <div className={`flex items-center justify-center min-h-[60vh] text-center transition-colors duration-300 ${isDark ? 'dark bg-gray-900' : ''}`} dir={isRTL ? "rtl" : "ltr"}>
        <div className="space-y-4">
          <div className="text-6xl">🔒</div>
          <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {lang === "ar" ? "وصول مرفوض" : "Access Denied"}
          </h2>
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            {lang === "ar" ? "هذه الصفحة متاحة للمدير العام فقط" : "This page is available for Super Admin only"}
          </p>
          {/* ✅ Debug Panel مؤقت */}
          <details className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-400'} mt-4`}>
            <summary>🔍 Debug Info (click to expand)</summary>
            <pre className={`text-left ${isDark ? 'bg-gray-800' : 'bg-gray-50'} p-2 rounded mt-2 max-w-md overflow-auto`}>
              {JSON.stringify({
                currentUserExists: !!currentUser,
                currentUserRole: currentUser?.role,
                storageRole: getRoleFromStorage(),
                computedRole: userRole,
                isSuperAdmin
              }, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    );
  }

  // ✅ جلب قائمة المستخدمين
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.get("/users");
      setUsers(res.data);
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;
      
      console.error("❌ Fetch users error:", err);
      
      if (err.response?.status === 404) {
        toast.error(
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {lang === "ar" ? "مسار المستخدمين غير متاح" : "Users endpoint not found"}
            </span>
          </div>,
          { duration: 4000 }
        );
      } else if (err.response?.status === 403) {
        toast.error(
          <div className="flex items-center gap-3">
            <span className="text-xl">❌</span>
            <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {lang === "ar" ? "غير مصرح" : "Forbidden"}
            </span>
          </div>,
          { duration: 4000 }
        );
      } else if (err.response?.status === 500) {
        toast.error(
          <div className="flex items-center gap-3">
            <span className="text-xl">❌</span>
            <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {lang === "ar" ? "خطأ في السيرفر" : "Server error"}
            </span>
          </div>,
          { duration: 4000 }
        );
      } else {
        toast.error(
          <div className="flex items-center gap-3">
            <span className="text-xl">❌</span>
            <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {lang === "ar" ? "فشل تحميل المستخدمين" : "Failed to load users"}
            </span>
          </div>,
          { duration: 4000 }
        );
      }
    } finally {
      setLoading(false);
    }
  }, [lang, isDark]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchUsers();
    }
  }, [fetchUsers, isSuperAdmin]);

  // ✅ فلترة البحث
  const filteredUsers = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter(u =>
      u.email?.toLowerCase().includes(q) ||
      u.name?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  }, [users, search]);

  // ✅ فتح/إغلاق النموذج - مع تحميل الصلاحيات الصحيحة
  const openModal = useCallback((user = null) => {
    if (user) {
      setEditingId(user._id);
      setFormData({
        email: user.email,
        password: "",
        name: user.name,
        role: user.role,
        permissions: user.permissions || [],
        isActive: user.isActive
      });
    } else {
      setEditingId(null);
      setFormData({
        email: "",
        password: "",
        name: "",
        role: "viewer",
        permissions: ROLE_DEFAULT_PERMISSIONS.viewer || [],
        isActive: true
      });
    }
    setShowModal(true);
  }, [ROLE_DEFAULT_PERMISSIONS]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setFormData({
      email: "", password: "", name: "",
      role: "viewer", permissions: ROLE_DEFAULT_PERMISSIONS.viewer || [], isActive: true
    });
  }, [ROLE_DEFAULT_PERMISSIONS]);

  // ✅ حفظ المستخدم (إضافة أو تعديل)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.name) {
      toast.warning(
        <div className="flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {lang === "ar" ? "يرجى تعبئة البريد والاسم" : "Please fill email and name"}
          </span>
        </div>,
        { duration: 3500 }
      );
      return;
    }

    if (!editingId && !formData.password) {
      toast.warning(
        <div className="flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {lang === "ar" ? "يرجى إدخال كلمة المرور للمستخدم الجديد" : "Password required for new user"}
          </span>
        </div>,
        { duration: 3500 }
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = { ...formData };
      
      if (editingId && !formData.password) {
        delete payload.password;
      }

      if (editingId) {
        await adminApi.put(`/users/${editingId}`, payload);
        toast.success(
          <div className="flex items-center gap-3">
            <span className="text-xl">✅</span>
            <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {lang === "ar" ? "تم تحديث المستخدم" : "User updated"}
            </span>
          </div>,
          { duration: 3000 }
        );
      } else {
        await adminApi.post("/users", payload);
        toast.success(
          <div className="flex items-center gap-3">
            <span className="text-xl">✅</span>
            <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {lang === "ar" ? "تمت إضافة المستخدم" : "User added"}
            </span>
          </div>,
          { duration: 3000 }
        );
      }
      
      closeModal();
      fetchUsers();
    } catch (err) {
      console.error("Save error:", err);
      toast.error(
        <div className="flex items-center gap-3">
          <span className="text-xl">❌</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {err.response?.data?.message || (lang === "ar" ? "حدث خطأ" : "Error occurred")}
          </span>
        </div>,
        { duration: 4000 }
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ حذف مستخدم
  const handleDelete = async (userId) => {
    if (userId === currentUser?._id) {
      toast.warning(
        <div className="flex items-center gap-3">
          <span className="text-xl">❌</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {lang === "ar" ? "لا يمكنك حذف حسابك الخاص" : "Cannot delete your own account"}
          </span>
        </div>,
        { duration: 4000 }
      );
      return;
    }

    if (!window.confirm(lang === "ar" ? "هل أنت متأكد من حذف هذا المستخدم؟" : "Are you sure?")) return;

    try {
      await adminApi.delete(`/users/${userId}`);
      toast.success(
        <div className="flex items-center gap-3">
          <span className="text-xl">🗑️</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {lang === "ar" ? "تم حذف المستخدم" : "User deleted"}
          </span>
        </div>,
        { duration: 3000 }
      );
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  // ✅ تبديل حالة النشاط
  const toggleActive = async (userId, currentStatus) => {
    try {
      await adminApi.put(`/users/${userId}`, { isActive: !currentStatus });
      toast.success(
        <div className="flex items-center gap-3">
          <span className="text-xl">✅</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {lang === "ar" ? "تم تحديث الحالة" : "Status updated"}
          </span>
        </div>,
        { duration: 3000 }
      );
      fetchUsers();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  // ✅ معالجة تغيير الحقول العادية
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === "role") {
      handleRoleChange(value);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value
      }));
    }
  };

  // ✅ ✅ تبديل صلاحية (الآن جميع الصلاحيات قابلة للتعديل)
  const togglePermission = (permission) => {
    setFormData(prev => {
      const defaultPerms = ROLE_DEFAULT_PERMISSIONS[prev.role] || [];
      const isDefault = defaultPerms.includes(permission);
      
      return {
        ...prev,
        permissions: prev.permissions.includes(permission)
          ? prev.permissions.filter(p => p !== permission)
          : [...new Set([...prev.permissions, permission])]
      };
    });
  };

  // ✅ تنسيق التاريخ
  const formatDate = useCallback((dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString(lang === "ar" ? "ar-PS" : "en-US", {
      timeZone: "Asia/Hebron",
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
  }, [lang]);

  // ✅ التحقق إذا كانت صلاحية محددة (للعرض في الـ UI)
  const isPermissionChecked = useCallback((permission) => {
    return formData.permissions.includes(permission);
  }, [formData.permissions]);

  // ✅ التحقق إذا كانت صلاحية افتراضية للدور (للعرض فقط)
  const isPermissionDefault = useCallback((permission) => {
    return ROLE_DEFAULT_PERMISSIONS[formData.role]?.includes(permission);
  }, [formData.role, ROLE_DEFAULT_PERMISSIONS]);

  return (
    <div className={`space-y-6 transition-colors duration-300 ${isDark ? 'dark' : ''}`} dir={isRTL ? "rtl" : "ltr"}>
      
      {/* ===== Header & Actions ===== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-3xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {lang === "ar" ? "إدارة المستخدمين" : "User Management"}
          </h1>
          <p className={`text-sm mt-1 font-bold ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
            {filteredUsers.length} {lang === "ar" ? "مستخدم" : "user(s)"}
          </p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === "ar" ? "بحث عن مستخدم..." : "Search user..."}
            className={`flex-1 md:w-64 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-pink-500/30 transition-colors ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400'
            }`}
          />
          <button
            onClick={() => openModal()}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              isDark 
                ? 'bg-gray-700 text-white hover:bg-pink-600' 
                : 'bg-gray-900 text-white hover:bg-pink-600'
            }`}
          >
            {lang === "ar" ? "+ إضافة مستخدم" : "+ Add User"}
          </button>
        </div>
      </div>

      {/* ===== Users Table ===== */}
      <div className={`rounded-[2rem] border shadow-sm overflow-hidden transition-colors ${
        isDark 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-100'
      }`}>
        {loading ? (
          <div className={`p-12 text-center font-bold animate-pulse ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
            {lang === "ar" ? "جاري التحميل..." : "Loading..."}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className={`p-12 text-center font-bold ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
            {lang === "ar" ? "لا توجد نتائج" : "No results"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={`border-b ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                <tr>
                  <th className={`px-6 py-4 font-black uppercase tracking-widest text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'} ${isRTL ? 'text-right' : 'text-left'}`}>
                    {lang === "ar" ? "المستخدم" : "User"}
                  </th>
                  <th className={`px-6 py-4 font-black uppercase tracking-widest text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'} ${isRTL ? 'text-right' : 'text-left'}`}>
                    {lang === "ar" ? "الدور" : "Role"}
                  </th>
                  <th className={`px-6 py-4 font-black uppercase tracking-widest text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'} ${isRTL ? 'text-right' : 'text-left'}`}>
                    {lang === "ar" ? "الحالة" : "Status"}
                  </th>
                  <th className={`px-6 py-4 font-black uppercase tracking-widest text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'} ${isRTL ? 'text-right' : 'text-left'}`}>
                    {lang === "ar" ? "آخر دخول" : "Last Login"}
                  </th>
                  <th className={`px-6 py-4 font-black uppercase tracking-widest text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'} ${isRTL ? 'text-right' : 'text-left'}`}>
                    {lang === "ar" ? "إجراءات" : "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-50'}`}>
                {filteredUsers.map(user => {
                  const isCurrentUser = user._id === currentUser?._id;
                  const roleLabel = ROLES.find(r => r.value === user.role)?.label || user.role;
                  
                  return (
                    <tr key={user._id} className={`transition-colors ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50/50'}`}>
                      
                      {/* User Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center text-lg font-bold text-gray-700">
                            {user.name?.charAt(0)?.toUpperCase() || "U"}
                          </div>
                          <div className={isRTL ? "text-right" : "text-left"}>
                            <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{user.name}</p>
                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-400'} font-mono`}>{user.email}</p>
                          </div>
                        </div>
                      </td>
                      
                      {/* Role */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          user.role === "super_admin" ? (isDark ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700') :
                          user.role === "admin" ? (isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700') :
                          user.role === "order_manager" ? (isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') :
                          user.role === "content_manager" ? (isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700') :
                          (isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600')
                        }`}>
                          {roleLabel}
                        </span>
                      </td>
                      
                      {/* Status Toggle */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() => !isCurrentUser && toggleActive(user._id, user.isActive)}
                          disabled={isCurrentUser}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            user.isActive ? "bg-green-500" : (isDark ? "bg-gray-600" : "bg-gray-300")
                          } ${isCurrentUser ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                          title={isCurrentUser ? (lang === "ar" ? "لا يمكن تغيير حالتك" : "Cannot change your own status") : ""}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            user.isActive ? (isRTL ? "translate-x-1" : "translate-x-6") : "translate-x-1"
                          }`} />
                        </button>
                      </td>
                      
                      {/* Last Login */}
                      <td className={`px-6 py-4 font-mono text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {formatDate(user.lastLogin)}
                      </td>
                      
                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openModal(user)}
                            disabled={isCurrentUser && user.role === "super_admin"}
                            className={`px-3 py-1.5 rounded-lg font-bold transition text-xs disabled:opacity-50 ${
                              isDark 
                                ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' 
                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                            }`}
                          >
                            {lang === "ar" ? "تعديل" : "Edit"}
                          </button>
                          <button
                            onClick={() => handleDelete(user._id)}
                            disabled={isCurrentUser}
                            className={`px-3 py-1.5 rounded-lg font-bold transition text-xs disabled:opacity-50 ${
                              isDark 
                                ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' 
                                : 'bg-red-50 text-red-600 hover:bg-red-100'
                            }`}
                          >
                            {lang === "ar" ? "حذف" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== Modal: Add/Edit User ===== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className={`rounded-[2.5rem] w-full max-w-lg shadow-2xl border max-h-[90vh] overflow-y-auto transition-colors ${
            isDark 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-100'
          }`}>
            
            {/* Modal Header */}
            <div className={`p-6 border-b flex justify-between items-center sticky top-0 rounded-t-[2.5rem] ${
              isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-white'
            }`}>
              <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {editingId
                  ? (lang === "ar" ? "تعديل مستخدم" : "Edit User")
                  : (lang === "ar" ? "إضافة مستخدم" : "Add User")}
              </h2>
              <button
                onClick={closeModal}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                  isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                ✕
              </button>
            </div>
            
            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* Name & Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {lang === "ar" ? "الاسم *" : "Name *"}
                  </label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className={`w-full rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-pink-500/30 outline-none transition-colors ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                        : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {lang === "ar" ? "البريد الإلكتروني *" : "Email *"}
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className={`w-full rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-pink-500/30 outline-none transition-colors ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                        : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
                    }`}
                  />
                </div>
              </div>
              
              {/* Password */}
              <div>
                <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {lang === "ar" 
                    ? (editingId ? "كلمة المرور الجديدة (اتركها فارغة للإبقاء على القديمة)" : "كلمة المرور *") 
                    : (editingId ? "New Password (leave blank to keep current)" : "Password *")}
                </label>
                <input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required={!editingId}
                  placeholder={editingId ? "••••••••" : ""}
                  className={`w-full rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-pink-500/30 outline-none transition-colors ${
                    isDark 
                      ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                      : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                />
              </div>
              
              {/* Role Selection */}
              <div>
                <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {lang === "ar" ? "الدور *" : "Role *"}
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className={`w-full rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-pink-500/30 outline-none transition-colors ${
                    isDark 
                      ? 'bg-gray-700 border-gray-600 text-gray-100' 
                      : 'bg-gray-50 border border-gray-200 text-gray-900'
                  }`}
                >
                  {ROLES.map(role => (
                    <option key={role.value} value={role.value} className={isDark ? 'bg-gray-800' : ''}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <p className={`text-[9px] mt-1 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                  {lang === "ar" 
                    ? "💡 تغيير الدور سيُحدّث الصلاحيات تلقائياً" 
                    : "💡 Changing role will auto-update permissions"}
                </p>
              </div>
              
              {/* Extra Permissions (Checkbox List) */}
              <div>
                <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {lang === "ar" ? "صلاحيات إضافية (اختياري)" : "Extra Permissions (Optional)"}
                </label>
                <div className={`grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  {AVAILABLE_PERMISSIONS.map(perm => {
                    const isChecked = isPermissionChecked(perm.value);
                    const isDefault = isPermissionDefault(perm.value);
                    
                    return (
                      <label 
                        key={perm.value} 
                        className={`flex items-center gap-2 text-xs cursor-pointer transition-all ${
                          isDefault 
                            ? isChecked 
                              ? (isDark ? "bg-amber-900/30 border border-amber-800 rounded-lg px-2 py-1" : "bg-amber-50 border border-amber-200 rounded-lg px-2 py-1")
                              : "opacity-60"
                            : ""
                        }`}
                        title={isDefault ? (lang === "ar" ? "✅ موصى بها لهذا الدور" : "✅ Recommended for this role") : ""}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePermission(perm.value)}
                          className={`rounded border-gray-300 focus:ring-pink-500 ${
                            isChecked 
                              ? "text-pink-600 bg-pink-50" 
                              : (isDark ? "text-gray-400 border-gray-600" : "text-gray-400")
                          } ${isDefault ? (isDark ? "ring-1 ring-amber-700" : "ring-1 ring-amber-300") : ""}`}
                        />
                        <span className={`${
                          isDefault 
                            ? isChecked ? (isDark ? "text-amber-400 font-bold" : "text-amber-700 font-bold") : (isDark ? "text-gray-500 line-through" : "text-gray-400 line-through")
                            : isChecked ? (isDark ? "text-gray-200 font-bold" : "text-gray-700 font-bold") : (isDark ? "text-gray-400" : "text-gray-500")
                        }`}>
                          {perm.label}
                          {isDefault && <span className={`text-[9px] ${isDark ? 'text-amber-500' : 'text-amber-500'} mr-1`}>✨</span>}
                        </span>
                      </label>
                    );
                  })}
                </div>

                <p className={`text-[9px] mt-1 flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                  <span className={isDark ? 'text-amber-500' : 'text-amber-500'}>✨</span>
                  {lang === "ar" 
                    ? "صلاحية موصى بها للدور (يمكن تعديلها)" 
                    : "Recommended permission for this role (editable)"}
                </p>

              </div>
              
              {/* Active Status */}
              <div className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <input
                  type="checkbox"
                  name="isActive"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                />
                <label htmlFor="isActive" className={`text-sm font-bold cursor-pointer ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                  {lang === "ar" ? "حساب مفعل" : "Account is active"}
                </label>
              </div>
              
              {/* Action Buttons */}
              <div className={`flex gap-3 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 py-3 rounded-xl font-black text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                    submitting || !formData.email || !formData.name
                      ? (isDark ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400')
                      : (isDark ? 'bg-gray-700 text-white hover:bg-pink-600' : 'bg-gray-900 text-white hover:bg-pink-600')
                  }`}
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      {lang === "ar" ? "جاري الحفظ..." : "Saving..."}
                    </>
                  ) : (
                    editingId ? (lang === "ar" ? "تحديث" : "Update") : (lang === "ar" ? "إضافة" : "Add")
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                    isDark 
                      ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
              </div>
              
            </form>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default AdminUsers;