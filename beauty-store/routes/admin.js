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
const { uploadCompressed, deleteFromCloudinary, extractPublicIdFromUrl, cloudinary, getBrandSlugById } = require("../middleware/upload");

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
        has_variants: has_variants || (variants?.length > 0) || false,
        isAvailable: req.body.isAvailable !== undefined ? req.body.isAvailable : true 
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

      // ✅ 1. التحقق من الـ SKU إذا تم تعديله
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

      // ✅ 2. إذا تم رفع صورة جديدة، نستخدمها مباشرة
      if (req.uploadedPath) {
        productData.image = req.uploadedPath;
      }

      const oldProduct = await Product.findOne({ id: productId }).lean();
      if (!oldProduct) return res.status(404).json({ message: "Product not found" });

      // ✅ ✅ ✅ 3. تحديد الصور القديمة التي يجب حذفها من Cloudinary
      const imagesToDelete = [];
      
      // 3.1. صورة المنتج الرئيسية
      if (req.uploadedPath && oldProduct.image && oldProduct.image !== req.uploadedPath && oldProduct.image.startsWith("https://res.cloudinary.com/")) {
        imagesToDelete.push(oldProduct.image);
      }

      // 3.2. جلب المتغيرات القديمة للتحقق من الصور
      const oldVariants = await Variant.find({ product_id: productId }).lean();
      const oldVariantsMap = new Map(oldVariants.map(v => [v.id, v]));

      // 3.3. التحقق من صور المتغيرات التي تم تحديثها أو حذفها
      if (variants && Array.isArray(variants)) {
        const newVariantIds = new Set(
          variants
            .map(v => v.id)
            .filter(id => id && !String(id).startsWith('temp_'))
            .map(id => Number(id))
        );

        // التحقق من المتغيرات التي تم تحديث صورتها
        for (const v of variants) {
          const variantId = v.id && !String(v.id).startsWith('temp_') ? Number(v.id) : null;
          if (variantId && oldVariantsMap.has(variantId)) {
            const oldVariant = oldVariantsMap.get(variantId);
            const newVariantImage = v.image || productData.image;
            
            if (newVariantImage && oldVariant.image && oldVariant.image !== newVariantImage && oldVariant.image.startsWith("https://res.cloudinary.com/")) {
              if (!imagesToDelete.includes(oldVariant.image)) {
                imagesToDelete.push(oldVariant.image);
              }
            }
          }
        }

        // 3.4. التحقق من المتغيرات المحذوفة
        for (const oldVariant of oldVariants) {
          if (!newVariantIds.has(oldVariant.id)) {
            if (oldVariant.image && oldVariant.image.startsWith("https://res.cloudinary.com/")) {
              if (!imagesToDelete.includes(oldVariant.image)) {
                imagesToDelete.push(oldVariant.image);
              }
            }
          }
        }
      } else if (variants && variants.length === 0) {
        // إذا كانت قائمة المتغيرات فارغة، يتم حذف جميع المتغيرات
        for (const oldVariant of oldVariants) {
          if (oldVariant.image && oldVariant.image.startsWith("https://res.cloudinary.com/")) {
            if (!imagesToDelete.includes(oldVariant.image)) {
              imagesToDelete.push(oldVariant.image);
            }
          }
        }
      }

      // 🔍🔍🔍 DEBUG LOGGING START 🔍🔍🔍
      console.log("🔍 [DEBUG] Product Update - Initial State:", {
        productId,
        oldBrandId: oldProduct.brand_id,
        newBrandId: productData.brand_id,
        oldImage: oldProduct.image,
        hasNewImage: !!req.uploadedPath,
        imagesToDeleteCount: imagesToDelete.length
      });

      // ✅ ✅ ✅ 4. 🚀 تحديث رابط الصورة إذا تغيّر البراند ولم يتم رفع صورة جديدة
      const isNewBrand = productData.brand_id !== undefined && 
                         String(productData.brand_id) !== String(oldProduct.brand_id);
      const isCloudinaryImage = oldProduct.image?.startsWith("https://res.cloudinary.com/");
      const noNewImageUploaded = req.isNewImageUploaded !== true;

      // ✅ ✅ ✅ 4.5. 🚀 نقل صور المتغيرات أيضاً عند تغيير البراند
      const variantImageUpdates = new Map(); // لتخزين تحديثات صور المتغيرات
      
      if (isNewBrand && noNewImageUploaded && oldVariants.length > 0) {
        const newBrandSlug = await getBrandSlugById(productData.brand_id);
        const baseUrl = process.env.CLOUDINARY_UPLOAD_FOLDER || "miles-beauty";
        
        if (newBrandSlug) {
          console.log(`📦 [DEBUG] Starting variant images transfer for brand change (${oldVariants.length} variants)...`);
          
          for (const oldVariant of oldVariants) {
            if (oldVariant.image?.startsWith("https://res.cloudinary.com/")) {
              try {
                const oldVariantImageUrl = oldVariant.image;
                const variantSku = oldVariant.sku || `VAR-${oldVariant.id}`;
                
                // بناء المسار الجديد
                const oldPathPattern = /\/products\/[^/]+\/[^/]+(?:\.[^/.]+)?$/;
                const newVariantPath = `/products/${newBrandSlug}/${variantSku}`;
                const newVariantUrl = oldVariantImageUrl.replace(oldPathPattern, newVariantPath + '.png');
                
                // تخزين التحديث لاستخدامه لاحقاً
                variantImageUpdates.set(oldVariant.id, newVariantUrl);
                
                // محاولة نقل الملف فعلياً في Cloudinary
                const oldPublicId = extractPublicIdFromUrl(oldVariantImageUrl);
                const newPublicId = `${baseUrl}/products/${newBrandSlug}/${variantSku}`;
                
                if (oldPublicId && oldPublicId !== newPublicId) {
                  console.log(`☁️ [DEBUG] Attempting to rename variant image: ${variantSku}`);
                  try {
                    const renameResult = await cloudinary.uploader.rename(oldPublicId, newPublicId, {
                      overwrite: true,
                      invalidate: true
                    });
                    console.log(`✅ Variant image renamed successfully: ${variantSku}`);
                    
                    // إزالة من قائمة الحذف إذا كانت موجودة
                    const deleteIndex = imagesToDelete.indexOf(oldVariantImageUrl);
                    if (deleteIndex > -1) {
                      imagesToDelete.splice(deleteIndex, 1);
                    }
                    
                  } catch (renameErr) {
                    console.warn(`⚠️ Failed to rename variant image ${variantSku} (non-critical):`, renameErr.message);
                    // Fallback: الرابط الجديد سيُحفظ في الداتابيس حتى لو فشل النقل الفعلي
                  }
                }
              } catch (err) {
                console.error(`❌ Error processing variant image ${oldVariant.id}:`, err.message);
              }
            }
          }
        }
      }

      if (isNewBrand && isCloudinaryImage && noNewImageUploaded) {
        try {
          console.log("📦 [DEBUG] Starting main product image URL update for brand change...");
          
          const oldImageUrl = oldProduct.image;
          const baseUrl = process.env.CLOUDINARY_UPLOAD_FOLDER || "miles-beauty";
          const newBrandSlug = await getBrandSlugById(productData.brand_id);
          const currentSku = productData.sku || oldProduct.sku;
          
          if (!newBrandSlug) {
            console.warn("⚠️ Could not get brand slug, skipping URL update");
            throw new Error("Could not determine new brand slug");
          }
          
          const oldPathPattern = /\/products\/[^/]+\/[^/]+(?:\.[^/.]+)?$/;
          const newPath = `/products/${newBrandSlug}/${currentSku}`;
          const newUrl = oldImageUrl.replace(oldPathPattern, newPath + '.png');
          
          productData.image = newUrl;
          console.log("✅ Main product image URL updated in productData (database only)");
          
          // ✅ إزالة الصورة القديمة من قائمة الحذف لأنها تم نقلها
          const index = imagesToDelete.indexOf(oldImageUrl);
          if (index > -1) {
            imagesToDelete.splice(index, 1);
          }
          
          // محاولة نقل الملف فعلياً في Cloudinary (optional)
          try {
            const oldPublicId = extractPublicIdFromUrl(oldImageUrl);
            const newPublicId = `${baseUrl}/products/${newBrandSlug}/${currentSku}`;
            
            if (oldPublicId && oldPublicId !== newPublicId) {
              console.log("☁️ [DEBUG] Attempting Cloudinary rename for main product (optional)...");
              const renameResult = await cloudinary.uploader.rename(oldPublicId, newPublicId, {
                overwrite: true,
                invalidate: true
              });
              console.log("✅ Cloudinary rename for main product (optional):", renameResult.result);
            }
          } catch (renameErr) {
            console.warn("⚠️ Cloudinary rename for main product failed (non-critical):", renameErr.message);
          }
          
        } catch (err) {
          console.error("❌ [DEBUG] Main product image URL update failed:", {
            message: err.message,
            code: err.code,
            stack: err.stack
          });
        }
      }

      // ✅ 5. حفظ المنتج في MongoDB
      const product = await Product.findOneAndUpdate(
        { id: productId },
        { $set: productData },
        { returnDocument: 'after', runValidators: true }
      ).lean();

      await audit.update(req.user, "product", oldProduct, product, req);

      // ✅ 6. تحديث المتغيرات (Variants)
      if (variants && Array.isArray(variants)) {
        const permanentIds = variants
          .map(v => v.id)
          .filter(id => id && !String(id).startsWith('temp_'))
          .map(id => Number(id))
          .filter(id => !isNaN(id));

        if (permanentIds.length > 0) {
          await Variant.deleteMany({ product_id: productId, id: { $nin: permanentIds } });
        } else if (variants.length === 0) {
          await Variant.deleteMany({ product_id: productId });
        }

        const skuMap = new Map();
        for (const v of variants) {
          const rawSku = v.sku?.trim()?.toUpperCase();
          if (rawSku) {
            if (skuMap.has(rawSku)) throw new Error(`⚠️ تكرار الـ SKU "${rawSku}" في نفس الطلب`);
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
            if (existingInDb) throw new Error(`⚠️ SKU "${variantSku}" مستخدم لمتغير آخر في هذا المنتج`);
          }

          // ✅ ✅ ✅ استخدام الصورة المحدّثة من نقل البراند إذا كانت موجودة
          let finalImage = v.image || product.image;
          if (variantId && variantImageUpdates.has(variantId)) {
            finalImage = variantImageUpdates.get(variantId);
            console.log(`✅ Using updated image URL for variant ${variantId}: ${finalImage}`);
          }

          const updatePayload = {
            sku: rawSku ? rawSku.toUpperCase() : `SKU-${productId}-${Date.now()}`,
            price: Number(v.price) || product.price,
            image: finalImage, // ✅ استخدام الصورة المحدّثة
            attributes: v.attributes || {},
            isAvailable: v.isAvailable !== false
          };

          if (variantId) {
            await Variant.findOneAndUpdate(
              { id: variantId, product_id: productId },
              { $set: updatePayload },
              { returnDocument: 'after', runValidators: true }
            );
          } else {
            await new Variant({
              id: Date.now() + Math.floor(Math.random() * 10000),
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

      // ✅ ✅ ✅ 7. حذف الصور القديمة من Cloudinary (في الخلفية بدون تعطيل الاستجابة)
      if (imagesToDelete.length > 0) {
        console.log(`🗑️ [Background] Deleting ${imagesToDelete.length} old image(s) from Cloudinary...`);
        
        imagesToDelete.forEach(imageUrl => {
          deleteFromCloudinary(imageUrl).then((success) => {
            if (success) {
              console.log(`✅ Deleted old product/variant image from Cloudinary: ${imageUrl}`);
            } else {
              console.warn(`⚠️ Failed to delete old image: ${imageUrl}`);
            }
          }).catch(err => {
            console.error("❌ Error deleting old image from Cloudinary:", err);
          });
        });
      }

      res.json({
        message: "✅ تم تحديث المنتج ومتغيراته بنجاح",
        product,
        variantsCount: variants?.length || 0,
        brandChanged: isNewBrand,
        variantImagesUpdated: variantImageUpdates.size
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
            // 1️⃣ جلب المتغيرات أولاً لحذف صورهم من Cloudinary
      const variants = await Variant.find({ product_id: productId });
      for (const variant of variants) {
        if (variant.image?.startsWith("https://res.cloudinary.com/")) {
          const publicId = extractPublicIdFromUrl(variant.image);
          if (publicId) await deleteFromCloudinary(publicId);
        }
      }
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
      const { id, sku, price, image, attributes, isAvailable } = req.body;
      const productId = Number(req.params.productId);
      
      // ✅ 1. التأكد من أن المنتج الأصلي موجود قبل إضافة متغير له
      const parentProduct = await Product.findOne({ id: productId });
      if (!parentProduct) {
        return res.status(404).json({ message: "⚠️ المنتج الأصلي غير موجود" });
      }

      // ✅ 2. التحقق من الـ ID (إذا تم إرساله)
      if (id) {
        const exists = await Variant.findOne({ id: Number(id) });
        if (exists) {
          return res.status(400).json({ message: "⚠️ Variant بهذا المعرف موجود مسبقاً" });
        }
      }
      
      // ✅ 3. التحقق من تكرار الـ SKU لنفس المنتج فقط
      if (sku) {
        const normalizedSku = sku.toUpperCase().trim();
        const skuExists = await Variant.findOne({ sku: normalizedSku, product_id: productId });
        if (skuExists) {
          return res.status(400).json({ 
            message: `⚠️ SKU "${normalizedSku}" موجود مسبقاً لهذا المنتج` 
          });
        }
      }

      // ✅ 4. إنشاء المتغير الجديد (مع ضمان أنواع البيانات الصحيحة)
      const newVariant = new Variant({
        id: id ? Number(id) : Date.now(), // ضمان أنه رقم
        product_id: productId,
        sku: sku ? sku.toUpperCase().trim() : `SKU-${productId}-${Date.now()}`,
        price: Number(price) || parentProduct.price, // استخدام سعر المنتج الأب كـ fallback
        image: image || parentProduct.image, // استخدام صورة المنتج الأب كـ fallback
        attributes: attributes || {},
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true
      });
      
      await newVariant.save();
      
      // ✅ 5. تحديث المنتج الأب ليعكس أنه يحتوي على متغيرات
      await Product.findOneAndUpdate(
        { id: productId },
        { $set: { has_variants: true } }
      );

      // ✅ 6. تسجيل العملية في الـ Audit Log
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

      // ✅ 1️⃣ جلب المتغير القديم أولاً (للتحقق من وجوده ولحفظ صورته القديمة)
      const oldVariant = await Variant.findOne({ id: variantId });
      if (!oldVariant) {
        return res.status(404).json({ message: "Variant not found" });
      }

      // ✅ 2️⃣ التحقق من تكرار الـ SKU (باستخدام oldVariant.product_id بدلاً من جلبه مرة أخرى)
      if (sku) {
        const normalizedSku = sku.toUpperCase().trim();
        const existing = await Variant.findOne({
          sku: normalizedSku,
          product_id: oldVariant.product_id,
          id: { $ne: variantId }
        });
        if (existing) {
          return res.status(400).json({ 
            message: `⚠️ SKU "${normalizedSku}" مستخدم لمتغير آخر` 
          });
        }
      }

      // ✅ 3️⃣ بناء payload التحديث
      const updatePayload = {
        ...(sku && { sku: sku.toUpperCase().trim() }),
        price,
        image,
        attributes,
        ...(req.body.isAvailable !== undefined && { isAvailable: req.body.isAvailable })
      };

      // ✅ 4️⃣ تحديث المتغير في MongoDB
      const updatedVariant = await Variant.findOneAndUpdate(
        { id: variantId },
        { $set: updatePayload },
        { returnDocument: 'after', runValidators: true }
      );

      // ✅ ✅ ✅ 5️⃣ حذف الصورة القديمة من Cloudinary (في الخلفية بدون تعطيل الاستجابة)
      // نتحقق: هل تم إرسال صورة جديدة؟ وهل هي مختلفة عن القديمة؟ وهل القديمة من Cloudinary؟
      if (image && oldVariant.image && oldVariant.image !== image && oldVariant.image.startsWith("https://res.cloudinary.com/")) {
        
        deleteFromCloudinary(oldVariant.image).then((success) => {
          if (success) {
            console.log(`✅ Deleted old variant image from Cloudinary: ${oldVariant.image}`);
          } else {
            console.warn(`⚠️ Failed to delete old variant image: ${oldVariant.image}`);
          }
        }).catch(err => {
          console.error("❌ Error deleting old variant image from Cloudinary:", err);
        });
      }

      // ✅ 6️⃣ تسجيل العملية في الـ Audit Log
      await audit.update(
        req.user, 
        "variant", 
        oldVariant.toObject(), // ✅ الآن نستخدمها بدون Optional Chaining لأننا تأكدنا من وجودها
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
      
      // ✅ ✅ ✅ حذف صورة المتغير من Cloudinary
      if (variant.image?.startsWith("https://res.cloudinary.com/")) {
        const publicId = extractPublicIdFromUrl(variant.image);
        if (publicId) {
          await deleteFromCloudinary(publicId);
          console.log(`🗑️ Deleted variant image from Cloudinary: ${publicId}`);
        }
      }

      const remaining = await Variant.countDocuments({ product_id: variant.product_id });
      if (remaining === 0) {
        await Product.findOneAndUpdate(
          { id: variant.product_id },
          { $set: { has_variants: false } }
        );
      }
      
      await audit.delete(req.user, "variant", variant.toObject(), req);
      
      res.json({ 
        message: "✅ تم حذف المتغير وصورته بنجاح",
        deletedVariantId: variant.id
      });
    } catch (err) {
      console.error("Error deleting variant:", err);
      res.status(500).json({ 
        message: "❌ خطأ أثناء حذف المتغير", 
        error: err.message 
      });
    }
  }
);
// ================= 🔄 PROMOTE VARIANT TO PRODUCT =================
router.post("/variants/:id/promote",
  authMiddleware,
  checkPermission(PERMISSIONS.PRODUCTS.CREATE),
  async (req, res) => {
    try {
      const lang = req.query.lang || 'ar';
      const variant = await Variant.findOne({ id: Number(req.params.id) });
      if (!variant) return res.status(404).json({ message: "Variant not found" });
      
      const parentProduct = await Product.findOne({ id: variant.product_id });
      if (!parentProduct) return res.status(400).json({ message: "Parent product not found" });

      // ✅ 1️⃣ استقبال البيانات المعدّلة من الفرونت إند (مع Fallback للقيم التلقائية)
      const { 
        name_ar, name_en, description_ar, description_en, 
        sku, price, image, category_id, brand_id, isAvailable 
      } = req.body || {};

      // ✅ 2️⃣ تحديد القيم النهائية (المعدّلة > التلقائية)
      const finalSku = sku?.trim() ? sku.toUpperCase().trim() : (variant.sku?.trim() ? variant.sku.toUpperCase().trim() : `PROMO-${Date.now()}`);
      const finalPrice = price !== undefined ? Number(price) : variant.price;
      const finalImage = image || variant.image;
      const finalBrandId = brand_id ? Number(brand_id) : parentProduct.brand_id;
      const finalCategoryId = category_id ? Number(category_id) : parentProduct.category_id;
      const finalIsAvailable = isAvailable !== undefined ? isAvailable : (variant.isAvailable !== false);

      // ✅ 3️⃣ التحقق من عدم تكرار الـ SKU
      if (finalSku) {
        const existingSku = await Product.findOne({ sku: finalSku });
        if (existingSku) {
          return res.status(400).json({ message: `⚠️ SKU "${finalSku}" مستخدم مسبقاً لمنتج آخر (ID: ${existingSku.id})` });
        }
      }

      // ✅ 4️⃣ توليد ID جديد للمنتج
      const lastProduct = await Product.findOne().sort({ id: -1 });
      const newProductId = lastProduct ? lastProduct.id + 1 : 10000;

      // ✅ 5️⃣ إنشاء المنتج الجديد
      const newProduct = new Product({
        id: newProductId,
        brand_id: finalBrandId,
        category_id: finalCategoryId,
        sku: finalSku,
        name_ar: name_ar || parentProduct.name_ar,
        name_en: name_en || parentProduct.name_en,
        description_ar: description_ar !== undefined ? description_ar : parentProduct.description_ar,
        description_en: description_en !== undefined ? description_en : parentProduct.description_en,
        image: finalImage,
        price: finalPrice,
        has_variants: false,
        isAvailable: finalIsAvailable
      });

      await newProduct.save();

      // ✅ 6️⃣ حذف المتغير الأصلي من الداتابيس
      await Variant.deleteOne({ id: variant.id });

      // ✅ ✅ ✅ 6.5️⃣ حذف صورة المتغير القديمة من Cloudinary إذا تم تغييرها أثناء التحويل
      // نتحقق: هل تم إرسال صورة جديدة؟ وهل هي مختلفة عن القديمة؟ وهل القديمة من Cloudinary؟
      if (image && variant.image && image !== variant.image && variant.image.startsWith("https://res.cloudinary.com/")) {
        
        // حذف في الخلفية (non-blocking) حتى لا نبطئ استجابة الـ API
        deleteFromCloudinary(variant.image).then((success) => {
          if (success) {
            console.log(`✅ Deleted old variant image from Cloudinary during promotion: ${variant.image}`);
          } else {
            console.warn(`⚠️ Failed to delete old variant image during promotion: ${variant.image}`);
          }
        }).catch(err => {
          console.error("❌ Error deleting old variant image during promotion:", err);
        });
      }

      // ✅ 7️⃣ تحديث حالة المنتج الأب إذا لم يتبقى متغيرات
      const remainingVariants = await Variant.countDocuments({ product_id: parentProduct.id });
      if (remainingVariants === 0) {
        await Product.findOneAndUpdate(
          { id: parentProduct.id },
          { $set: { has_variants: false } }
        );
      }

      // ✅ 8️⃣ تسجيل العملية في الـ Audit Log
      await audit.create(req.user, "product", newProduct.toObject(), req, {
        promotedFromVariant: variant.id,
        parentProductId: parentProduct.id
      });

      res.status(201).json({
        message: lang === "ar" ? "✅ تم تحويل المتغير إلى منتج مستقل بنجاح" : "✅ Variant promoted to standalone product successfully",
        product: { 
          id: newProduct.id, 
          sku: newProduct.sku, 
          name_ar: newProduct.name_ar, 
          name_en: newProduct.name_en 
        }
      });

    } catch (err) {
      console.error("❌ Promote variant error:", err);
      res.status(500).json({ message: "Failed to promote variant", error: err.message });
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
      
      // 1️⃣ جلب بيانات البراند القديمة أولاً لمعرفة رابط الصورة القديمة
      const oldBrand = await Brand.findOne({ id: Number(req.params.id) });
      if (!oldBrand) return res.status(404).json({ message: "Brand not found" });

      // 2️⃣ إذا تم رفع صورة جديدة، نجهّز رابطها للحفظ
      if (req.uploadedPath) {
        updateData.image = req.uploadedPath;
      }
      
      // 3️⃣ تحديث البيانات في MongoDB
      const brand = await Brand.findOneAndUpdate(
        { id: Number(req.params.id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );
      
      // 4️⃣ ✅ حذف الصورة القديمة من Cloudinary (في الخلفية بدون تعطيل الاستجابة)
      if (req.uploadedPath && oldBrand.image && oldBrand.image !== req.uploadedPath && oldBrand.image.startsWith("https://res.cloudinary.com/")) {
        
        // نحذفها بشكل غير متزامن (non-blocking) حتى لا نبطئ استجابة الـ API للمستخدم
        deleteFromCloudinary(oldBrand.image).then((success) => {
          if (success) {
            console.log(`✅ Deleted old brand image from Cloudinary: ${oldBrand.image}`);
          } else {
            console.warn(`⚠️ Failed to delete old brand image: ${oldBrand.image}`);
          }
        }).catch(err => {
          console.error("❌ Error deleting old image from Cloudinary:", err);
        });
      }
      
      // 5️⃣ تسجيل العملية في الـ Audit Log
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
      res.status(500).json({ message: "Error updating brand", error: err.message });
    }
  }
);
router.delete("/brands/:id", 
  authMiddleware,
  checkPermission(PERMISSIONS.BRANDS.DELETE),
  async (req, res) => {
    try {
      const brandId = Number(req.params.id);
      
      // ✅ 1️⃣ جلب المنتجات مع الصور (لحذفها من Cloudinary)
      const products = await Product.find({ brand_id: brandId }).select('id image');
      const productIds = products.map(p => p.id);
      
      // ✅ 2️⃣ حذف صور المنتجات من Cloudinary
      for (const product of products) {
        if (product.image?.startsWith("https://res.cloudinary.com/")) {
          const publicId = extractPublicIdFromUrl(product.image);
          if (publicId) {
            await deleteFromCloudinary(publicId);
            console.log(`🗑️ Deleted product image from Cloudinary: ${publicId}`);
          }
        }
      }
      
      // ✅ 3️⃣ جلب المتغيرات مع الصور (لحذفها من Cloudinary)
      if (productIds.length > 0) {
        const variants = await Variant.find({ product_id: { $in: productIds } }).select('image');
        
        // ✅ 4️⃣ حذف صور المتغيرات من Cloudinary
        for (const variant of variants) {
          if (variant.image?.startsWith("https://res.cloudinary.com/")) {
            const publicId = extractPublicIdFromUrl(variant.image);
            if (publicId) {
              await deleteFromCloudinary(publicId);
              console.log(`🗑️ Deleted variant image from Cloudinary: ${publicId}`);
            }
          }
        }
        
        // ✅ 5️⃣ حذف المتغيرات من الداتابيز
        await Variant.deleteMany({ product_id: { $in: productIds } });
      }
      
      // ✅ 6️⃣ حذف المنتجات من الداتابيز
      if (productIds.length > 0) {
        await Product.deleteMany({ id: { $in: productIds } });
      }
      
      // ✅ 7️⃣ حذف البراند من الداتابيز
      const brand = await Brand.findOneAndDelete({ id: brandId });
      if (!brand) {
        return res.status(404).json({ message: "Brand not found" });
      }

      // ✅ 8️⃣ حذف صورة البراند من Cloudinary
      if (brand.image?.startsWith("https://res.cloudinary.com/")) {
        const publicId = extractPublicIdFromUrl(brand.image);
        if (publicId) {
          await deleteFromCloudinary(publicId);
          console.log(`🗑️ Deleted brand image from Cloudinary: ${publicId}`);
        }
      }

      // ✅ 9️⃣ تسجيل عملية الحذف في الـ Audit Log
      await audit.delete(req.user, "brand", brand.toObject(), req);

      res.json({
        message: "✅ تم حذف البراند وجميع منتجاته ومتغيراته وصورهم بنجاح",
        deleted: {
          brand: brand.name,
          productsCount: productIds.length,
          variantsDeleted: productIds.length > 0 ? "جميع المتغيرات المرتبطة" : 0,
          cloudinaryCleanup: "تم حذف جميع الصور من التخزين السحابي"
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
      
      // 1️⃣ جلب بيانات التصنيف القديمة أولاً لمعرفة رابط الصورة القديمة
      const oldCat = await Category.findOne({ id: Number(req.params.id) });
      if (!oldCat) return res.status(404).json({ message: "Category not found" });

      // 2️⃣ إذا تم رفع صورة جديدة، نجهّز رابطها للحفظ
      if (req.uploadedPath) {
        updateData.image = req.uploadedPath;
      }
      
      // 3️⃣ تحديث البيانات في MongoDB
      const cat = await Category.findOneAndUpdate(
        { id: Number(req.params.id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );
      
      // 4️⃣ ✅ حذف الصورة القديمة من Cloudinary (في الخلفية بدون تعطيل الاستجابة)
      if (req.uploadedPath && oldCat.image && oldCat.image !== req.uploadedPath && oldCat.image.startsWith("https://res.cloudinary.com/")) {
        
        // نحذفها بشكل غير متزامن (non-blocking) حتى لا نبطئ استجابة الـ API
        deleteFromCloudinary(oldCat.image).then((success) => {
          if (success) {
            console.log(`✅ Deleted old category image from Cloudinary: ${oldCat.image}`);
          } else {
            console.warn(`⚠️ Failed to delete old category image: ${oldCat.image}`);
          }
        }).catch(err => {
          console.error("❌ Error deleting old category image from Cloudinary:", err);
        });
      }
      
      // 5️⃣ تسجيل العملية في الـ Audit Log
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
      res.status(500).json({ message: "Error updating category", error: err.message });
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
