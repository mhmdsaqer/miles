const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
    image: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Brand", brandSchema);
