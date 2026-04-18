// Barcha klaviatura (tugma) sozlamalari
const { Markup } = require('telegraf');

/**
 * Asosiy menyu tugmalari (oddiy foydalanuvchi uchun)
 */
const boshMenu = () => {
  return Markup.keyboard([
    ['🛍 Mahsulotlar', '🛒 Buyurtma berish'],
    ['📋 Buyurtmalar tarixi', 'ℹ️ Yordam'],
  ])
    .resize()
    .oneTime(false);
};

/**
 * Admin panel tugmalari
 */
const adminMenu = () => {
  return Markup.keyboard([
    ['➕ Mahsulot qo\'shish', '✏️ Mahsulot tahrirlash'],
    ['📊 Statistika', '🛍 Mahsulotlar'],
    ['🔙 Asosiy menyu'],
  ])
    .resize()
    .oneTime(false);
};

/**
 * Bekor qilish tugmasi
 */
const bekorQilish = () => {
  return Markup.keyboard([['❌ Bekor qilish']])
    .resize()
    .oneTime(false);
};

/**
 * Telefon raqamini yuborish tugmasi
 */
const telefonYuborish = () => {
  return Markup.keyboard([
    [Markup.button.contactRequest('📱 Telefon raqamni yuborish')],
    ['❌ Bekor qilish'],
  ])
    .resize()
    .oneTime(true);
};

/**
 * Mahsulotlarni inline tugmalar sifatida ko'rsatish
 * @param {Array} mahsulotlar - Mahsulotlar ro'yxati
 */
const mahsulotTanlash = (mahsulotlar) => {
  const tugmalar = mahsulotlar.map((m) => [
    Markup.button.callback(
      `${m.nomi} — ${m.narxi.toLocaleString('uz-UZ')} so'm`,
      `tanlash_${m._id}`
    ),
  ]);
  tugmalar.push([Markup.button.callback('✅ Tasdiqlash', 'tasdiqlash_buyurtma')]);
  tugmalar.push([Markup.button.callback('❌ Bekor qilish', 'bekor_inline')]);
  return Markup.inlineKeyboard(tugmalar);
};

/**
 * Admin uchun mahsulotni tahrirlash inline tugmalari
 * @param {Array} mahsulotlar - Mahsulotlar ro'yxati
 */
const mahsulotTahrirlash = (mahsulotlar) => {
  const tugmalar = mahsulotlar.map((m) => [
    Markup.button.callback(
      `✏️ ${m.nomi} — ${m.narxi.toLocaleString('uz-UZ')} so'm`,
      `tahrir_${m._id}`
    ),
  ]);
  tugmalar.push([Markup.button.callback('🔙 Orqaga', 'bekor_inline')]);
  return Markup.inlineKeyboard(tugmalar);
};

/**
 * Tahrirlash amallarini tanlash
 * @param {string} mahsulotId - Mahsulot ID si
 */
const tahrirAmallari = (mahsulotId) => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📝 Nomini o\'zgartirish', `tahrir_nom_${mahsulotId}`)],
    [Markup.button.callback('💰 Narxini o\'zgartirish', `tahrir_narx_${mahsulotId}`)],
    [Markup.button.callback('🗑 O\'chirish', `ochirish_${mahsulotId}`)],
    [Markup.button.callback('🔙 Orqaga', 'bekor_inline')],
  ]);
};

/**
 * Savatdagi mahsulotlarni ko'rsatish
 * @param {Array} savat - Savatdagi mahsulotlar
 */
const savatKorsatish = (savat) => {
  const tugmalar = savat.map((item, index) => [
    Markup.button.callback(
      `🗑 ${item.nomi} (${item.soni} dona)`,
      `olib_tashlash_${index}`
    ),
  ]);
  tugmalar.push([
    Markup.button.callback('➕ Yana qo\'shish', 'yana_qoshish'),
    Markup.button.callback('✅ Rasmiylashtirish', 'rasmiylashtirish'),
  ]);
  tugmalar.push([Markup.button.callback('❌ Savatni tozalash', 'savatni_tozalash')]);
  return Markup.inlineKeyboard(tugmalar);
};

module.exports = {
  boshMenu,
  adminMenu,
  bekorQilish,
  telefonYuborish,
  mahsulotTanlash,
  mahsulotTahrirlash,
  tahrirAmallari,
  savatKorsatish,
};