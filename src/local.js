// Lokal ishga tushirish (polling rejimi)
// Bu faqat dasturlash paytida ishlatiladi
require('dotenv').config();
const { createBot } = require('./bot');

const bot = createBot(process.env.BOT_TOKEN);

// Polling rejimida ishga tushirish
bot.launch()
  .then(() => {
    console.log('🚀 Feruz Market Bot lokal rejimda ishga tushdi!');
    console.log(`📋 Admin ID: ${process.env.ADMIN_ID}`);
  })
  .catch((xatolik) => {
    console.error('❌ Botni ishga tushirishda xatolik:', xatolik);
  });

// Dastur to'xtatilganda botni yopish
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));