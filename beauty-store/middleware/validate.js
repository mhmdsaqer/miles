// ✅ beauty-store/middleware/validate.js - النسخة الاحترافية النهائية ✅
const Joi = require("joi");

/**
 * ✅ دالة مساعدة: تنظيف الـ SKU فعلياً في الـ Backend
 * (لضمان التوافق مع الـ Frontend ومنع أخطاء التحقق)
 */
const cleanSKU = (sku) => {
  if (!sku) return "";
  return sku
    .toString()
    .toUpperCase()                    // ✅ تحويل فعلي لأحرف كبيرة
    .trim()                           // ✅ إزالة المسافات
    .normalize('NFD')                 // ✅ فصل التشكيل
    .replace(/[\u0300-\u036f]/g, '')  // ✅ إزالة علامات التشكيل
    .replace(/\s+/g, '-')             // ✅ تحويل المسافات الداخلية لشرطات
    .replace(/[^A-Z0-9\-_.]/g, '')    // ✅ إبقاء: أحرف، أرقام، شرطات، نقاط فقط
    .substring(0, 100);               // ✅ تحديد الطول الأقصى
};

/**
 * Middleware عام للتحقق من المدخلات باستخدام Joi
 * @param {Object} schema - مخطط Joi للتحقق
 * @param {string} source - مصدر البيانات: 'body' | 'query' | 'params'
 */
const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const data = req[source];
    
    // ✅ ✅ ✅ Pre-process: تنظيف الـ SKU فعلياً قبل التحقق
    // هذا يضمن أن الـ SKU يكون دائماً بأحرف كبيرة ونظيف قبل التحقق
    if (data && typeof data === 'object') {
      if (data.sku) {
        data.sku = cleanSKU(data.sku);
      }
      if (Array.isArray(data.variants)) {
        data.variants = data.variants.map(v => ({
          ...v,
          sku: v.sku ? cleanSKU(v.sku) : v.sku
        }));
      }
      if (data.items && Array.isArray(data.items)) {
        data.items = data.items.map(item => ({
          ...item,
          sku: item.sku ? cleanSKU(item.sku) : item.sku
        }));
      }
    }
    
    const { error, value } = schema.validate(data, {
      abortEarly: false,        // إرجاع كل الأخطاء دفعة واحدة
      stripUnknown: true,       // إزالة الحقول غير المعروفة
      allowUnknown: source === "query" // السماح بحقول غير معروفة في الـ query
    });
    
    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));
      return res.status(400).json({
        message: "❌ Validation failed",
        errors,
      });
    }
    
    // ✅ تحديث الـ req بالبيانات المُتحقق منها والمُنظفة
    req[source] = value;
    next();
  };
};

// ============================================
// 📦 مخططات التحقق للمنتجات (Products)
// ============================================
const productSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
  brand_id: Joi.number().integer().positive().required(),
  category_id: Joi.number().integer().positive().required(),
  
  // ✅ ✅ ✅ SKU: مرن + نظيف + رسائل واضحة
  sku: Joi.string()
    .trim()                       // ✅ إزالة المسافات (بدون .uppercase() لأنها لا تعمل فعلياً)
    .min(1)                       // ✅ الحد الأدنى: حرف واحد
    .max(100)                     // ✅ الحد الأقصى: 100 حرف
    .pattern(/^[A-Z0-9\-_.]+$/)   // ✅ نمط صارم: أحرف كبيرة فقط + أرقام + شرطات + نقاط
    .required()
    .messages({
      "string.empty": "SKU مطلوب ولا يمكن أن يكون فارغاً",
      "string.min": "SKU يجب أن يكون حرفاً واحداً على الأقل",
      "string.max": "SKU طويل جداً (الحد الأقصى 100 حرف)",
      "string.pattern.base": "SKU يجب أن يحتوي على أحرف إنجليزية كبيرة وأرقام فقط (بدون مسافات أو رموز خاصة)"
    }),
    
  name_ar: Joi.string().min(2).max(200).required(),
  name_en: Joi.string().min(2).max(200).required(),
  description_ar: Joi.string().min(10).max(2000).allow(""),
  description_en: Joi.string().min(10).max(2000).allow(""),
  
  // ✅ ✅ ✅ الصورة: تقبل Cloudinary أو مسار محلي
  image: Joi.alternatives().try(
    Joi.string().uri({ scheme: ['https'] }),  // ✅ أي رابط HTTPS صحيح
    Joi.string().pattern(/^(assets\/.+\.(jpg|jpeg|png|webp|gif))$/i)  // ✅ أو مسار محلي
  )
  .required()
  .messages({
    "any.only": "مسار الصورة يجب أن يكون إما رابط HTTPS صحيح أو مسار محلي (assets/...)",
  }),
  
  price: Joi.number().min(0).max(10000).precision(2).required(),
  has_variants: Joi.boolean().default(false),
  
  variants: Joi.array()
    .items(
      Joi.object({
        id: Joi.alternatives().try(
          Joi.number().integer().positive(),
          Joi.string().pattern(/^temp_/)
        ),
        
        // ✅ SKU للمتغيرات: مرن + يسمح بالفارغ
        sku: Joi.string()
          .trim()
          .min(1)
          .max(100)
          .pattern(/^[A-Z0-9\-_.]+$/)
          .allow("")  // ✅ السماح بحقل فارغ للمتغيرات
          .messages({
            "string.pattern.base": "SKU يجب أن يحتوي على أحرف إنجليزية كبيرة وأرقام فقط",
          }),
          
        price: Joi.number().min(0).max(10000).precision(2),
        
        image: Joi.alternatives().try(
          Joi.string().uri({ scheme: ['https'] }),
          Joi.string().pattern(/^(assets\/.+\.(jpg|jpeg|png|webp|gif))$/i)
        )
        .allow(""),
        
        attributes: Joi.object().pattern(Joi.string(), Joi.any()),
      })
    )
    .optional(),
});

