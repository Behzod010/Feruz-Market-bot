// MongoDB bazaga ulanish moduli
const mongoose = require('mongoose');

let isConnected = false;

/**
 * MongoDB Atlas bazasiga ulanish funksiyasi.
 * Vercel serverless muhitida har bir so'rovda qayta ulanishni oldini olish uchun
 * kesh mexanizmi ishlatilgan.
 */
const connectDB = async () => {
  // Agar allaqachon ulangan bo'lsa, qayta ulanmaymiz
  if (isConnected) {
    console.log('MongoDB: Mavjud ulanish ishlatilmoqda');
    return;
  }

  try {
    const db = await mongoose.connect(process.env.MONGODB_URI, {
      // Serverless muhit uchun optimizatsiya
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = db.connections[0].readyState === 1;
    console.log('✅ MongoDB Atlas bazasiga muvaffaqiyatli ulandi');
  } catch (xatolik) {
    console.error('❌ MongoDB ulanish xatosi:', xatolik.message);
    throw xatolik;
  }
};

module.exports = connectDB;