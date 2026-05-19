// beauty-store/middleware/validate.js - النسخة المُصححة ✅
const Joi = require("joi");

/**
* Middleware عام للتحقق من المدخلات باستخدام Joi
* @param {Object} schema - مخطط Joi للتحقق
* @param {string} source - مصدر البيانات: 'body' | 'query' | 'params'
*/
const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const data = req[source];
    const { error, value } = schema.validate(data, {
      abortEarly: false, // إرجاع كل الأخطاء دفعة واحدة
      stripUnknown: true, // إزالة الحقول غير المعروفة
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
  sku: Joi.string()
    .uppercase()
    .trim()
    .pattern(/^[A-Z0-9\-]{3,50}$/)
    .required()
    .messages({
      "string.pattern.base": "SKU يجب أن يحتوي على أحرف كبيرة وأرقام وشرطات فقط",
    }),
  name_ar: Joi.string().min(2).max(200).required(),
  name_en: Joi.string().min(2).max(200).required(),
  description_ar: Joi.string().min(10).max(2000).allow(""),
  description_en: Joi.string().min(10).max(2000).allow(""),
  
  // ✅ ✅ ✅ الإصلاح: استخدام Joi.alternatives().try() بدلاً من .or()
  image: Joi.alternatives().try(
    Joi.string().uri({ scheme: ['https'] }),  // ✅ يقبل أي رابط HTTPS صحيح
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
        sku: Joi.string().uppercase().trim().pattern(/^[A-Z0-9\-]{3,50}$/),
        price: Joi.number().min(0).max(10000).precision(2),
        
        // ✅ نفس الإصلاح لحقل image في المتغيرات
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
  code: Joi.string()
    .uppercase()
    .trim()
    .pattern(/^[A-Z]{2,10}$/)
    .required()
    .messages({
      "string.pattern.base": "Code يجب أن يكون 2-10 أحرف كبيرة",
    }),
  
  // ✅ ✅ ✅ نفس الإصلاح
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
  
  // ✅ ✅ ✅ نفس الإصلاح (مع السماح بالفارغ)
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
        sku: Joi.string().required(),
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
  schemas: {
    product: productSchema,
    brand: brandSchema,
    category: categorySchema,
    order: orderSchema,
    user: userSchema,
  },
};
