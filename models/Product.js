// Mahsulot (Product) modeli
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    // Mahsulot nomi
    nomi: {
      type: String,
      required: true,
      trim: true,
    },
    // Mahsulot narxi (so'mda)
    narxi: {
      type: Number,
      required: true,
      min: 0,
    },
    // Mahsulot faolmi yoki yo'qmi
    faol: {
      type: Boolean,
      default: true,
    },
    // Qo'shilgan sana
    qoshilgan_sana: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Product', productSchema);