// routes/admin.js - النسخة المُصححة نهائياً ✅
// ✅ المبدأ: روتات الـ POST تستقبل رابط الصورة كـ JSON (لأن الصورة رُفعت مسبقاً عبر /upload)
// ✅ روتات الـ PUT يمكنها استقبال ملف جديد للرفع عبر uploadCompressed

const express = require("express");
const router = express.Router();
const { validate, schemas } = require("../middleware/validate");

// ✅ استيراد الموديلات
const Brand = require("../models/Brand");
const Category = require("../models/Category");
const Product = require("../models/Product");
const Variant = require("../models/Variant");
const Order = require("../models/Order");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");

// ✅ استيراد الميديلوير
const authMiddleware = require("../middleware/auth");
const { checkPermission, PERMISSIONS } = require("../middleware/authorize");

// ✅ استيراد دالة رفع الصور + دالة الحذف من Cloudinary
const { uploadCompressed, deleteFromCloudinary, extractPublicIdFromUrl } = require("../middleware/upload");

// ✅ استيراد Audit Logger
const audit = require("../utils/auditLogger");

// ================= 📊 DASHBOARD =================
router.get("/stats", 
  authMiddleware,
  checkPermission(PERMISSIONS.REPORTS.VIEW_ANALYTICS),
  async (req, res) => {
    try {
      const [brandsCount, categoriesCount, productsCount, variantsCount] = await Promise.all([
        Brand.countDocuments(),
        Category.countDocuments(),
        Product.countDocuments(),
        Variant.countDocuments()
      ]);
      res.json({
        brands: brandsCount,
        categories: categoriesCount,
        products: productsCount,
        variants: variantsCount,
        lastUpdated: new Date()
      });
    } catch (err) {
      console.error("Stats error:", err);
      res.status(500).json({ message: "Error fetching stats" });
    }
  }
);

// ================= 📤 IMAGE UPLOAD =================
router.post("/upload",
  authMiddleware,
  checkPermission(PERMISSIONS.PRODUCTS.CREATE),
  uploadCompressed("image"),
  (req, res) => {
    if (!req.uploadedPath) {
      return res.status(400).json({ message: "❌ لم يتم رفع الصورة" });
    }
    res.status(201).json({
      message: "✅ تم رفع الصورة بنجاح",
      path: req.uploadedPath,
      url: req.uploadedPath,
      public_id: req.cloudinaryPublicId
    });
  }
);

// ================= 📦 PRODUCTS CRUD =================

router.get("/products", 
  authMiddleware,
  checkPermission(PERMISSIONS.PRODUCTS.READ),
  async (req, res) => {
    try {
      const { page = 1, limit = 20, search, brand, category } = req.query;
      let query = {};
      
      if (search) {
        query.$or = [
          { name_ar: { $regex: search, $options: "i" } },
          { name_en: { $regex: search, $options: "i" } },
          { sku: { $regex: search, $options: "i" } }
        ];
      }
      if (brand) query.brand_id = Number(brand);
      if (category) query.category_id = Number(category);

      const total = await Product.countDocuments(query);
      const products = await Product.find(query)
        .sort({ id: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

      res.json({
        products,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / limit),
          total
        }
      });
    } catch (err) {
      console.error("Error fetching products:", err);
      res.status(500).json({ message: "Error fetching products" });
    }
  }
);

router.get("/products/:id", 
  authMiddleware,
  checkPermission(PERMISSIONS.PRODUCTS.READ),
  async (req, res) => {
    try {
      const product = await Product.findOne({ id: Number(req.params.id) });
      if (!product) return res.status(404).json({ message: "Product not found" });
      const variants = await Variant.find({ product_id: product.id });
      res.json({ ...product.toObject(), variants });
    } catch (err) {
      console.error("Error fetching product:", err);
      res.status(500).json({ message: "Error fetching product" });
    }
  }
);

// ✅ دالة مساعدة لتوليد SKU
const generateSKU = async (formData, brands) => {
  if (formData.sku?.trim()) {
    return formData.sku.toUpperCase().trim();
  }
  const brand = brands.find(b => b.id === Number(formData.brand_id));
  const brandCode = brand?.code || 'BR';
  return `${brandCode}-${String(formData.id).padStart(5, '0')}`.toUpperCase();
};

