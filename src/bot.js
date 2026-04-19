const { Telegraf } = require('telegraf');
const connectDB = require('./database');

const userHandlers = require('./handlers/userHandlers');
const adminHandlers = require('./handlers/adminHandlers');

const createBot = (token) => {
  const bot = new Telegraf(token);

  // KOMANDALAR
  bot.start(async (ctx) => {
    await connectDB();
    await userHandlers.startHandler(ctx);
  });

  bot.command('admin', async (ctx) => {
    await connectDB();
    await adminHandlers.adminPanelHandler(ctx);
  });

  // MATNLI TUGMALAR
  bot.hears('🛍 Mahsulotlar', async (ctx) => {
    await connectDB();
    await userHandlers.mahsulotlarHandler(ctx);
  });

  bot.hears('🛒 Buyurtma berish', async (ctx) => {
    await connectDB();
    await userHandlers.buyurtmaBoshlanishi(ctx);
  });

  bot.hears('📋 Buyurtmalar tarixi', async (ctx) => {
    await connectDB();
    await userHandlers.buyurtmalarTarixiHandler(ctx);
  });

  bot.hears('ℹ️ Yordam', async (ctx) => {
    await connectDB();
    await userHandlers.yordamHandler(ctx);
  });

  bot.hears('❌ Bekor qilish', async (ctx) => {
    await connectDB();
    await userHandlers.bekorQilishHandler(ctx);
  });

  bot.hears('➕ Mahsulot qo\'shish', async (ctx) => {
    await connectDB();
    await adminHandlers.mahsulotQoshishHandler(ctx);
  });

  bot.hears('✏️ Mahsulot tahrirlash', async (ctx) => {
    await connectDB();
    await adminHandlers.mahsulotTahrirHandler(ctx);
  });

  bot.hears('📊 Statistika', async (ctx) => {
    await connectDB();
    await adminHandlers.statistikaHandler(ctx);
  });

  bot.hears('🔙 Asosiy menyu', async (ctx) => {
    await connectDB();
    await adminHandlers.asosiyMenuHandler(ctx);
  });

  // INLINE TUGMALAR

  // Mahsulot tanlash (buyurtma)
  bot.action(/^tanlash_/, async (ctx) => {
    await connectDB();
    await userHandlers.mahsulotTanlashHandler(ctx);
  });

  // MIQDOR TANLASH (yangi!)
  bot.action(/^miqdor_/, async (ctx) => {
    await connectDB();
    await userHandlers.miqdorTanlashHandler(ctx);
  });

  // Savatdan olib tashlash
  bot.action(/^olib_tashlash_/, async (ctx) => {
    await connectDB();
    await userHandlers.olibTashlashHandler(ctx);
  });

  bot.action('yana_qoshish', async (ctx) => {
    await connectDB();
    await userHandlers.yanaQoshishHandler(ctx);
  });

  bot.action('savatni_tozalash', async (ctx) => {
    await connectDB();
    await userHandlers.savatniTozalashHandler(ctx);
  });

  bot.action('rasmiylashtirish', async (ctx) => {
    await connectDB();
    await userHandlers.rasmiylashtirishHandler(ctx);
  });

  bot.action('tasdiqlash_buyurtma', async (ctx) => {
    await connectDB();
    await userHandlers.tasdiqlashBuyurtmaHandler(ctx);
  });

  bot.action('bekor_inline', async (ctx) => {
    await connectDB();
    await userHandlers.bekorInlineHandler(ctx);
  });

  // ADMIN INLINE TUGMALAR

  // Birlik tanlash
  bot.action(/^birlik_/, async (ctx) => {
    await connectDB();
    await adminHandlers.birlikTanlashHandler(ctx);
  });

  // Birlikni tahrirlash
  bot.action(/^tahrir_birlik_/, async (ctx) => {
    await connectDB();
    await adminHandlers.tahrirBirlikHandler(ctx);
  });

  // Nomini tahrirlash
  bot.action(/^tahrir_nom_/, async (ctx) => {
    await connectDB();
    await adminHandlers.tahrirNomHandler(ctx);
  });

  // Narxini tahrirlash
  bot.action(/^tahrir_narx_/, async (ctx) => {
    await connectDB();
    await adminHandlers.tahrirNarxHandler(ctx);
  });

  // Mahsulotni tanlash (tahrir uchun)
  bot.action(/^tahrir_(?!nom_|narx_|birlik_)/, async (ctx) => {
    await connectDB();
    await adminHandlers.tahrirTanlashHandler(ctx);
  });

  // O'chirish
  bot.action(/^ochirish_/, async (ctx) => {
    await connectDB();
    await adminHandlers.mahsulotOchirishHandler(ctx);
  });

  // KONTAKT
  bot.on('contact', async (ctx) => {
    await connectDB();
    await userHandlers.telefonQabulQilish(ctx);
  });

  // MATNLI XABARLAR
  bot.on('text', async (ctx) => {
    await connectDB();

    const adminNatija = await adminHandlers.adminMatnHandler(ctx);
    if (adminNatija) return;

    const userNatija = await userHandlers.matnHandler(ctx);
    if (userNatija) return;
  });

  bot.catch((xatolik, ctx) => {
    console.error(`❌ Bot xatosi [${ctx.updateType}]:`, xatolik);
  });

  return bot;
};

module.exports = { createBot };

///so'ngi yangilanishh 2026-04-19