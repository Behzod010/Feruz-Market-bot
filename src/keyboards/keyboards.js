const { Markup } = require('telegraf');

// Asosiy menyu
const boshMenu = () => {
  return Markup.keyboard([
    ['🛍 Mahsulotlar', '🛒 Buyurtma berish'],
    ['📋 Buyurtmalar tarixi', 'ℹ️ Yordam'],
  ])
    .resize()
    .oneTime(false);
};

// Admin panel
const adminMenu = () => {
  return Markup.keyboard([
    ['➕ Mahsulot qo\'shish', '✏️ Mahsulot tahrirlash'],
    ['📊 Statistika', '🛍 Mahsulotlar'],
    ['🔙 Asosiy menyu'],
  ])
    .resize()
    .oneTime(false);
};

// Bekor qilish
const bekorQilish = () => {
  return Markup.keyboard([['❌ Bekor qilish']])
    .resize()
    .oneTime(false);
};

// Telefon yuborish
const telefonYuborish = () => {
  return Markup.keyboard([
    [Markup.button.contactRequest('📱 Telefon raqamni yuborish')],
    ['❌ Bekor qilish'],
  ])
    .resize()
    .oneTime(true);
};

// Birlik tanlash (admin uchun)
const birlikTanlash = () => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('⚖️ Kg', 'birlik_kg'),
      Markup.button.callback('📦 Dona', 'birlik_dona'),
    ],
    [
      Markup.button.callback('🥛 Litr', 'birlik_litr'),
      Markup.button.callback('📏 Metr', 'birlik_metr'),
    ],
    [
      Markup.button.callback('📦 Pachka', 'birlik_pachka'),
      Markup.button.callback('🎁 Qadoq', 'birlik_qadoq'),
    ],
    [Markup.button.callback('❌ Bekor qilish', 'bekor_inline')],
  ]);
};

// Mahsulot tanlash (buyurtma uchun)
const mahsulotTanlash = (mahsulotlar) => {
  const tugmalar = mahsulotlar.map((m) => {
    const birlik = m.birlik || 'dona';
    return [
      Markup.button.callback(
        `${m.nomi} — ${m.narxi.toLocaleString('uz-UZ')} so'm/${birlik}`,
        `tanlash_${m._id}`
      ),
    ];
  });
  tugmalar.push([Markup.button.callback('✅ Tasdiqlash', 'tasdiqlash_buyurtma')]);
  tugmalar.push([Markup.button.callback('❌ Bekor qilish', 'bekor_inline')]);
  return Markup.inlineKeyboard(tugmalar);
};

// Mahsulot tahrirlash (admin uchun)
const mahsulotTahrirlash = (mahsulotlar) => {
  const tugmalar = mahsulotlar.map((m) => {
    const birlik = m.birlik || 'dona';
    return [
      Markup.button.callback(
        `✏️ ${m.nomi} — ${m.narxi.toLocaleString('uz-UZ')} so'm/${birlik}`,
        `tahrir_${m._id}`
      ),
    ];
  });
  tugmalar.push([Markup.button.callback('🔙 Orqaga', 'bekor_inline')]);
  return Markup.inlineKeyboard(tugmalar);
};

// Tahrirlash amallari
const tahrirAmallari = (mahsulotId) => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📝 Nomini o\'zgartirish', `tahrir_nom_${mahsulotId}`)],
    [Markup.button.callback('💰 Narxini o\'zgartirish', `tahrir_narx_${mahsulotId}`)],
    [Markup.button.callback('⚖️ Birligini o\'zgartirish', `tahrir_birlik_${mahsulotId}`)],
    [Markup.button.callback('🗑 O\'chirish', `ochirish_${mahsulotId}`)],
    [Markup.button.callback('🔙 Orqaga', 'bekor_inline')],
  ]);
};

// Savat ko'rsatish
const savatKorsatish = (savat) => {
  const tugmalar = savat.map((item, index) => [
    Markup.button.callback(
      `🗑 ${item.nomi} (${item.soni} ${item.birlik || 'dona'})`,
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

// =============================================
// MIQDOR TANLASH TUGMALARI
// Birlikka qarab har xil miqdorlar chiqadi
// =============================================
const miqdorTanlash = (birlik) => {
  // Birlik null yoki undefined bo'lsa default dona
  const b = birlik || 'dona';

  if (b === 'kg') {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('0.5 kg', 'miqdor_0.5'),
        Markup.button.callback('1 kg', 'miqdor_1'),
        Markup.button.callback('2 kg', 'miqdor_2'),
      ],
      [
        Markup.button.callback('3 kg', 'miqdor_3'),
        Markup.button.callback('5 kg', 'miqdor_5'),
        Markup.button.callback('10 kg', 'miqdor_10'),
      ],
      [Markup.button.callback('❌ Bekor qilish', 'bekor_inline')],
    ]);
  } else if (b === 'litr') {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('0.5 L', 'miqdor_0.5'),
        Markup.button.callback('1 L', 'miqdor_1'),
        Markup.button.callback('2 L', 'miqdor_2'),
      ],
      [
        Markup.button.callback('3 L', 'miqdor_3'),
        Markup.button.callback('5 L', 'miqdor_5'),
        Markup.button.callback('10 L', 'miqdor_10'),
      ],
      [Markup.button.callback('❌ Bekor qilish', 'bekor_inline')],
    ]);
  } else if (b === 'metr') {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('0.5 m', 'miqdor_0.5'),
        Markup.button.callback('1 m', 'miqdor_1'),
        Markup.button.callback('2 m', 'miqdor_2'),
      ],
      [
        Markup.button.callback('5 m', 'miqdor_5'),
        Markup.button.callback('10 m', 'miqdor_10'),
        Markup.button.callback('20 m', 'miqdor_20'),
      ],
      [Markup.button.callback('❌ Bekor qilish', 'bekor_inline')],
    ]);
  } else {
    // dona, pachka, qadoq, ta — hammasi uchun
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('1 ta', 'miqdor_1'),
        Markup.button.callback('2 ta', 'miqdor_2'),
        Markup.button.callback('3 ta', 'miqdor_3'),
      ],
      [
        Markup.button.callback('5 ta', 'miqdor_5'),
        Markup.button.callback('10 ta', 'miqdor_10'),
        Markup.button.callback('20 ta', 'miqdor_20'),
      ],
      [Markup.button.callback('❌ Bekor qilish', 'bekor_inline')],
    ]);
  }
};

// Birlik emoji
const birlikEmoji = (birlik) => {
  const emojilar = {
    kg: '⚖️',
    dona: '📦',
    litr: '🥛',
    metr: '📏',
    pachka: '📦',
    qadoq: '🎁',
    ta: '📦',
  };
  return emojilar[birlik] || '📦';
};

module.exports = {
  boshMenu,
  adminMenu,
  bekorQilish,
  telefonYuborish,
  birlikTanlash,
  mahsulotTanlash,
  mahsulotTahrirlash,
  tahrirAmallari,
  savatKorsatish,
  miqdorTanlash,
  birlikEmoji,
};