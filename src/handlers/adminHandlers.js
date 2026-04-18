// Admin panel handlerlari
const User = require('../../models/User');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const keyboards = require('../keyboards/keyboards');

/**
 * Narxni chiroyli formatda ko'rsatish
 */
const narxFormat = (narx) => {
  return narx.toLocaleString('uz-UZ');
};

/**
 * Admin ekanligini tekshirish
 */
const adminTekshirish = (ctx) => {
  const adminId = Number(process.env.ADMIN_ID);
  return ctx.from.id === adminId;
};

/**
 * Foydalanuvchini bazadan topish
 */
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

/**
 * Admin paneli
 */
const adminPanelHandler = async (ctx) => {
  if (!adminTekshirish(ctx)) {
    return await ctx.reply('⛔️ Sizda admin huquqi yo\'q!');
  }

  await ctx.reply(
    '👨‍💼 *Admin Paneli*\n\nQuyidagi amallardan birini tanlang:',
    {
      parse_mode: 'Markdown',
      ...keyboards.adminMenu(),
    }
  );
};

/**
 * "Mahsulot qo'shish" handleri — birinchi qadam: nom so'rash
 */
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
      '➕ *Yangi mahsulot qo\'shish*\n\n📝 Mahsulot nomini kiriting:',
      {
        parse_mode: 'Markdown',
        ...keyboards.bekorQilish(),
      }
    );
  } catch (xatolik) {
    console.error('Mahsulot qo\'shish xatosi:', xatolik);
    await ctx.reply('❌ Xatolik yuz berdi.');
  }
};

/**
 * Mahsulot nomini qabul qilish
 */
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

    foydalanuvchi.vaqtinchalik = { mahsulot_nomi: nomi };
    foydalanuvchi.holat = 'admin_mahsulot_narxi';
    foydalanuvchi.markModified('vaqtinchalik');
    await foydalanuvchi.save();

    await ctx.reply(
      `📝 Mahsulot nomi: *${nomi}*\n\n💰 Endi narxini kiriting (so'mda):\n\nMasalan: 25000`,
      {
        parse_mode: 'Markdown',
        ...keyboards.bekorQilish(),
      }
    );

    return true;
  } catch (xatolik) {
    console.error('Mahsulot nomi qabul xatosi:', xatolik);
    return true;
  }
};

/**
 * Mahsulot narxini qabul qilish va bazaga saqlash
 */
const mahsulotNarxiQabul = async (ctx) => {
  try {
    const foydalanuvchi = await foydalanuvchiTopish(ctx);

    if (foydalanuvchi.holat !== 'admin_mahsulot_narxi') return false;
    if (!adminTekshirish(ctx)) return false;

    const narxMatni = ctx.message.text.trim().replace(/\s/g, '');
    const narx = parseInt(narxMatni);

    if (isNaN(narx) || narx <= 0) {
      await ctx.reply(
        '❌ Noto\'g\'ri narx formati!\n\nFaqat musbat son kiriting. Masalan: 25000',
        keyboards.bekorQilish()
      );
      return true;
    }

    const nomi = foydalanuvchi.vaqtinchalik?.mahsulot_nomi;

    if (!nomi) {
      await ctx.reply('❌ Xatolik. Qaytadan boshlang.', keyboards.adminMenu());
      foydalanuvchi.holat = 'bosh_menu';
      foydalanuvchi.vaqtinchalik = {};
      await foydalanuvchi.save();
      return true;
    }

    // Mahsulotni bazaga saqlash
    const yangiMahsulot = new Product({
      nomi,
      narxi: narx,
    });

    await yangiMahsulot.save();

    // Holatni tozalash
    foydalanuvchi.holat = 'bosh_menu';
    foydalanuvchi.vaqtinchalik = {};
    foydalanuvchi.markModified('vaqtinchalik');
    await foydalanuvchi.save();

    await ctx.reply(
      `✅ *Mahsulot muvaffaqiyatli qo'shildi!*\n\n` +
        `📦 Nomi: *${nomi}*\n` +
        `💰 Narxi: *${narxFormat(narx)} so'm*`,
      {
        parse_mode: 'Markdown',
        ...keyboards.adminMenu(),
      }
    );

    return true;
  } catch (xatolik) {
    console.error('Mahsulot narxi qabul xatosi:', xatolik);
    await ctx.reply('❌ Mahsulotni saqlashda xatolik.', keyboards.adminMenu());
    return true;
  }
};

/**
 * "Mahsulot tahrirlash" handleri
 */
