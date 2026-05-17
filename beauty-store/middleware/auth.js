// beauty-store/middleware/auth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Middleware للتحقق من هوية المستخدم عبر JWT
 * يضيف المستخدم إلى req.user إذا كان التوكن صالحاً
 */
module.exports = async (req, res, next) => {
  try {
    // 1. استخراج التوكن من الهيدر
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "❌ Token required" });
    }
    
    const token = authHeader.replace("Bearer ", "");
    
    // 2. التحقق من التوكن
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 3. جلب المستخدم من الداتابيس (مع استثناء كلمة المرور)
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "❌ User not found" });
    }
    
    // 4. التحقق من أن الحساب مفعل
    if (!user.isActive) {
      return res.status(403).json({ message: "❌ Account is deactivated" });
    }
    
    // 5. إضافة المستخدم للـ Request
    req.user = user;
    next();
    
  } catch (err) {
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "❌ Invalid token" });
    }
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "❌ Token expired" });
    }
    console.error("Auth middleware error:", err);
    return res.status(500).json({ message: "❌ Server error" });
  }
};
