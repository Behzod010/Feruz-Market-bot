// Vercel Webhook Endpoint
// Bu fayl Vercel serverless funksiya sifatida ishlaydi
require('dotenv').config();
const { createBot } = require('../src/bot');

// Botni yaratish
const bot = createBot(process.env.BOT_TOKEN);

/**
 * Vercel serverless funksiya handleri
 * Telegram webhook so'rovlarini qabul qiladi
 */
module.exports = async (req, res) => {
  try {
    // Faqat POST so'rovlarni qabul qilish
    if (req.method === 'POST') {
      // Maxfiy kalit tekshiruvi (xavfsizlik uchun)
      const secretHeader = req.headers['x-telegram-bot-api-secret-token'];
      if (process.env.BOT_SECRET && secretHeader !== process.env.BOT_SECRET) {
        console.warn('⚠️ Noto\'g\'ri secret token');
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Telegram update ni qayta ishlash
      await bot.handleUpdate(req.body);
      res.status(200).json({ ok: true });
    } else if (req.method === 'GET') {
      // GET so'rov — bot holati tekshiruvi
      res.status(200).json({
        status: 'Feruz Market Bot ishlamoqda! ✅',
        vaqt: new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' }),
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (xatolik) {
    console.error('❌ Webhook xatosi:', xatolik);
    // Telegram ga 200 qaytarish kerak, aks holda qayta-qayta yuboradi
    res.status(200).json({ ok: false, error: xatolik.message });
  }
};