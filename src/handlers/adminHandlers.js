const User = require('../../models/User');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const keyboards = require('../keyboards/keyboards');

const narxFormat = (narx) => {
  return Number(narx).toLocaleString('uz-UZ');
};

const adminTekshirish = (ctx) => {
  const adminId = Number(process.env.ADMIN_ID);
  return ctx.from.id === adminId;
};

const foydalanuvchiTopish = async (ctx) => {
  const telegramId = ctx.from.id;
  let foydalanuvchi = await User.findOne({ telegramId });
  if (!foydalanuvchi) {
    foydalanuvchi = new User({
      telegramId,
      ism: `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim(),
      username: ctx.from.username || '',
    });
    await foydalanuvchi.save();
  }
  return foydalanuvchi;
};

// ========== Admin paneli ==========
const adminPanelHandler = async (ctx) => {
  if (!adminTekshirish(ctx)) {
    return await ctx.reply('⛔️ Sizda admin huquqi yo\'q!');
  }
  await ctx.reply('👨‍💼 Admin Paneli\n\nQuyidagi amallardan birini tanlang:', keyboards.adminMenu());
};

// ========== 1-QADAM: NOM SO'RASH ==========
const mahsulotQoshishHandler = async (ctx) => {
  if (!adminTekshirish(ctx)) {
    return await ctx.reply('⛔️ Sizda admin huquqi yo\'q!');
  }

  try {
    const foydalanuvchi = await foydalanuvchiTopish(ctx);
    foydalanuvchi.holat = 'admin_mahsulot_nomi';
    foydalanuvchi.vaqtinchalik = {};
    foydalanuvchi.markModified('vaqtinchalik');
    await foydalanuvchi.save();

    await ctx.reply(
      '➕ Yangi mahsulot qo\'shish\n\n' +
      '📝 1-qadam: Mahsulot nomini kiriting:\n\n' +
      'Masalan: Go\'sht, Un, Shakar, Kartoshka...',
      keyboards.bekorQilish()
    );
  } catch (xatolik) {
    console.error('Mahsulot qo\'shish xatosi:', xatolik);
    await ctx.reply('❌ Xatolik yuz berdi.');
  }
};

// ========== 2-QADAM: NOM QABUL + BIRLIK SO'RASH ==========
const mahsulotNomiQabul = async (ctx) => {
  try {
    const foydalanuvchi = await foydalanuvchiTopish(ctx);
    if (foydalanuvchi.holat !== 'admin_mahsulot_nomi') return false;
    if (!adminTekshirish(ctx)) return false;

    const nomi = ctx.message.text.trim();

    if (nomi.length < 2) {
      await ctx.reply('❌ Mahsulot nomi juda qisqa. Kamida 2 ta belgi kiriting.');
      return true;
    }

    // MUHIM: Avval BIRLIK so'raymiz, keyin narx!
    foydalanuvchi.vaqtinchalik = { mahsulot_nomi: nomi };
    foydalanuvchi.holat = 'admin_mahsulot_birlik';
    foydalanuvchi.markModified('vaqtinchalik');
    await foydalanuvchi.save();

    await ctx.reply(
      `📝 Mahsulot nomi: ${nomi}\n\n` +
      `⚖️ 2-qadam: O'lchov birligini tanlang:\n\n` +
      `• Go'sht, meva, sabzavot → kg\n` +
      `• Non, tuxum → dona\n` +
      `• Sut, yog' → litr\n` +
      `• Mato, sim → metr`,
      keyboards.birlikTanlash()
    );

    return true;
  } catch (xatolik) {
    console.error('Mahsulot nomi qabul xatosi:', xatolik);
    return true;
  }
};

// ========== 3-QADAM: BIRLIK TANLASH (INLINE) ==========
const birlikTanlashHandler = async (ctx) => {
  try {
    if (!adminTekshirish(ctx)) {
      return await ctx.answerCbQuery('⛔️ Admin huquqi yo\'q!');
    }

    const foydalanuvchi = await foydalanuvchiTopish(ctx);
    const birlik = ctx.callbackQuery.data.replace('birlik_', '');

    const birlikNomlari = {
      kg: 'Kilogramm (kg)',
      dona: 'Dona',
      litr: 'Litr',
      metr: 'Metr',
      pachka: 'Pachka',
      qadoq: 'Qadoq',
    };

    // Mahsulot qo'shish jarayonida
    if (foydalanuvchi.holat === 'admin_mahsulot_birlik') {
      foydalanuvchi.vaqtinchalik = {
        ...(foydalanuvchi.vaqtinchalik || {}),
        mahsulot_birlik: birlik,
      };
      foydalanuvchi.holat = 'admin_mahsulot_narxi';
      foydalanuvchi.markModified('vaqtinchalik');
      await foydalanuvchi.save();

      const nomi = foydalanuvchi.vaqtinchalik.mahsulot_nomi;

      await ctx.answerCbQuery(`${birlikNomlari[birlik]} tanlandi`);
      await ctx.reply(
        `📝 Mahsulot nomi: ${nomi}\n` +
        `⚖️ Birlik: ${birlikNomlari[birlik]}\n\n` +
        `💰 3-qadam: Narxini kiriting (so'mda):\n\n` +
        `Masalan: 85000 (1 ${birlik} uchun 85,000 so'm)`
      );
    }
    // Tahrirlash jarayonida
    else if (foydalanuvchi.holat === 'admin_tahrir_birlik') {
      const mahsulotId = foydalanuvchi.vaqtinchalik?.tahrir_mahsulot_id;
      if (!mahsulotId) {
        await ctx.answerCbQuery('❌ Xatolik!');
        return;
      }

      await Product.findByIdAndUpdate(mahsulotId, { birlik: birlik });

      foydalanuvchi.holat = 'bosh_menu';
      foydalanuvchi.vaqtinchalik = {};
      foydalanuvchi.markModified('vaqtinchalik');
      await foydalanuvchi.save();

      await ctx.answerCbQuery('O\'zgartirildi!');
      await ctx.reply(
        `✅ Mahsulot birligi "${birlikNomlari[birlik]}" ga o'zgartirildi!`,
        keyboards.adminMenu()
      );
    }
  } catch (xatolik) {
    console.error('Birlik tanlash xatosi:', xatolik);
    try { await ctx.answerCbQuery('❌ Xatolik!'); } catch(e) {}
  }
};

// ========== 4-QADAM: NARX QABUL + SAQLASH ==========
const mahsulotNarxiQabul = async (ctx) => {
  try {
    const foydalanuvchi = await foydalanuvchiTopish(ctx);
    if (foydalanuvchi.holat !== 'admin_mahsulot_narxi') return false;
    if (!adminTekshirish(ctx)) return false;

    const narxMatni = ctx.message.text.trim().replace(/\s/g, '');
    const narx = parseInt(narxMatni);

    if (isNaN(narx) || narx <= 0) {
      await ctx.reply('❌ Noto\'g\'ri narx!\nFaqat musbat son kiriting. Masalan: 25000', keyboards.bekorQilish());
      return true;
    }

    const nomi = foydalanuvchi.vaqtinchalik?.mahsulot_nomi;
    const birlik = foydalanuvchi.vaqtinchalik?.mahsulot_birlik || 'dona';

    if (!nomi) {
      await ctx.reply('❌ Xatolik. Qaytadan boshlang.', keyboards.adminMenu());
      foydalanuvchi.holat = 'bosh_menu';
      foydalanuvchi.vaqtinchalik = {};
      await foydalanuvchi.save();
      return true;
    }

    // Bazaga saqlash
    const yangiMahsulot = new Product({
      nomi,
      narxi: narx,
      birlik: birlik,
    });
    await yangiMahsulot.save();

    // Tozalash
    foydalanuvchi.holat = 'bosh_menu';
    foydalanuvchi.vaqtinchalik = {};
    foydalanuvchi.markModified('vaqtinchalik');
    await foydalanuvchi.save();

    await ctx.reply(
      `✅ Mahsulot muvaffaqiyatli qo'shildi!\n\n` +
      `📦 Nomi: ${nomi}\n` +
      `⚖️ Birlik: ${birlik}\n` +
      `💰 Narxi: ${narxFormat(narx)} so'm/${birlik}`,
      keyboards.adminMenu()
    );

    return true;
  } catch (xatolik) {
    console.error('Mahsulot narxi qabul xatosi:', xatolik);
    await ctx.reply('❌ Mahsulotni saqlashda xatolik.', keyboards.adminMenu());
    return true;
  }
};

// ========== Mahsulot tahrirlash ==========
const mahsulotTahrirHandler = async (ctx) => {
  if (!adminTekshirish(ctx)) {
    return await ctx.reply('⛔️ Sizda admin huquqi yo\'q!');
  }

  try {
    const mahsulotlar = await Product.find({ faol: true }).sort({ nomi: 1 });

    if (mahsulotlar.length === 0) {
      return await ctx.reply('📭 Hozircha mahsulotlar mavjud emas.', keyboards.adminMenu());
    }

    await ctx.reply('✏️ Tahrirlash uchun mahsulotni tanlang:', keyboards.mahsulotTahrirlash(mahsulotlar));
  } catch (xatolik) {
    console.error('Mahsulot tahrir xatosi:', xatolik);
    await ctx.reply('❌ Xatolik yuz berdi.', keyboards.adminMenu());
  }
};

const tahrirTanlashHandler = async (ctx) => {
  try {
    if (!adminTekshirish(ctx)) {
      return await ctx.answerCbQuery('⛔️ Admin huquqi yo\'q!');
    }

    const mahsulotId = ctx.callbackQuery.data.replace('tahrir_', '');
    const mahsulot = await Product.findById(mahsulotId);

    if (!mahsulot) {
      return await ctx.answerCbQuery('❌ Mahsulot topilmadi!');
    }

    await ctx.answerCbQuery();
    await ctx.reply(
      `📦 ${mahsulot.nomi}\n` +
      `⚖️ Birlik: ${mahsulot.birlik || 'dona'}\n` +
      `💰 Narxi: ${narxFormat(mahsulot.narxi)} so'm/${mahsulot.birlik || 'dona'}\n\n` +
      `Quyidagi amallardan birini tanlang:`,
      keyboards.tahrirAmallari(mahsulotId)
    );
  } catch (xatolik) {
    console.error('Tahrir tanlash xatosi:', xatolik);
    try { await ctx.answerCbQuery('❌ Xatolik!'); } catch(e) {}
  }
};

const tahrirNomHandler = async (ctx) => {
  try {
    if (!adminTekshirish(ctx)) {
      return await ctx.answerCbQuery('⛔️ Admin huquqi yo\'q!');
    }

    const mahsulotId = ctx.callbackQuery.data.replace('tahrir_nom_', '');
    const foydalanuvchi = await foydalanuvchiTopish(ctx);

    foydalanuvchi.holat = 'admin_tahrir_nomi';
    foydalanuvchi.vaqtinchalik = { tahrir_mahsulot_id: mahsulotId };
    foydalanuvchi.markModified('vaqtinchalik');
    await foydalanuvchi.save();

    await ctx.answerCbQuery();
    await ctx.reply('📝 Yangi mahsulot nomini kiriting:', keyboards.bekorQilish());
  } catch (xatolik) {
    console.error('Tahrir nom xatosi:', xatolik);
    try { await ctx.answerCbQuery('❌ Xatolik!'); } catch(e) {}
  }
};

const tahrirNomiQabul = async (ctx) => {
  try {
    const foydalanuvchi = await foydalanuvchiTopish(ctx);
    if (foydalanuvchi.holat !== 'admin_tahrir_nomi') return false;
    if (!adminTekshirish(ctx)) return false;

    const yangiNom = ctx.message.text.trim();
    const mahsulotId = foydalanuvchi.vaqtinchalik?.tahrir_mahsulot_id;

    if (!mahsulotId) {
      await ctx.reply('❌ Xatolik. Qaytadan urinib ko\'ring.', keyboards.adminMenu());
      foydalanuvchi.holat = 'bosh_menu';
      foydalanuvchi.vaqtinchalik = {};
      await foydalanuvchi.save();
      return true;
    }

    if (yangiNom.length < 2) {
      await ctx.reply('❌ Nom juda qisqa. Kamida 2 ta belgi kiriting.');
      return true;
    }

    await Product.findByIdAndUpdate(mahsulotId, { nomi: yangiNom });

    foydalanuvchi.holat = 'bosh_menu';
    foydalanuvchi.vaqtinchalik = {};
    foydalanuvchi.markModified('vaqtinchalik');
    await foydalanuvchi.save();

    await ctx.reply(`✅ Mahsulot nomi "${yangiNom}" ga o'zgartirildi!`, keyboards.adminMenu());
    return true;
  } catch (xatolik) {
    console.error('Tahrir nomi qabul xatosi:', xatolik);
    return true;
  }
};

const tahrirNarxHandler = async (ctx) => {
  try {
    if (!adminTekshirish(ctx)) {
      return await ctx.answerCbQuery('⛔️ Admin huquqi yo\'q!');
    }

    const mahsulotId = ctx.callbackQuery.data.replace('tahrir_narx_', '');
    const foydalanuvchi = await foydalanuvchiTopish(ctx);

    foydalanuvchi.holat = 'admin_tahrir_narxi';
    foydalanuvchi.vaqtinchalik = { tahrir_mahsulot_id: mahsulotId };
    foydalanuvchi.markModified('vaqtinchalik');
    await foydalanuvchi.save();

    await ctx.answerCbQuery();
    await ctx.reply('💰 Yangi narxni kiriting (so\'mda):', keyboards.bekorQilish());
  } catch (xatolik) {
    console.error('Tahrir narx xatosi:', xatolik);
    try { await ctx.answerCbQuery('❌ Xatolik!'); } catch(e) {}
  }
};

const tahrirNarxiQabul = async (ctx) => {
  try {
    const foydalanuvchi = await foydalanuvchiTopish(ctx);
    if (foydalanuvchi.holat !== 'admin_tahrir_narxi') return false;
    if (!adminTekshirish(ctx)) return false;

    const narxMatni = ctx.message.text.trim().replace(/\s/g, '');
    const yangiNarx = parseInt(narxMatni);
    const mahsulotId = foydalanuvchi.vaqtinchalik?.tahrir_mahsulot_id;

    if (!mahsulotId) {
      await ctx.reply('❌ Xatolik.', keyboards.adminMenu());
      foydalanuvchi.holat = 'bosh_menu';
      foydalanuvchi.vaqtinchalik = {};
      await foydalanuvchi.save();
      return true;
    }

    if (isNaN(yangiNarx) || yangiNarx <= 0) {
      await ctx.reply('❌ Noto\'g\'ri narx! Faqat musbat son kiriting.');
      return true;
    }

    await Product.findByIdAndUpdate(mahsulotId, { narxi: yangiNarx });

    foydalanuvchi.holat = 'bosh_menu';
    foydalanuvchi.vaqtinchalik = {};
    foydalanuvchi.markModified('vaqtinchalik');
    await foydalanuvchi.save();

    await ctx.reply(`✅ Mahsulot narxi ${narxFormat(yangiNarx)} so'm ga o'zgartirildi!`, keyboards.adminMenu());
    return true;
  } catch (xatolik) {
    console.error('Tahrir narxi qabul xatosi:', xatolik);
    return true;
  }
};

// ========== Birlikni tahrirlash ==========
const tahrirBirlikHandler = async (ctx) => {
  try {
    if (!adminTekshirish(ctx)) {
      return await ctx.answerCbQuery('⛔️ Admin huquqi yo\'q!');
    }

    const mahsulotId = ctx.callbackQuery.data.replace('tahrir_birlik_', '');
    const foydalanuvchi = await foydalanuvchiTopish(ctx);

    foydalanuvchi.holat = 'admin_tahrir_birlik';
    foydalanuvchi.vaqtinchalik = { tahrir_mahsulot_id: mahsulotId };
    foydalanuvchi.markModified('vaqtinchalik');
    await foydalanuvchi.save();

    await ctx.answerCbQuery();
    await ctx.reply('⚖️ Yangi o\'lchov birligini tanlang:', keyboards.birlikTanlash());
  } catch (xatolik) {
    console.error('Tahrir birlik xatosi:', xatolik);
    try { await ctx.answerCbQuery('❌ Xatolik!'); } catch(e) {}
  }
};

// ========== Mahsulotni o'chirish ==========
const mahsulotOchirishHandler = async (ctx) => {
  try {
    if (!adminTekshirish(ctx)) {
      return await ctx.answerCbQuery('⛔️ Admin huquqi yo\'q!');
    }

    const mahsulotId = ctx.callbackQuery.data.replace('ochirish_', '');
    const mahsulot = await Product.findById(mahsulotId);

    if (!mahsulot) {
      return await ctx.answerCbQuery('❌ Mahsulot topilmadi!');
    }

    mahsulot.faol = false;
    await mahsulot.save();

    await ctx.answerCbQuery('O\'chirildi!');
    await ctx.reply(`🗑 "${mahsulot.nomi}" mahsuloti o'chirildi!`);
  } catch (xatolik) {
    console.error('Mahsulot o\'chirish xatosi:', xatolik);
    try { await ctx.answerCbQuery('❌ Xatolik!'); } catch(e) {}
  }
};

// ========== Statistika ==========
const statistikaHandler = async (ctx) => {
  if (!adminTekshirish(ctx)) {
    return await ctx.reply('⛔️ Sizda admin huquqi yo\'q!');
  }

  try {
    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);
    const ertaga = new Date(bugun);
    ertaga.setDate(ertaga.getDate() + 1);

    const [
      jamiMahsulotlar,
      faolMahsulotlar,
      jamiFoydalanuvchilar,
      jamiBuyurtmalar,
      yangiBuyurtmalar,
      bugungiTushum,
      umumiyTushum,
      bugungiSoni,
      bugungiYangi,
    ] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ faol: true }),
      User.countDocuments(),
      Order.countDocuments(),
      Order.countDocuments({ holati: 'yangi' }),
      Order.aggregate([
        { $match: { sana: { $gte: bugun, $lt: ertaga }, holati: { $ne: 'bekor_qilindi' } } },
        { $group: { _id: null, jami: { $sum: '$jami_narx' } } },
      ]),
      Order.aggregate([
        { $match: { holati: { $ne: 'bekor_qilindi' } } },
        { $group: { _id: null, jami: { $sum: '$jami_narx' } } },
      ]),
      Order.countDocuments({ sana: { $gte: bugun, $lt: ertaga } }),
      Order.countDocuments({ sana: { $gte: bugun, $lt: ertaga }, holati: 'yangi' }),
    ]);

    const bugunTushum = bugungiTushum.length > 0 ? bugungiTushum[0].jami : 0;
    const umumTushum = umumiyTushum.length > 0 ? umumiyTushum[0].jami : 0;

    const xabar =
      `📊 Feruz Market — Statistika\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📅 BUGUNGI KUN:\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🛒 Buyurtmalar: ${bugungiSoni} ta\n` +
      `🆕 Yangilari: ${bugungiYangi} ta\n` +
      `💰 Bugungi tushum: ${narxFormat(bugunTushum)} so'm\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📈 UMUMIY MA'LUMOTLAR:\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 Mahsulotlar: ${faolMahsulotlar} ta (jami: ${jamiMahsulotlar})\n` +
      `👥 Foydalanuvchilar: ${jamiFoydalanuvchilar} ta\n` +
      `🛒 Jami buyurtmalar: ${jamiBuyurtmalar} ta\n` +
      `🆕 Ko'rib chiqilmaganlar: ${yangiBuyurtmalar} ta\n` +
      `💰 Umumiy tushum: ${narxFormat(umumTushum)} so'm\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🕐 ${new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}`;

    await ctx.reply(xabar, keyboards.adminMenu());
  } catch (xatolik) {
    console.error('Statistika xatosi:', xatolik);
    await ctx.reply('❌ Statistikani yuklashda xatolik yuz berdi.');
  }
};

