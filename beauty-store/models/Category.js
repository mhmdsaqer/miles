const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    name_ar: { type: String, required: true },
    name_en: { type: String, required: true },
    parent_id: { type: Number, default: null },
    image: { type: String, default: "" },
    sort_order: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// فهرس لتسريع الفلترة الشجرية (أبناء وأحفاد)
categorySchema.index({ parent_id: 1, sort_order: 1  });

module.exports = mongoose.model("Category", categorySchema);
