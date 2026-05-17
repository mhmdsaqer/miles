// beauty-store/models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"]
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true
    },
    role: {
      type: String,
      enum: ["super_admin", "admin", "order_manager", "content_manager", "viewer"],
      default: "viewer"
    },
    permissions: [{
      type: String,
      enum: [
        "products:create", "products:read", "products:update", "products:delete",
        "brands:create", "brands:read", "brands:update", "brands:delete",
        "categories:create", "categories:read", "categories:update", "categories:delete",
        "orders:read", "orders:update_status", "orders:add_notes", "orders:delete",
        "users:create", "users:read", "users:update", "users:delete",
        "settings:read", "settings:update",
        "reports:view_sales", "reports:export_data", "reports:view_analytics",
        "*" // ✅ wildcard للصلاحيات الكاملة
      ]
    }],
    isActive: { type: Boolean, default: true },
    lastLogin: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ✅ ✅ إصلاح: Hash password بدون next() في async function
userSchema.pre("save", async function() {
  // إذا لم يتم تعديل كلمة المرور، اخرج
  if (!this.isModified("password")) return;
  
  // إذا كانت كلمة المرور فارغة، اخرج
  if (!this.password) return;
  
  // تشفير كلمة المرور
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  // ✅ لا نستخدم next() هنا لأن Mongoose يتعامل مع async تلقائياً
});

// ✅ مقارنة كلمة المرور (مثال)
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ✅ Virtual: هل المستخدم لديه صلاحية معينة؟
userSchema.virtual("hasPermission").get(function() {
  return function(permission) {
    if (this.role === "super_admin" || this.permissions?.includes("*")) {
      return true;
    }
    if (this.permissions?.includes(permission)) {
      return true;
    }
    const [resource] = permission.split(":");
    if (this.permissions?.includes(`${resource}:*`)) {
      return true;
    }
    return false;
  };
});

// ✅ فهرس للبحث السريع (بدون تكرار)
userSchema.index({ email: 1 });
userSchema.index({ role: 1, isActive: 1 });

module.exports = mongoose.model("User", userSchema);