// ✅ ✅ ✅ إضافة منتج - مع التحقق اليدوي من الصورة (بدون .fork().uri())
router.post("/products", 
  authMiddleware,
  checkPermission(PERMISSIONS.PRODUCTS.CREATE),
  
  // ✅ ✅ ✅ الإصلاح: استخدام validate عادي + تحقق يدوي من الصورة
  validate(schemas.product, "body"),
  
  async (req, res) => {
    try {
      const {
        id, brand_id, category_id, name_ar, name_en,
        description_ar, description_en, image, price, sku,
        has_variants, variants
      } = req.body;

      // ✅ ✅ ✅ التحقق اليدوي من أن الصورة رابط HTTPS (بدون استخدام .uri() في الفورك)
      if (!image || !/^https:\/\//i.test(image)) {
        return res.status(400).json({ 
          message: "❌ صورة المنتج مطلوبة ويجب أن تكون رابط HTTPS صحيح" 
        });
      }

      const brands = await Brand.find().select('id code');
      const finalSku = await generateSKU({ ...req.body, sku }, brands);

      const existsId = await Product.findOne({ id });
      if (existsId) {
        return res.status(400).json({ message: "⚠️ منتج بهذا المعرف موجود مسبقاً" });
      }

      const existsSku = await Product.findOne({ sku: finalSku });
      if (existsSku) {
        return res.status(400).json({
          message: `⚠️ SKU "${finalSku}" مستخدم مسبقاً لمنتج آخر (ID: ${existsSku.id})`
        });
      }

      const newProduct = new Product({
        id, brand_id, category_id, name_ar, name_en,
        description_ar, description_en,
        image,
        price,
        sku: finalSku,
        has_variants: has_variants || (variants?.length > 0) || false
      });
      await newProduct.save();

      await audit.create(req.user, "product", newProduct.toObject(), req);

      if (variants && Array.isArray(variants) && variants.length > 0) {
        const variantsToSave = variants.map((v, index) => {
          const variantSku = v.sku?.trim()?.toUpperCase() ||
            `${finalSku}-${String(index + 1).padStart(3, '0')}`;
          return {
            id: v.id || (Date.now() + index),
            product_id: id,
            sku: variantSku,
            price: Number(v.price) || Number(price),
            image: v.image || image,
            attributes: v.attributes || {}
          };
        });

        const skuList = variantsToSave.map(v => v.sku);
        const duplicates = skuList.filter((s, i) => skuList.indexOf(s) !== i);
        if (duplicates.length > 0) {
          await Product.findOneAndDelete({ id });
          return res.status(400).json({
            message: `⚠️ تكرار في الـ SKU للمتغيرات: ${[...new Set(duplicates)].join(', ')}`
          });
        }
        await Variant.insertMany(variantsToSave);
      }

      res.status(201).json({
        message: "✅ تمت إضافة المنتج ومتغيراته بنجاح",
        product: newProduct,
        variantsCount: variants?.length || 0
      });
    } catch (err) {
      console.error("❌ Error adding product:", err);
      if (req.body?.id) {
        await Product.findOneAndDelete({ id: req.body.id }).catch(() => {});
      }
      res.status(500).json({
        message: "❌ خطأ أثناء إضافة المنتج",
        error: err.message
      });
    }
  }
);

