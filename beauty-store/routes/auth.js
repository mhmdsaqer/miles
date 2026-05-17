// beauty-store/routes/auth.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const audit = require("../utils/auditLogger"); // ✅ إضافة Audit Logger

/**
 * تسجيل الدخول للنظام الجديد
 * @body {string} email
 * @body {string} password
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 1. التحقق من المدخلات
    if (!email || !password) {
      return res.status(400).json({ message: "❌ Email and password are required" });
    }
    
    // 2. البحث عن المستخدم (مع جلب حقل password)
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      // ✅ تسجيل المحاولة الفاشلة
      await audit.failedLogin(email, req);
      await new Promise(resolve => setTimeout(resolve, 100)); // تأخير أمني
      return res.status(401).json({ message: "❌ Invalid credentials" });
    }
    
    // 3. التحقق من كلمة المرور
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // ✅ تسجيل المحاولة الفاشلة
      await audit.failedLogin(email, req);
      await new Promise(resolve => setTimeout(resolve, 100));
      return res.status(401).json({ message: "❌ Invalid credentials" });
    }
    
    // 4. التحقق من حالة الحساب
    if (!user.isActive) {
      return res.status(403).json({ message: "❌ Account is deactivated" });
    }
    
    // ✅ تسجيل الدخول الناجح
    await audit.login(user, req);
    
    // 5. إنشاء الـ JWT Token
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role,
        permissions: user.permissions 
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRES_IN || "24h",
        issuer: "miles-beauty-store"
      }
    );
    
    // 6. تحديث آخر تسجيل دخول
    user.lastLogin = new Date();
    await user.save();
    
    // 7. إرجاع البيانات (بدون كلمة المرور)
    const userData = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions,
      lastLogin: user.lastLogin
    };
    
    res.json({
      message: "✅ Login successful",
      token,
      user: userData,
      expiresIn: process.env.JWT_EXPIRES_IN || "24h"
    });
    
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ 
      message: "❌ Server error during login",
      error: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
});

/**
 * جلب بيانات المستخدم الحالي
 */
router.get("/me", async (req, res) => {
  try {
    // يتم إضافة req.user عبر middleware/auth.js
    if (!req.user) {
      return res.status(401).json({ message: "❌ Not authenticated" });
    }
    
    res.json({
      user: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        permissions: req.user.permissions,
        lastLogin: req.user.lastLogin,
        createdAt: req.user.createdAt
      }
    });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ message: "❌ Server error" });
  }
});

/**
 * تسجيل الخروج (إبطال التوكن - اختياري مع JWT)
 */
router.post("/logout", (req, res) => {
  // مع JWT Stateless، لا حاجة لتخزين قائمة التوكنات الملغاة
  // يمكن إضافة Redis لاحقاً لإدارة Blacklist إذا لزم
  res.json({ message: "✅ Logged out successfully" });
});

module.exports = router;
