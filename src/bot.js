// Feruz Market Bot — Asosiy bot fayli
const { Telegraf } = require('telegraf');
const connectDB = require('./database');

// Handlerlar
const userHandlers = require('./handlers/userHandlers');
const adminHandlers = require('./handlers/adminHandlers');

/**
 * Botni yaratish va barcha handlerlarni ulash
 * @param {string} token - Bot token
 * @returns {Telegraf} - Telegraf bot instansiyasi
 */
const createBot = (token) => {
  const bot = new Telegraf(token);

  // ============================================
  // KOMANDALAR
  // ============================================

  // /start komandasi
  bot.start(async (ctx) => {
    await connectDB();
    await userHandlers.startHandler(ctx);
  });

  // /admin komandasi
  bot.command('admin', async (ctx) => {
    await connectDB();
    await adminHandlers.adminPanelHandler(ctx);
  });

  // ============================================
  // MATNLI TUGMALAR (hears)
  // ============================================

  // --- Foydalanuvchi tugmalari ---
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

  // --- Admin tugmalari ---
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

  // ============================================
  // INLINE TUGMALAR (callback query)
  // ============================================

  // Mahsulot tanlash (buyurtma uchun)
  bot.action(/^tanlash_/, async (ctx) => {
    await connectDB();
    await userHandlers.mahsulotTanlashHandler(ctx);
  });

  // Savatdan olib tashlash
  bot.action(/^olib_tashlash_/, async (ctx) => {
    await connectDB();
    await userHandlers.olibTashlashHandler(ctx);
  });

  // Yana qo'shish
  bot.action('yana_qoshish', async (ctx) => {
    await connectDB();
    await userHandlers.yanaQoshishHandler(ctx);
  });

  // Savatni tozalash
  bot.action('savatni_tozalash', async (ctx) => {
    await connectDB();
    await userHandlers.savatniTozalashHandler(ctx);
  });

  // Rasmiylashtirish (telefon raqam so'rash)
  bot.action('rasmiylashtirish', async (ctx) => {
    await connectDB();
    await userHandlers.rasmiylashtirishHandler(ctx);
  });

  // Tasdiqlash (buyurtmani ko'rib chiqish)
  bot.action('tasdiqlash_buyurtma', async (ctx) => {
    await connectDB();
    await userHandlers.tasdiqlashBuyurtmaHandler(ctx);
  });

  // Bekor qilish (inline)
  bot.action('bekor_inline', async (ctx) => {
    await connectDB();
    await userHandlers.bekorInlineHandler(ctx);
  });

  // --- Admin inline tugmalari ---

  // Tahrirlash uchun mahsulotni tanlash
  bot.action(/^tahrir_(?!nom_|narx_)/, async (ctx) => {
    await connectDB();
    await adminHandlers.tahrirTanlashHandler(ctx);
  });

  // Nomini o'zgartirish
  bot.action(/^tahrir_nom_/, async (ctx) => {
    await connectDB();
    await adminHandlers.tahrirNomHandler(ctx);
  });

  // Narxini o'zgartirish
  bot.action(/^tahrir_narx_/, async (ctx) => {
    await connectDB();
    await adminHandlers.tahrirNarxHandler(ctx);
  });

  // O'chirish
  bot.action(/^ochirish_/, async (ctx) => {
    await connectDB();
    await adminHandlers.mahsulotOchirishHandler(ctx);
  });

  // ============================================
  // KONTAKT (telefon raqam)
  // ============================================

  bot.on('contact', async (ctx) => {
    await connectDB();
    await userHandlers.telefonQabulQilish(ctx);
  });

  // ============================================
  // MATNLI XABARLAR (holat bo'yicha)
  // ============================================

  bot.on('text', async (ctx) => {
    await connectDB();

    // Avval admin handlerlarni tekshirish
    const adminNatija = await adminHandlers.adminMatnHandler(ctx);
    if (adminNatija) return;

    // Keyin foydalanuvchi handlerlarni tekshirish
    const userNatija = await userHandlers.matnHandler(ctx);
    if (userNatija) return;

    // Agar hech qaysi holat mos kelmasa
    const adminId = Number(process.env.ADMIN_ID);
    const isAdmin = ctx.from.id === adminId;

    // Noma'lum xabar uchun
    // (menyu tugmalari ishladi bo'lsa, bu yerga kelmaydi)
  });

  // Xatoliklarni ushlash
  bot.catch((xatolik, ctx) => {
    console.error(`❌ Bot xatosi [${ctx.updateType}]:`, xatolik);
  });

  return bot;
};

module.exports = { createBot };