const mahsulotTahrirHandler = async (ctx) => {
  if (!adminTekshirish(ctx)) {
    return await ctx.reply('⛔️ Sizda admin huquqi yo\'q!');
  }

  try {
    const mahsulotlar = await Product.find({ faol: true }).sort({ nomi: 1 });

    if (mahsulotlar.length === 0) {
      return await ctx.reply(
        '📭 Hozircha mahsulotlar mavjud emas.',
        keyboards.adminMenu()
      );
    }

    await ctx.reply(
      '✏️ *Tahrirlash uchun mahsulotni tanlang:*',
      {
        parse_mode: 'Markdown',
        ...keyboards.mahsulotTahrirlash(mahsulotlar),
      }
    );
  } catch (xatolik) {
    console.error('Mahsulot tahrir xatosi:', xatolik);
    await ctx.reply('❌ Xatolik yuz berdi.', keyboards.adminMenu());
  }
};

/**
 * Tahrirlash uchun mahsulotni tanlash (inline callback)
 */
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

    const xabar =
      `📦 *${mahsulot.nomi}*\n` +
      `💰 Narxi: ${narxFormat(mahsulot.narxi)} so'm\n\n` +
      `Quyidagi amallardan birini tanlang:`;

    await ctx.editMessageText(xabar, {
      parse_mode: 'Markdown',
      ...keyboards.tahrirAmallari(mahsulotId),
    });
    await ctx.answerCbQuery();
  } catch (xatolik) {
    console.error('Tahrir tanlash xatosi:', xatolik);
    await ctx.answerCbQuery('❌ Xatolik!');
  }
};

/**
 * Mahsulot nomini o'zgartirish boshlash
 */
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

    await ctx.editMessageText('📝 Yangi mahsulot nomini kiriting:');
    await ctx.answerCbQuery();
    await ctx.reply('Yangi nomni yozing:', keyboards.bekorQilish());
  } catch (xatolik) {
    console.error('Tahrir nom xatosi:', xatolik);
    await ctx.answerCbQuery('❌ Xatolik!');
  }
};

/**
 * Tahrirlash — yangi nom qabul qilish
 */
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

    await ctx.reply(
      `✅ Mahsulot nomi *"${yangiNom}"* ga o'zgartirildi!`,
      {
        parse_mode: 'Markdown',
        ...keyboards.adminMenu(),
      }
    );

    return true;
  } catch (xatolik) {
    console.error('Tahrir nomi qabul xatosi:', xatolik);
    return true;
  }
};

/**
 * Mahsulot narxini o'zgartirish boshlash
 */
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

    await ctx.editMessageText('💰 Yangi narxni kiriting (so\'mda):');
    await ctx.answerCbQuery();
    await ctx.reply('Yangi narxni yozing:', keyboards.bekorQilish());
  } catch (xatolik) {
    console.error('Tahrir narx xatosi:', xatolik);
    await ctx.answerCbQuery('❌ Xatolik!');
  }
};

/**
 * Tahrirlash — yangi narx qabul qilish
 */
const tahrirNarxiQabul = async (ctx) => {
  try {
    const foydalanuvchi = await foydalanuvchiTopish(ctx);

    if (foydalanuvchi.holat !== 'admin_tahrir_narxi') return false;
    if (!adminTekshirish(ctx)) return false;

    const narxMatni = ctx.message.text.trim().replace(/\s/g, '');
    const yangiNarx = parseInt(narxMatni);
    const mahsulotId = foydalanuvchi.vaqtinchalik?.tahrir_mahsulot_id;

    if (!mahsulotId) {
      await ctx.reply('❌ Xatolik. Qaytadan urinib ko\'ring.', keyboards.adminMenu());
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

    await ctx.reply(
      `✅ Mahsulot narxi *${narxFormat(yangiNarx)} so'm* ga o'zgartirildi!`,
      {
        parse_mode: 'Markdown',
        ...keyboards.adminMenu(),
      }
    );

    return true;
  } catch (xatolik) {
    console.error('Tahrir narxi qabul xatosi:', xatolik);
    return true;
  }
};

/**
 * Mahsulotni o'chirish handleri
 */
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

    // Mahsulotni o'chirish (faolsiz qilish)
    mahsulot.faol = false;
    await mahsulot.save();

    await ctx.editMessageText(
      `🗑 *"${mahsulot.nomi}"* mahsuloti o'chirildi!`,
      { parse_mode: 'Markdown' }
    );
    await ctx.answerCbQuery('O\'chirildi!');
  } catch (xatolik) {
    console.error('Mahsulot o\'chirish xatosi:', xatolik);
    await ctx.answerCbQuery('❌ Xatolik!');
  }
};

/**
 * "Statistika" handleri
 */
/**
 * "Statistika" handleri — bugungi va umumiy alohida
 */