// ✅ تعديل منتج
router.put("/products/:id", 
  authMiddleware,
  checkPermission(PERMISSIONS.PRODUCTS.UPDATE),
  
  uploadCompressed("image", { required: false }),
  
  (req, res, next) => {
    const updateSchema = schemas.product.fork(
      ["id", "sku", "name_ar", "name_en", "image", "price"],
      (field) => field.optional()
    );
    validate(updateSchema, "body")(req, res, next);
  },
  
  async (req, res) => {
    try {
      const productId = Number(req.params.id);
      const { variants, sku, ...productData } = req.body;

      if (sku !== undefined) {
        if (!sku || !sku.trim()) {
          return res.status(400).json({ message: "⚠️ حقل SKU مطلوب ولا يمكن أن يكون فارغاً" });
        }
        const normalizedSku = sku.toUpperCase().trim();
        const existingSku = await Product.findOne({ sku: normalizedSku, id: { $ne: productId } });
        if (existingSku) {
          return res.status(400).json({ 
            message: `⚠️ SKU "${normalizedSku}" مستخدم لمنتج آخر (ID: ${existingSku.id})` 
          });
        }
        productData.sku = normalizedSku;
      }

      if (req.uploadedPath) {
        productData.image = req.uploadedPath;
      }

      const oldProduct = await Product.findOne({ id: productId }).lean();

      const product = await Product.findOneAndUpdate(
        { id: productId },
        { $set: productData },
        { returnDocument: 'after', runValidators: true }
      ).lean();

      if (!product) return res.status(404).json({ message: "Product not found" });

      await audit.update(req.user, "product", oldProduct || {}, product, req);
    
      if (variants && Array.isArray(variants)) {
        const permanentIds = variants
          .map(v => v.id)
          .filter(id => id && !String(id).startsWith('temp_'))
          .map(id => Number(id))
          .filter(id => !isNaN(id));

        if (permanentIds.length > 0) {
          await Variant.deleteMany({
            product_id: productId,
            id: { $nin: permanentIds }
          });
        } else if (variants.length === 0) {
          await Variant.deleteMany({ product_id: productId });
        }

        const skuMap = new Map();
        for (const v of variants) {
          const rawSku = v.sku?.trim()?.toUpperCase();
          if (rawSku) {
            if (skuMap.has(rawSku)) {
              throw new Error(`⚠️ تكرار الـ SKU "${rawSku}" في نفس الطلب`);
            }
            skuMap.set(rawSku, v.id);
          }
        }

        for (const v of variants) {
          const isTemp = v.id?.startsWith?.('temp_');
          const variantId = isTemp ? null : (v.id ? Number(v.id) : null);
          const rawSku = v.sku?.trim();
          
          if (rawSku) {
            const variantSku = rawSku.toUpperCase();
            const existingInDb = await Variant.findOne({
              sku: variantSku,
              product_id: productId,
              id: variantId ? { $ne: variantId } : { $exists: false }
            });
            if (existingInDb) {
              throw new Error(`⚠️ SKU "${variantSku}" مستخدم لمتغير آخر في هذا المنتج`);
            }
          }

          const updatePayload = {
            sku: rawSku ? rawSku.toUpperCase() : `SKU-${productId}-${Date.now()}`,
            price: Number(v.price) || product.price,
            image: v.image || product.image,
            attributes: v.attributes || {}
          };

          if (variantId) {
            await Variant.findOneAndUpdate(
              { id: variantId, product_id: productId },
              { $set: updatePayload },
              { returnDocument: 'after', runValidators: true }
            );
          } else {
            const newVariantId = Date.now() + Math.floor(Math.random() * 10000);
            await new Variant({
              id: newVariantId,
              product_id: productId,
              ...updatePayload
            }).save();
          }
        }

        const remaining = await Variant.countDocuments({ product_id: productId });
        await Product.findOneAndUpdate(
          { id: productId },
          { $set: { has_variants: remaining > 0 } }
        );
      }

      res.json({
        message: "✅ تم تحديث المنتج ومتغيراته بنجاح",
        product,
        variantsCount: variants?.length || 0
      });
    } catch (err) {
      console.error("❌ Error updating product:", err);
      res.status(500).json({
        message: "❌ خطأ أثناء تحديث المنتج",
        error: err.message
      });
    }
  }
);

router.delete("/products/:id", 
  authMiddleware,
  checkPermission(PERMISSIONS.PRODUCTS.DELETE),
  async (req, res) => {
    try {
      const productId = Number(req.params.id);
      await Variant.deleteMany({ product_id: productId });
      const product = await Product.findOneAndDelete({ id: productId });
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      if (product.image?.startsWith("https://res.cloudinary.com/")) {
        const publicId = extractPublicIdFromUrl(product.image);
        if (publicId) {
          await deleteFromCloudinary(publicId);
          console.log(`🗑️ Deleted product image from Cloudinary: ${publicId}`);
        }
      }
      
      await audit.delete(req.user, "product", product.toObject(), req);
      
      res.json({
        message: "✅ تم حذف المنتج وجميع متغيراته بنجاح",
        deleted: {
          productName: product.name_ar,
          productSku: product.sku,
          deletedBy: req.user.email,
          deletedAt: new Date()
        }
      });
    } catch (err) {
      console.error("Error deleting product:", err);
      res.status(500).json({ 
        message: "❌ خطأ أثناء حذف المنتج", 
        error: err.message 
      });
    }
  }
);

// ================= 🔄 VARIANTS CRUD =================
router.post("/products/:productId/variants", 
  authMiddleware,
  checkPermission(PERMISSIONS.PRODUCTS.CREATE),
  async (req, res) => {
    try {
      const { id, sku, price, image, attributes } = req.body;
      const productId = Number(req.params.productId);
      
      const exists = await Variant.findOne({ id });
      if (exists) return res.status(400).json({ message: "⚠️ Variant بهذا المعرف موجود مسبقاً" });
      
      if (sku) {
        const normalizedSku = sku.toUpperCase().trim();
        const skuExists = await Variant.findOne({ sku: normalizedSku, product_id: productId });
        if (skuExists) {
          return res.status(400).json({ 
            message: `⚠️ SKU "${normalizedSku}" موجود مسبقاً لهذا المنتج` 
          });
        }
      }

      const newVariant = new Variant({
        id: id || Date.now(),
        product_id: productId,
        sku: sku ? sku.toUpperCase().trim() : `SKU-${productId}-${Date.now()}`,
        price,
        image,
        attributes: attributes || {}
      });
      await newVariant.save();
      
      await Product.findOneAndUpdate(
        { id: productId },
        { $set: { has_variants: true } }
      );

      await audit.create(req.user, "variant", newVariant.toObject(), req);

      res.status(201).json({ 
        message: "✅ تمت إضافة المتغير بنجاح", 
        variant: newVariant 
      });
    } catch (err) {
      console.error("Error adding variant:", err);
      res.status(500).json({ 
        message: "❌ خطأ أثناء إضافة المتغير", 
        error: err.message 
      });
    }
  }
);

