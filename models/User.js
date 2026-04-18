const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    telegramId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    ism: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      default: '',
    },
    holat: {
      type: String,
      default: 'bosh_menu',
      enum: [
        'bosh_menu',
        'buyurtma_mahsulot_tanlash',
        'buyurtma_miqdor',
        'buyurtma_telefon',
        'buyurtma_manzil',
        'admin_mahsulot_nomi',
        'admin_mahsulot_birlik',
        'admin_mahsulot_narxi',
        'admin_tahrir_tanlash',
        'admin_tahrir_nomi',
        'admin_tahrir_narxi',
        'admin_tahrir_birlik',
      ],
    },
    vaqtinchalik: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    royxatdan_otgan: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);