const statistikaHandler = async (ctx) => {
  if (!adminTekshirish(ctx)) {
    return await ctx.reply('⛔️ Sizda admin huquqi yo\'q!');
  }

  try {
    // Bugungi kunning boshlanishi (00:00:00)
    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);

    // Ertangi kunning boshlanishi (00:00:00)
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
      bugungiYangiBuyurtmalar,
    ] = await Promise.all([
      // Mahsulotlar soni
      Product.countDocuments(),
      Product.countDocuments({ faol: true }),

      // Foydalanuvchilar soni
      User.countDocuments(),

      // Jami buyurtmalar
      Order.countDocuments(),
      Order.countDocuments({ holati: 'yangi' }),

      // BUGUNGI TUSHUM (faqat bugungi buyurtmalar)
      Order.aggregate([
        {
          $match: {
            sana: { $gte: bugun, $lt: ertaga },
            holati: { $ne: 'bekor_qilindi' },
          },
        },
        { $group: { _id: null, jami: { $sum: '$jami_narx' } } },
      ]),

      // UMUMIY TUSHUM (barcha vaqtdagi)
      Order.aggregate([
        {
          $match: {
            holati: { $ne: 'bekor_qilindi' },
          },
        },
        { $group: { _id: null, jami: { $sum: '$jami_narx' } } },
      ]),

      // Bugungi buyurtmalar soni
      Order.countDocuments({
        sana: { $gte: bugun, $lt: ertaga },
      }),

      // Bugungi yangi buyurtmalar
      Order.countDocuments({
        sana: { $gte: bugun, $lt: ertaga },
        holati: 'yangi',
      }),
    ]);

    const bugunTushum = bugungiTushum.length > 0 ? bugungiTushum[0].jami : 0;
    const umumTushum = umumiyTushum.length > 0 ? umumiyTushum[0].jami : 0;

    const xabar =
      `📊 *Feruz Market — Statistika*\n\n` +

      `━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📅 *BUGUNGI KUN:*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🛒 Buyurtmalar: ${bugungiSoni} ta\n` +
      `🆕 Yangilari: ${bugungiYangiBuyurtmalar} ta\n` +
      `💰 Bugungi tushum: *${narxFormat(bugunTushum)} so'm*\n\n` +

      `━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📈 *UMUMIY MA'LUMOTLAR:*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 Mahsulotlar: ${faolMahsulotlar} ta (jami: ${jamiMahsulotlar})\n` +
      `👥 Foydalanuvchilar: ${jamiFoydalanuvchilar} ta\n` +
      `🛒 Jami buyurtmalar: ${jamiBuyurtmalar} ta\n` +
      `🆕 Ko'rib chiqilmaganlar: ${yangiBuyurtmalar} ta\n` +
      `💰 Umumiy tushum: *${narxFormat(umumTushum)} so'm*\n\n` +

      `━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🕐 ${new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}`;

    await ctx.reply(xabar, {
      parse_mode: 'Markdown',
      ...keyboards.adminMenu(),
    });
  } catch (xatolik) {
    console.error('Statistika xatosi:', xatolik);
    await ctx.reply('❌ Statistikani yuklashda xatolik yuz berdi.');
  }
};

/**
 * "Asosiy menyu"ga qaytish handleri (admin)
 */
const asosiyMenuHandler = async (ctx) => {
  try {
    const foydalanuvchi = await foydalanuvchiTopish(ctx);
    foydalanuvchi.holat = 'bosh_menu';
    foydalanuvchi.vaqtinchalik = {};
    foydalanuvchi.markModified('vaqtinchalik');
    await foydalanuvchi.save();

    const adminId = Number(process.env.ADMIN_ID);
    const isAdmin = ctx.from.id === adminId;

    await ctx.reply(
      '🏠 Bosh menyu',
      isAdmin ? keyboards.adminMenu() : keyboards.boshMenu()
    );
  } catch (xatolik) {
    console.error('Asosiy menyu xatosi:', xatolik);
    await ctx.reply('Bosh menyu', keyboards.boshMenu());
  }
};

/**
 * Admin matn xabarlarini holat bo'yicha yo'naltirish
 */
const adminMatnHandler = async (ctx) => {
  if (!adminTekshirish(ctx)) return false;

  const foydalanuvchi = await foydalanuvchiTopish(ctx);

  // Mahsulot nomi qabul qilish
  if (foydalanuvchi.holat === 'admin_mahsulot_nomi') {
    return await mahsulotNomiQabul(ctx);
  }

  // Mahsulot narxi qabul qilish
  if (foydalanuvchi.holat === 'admin_mahsulot_narxi') {
    return await mahsulotNarxiQabul(ctx);
  }

  // Tahrirlash — yangi nom
  if (foydalanuvchi.holat === 'admin_tahrir_nomi') {
    return await tahrirNomiQabul(ctx);
  }

  // Tahrirlash — yangi narx
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
  mahsulotOchirishHandler,
  statistikaHandler,
  asosiyMenuHandler,
  adminMatnHandler,
};