router.put("/variants/:id", 
  authMiddleware,
  checkPermission(PERMISSIONS.PRODUCTS.UPDATE),
  async (req, res) => {
    try {
      const variantId = Number(req.params.id);
      const { sku, price, image, attributes } = req.body;

      if (sku) {
        const normalizedSku = sku.toUpperCase().trim();
        const variant = await Variant.findOne({ id: variantId });
        if (variant) {
          const existing = await Variant.findOne({
            sku: normalizedSku,
            product_id: variant.product_id,
            id: { $ne: variantId }
          });
          if (existing) {
            return res.status(400).json({ 
              message: `⚠️ SKU "${normalizedSku}" مستخدم لمتغير آخر` 
            });
          }
        }
      }

      const updatePayload = {
        ...(sku && { sku: sku.toUpperCase().trim() }),
        price,
        image,
        attributes
      };

      const oldVariant = await Variant.findOne({ id: variantId });
      const updatedVariant = await Variant.findOneAndUpdate(
        { id: variantId },
        { $set: updatePayload },
        { returnDocument: 'after', runValidators: true }
      );

      if (!updatedVariant) {
        return res.status(404).json({ message: "Variant not found" });
      }

      await audit.update(
        req.user, 
        "variant", 
        oldVariant?.toObject() || {},
        updatedVariant.toObject(),
        req
      );

      res.json({ 
        message: "✅ تم تحديث المتغير بنجاح", 
        variant: updatedVariant 
      });
    } catch (err) {
      console.error("Error updating variant:", err);
      res.status(500).json({ 
        message: "❌ خطأ أثناء تحديث المتغير", 
        error: err.message 
      });
    }
  }
);

router.delete("/variants/:id", 
  authMiddleware,
  checkPermission(PERMISSIONS.PRODUCTS.DELETE),
  async (req, res) => {
    try {
      const variant = await Variant.findOneAndDelete({ id: Number(req.params.id) });
      if (!variant) return res.status(404).json({ message: "Variant not found" });
      
      const remaining = await Variant.countDocuments({ product_id: variant.product_id });
      if (remaining === 0) {
        await Product.findOneAndUpdate(
          { id: variant.product_id },
          { $set: { has_variants: false } }
        );
      }
      
      await audit.delete(req.user, "variant", variant.toObject(), req);
      
      res.json({ message: "✅ تم حذف المتغير بنجاح" });
    } catch (err) {
      console.error("Error deleting variant:", err);
      res.status(500).json({ 
        message: "❌ خطأ أثناء حذف المتغير", 
        error: err.message 
      });
    }
  }
);

// ================= 📋 WHATSAPP ORDERS =================
router.post("/whatsapp-orders", 
  authMiddleware,
  checkPermission(PERMISSIONS.ORDERS.READ),
  async (req, res) => {
    try {
      const order = new Order({
        id: Date.now(),
        receivedAt: new Date(),
        ...req.body
      });
      await order.save();

      await audit.create(req.user, "order", order.toObject(), req);

      const io = req.app.get('io');
      if (io) {
        io.emit("new-order", order.toObject());
      }

      res.status(201).json({
        message: "✅ تم تسجيل الطلب في قاعدة البيانات",
        order: order.toObject()
      });
    } catch (err) {
      console.error("❌ Error saving order to MongoDB:", err);
      res.status(500).json({
        message: "❌ فشل حفظ الطلب",
        error: err.message
      });
    }
  }
);