const asosiyMenuHandler = async (ctx) => {
  try {
    const foydalanuvchi = await foydalanuvchiTopish(ctx);
    foydalanuvchi.holat = 'bosh_menu';
    foydalanuvchi.vaqtinchalik = {};
    foydalanuvchi.markModified('vaqtinchalik');
    await foydalanuvchi.save();

    const adminId = Number(process.env.ADMIN_ID);
    const isAdmin = ctx.from.id === adminId;

    await ctx.reply('🏠 Bosh menyu', isAdmin ? keyboards.adminMenu() : keyboards.boshMenu());
  } catch (xatolik) {
    await ctx.reply('Bosh menyu', keyboards.boshMenu());
  }
};

// ========== Admin matn handler ==========
const adminMatnHandler = async (ctx) => {
  if (!adminTekshirish(ctx)) return false;

  const foydalanuvchi = await foydalanuvchiTopish(ctx);

  if (foydalanuvchi.holat === 'admin_mahsulot_nomi') {
    return await mahsulotNomiQabul(ctx);
  }
  if (foydalanuvchi.holat === 'admin_mahsulot_narxi') {
    return await mahsulotNarxiQabul(ctx);
  }
  if (foydalanuvchi.holat === 'admin_tahrir_nomi') {
    return await tahrirNomiQabul(ctx);
  }
  if (foydalanuvchi.holat === 'admin_tahrir_narxi') {
    return await tahrirNarxiQabul(ctx);
  }

  return false;
};

module.exports = {
  adminPanelHandler,
  mahsulotQoshishHandler,
  mahsulotTahrirHandler,
  tahrirTanlashHandler,
  tahrirNomHandler,
  tahrirNarxHandler,
  tahrirBirlikHandler,
  birlikTanlashHandler,
  mahsulotOchirishHandler,
  statistikaHandler,
  asosiyMenuHandler,
  adminMatnHandler,
};