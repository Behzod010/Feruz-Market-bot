const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    buyurtma_raqami: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    foydalanuvchi_id: {
      type: Number,
      required: true,
      index: true,
    },
    foydalanuvchi_ismi: {
      type: String,
      required: true,
    },
    mahsulotlar: [
      {
        nomi: { type: String, required: true },
        narxi: { type: Number, required: true },
        birlik: { type: String, default: 'dona' },
        soni: { type: Number, default: 1 },
      },
    ],
    jami_narx: {
      type: Number,
      required: true,
      min: 0,
    },
    telefon: {
      type: String,
      required: true,
    },
    manzil: {
      type: String,
      required: true,
    },
    holati: {
      type: String,
      default: 'yangi',
      enum: ['yangi', 'qabul_qilindi', 'yetkazilmoqda', 'yakunlandi', 'bekor_qilindi'],
    },
    sana: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);