router.get("/whatsapp-orders", 
  authMiddleware,
  checkPermission(PERMISSIONS.ORDERS.READ),
  async (req, res) => {
    try {
      const {
        page = 1, limit = 20, status, city, search, startDate, endDate
      } = req.query;

      let query = {};
      if (status && status !== "all") query.status = status;
      if (city && city !== "all") query.city = city;
      
      if (startDate || endDate) {
        query.receivedAt = {};
        if (startDate) query.receivedAt.$gte = new Date(startDate);
        if (endDate) query.receivedAt.$lte = new Date(endDate + "T23:59:59");
      }
      
      if (search) {
        query.$or = [
          { fullName: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
          { "items.sku": { $regex: search, $options: "i" } },
          { "items.name": { $regex: search, $options: "i" } }
        ];
      }

      const total = await Order.countDocuments(query);
      const orders = await Order.find(query)
        .sort({ receivedAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean();

      res.json({
        orders,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / limit),
          total,
          hasNextPage: Number(page) < Math.ceil(total / limit)
        }
      });
    } catch (err) {
      console.error("❌ Error fetching orders:", err);
      res.status(500).json({ 
        message: "Error fetching orders", 
        error: err.message 
      });
    }
  }
);

router.put("/whatsapp-orders/:id", 
  authMiddleware,
  checkPermission(PERMISSIONS.ORDERS.UPDATE_STATUS),
  async (req, res) => {
    try {
      const { status, adminNotes } = req.body;
      const updateData = {};
      
      if (status) updateData.status = status;
      if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
      updateData.updatedAt = new Date();

      const order = await Order.findOneAndUpdate(
        { id: Number(req.params.id) },
        { $set: updateData },
        { returnDocument: 'after', runValidators: true }
      );

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (status) {
        await audit.statusChange(
          req.user, 
          "order", 
          order.toObject(), 
          order._doc.status, 
          status, 
          req
        );
      }

      const io = req.app.get('io');
      if (io && status) {
        io.emit("order-updated", { 
          id: order.id, 
          status, 
          updatedAt: order.updatedAt 
        });
      }

      res.json({ 
        message: "✅ تم تحديث الطلب", 
        order: order.toObject() 
      });
    } catch (err) {
      console.error("❌ Error updating order:", err);
      res.status(500).json({ 
        message: "Error updating order", 
        error: err.message 
      });
    }
  }
);

router.delete("/whatsapp-orders/:id", 
  authMiddleware,
  checkPermission(PERMISSIONS.ORDERS.DELETE),
  async (req, res) => {
    try {
      const order = await Order.findOneAndDelete({ id: Number(req.params.id) });
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      await audit.delete(req.user, "order", order.toObject(), req);
      
      res.json({ 
        message: "✅ تم حذف الطلب بنجاح", 
        deletedId: order.id 
      });
    } catch (err) {
      console.error("❌ Error deleting order:", err);
      res.status(500).json({ 
        message: "Error deleting order", 
        error: err.message 
      });
    }
  }
);

router.get("/orders/stats", 
  authMiddleware,
  checkPermission(PERMISSIONS.REPORTS.VIEW_SALES),
  async (req, res) => {
    try {
      const stats = await Order.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalRevenue: { $sum: "$total" }
          }
        }
      ]);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayOrders = await Order.countDocuments({
        receivedAt: { $gte: today }
      });
      
      const todayRevenue = await Order.aggregate([
        { $match: { receivedAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: "$total" } } }
      ]);

      res.json({
        byStatus: stats,
        today: {
          orders: todayOrders,
          revenue: todayRevenue[0]?.total || 0
        },
        lastUpdated: new Date()
      });
    } catch (err) {
      console.error("❌ Error fetching order stats:", err);
      res.status(500).json({ 
        message: "Error fetching stats", 
        error: err.message 
      });
    }
  }
);

// ================= 📦 BRANDS CRUD =================
router.get("/brands", 
  authMiddleware,
  checkPermission(PERMISSIONS.BRANDS.READ),
  async (req, res) => {
    try {
      const brands = await Brand.find().sort({ id: 1 });
      res.json(brands);
    } catch (err) {
      console.error("Error fetching brands:", err);
      res.status(500).json({ message: "Error fetching brands" });
    }
  }
);

// ✅ ✅ ✅ إضافة براند - مع التحقق اليدوي من الصورة
router.post("/brands", 
  authMiddleware,
  checkPermission(PERMISSIONS.BRANDS.CREATE),
  
  // ✅ استخدام المخطط الأصلي + تحقق يدوي
  validate(schemas.brand, "body"),
  
  async (req, res) => {
    try {
      const { id, name, code, image } = req.body;
      
      // ✅ التحقق اليدوي من أن الصورة رابط HTTPS
      if (!image || !/^https:\/\//i.test(image)) {
        return res.status(400).json({ 
          message: "❌ صورة البراند مطلوبة ويجب أن تكون رابط HTTPS صحيح" 
        });
      }
      
      const exists = await Brand.findOne({ id });
      if (exists) return res.status(400).json({ message: "⚠️ براند بهذا المعرف موجود" });

      const newBrand = await Brand.create({
        id, name, code, image
      });
      
      await audit.create(req.user, "brand", newBrand.toObject(), req);
      
      res.status(201).json({ 
        message: "✅ تمت إضافة البراند", 
        brand: newBrand 
      });
    } catch (err) {
      console.error("Error creating brand:", err);
      res.status(500).json({ message: "Error creating brand" });
    }
  }
);

