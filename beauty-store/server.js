// server.js - النسخة النهائية 100% ✅
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");

// استيراد الموديلات
const Brand = require("./models/Brand");
const Category = require("./models/Category");
const Product = require("./models/Product");
const Variant = require("./models/Variant");

// استيراد الـ Routes
const adminRoutes = require("./routes/admin");
const authRoutes = require("./routes/auth");

const app = express();

// 🔗 الاتصال بقاعدة البيانات
connectDB();

// 🛡️ إعدادات الأمان
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false
}));

// ✅ CORS - بسيط وموثوق (يتعامل مع preflight تلقائياً)
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:3000'];

const isProd = process.env.NODE_ENV === 'production';

app.use(cors({
  origin: isProd ? '*' : corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// ✅ ✅ ✅ لا نستخدم app.options مع أي wildcard - CORS يتكفل بذلك!

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(require("./middleware/sanitize"));

// ✅ تسجيل الـ Routes
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);

// ✅ Rate Limiting
const isDev = process.env.NODE_ENV !== 'production';
app.use(
  rateLimit({
    windowMs: isDev ? 1 * 60 * 1000 : 15 * 60 * 1000,
    max: isDev ? 500 : 100,
    message: { error: "⚠️ Too many requests, please slow down." },
    standardHeaders: true,
    legacyHeaders: false
  })
);

// 📁 خدمة الصور
app.use("/assets", (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  next();
});
app.use("/assets", express.static(path.join(__dirname, "data/assets")));

// 🧠 دالة مساعدة للبحث في التصنيفات
async function getCategoryAndChildrenIds(catId) {
  let ids = [catId];
  const children = await Category.find({ parent_id: catId }).select("id");
  for (const child of children) {
    const subIds = await getCategoryAndChildrenIds(child.id);
    ids = ids.concat(subIds);
  }
  return ids;
}

// 🗄️ Caching بسيط
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const getCached = async (key, fetchFn) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < CACHE_TTL) return cached.data;
  const data = await fetchFn();
  cache.set(key, { data, time: Date.now() });
  return data;
};

// 🌐 الروابط العامة
app.get("/", (req, res) => res.send("Miles Beauty API 🚀"));

app.get("/brands", async (req, res) => {
  try {
    const brands = await getCached("brands", () => Brand.find().sort({ id: 1 }));
    res.json(brands);
  } catch (err) {
    console.error("Error fetching brands:", err);
    res.status(500).json({ message: "Error fetching brands", error: err.message });
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
    res.status(500).json({ message: "Error fetching categories", error: err.message });
  }
});

app.get("/products", async (req, res) => {
  try {
    const { brand, category, min, max, search, page = 1, limit = 20 } = req.query;
    let query = {};

	if (search) {
	  const s = search.trim();

	  try {
	    // ✅ 1️⃣ ابحث في SKU المتغيرات (مع Index سريع)
	    const matchingVariantProductIds = await Variant.find({
	      sku: { $regex: `^${s}`, $options: "i" }  // ✅ يبدأ بـ... لأسرع أداء
	    }).distinct("product_id");

	    // ✅ 2️⃣ ابحث في خصائص المتغيرات (attributes) - اختياري
	    // إذا بدك تبحث داخل الـ attributes (مثل: "Red", "50ml", إلخ)
	    const matchingAttributeProductIds = await Variant.find({
	      attributes: { $regex: s, $options: "i" }  // ⚠️ Mixed field - أبطأ قليلاً
	    }).distinct("product_id");

	    // ✅ 3️⃣ ادمج كل الـ IDs (بدون تكرار)
	    const allMatchingIds = [
	      ...new Set([...matchingVariantProductIds, ...matchingAttributeProductIds])
	    ];

	    // ✅ 4️⃣ ابني شرط الـ $or الشامل
	    query.$or = [
	      { name_ar: { $regex: s, $options: "i" } },
	      { name_en: { $regex: s, $options: "i" } },
	      { sku: { $regex: s, $options: "i" } },  // SKU المنتج الأساسي
	      { id: { $in: allMatchingIds } }          // المنتجات اللي عندها متغيرات مطابقة
	    ];

	  } catch (err) {
	    console.warn("⚠️ Variant search skipped:", err.message);
	    // Fallback: ابحث في أسماء المنتجات فقط إذا فشل بحث المتغيرات
	    query.$or = [
	      { name_ar: { $regex: s, $options: "i" } },
	      { name_en: { $regex: s, $options: "i" } }
	    ];
	  }
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

    const [allBrands, allCategories] = await Promise.all([
      getCached("brands", () => Brand.find()),
      getCached("categories", () => Category.find())
    ]);

    const brandMap = Object.fromEntries(allBrands.map(b => [b.id, b]));
    const catMap = Object.fromEntries(allCategories.map(c => [c.id, c]));

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
          brand_name: brandDoc?.name || "Unknown",
          category_name: catDoc?.name_en || "General",
          options: opts
        };
      })
    );

    res.json({
      products: enrichedProducts,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalProducts,
        hasNextPage: Number(page) < totalPages
      }
    });

  } catch (err) {
    console.error("❌ Error in /products:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
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
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

app.get("/variants", async (req, res) => {
  try {
    const variants = await getCached("variants", () => Variant.find().sort({ id: 1 }));
    res.json(variants);
  } catch (err) {
    console.error("Error fetching variants:", err);
    res.status(500).json({ message: "Error fetching variants", error: err.message });
  }
});

// ✅ Public Orders Endpoint
app.post("/api/orders", async (req, res) => {
  try {
    const Order = require("./models/Order");
    const { fullName, phone, city, address, items, total } = req.body;
    
    if (!fullName || !phone || !city || !address || !items || !total) {
      return res.status(400).json({ 
        message: "❌ Missing required fields",
        required: ["fullName", "phone", "city", "address", "items", "total"]
      });
    }
    
    const order = new Order({
      id: Date.now(),
      receivedAt: new Date(),
      ...req.body
    });
    
    await order.save();
    
    const io = app.get('io');
    if (io) {
      io.emit("new-order", order.toObject());
    }
    
    res.status(201).json({
      message: "✅ تم تسجيل الطلب بنجاح",
      order: order.toObject()
    });
    
  } catch (err) {
    console.error("❌ Error saving order:", err);
    res.status(500).json({ message: "❌ فشل حفظ الطلب", error: err.message });
  }
});

// ============================================
// 🚀 Socket.io Setup + Server Start
// ============================================

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    // ✅ السماح لكل النطاقات في الإنتاج (أو حدد نطاق Vercel فقط)
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.CORS_ORIGIN, "https://miles-six-gamma.vercel.app"].filter(Boolean)
      : ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true
});

app.set('io', io);

io.on("connection", (socket) => {
  console.log("🔌 Connected:", socket.id);
  socket.on("disconnect", () => console.log(`🔌 Disconnected: ${socket.id}`));
});

// ✅ أضف هذا في server.js للتأكد من أن Socket.io يعمل
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    socket: io ? "connected" : "not initialized",
    environment: process.env.NODE_ENV 
  });
});

// 🚀 تشغيل السيرفر
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${isProd ? 'Production' : 'Development'}`);
});

module.exports = { io, app };