// ============================================
// 🏷️ مخططات التحقق للبراندات (Brands)
// ============================================
const brandSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
  name: Joi.string().min(2).max(100).required(),
  
  // ✅ Code: أحرف كبيرة فقط (2-10 أحرف)
  code: Joi.string()
    .trim()
    .pattern(/^[A-Z]{2,10}$/)
    .required()
    .messages({
      "string.pattern.base": "Code يجب أن يكون 2-10 أحرف إنجليزية كبيرة فقط (بدون أرقام أو رموز)",
      "string.empty": "Code مطلوب"
    }),
  
  image: Joi.alternatives().try(
    Joi.string().uri({ scheme: ['https'] }),
    Joi.string().pattern(/^(assets\/.+\.(jpg|jpeg|png|webp|gif))$/i)
  )
  .required()
  .messages({
    "any.only": "مسار الصورة يجب أن يكون إما رابط HTTPS صحيح أو مسار محلي (assets/...)",
  }),
});

// ============================================
// 🗂️ مخططات التحقق للتصنيفات (Categories)
// ============================================
const categorySchema = Joi.object({
  id: Joi.number().integer().positive().required(),
  name_ar: Joi.string().min(2).max(100).required(),
  name_en: Joi.string().min(2).max(100).required(),
  parent_id: Joi.number().integer().positive().allow(null).default(null),
  
  image: Joi.alternatives().try(
    Joi.string().uri({ scheme: ['https'] }),
    Joi.string().pattern(/^(assets\/.+\.(jpg|jpeg|png|webp|gif))$/i)
  )
  .allow("")
  .default(""),
  
  sort_order: Joi.number().integer().min(0).default(0),
});

// ============================================
// 📋 مخططات التحقق للطلبات (Orders)
// ============================================
const orderSchema = Joi.object({
  fullName: Joi.string().min(2).max(100).required(),
  phone: Joi.string()
    .pattern(/^05[6-9]\d{7}$/)
    .required()
    .messages({
      "string.pattern.base": "رقم هاتف فلسطيني صحيح (059xxxxxxx)",
      "string.empty": "رقم الهاتف مطلوب"
    }),
  altPhone: Joi.string()
    .pattern(/^05[6-9]\d{7}$/)
    .allow("")
    .optional(),
  email: Joi.string().email().allow("").optional(),
  city: Joi.string().min(2).max(50).required(),
  address: Joi.string().min(15).max(500).required(),
  notes: Joi.string().max(500).allow("").optional(),
  paymentMethod: Joi.string().valid("cod", "electronic").default("cod"),
  items: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().min(1).required(),
        sku: Joi.string().min(1).required(),
        variant: Joi.string().allow(""),
        qty: Joi.number().integer().min(1).required(),
        price: Joi.number().min(0).required(),
      })
    )
    .min(1)
    .required(),
  subtotal: Joi.number().min(0).required(),
  deliveryFee: Joi.number().min(0).required(),
  total: Joi.number().min(0).required(),
});

// ============================================
// 👥 مخططات التحقق للمستخدمين (Users)
// ============================================
const userSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string()
    .min(6)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .messages({
      "string.pattern.base": "كلمة المرور يجب أن تحتوي على حرف كبير، صغير، ورقم",
      "string.min": "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
    })
    .required(),
  name: Joi.string().min(2).max(100).required(),
  role: Joi.string()
    .valid("super_admin", "admin", "order_manager", "content_manager", "viewer")
    .default("viewer"),
  permissions: Joi.array()
    .items(
      Joi.string().pattern(
        /^(products|brands|categories|orders|users|settings|reports):(\*|create|read|update|delete|update_status|add_notes|view_sales|export_data|view_analytics)$/
      )
    )
    .optional(),
  isActive: Joi.boolean().default(true),
});

// ✅ تصدير كل المخططات والـ middleware
module.exports = {
  validate,
  cleanSKU,  // ✅ تصدير دالة التنظيف للاستخدام الخارجي إذا لزم
  schemas: {
    product: productSchema,
    brand: brandSchema,
    category: categorySchema,
    order: orderSchema,
    user: userSchema,
  },
};
