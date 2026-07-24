const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
    image: { type: String, required: true },
    header_image: { type: String, default: "" },
    description_ar: { type: String, default: "", trim: true },
    description_en: { type: String, default: "", trim: true }
  },
  { timestamps: true }
);

brandSchema.index({
  name: "text",
  description_ar: "text",
  description_en: "text"
});

module.exports = mongoose.model("Brand", brandSchema);