router.put("/brands/:id", 
  authMiddleware,
  checkPermission(PERMISSIONS.BRANDS.UPDATE),
  
  uploadCompressed("image"),
  
  validate(schemas.brand.fork(["id"], field => field.optional()), "body"),
  
  async (req, res) => {
    try {
      const { image, ...updateData } = req.body;
      
      if (req.uploadedPath) {
        updateData.image = req.uploadedPath;
      }
      
      const oldBrand = await Brand.findOne({ id: Number(req.params.id) });
      const brand = await Brand.findOneAndUpdate(
        { id: Number(req.params.id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );
      
      if (!brand) return res.status(404).json({ message: "Brand not found" });
      
      await audit.update(
        req.user, 
        "brand", 
        oldBrand?.toObject() || {},
        brand.toObject(),
        req
      );
      
      res.json({ 
        message: "✅ تم تحديث البراند", 
        brand 
      });
    } catch (err) {
      console.error("Error updating brand:", err);
      res.status(500).json({ message: "Error updating brand" });
    }
  }
);

router.delete("/brands/:id", 
  authMiddleware,
  checkPermission(PERMISSIONS.BRANDS.DELETE),
  async (req, res) => {
    try {
      const brandId = Number(req.params.id);
      const products = await Product.find({ brand_id: brandId }).select('id');
      const productIds = products.map(p => p.id);
      
      if (productIds.length > 0) {
        await Variant.deleteMany({ product_id: { $in: productIds } });
      }
      if (productIds.length > 0) {
        await Product.deleteMany({ id: { $in: productIds } });
      }
      
      const brand = await Brand.findOneAndDelete({ id: brandId });
      if (!brand) {
        return res.status(404).json({ message: "Brand not found" });
      }

      if (brand.image?.startsWith("https://res.cloudinary.com/")) {
        const publicId = extractPublicIdFromUrl(brand.image);
        if (publicId) {
          await deleteFromCloudinary(publicId);
          console.log(`🗑️ Deleted brand image from Cloudinary: ${publicId}`);
        }
      }

      await audit.delete(req.user, "brand", brand.toObject(), req);

      res.json({
        message: "✅ تم حذف البراند وجميع منتجاته ومتغيراته بنجاح",
        deleted: {
          brand: brand.name,
          productsCount: productIds.length,
          variantsDeleted: productIds.length > 0 ? "جميع المتغيرات المرتبطة" : 0
        }
      });
    } catch (err) {
      console.error("Error in cascading brand delete:", err);
      res.status(500).json({ 
        message: "❌ خطأ أثناء حذف البراند", 
        error: err.message 
      });
    }
  }
);

// ================= 🗂️ CATEGORIES CRUD =================
router.get("/categories", 
  authMiddleware,
  checkPermission(PERMISSIONS.CATEGORIES.READ),
  async (req, res) => {
    try {
      const categories = await Category.find().sort({ sort_order: 1, id: 1 });
      res.json(categories);
    } catch (err) {
      console.error("Error fetching categories:", err);
      res.status(500).json({ message: "Error fetching categories" });
    }
  }
);

// ✅ ✅ ✅ إضافة تصنيف - مع التحقق اليدوي من الصورة
router.post("/categories", 
  authMiddleware,
  checkPermission(PERMISSIONS.CATEGORIES.CREATE),
  
  // ✅ استخدام المخطط الأصلي + تحقق يدوي
  validate(schemas.category, "body"),
  
  async (req, res) => {
    try {
      const { id, name_ar, name_en, parent_id, image, sort_order } = req.body;
      
      // ✅ التحقق اليدوي: إذا وُجدت صورة، يجب أن تكون رابط HTTPS
      if (image && !/^https:\/\//i.test(image)) {
        return res.status(400).json({ 
          message: "❌ صورة التصنيف يجب أن تكون رابط HTTPS صحيح" 
        });
      }
      
      const exists = await Category.findOne({ id });
      if (exists) return res.status(400).json({ message: "⚠️ تصنيف بهذا المعرف موجود" });

      const newCat = await Category.create({
        id, name_ar, name_en, parent_id: parent_id || null,
        image: image || "", sort_order: sort_order || 0
      });
      
      await audit.create(req.user, "category", newCat.toObject(), req);
      
      res.status(201).json({ 
        message: "✅ تمت إضافة التصنيف", 
        category: newCat 
      });
    } catch (err) {
      console.error("Error creating category:", err);
      res.status(500).json({ message: "Error creating category" });
    }
  }
);

router.put("/categories/:id", 
  authMiddleware,
  checkPermission(PERMISSIONS.CATEGORIES.UPDATE),
  
  uploadCompressed("image"),
  
  async (req, res) => {
    try {
      const { image, ...updateData } = req.body;
      
      if (req.uploadedPath) {
        updateData.image = req.uploadedPath;
      }
      
      const oldCat = await Category.findOne({ id: Number(req.params.id) });
      const cat = await Category.findOneAndUpdate(
        { id: Number(req.params.id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );
      
      if (!cat) return res.status(404).json({ message: "Category not found" });
      
      await audit.update(
        req.user, 
        "category", 
        oldCat?.toObject() || {},
        cat.toObject(),
        req
      );
      
      res.json({ 
        message: "✅ تم تحديث التصنيف", 
        category: cat 
      });
    } catch (err) {
      console.error("Error updating category:", err);
      res.status(500).json({ message: "Error updating category" });
    }
  }
);

// دالة مساعدة للحصول على جميع الأبناء شجرياً
async function getCategoryAndDescendantsIds(catId, categories = null) {
  let ids = [catId];
  if (!categories) {
    categories = await Category.find().select('id parent_id');
  }
  const children = categories.filter(c => c.parent_id === catId);
  for (const child of children) {
    const subIds = await getCategoryAndDescendantsIds(child.id, categories);
    ids = ids.concat(subIds);
  }
  return ids;
}

router.delete("/categories/:id", 
  authMiddleware,
  checkPermission(PERMISSIONS.CATEGORIES.DELETE),
  async (req, res) => {
    try {
      const catId = Number(req.params.id);
      const category = await Category.findOne({ id: catId });
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      const allCategories = await Category.find().select('id parent_id');
      const idsToDelete = await getCategoryAndDescendantsIds(catId, allCategories);

      if (idsToDelete.length > 0) {
        const products = await Product.find({
          category_id: { $in: idsToDelete }
        }).select('id');
        const productIds = products.map(p => p.id);
        
        if (productIds.length > 0) {
          await Variant.deleteMany({ product_id: { $in: productIds } });
        }
        if (productIds.length > 0) {
          await Product.deleteMany({ id: { $in: productIds } });
        }
      }

      await Category.deleteMany({ id: { $in: idsToDelete } });

      if (category.image?.startsWith("https://res.cloudinary.com/")) {
        const publicId = extractPublicIdFromUrl(category.image);
        if (publicId) {
          await deleteFromCloudinary(publicId);
          console.log(`🗑️ Deleted category image from Cloudinary: ${publicId}`);
        }
      }

      await audit.delete(req.user, "category", category.toObject(), req);

      const lang = req.query.lang || 'ar';
      res.json({
        message: "✅ تم حذف التصنيف وجميع فروعه ومنتجاته بنجاح",
        deleted: {
          categoryName: category[`name_${lang}`] || category.name_ar,
          categoriesCount: idsToDelete.length,
          productsDeleted: idsToDelete.length > 0 ? "جميع المنتجات المرتبطة" : 0
        }
      });
    } catch (err) {
      console.error("Error in cascading category delete:", err);
      res.status(500).json({ 
        message: "❌ خطأ أثناء حذف التصنيف", 
        error: err.message 
      });
    }
  }
);

// ================= 👥 USERS MANAGEMENT =================
router.get("/users", 
  authMiddleware,
  checkPermission(PERMISSIONS.USERS.READ),
  async (req, res) => {
    try {
      const users = await User.find().select("-password");
      res.json(users);
    } catch (err) {
      console.error("Error fetching users:", err);
      res.status(500).json({ message: "Error fetching users" });
    }
  }
);

router.post("/users", 
  authMiddleware,
  checkPermission(PERMISSIONS.USERS.CREATE),
  async (req, res) => {
    try {
      const { email, password, name, role, permissions } = req.body;
      
      const exists = await User.findOne({ email });
      if (exists) {
        return res.status(400).json({ 
          message: "⚠️ User with this email already exists" 
        });
      }
      
      const newUser = new User({
        email,
        password,
        name,
        role: role || "viewer",
        permissions: permissions || [],
        createdBy: req.user._id
      });
      
      await newUser.save();
      
      await audit.create(req.user, "user", newUser.toObject(), req);
      
      res.status(201).json({
        message: "✅ User created successfully",
        user: {
          id: newUser._id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role
        }
      });
    } catch (err) {
      console.error("Error creating user:", err);
      res.status(500).json({ 
        message: "Error creating user", 
        error: err.message 
      });
    }
  }
);

router.put("/users/:id", 
  authMiddleware,
  checkPermission(PERMISSIONS.USERS.UPDATE),
  async (req, res) => {
    try {
      const { password, ...updateData } = req.body;
      
      if (password) {
        const bcrypt = require("bcryptjs");
        updateData.password = await bcrypt.hash(password, 10);
      }
      
      const oldUser = await User.findById(req.params.id);
      
      const updatedUser = await User.findOneAndUpdate(
        { _id: req.params.id },
        { $set: updateData },
        { returnDocument: 'after' }
      ).select("-password");
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (JSON.stringify(oldUser?.permissions) !== JSON.stringify(updateData.permissions)) {
        await audit.permissionChange(
          req.user, 
          updatedUser.toObject(), 
          oldUser?.permissions || [], 
          updateData.permissions || [], 
          req
        );
      } else {
        await audit.update(
          req.user, 
          "user", 
          oldUser?.toObject() || {},
          updatedUser.toObject(),
          req
        );
      }
      
      res.json({
        message: "✅ User updated successfully",
        user: updatedUser
      });
    } catch (err) {
      console.error("Error updating user:", err);
      res.status(500).json({ 
        message: "Error updating user", 
        error: err.message 
      });
    }
  }
);

router.delete("/users/:id", 
  authMiddleware,
  checkPermission(PERMISSIONS.USERS.DELETE),
  async (req, res) => {
    try {
      if (req.params.id === req.user._id.toString()) {
        return res.status(400).json({ 
          message: "❌ Cannot delete your own account" 
        });
      }
      
      const deletedUser = await User.findOneAndDelete({ _id: req.params.id });
      if (!deletedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      await audit.delete(req.user, "user", deletedUser.toObject(), req);
      
      res.json({
        message: "✅ User deleted successfully",
        deletedUser: {
          id: deletedUser._id,
          email: deletedUser.email,
          role: deletedUser.role
        }
      });
    } catch (err) {
      console.error("Error deleting user:", err);
      res.status(500).json({ 
        message: "Error deleting user", 
        error: err.message 
      });
    }
  }
);

// ================= ⚙️ SETTINGS =================
router.get("/settings", 
  authMiddleware,
  checkPermission(PERMISSIONS.SETTINGS.READ),
  async (req, res) => {
    res.json({
      message: "Settings endpoint",
      note: "Add your settings logic here"
    });
  }
);

router.put("/settings", 
  authMiddleware,
  checkPermission(PERMISSIONS.SETTINGS.UPDATE),
  async (req, res) => {
    res.json({
      message: "✅ Settings updated",
      updatedBy: req.user.email
    });
  }
);

// ================= 📋 AUDIT LOGS =================
router.get("/audit-logs",
  authMiddleware,
  checkPermission("settings:read"),
  async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 50, 
        userId, 
        action, 
        resource, 
        startDate, 
        endDate,
        search,
        lang
      } = req.query;
      
      let query = {};
      
      if (userId) query.userId = userId;
      if (action) query.action = action;
      if (resource) query.resource = resource;
      
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate + "T23:59:59");
      }
      
      if (search) {
        query.$or = [
          { description: { $regex: search, $options: "i" } },
          { userEmail: { $regex: search, $options: "i" } },
          { userName: { $regex: search, $options: "i" } }
        ];
      }
      
      if (lang && ["ar", "en"].includes(lang)) {
        query["metadata.lang"] = lang;
      }
      
      const total = await AuditLog.countDocuments(query);
      const logs = await AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .select("-changes.before -changes.after");
      
      res.json({
        logs,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / limit),
          total
        }
      });
      
    } catch (err) {
      console.error("Audit logs fetch error:", err);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  }
);

