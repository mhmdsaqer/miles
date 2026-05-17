// server.js - النسخة النهائية لـ Render/Production
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const { validate, schemas } = require("./middleware/validate");

// 1️⃣ استيراد الموديلات
const Brand = require("./models/Brand");
const Category = require("./models/Category");
const Product = require("./models/Product");
const Variant = require("./models/Variant");

// 2️⃣ استيراد الـ Routes
const adminRoutes = require("./routes/admin");
const authRoutes = require("./routes/auth");

const app = express();

// 🔗 الاتصال بقاعدة البيانات
connectDB();

// 🛡️ إعدادات الأمان والـ Middleware
app.use(helmet({
  crossOriginResourcePolicy: false
}));

// ✅ ✅ ✅ CORS ديناميكي يعمل مع Render + Vercel + Local
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({
  limit: "10mb"
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: "10mb" 
}));
app.use(require("./middleware/sanitize"));

// ✅ تسجيل الـ Routes
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);

// ✅ معدل الحد من الطلبات
const isDev = process.env.NODE_ENV !== 'production';
app.use(
  rateLimit({
    windowMs: isDev ? 1 * 60 * 1000 : 15 * 60 * 1000,
    max: isDev ? 500 : 100,
    message: { error: "⚠️ Too many requests, please slow down." },
    standardHeaders: true,
    legacyHeaders: false,
    skip: isDev ? (req) => req.ip === '127.0.0.1' : undefined
  })
);

// 📁 خدمة الصور (Static Assets)
app.use("/assets", (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
app.use("/assets", express.static(path.join(__dirname, "data/assets")));

app.use("/assets/uploads", (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});
app.use("/assets/uploads", express.static(path.join(__dirname, "data/assets/uploads")));

// 🧠 دالة مساعدة للبحث في التصنيفات (شجرية)
async function getCategoryAndChildrenIds(catId) {
  let ids = [catId];
  const children = await Category.find({ parent_id: catId }).select("id");
  for (const child of children) {
    const subIds = await getCategoryAndChildrenIds(child.id);
    ids = ids.concat(subIds);
  }
  return ids;
}

// 🗄️ Caching بسيط للبيانات الثابتة
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

const getCached = async (key, fetchFn) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data;
  }
  const data = await fetchFn();
  cache.set(key, { data, time: Date.now() });
  return data;
};

// 🌐 الروابط العامة (Public Routes)
app.get("/", (req, res) => res.send("Beauty Store API (MongoDB + Pagination + Cache + Socket.io) 🚀"));

app.get("/brands", async (req, res) => {
  try {
    const brands = await getCached("brands", () => Brand.find().sort({ id: 1 }));
    res.json(brands);
  } catch (err) {
    console.error("Error fetching brands:", err);
    res.status(500).json({ message: "Error fetching brands" });
  }
});

app.get("/categories", async (req, res) => {
  try {
    const categories = await getCached("categories", () =>
      Category.find().sort({ sort_order: 1, id: 1 })
    );
    res.json(categories);
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ message: "Error fetching categories" });
  }
});

app.get("/products", async (req, res) => {
  try {
    const { brand, category, min, max, search, page = 1, limit = 20 } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { name_en: { $regex: search, $options: "i" } },
        { name_ar: { $regex: search, $options: "i" } },
      ];
    }
    if (brand) query.brand_id = Number(brand);
    if (category) {
      const catIds = await getCategoryAndChildrenIds(Number(category));
      query.category_id = { $in: catIds };
    }
    if (min || max) {
      query.price = {};
      if (min) query.price.$gte = Number(min);
      if (max) query.price.$lte = Number(max);
    }

    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);
    const skip = (Number(page) - 1) * limit;

    const products = await Product.find(query)
      .sort({ id: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select('-__v');

    const allBrands = await getCached("brands", () => Brand.find());
    const allCategories = await getCached("categories", () => Category.find());

    const brandMap = {};
    allBrands.forEach(b => brandMap[b.id] = b);

    const catMap = {};
    allCategories.forEach(c => catMap[c.id] = c);

    const enrichedProducts = await Promise.all(
      products.map(async (p) => {
        const brandDoc = brandMap[p.brand_id];
        const catDoc = catMap[p.category_id];
        let opts = [];
        if (p.has_variants) {
          opts = await Variant.find({ product_id: p.id }).select('-__v');
        }
        return {
          ...p.toObject(),
          brand_name: brandDoc ? brandDoc.name : "Unknown",
          category_name: catDoc ? catDoc.name_en : "General",
          options: opts
        };
      })
    );

    res.json({
      products: enrichedProducts,
      pagination: {
        currentPage: Number(page),
        totalPages: totalPages,
        totalProducts: totalProducts,
        hasNextPage: Number(page) < totalPages
      }
    });

  } catch (err) {
    console.error("❌ Error in /products:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

app.get("/products/:id", async (req, res) => {
  try {
    const product = await Product.findOne({ id: Number(req.params.id) });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const [brand, category, variants] = await Promise.all([
      Brand.findOne({ id: product.brand_id }),
      Category.findOne({ id: product.category_id }),
      product.has_variants ? Variant.find({ product_id: product.id }) : []
    ]);

    res.json({
      ...product.toObject(),
      brand_details: brand,
      category_details: category,
      options: variants,
    });
  } catch (err) {
    console.error("Error fetching product details:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

app.get("/variants", async (req, res) => {
  try {
    const variants = await getCached("variants", () => Variant.find().sort({ id: 1 }));
    res.json(variants);
  } catch (err) {
    console.error("Error fetching variants:", err);
    res.status(500).json({ message: "Error fetching variants" });
  }
});

app.post("/api/orders", validate(schemas.order, "body"), async (req, res) => {
  try {
    const Order = require("./models/Order");
    
    const order = new Order({
      id: Date.now(),
      receivedAt: new Date(),
      ...req.body
    });
    
    await order.save();
    
    // ✅ إرسال إشعار عبر Socket.io للأدمن
    const io = app.get('io');
    if (io) {
      io.emit("new-order", order.toObject());
      console.log(`📡 Real-time notification sent for public order #${order.id}`);
    }
    
    res.status(201).json({
      message: "✅ تم تسجيل الطلب بنجاح",
      order: order.toObject()
    });
    
  } catch (err) {
    console.error("❌ Error saving public order:", err);
    res.status(500).json({ 
      message: "❌ فشل حفظ الطلب", 
      error: err.message 
    });
  }
});

// ============================================
// 🚀 Socket.io Setup + Server Start
// ============================================

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: corsOrigins, // ✅ استخدام نفس متغير البيئة
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

app.set('io', io);

io.on("connection", (socket) => {
  console.log("🔌 Admin connected:", socket.id);
  socket.emit("connected", { message: "✅ Connected to real-time notifications" });

  socket.on("disconnect", (reason) => {
    console.log(`🔌 Admin disconnected: ${socket.id} - Reason: ${reason}`);
  });

  socket.on("error", (err) => {
    console.error(`⚠️ Socket error for ${socket.id}:`, err.message);
  });
});

const sendNotification = (event, data) => {
  io.emit(event, data);
  console.log(`📡 Notification sent: ${event}`);
};

// 🚀 تشغيل السيرفر
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.io ready for real-time notifications`);
});

module.exports = { io, sendNotification };