router.get("/audit-logs/:id",
  authMiddleware,
  checkPermission("settings:read"),
  async (req, res) => {
    try {
      const log = await AuditLog.findById(req.params.id);
      if (!log) return res.status(404).json({ message: "Log not found" });
      res.json({ log });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch log details" });
    }
  }
);

router.delete("/audit-logs/:id",
  authMiddleware,
  async (req, res) => {
    try {
      const lang = req.query.lang || 'ar';
      
      if (req.user.role !== "super_admin") {
        return res.status(403).json({ 
          message: lang === "ar" 
            ? "❌ فقط المدير العام يمكنه حذف سجلات النشاطات" 
            : "❌ Only Super Admin can delete audit logs" 
        });
      }
      
      const log = await AuditLog.findByIdAndDelete(req.params.id);
      if (!log) {
        return res.status(404).json({ message: "Log not found" });
      }
      
      res.json({
        message: lang === "ar" 
          ? "✅ تم حذف سجل النشاط بنجاح" 
          : "✅ Audit log deleted successfully",
        deletedLog: {
          id: log._id,
          action: log.action,
          resource: log.resource,
          userName: log.userName,
          deletedAt: new Date()
        }
      });
    } catch (err) {
      console.error("Error deleting audit log:", err);
      const lang = req.query.lang || 'ar';
      res.status(500).json({ 
        message: lang === "ar" ? "❌ فشل حذف السجل" : "❌ Failed to delete log" 
      });
    }
  }
);

module.exports = router;
