const User = require('../../models/User');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const keyboards = require('../keyboards/keyboards');

const buyurtmaRaqamiYaratish = () => {
  const sana = new Date();
  const yil = sana.getFullYear();
  const oy = String(sana.getMonth() + 1).padStart(2, '0');
  const kun = String(sana.getDate()).padStart(2, '0');
  const tasodifiy = Math.floor(1000 + Math.random() * 9000);
  return `FM-${yil}${oy}${kun}-${tasodifiy}`;
};

const narxFormat = (narx) => {
  return narx.toLocaleString('uz-UZ');
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

// /start komandasi
const startHandler = async (ctx) => {
  try {
    const foydalanuvchi = await foydalanuvchiTopish(ctx);
    foydalanuvchi.holat = 'bosh_menu';
    foydalanuvchi.vaqtinchalik = {};
    await foydalanuvchi.save();

    const adminId = Number(process.env.ADMIN_ID);
    const isAdmin = ctx.from.id === adminId;

    const xabar =
      `🏪 *Feruz Market*ga xush kelibsiz!\n\n` +
      `Assalomu alaykum, *${foydalanuvchi.ism}*! 👋\n\n` +
      `🛍 Mahsulotlarni ko'rish\n` +
      `🛒 Buyurtma berish\n` +
      `📋 Buyurtmalar tarixini ko'rish\n\n` +
      `Quyidagi tugmalardan birini tanlang:`;

    if (isAdmin) {
      await ctx.reply(xabar, { parse_mode: 'Markdown', ...keyboards.adminMenu() });
    } else {
      await ctx.reply(xabar, { parse_mode: 'Markdown', ...keyboards.boshMenu() });
    }
  } catch (xatolik) {
    console.error('Start xatosi:', xatolik);
    await ctx.reply('❌ Xatolik yuz berdi.');
  }
};

// Mahsulotlar ro'yxati
const mahsulotlarHandler = async (ctx) => {
  try {
    const mahsulotlar = await Product.find({ faol: true }).sort({ qoshilgan_sana: -1 });

    if (mahsulotlar.length === 0) {
      return await ctx.reply('📭 Hozircha mahsulotlar mavjud emas.');
    }

    let xabar = '🛍 *Feruz Market — Mahsulotlar:*\n\n';
    xabar += '━━━━━━━━━━━━━━━━━━━━━━━\n';

    mahsulotlar.forEach((m, index) => {
      xabar += `${index + 1}. *${m.nomi}*\n`;
      xabar += `   💰 ${narxFormat(m.narxi)} so'm / ${m.birlik || 'dona'}\n`;
      if (index < mahsulotlar.length - 1) {
        xabar += `   ─────────────────────\n`;
      }
    });

    xabar += '━━━━━━━━━━━━━━━━━━━━━━━\n';
    xabar += `\n📦 Jami: ${mahsulotlar.length} ta mahsulot`;

    await ctx.reply(xabar, { parse_mode: 'Markdown' });
  } catch (xatolik) {
    console.error('Mahsulotlar xatosi:', xatolik);
    await ctx.reply('❌ Xatolik yuz berdi.');
  }
};

// Buyurtma berish boshlash
const buyurtmaBoshlanishi = async (ctx) => {
  try {
    const foydalanuvchi = await foydalanuvchiTopish(ctx);
    const mahsulotlar = await Product.find({ faol: true }).sort({ nomi: 1 });

    if (mahsulotlar.length === 0) {
      return await ctx.reply('📭 Hozircha mahsulotlar mavjud emas.');
    }

    foydalanuvchi.holat = 'buyurtma_mahsulot_tanlash';
    foydalanuvchi.vaqtinchalik = { savat: [] };
    foydalanuvchi.markModified('vaqtinchalik');
    await foydalanuvchi.save();

    await ctx.reply(
      '🛒 *Buyurtma berish*\n\n' +
      'Quyidagi mahsulotlardan tanlang.\n' +
      'Bir nechta mahsulot tanlashingiz mumkin.',
      {
        parse_mode: 'Markdown',
        ...keyboards.mahsulotTanlash(mahsulotlar),
      }
    );
  } catch (xatolik) {
    console.error('Buyurtma boshlash xatosi:', xatolik);
    await ctx.reply('❌ Xatolik yuz berdi.');
  }
};

// =============================================
// MAHSULOT TANLASH — MIQDOR SO'RASH
// Foydalanuvchi mahsulotni bosganda miqdor chiqadi
// =============================================
const mahsulotTanlashHandler = async (ctx) => {
  try {
    const mahsulotId = ctx.callbackQuery.data.replace('tanlash_', '');
    const foydalanuvchi = await foydalanuvchiTopish(ctx);

    const mahsulot = await Product.findById(mahsulotId);
    if (!mahsulot) {
      return await ctx.answerCbQuery('❌ Mahsulot topilmadi!');
    }

    // Tanlangan mahsulotni vaqtinchalik saqlash
    foydalanuvchi.vaqtinchalik = {
      ...foydalanuvchi.vaqtinchalik,
      tanlangan_mahsulot: {
        id: mahsulotId,
        nomi: mahsulot.nomi,
        narxi: mahsulot.narxi,
        birlik: mahsulot.birlik || 'dona',
      },
    };
    foydalanuvchi.holat = 'buyurtma_miqdor';
    foydalanuvchi.markModified('vaqtinchalik');
    await foydalanuvchi.save();

    const birlik = mahsulot.birlik || 'dona';

    await ctx.editMessageText(
      `📦 *${mahsulot.nomi}*\n` +
      `💰 Narxi: ${narxFormat(mahsulot.narxi)} so'm / ${birlik}\n\n` +
      `📏 Necha *${birlik}* buyurtma qilasiz?\n\n` +
      `Quyidagi tugmalardan tanlang yoki o'zingiz yozing:`,
      {
        parse_mode: 'Markdown',
        ...keyboards.miqdorTanlash(birlik),
      }
    );

    await ctx.answerCbQuery();
  } catch (xatolik) {
    console.error('Mahsulot tanlash xatosi:', xatolik);
    await ctx.answerCbQuery('❌ Xatolik!');
  }
};

// =============================================
// MIQDOR TANLASH (INLINE TUGMA ORQALI)
// 0.5 kg, 1 kg, 2 dona kabi
// =============================================
const miqdorTanlashHandler = async (ctx) => {
  try {
    const miqdorMatn = ctx.callbackQuery.data.replace('miqdor_', '');
    const miqdor = parseFloat(miqdorMatn);

    if (isNaN(miqdor) || miqdor <= 0) {
      return await ctx.answerCbQuery('❌ Noto\'g\'ri miqdor!');
    }

    const foydalanuvchi = await foydalanuvchiTopish(ctx);
    const tanlangan = foydalanuvchi.vaqtinchalik?.tanlangan_mahsulot;

    if (!tanlangan) {
      return await ctx.answerCbQuery('❌ Mahsulot topilmadi!');
    }

    // Savatga qo'shish
    const savat = foydalanuvchi.vaqtinchalik?.savat || [];

    const mavjudIndex = savat.findIndex((item) => item.id === tanlangan.id);
    if (mavjudIndex !== -1) {
      savat[mavjudIndex].soni += miqdor;
    } else {
      savat.push({
        id: tanlangan.id,
        nomi: tanlangan.nomi,
        narxi: tanlangan.narxi,
        birlik: tanlangan.birlik,
        soni: miqdor,
      });
    }

    // Tanlangan mahsulotni tozalash
    foydalanuvchi.vaqtinchalik = {
      savat,
      tanlangan_mahsulot: null,
    };
    foydalanuvchi.holat = 'buyurtma_mahsulot_tanlash';
    foydalanuvchi.markModified('vaqtinchalik');
    await foydalanuvchi.save();

    await ctx.answerCbQuery(`✅ ${tanlangan.nomi} ${miqdor} ${tanlangan.birlik} qo'shildi!`);

    // Savatni ko'rsatish
    let jamiNarx = 0;
    let savatMatni = '🧺 *Sizning savatingiz:*\n\n';
    savat.forEach((item, index) => {
      const narx = item.narxi * item.soni;
      jamiNarx += narx;
      savatMatni += `${index + 1}. *${item.nomi}* — ${item.soni} ${item.birlik}\n`;
      savatMatni += `   💰 ${narxFormat(item.narxi)} x ${item.soni} = ${narxFormat(narx)} so'm\n`;
    });
    savatMatni += `\n━━━━━━━━━━━━━━━━━━━━━━━`;
    savatMatni += `\n💰 *Jami: ${narxFormat(jamiNarx)} so'm*`;
    savatMatni += '\n\n🗑 Olib tashlash uchun mahsulot ustiga bosing.';

    await ctx.editMessageText(savatMatni, {
      parse_mode: 'Markdown',
      ...keyboards.savatKorsatish(savat),
    });
  } catch (xatolik) {
    console.error('Miqdor tanlash xatosi:', xatolik);
    await ctx.answerCbQuery('❌ Xatolik!');
  }
};

// =============================================
// MIQDOR QO'LDA KIRITISH (matn orqali)
// Foydalanuvchi "2.5" yoki "3" deb yozadi
// =============================================
const miqdorQabulQilish = async (ctx) => {
  try {
    const foydalanuvchi = await foydalanuvchiTopish(ctx);

    if (foydalanuvchi.holat !== 'buyurtma_miqdor') return false;

    const miqdorMatn = ctx.message.text.trim().replace(',', '.');
    const miqdor = parseFloat(miqdorMatn);

    const tanlangan = foydalanuvchi.vaqtinchalik?.tanlangan_mahsulot;

    if (!tanlangan) {
      await ctx.reply('❌ Xatolik. Qaytadan buyurtma bering.', keyboards.boshMenu());
      foydalanuvchi.holat = 'bosh_menu';
      foydalanuvchi.vaqtinchalik = {};
      await foydalanuvchi.save();
      return true;
    }

    if (isNaN(miqdor) || miqdor <= 0) {
      await ctx.reply(
        `❌ Noto'g'ri miqdor!\n\n` +
        `To'g'ri son kiriting.\nMasalan: 1, 2.5, 0.5`
      );
      return true;
    }

    if (miqdor > 1000) {
      await ctx.reply('❌ Miqdor juda katta! Maksimum 1000 gacha.');
      return true;
    }

    // Savatga qo'shish
    const savat = foydalanuvchi.vaqtinchalik?.savat || [];

    const mavjudIndex = savat.findIndex((item) => item.id === tanlangan.id);
    if (mavjudIndex !== -1) {
      savat[mavjudIndex].soni += miqdor;
    } else {
      savat.push({
        id: tanlangan.id,
        nomi: tanlangan.nomi,
        narxi: tanlangan.narxi,
        birlik: tanlangan.birlik,
        soni: miqdor,
      });
    }

    foydalanuvchi.vaqtinchalik = {
      savat,
      tanlangan_mahsulot: null,
    };
    foydalanuvchi.holat = 'buyurtma_mahsulot_tanlash';
    foydalanuvchi.markModified('vaqtinchalik');
    await foydalanuvchi.save();

    // Savatni ko'rsatish
    let jamiNarx = 0;
    let savatMatni = `✅ *${tanlangan.nomi}* ${miqdor} ${tanlangan.birlik} qo'shildi!\n\n`;
    savatMatni += '🧺 *Savatingiz:*\n\n';

    savat.forEach((item, index) => {
      const narx = item.narxi * item.soni;
      jamiNarx += narx;
      savatMatni += `${index + 1}. *${item.nomi}* — ${item.soni} ${item.birlik}\n`;
      savatMatni += `   💰 ${narxFormat(item.narxi)} x ${item.soni} = ${narxFormat(narx)} so'm\n`;
    });
    savatMatni += `\n💰 *Jami: ${narxFormat(jamiNarx)} so'm*`;

    const mahsulotlar = await Product.find({ faol: true }).sort({ nomi: 1 });

    await ctx.reply(savatMatni, { parse_mode: 'Markdown' });
    await ctx.reply(
      '➕ Yana mahsulot qo\'shish uchun tanlang yoki ✅ Tasdiqlang:',
      keyboards.mahsulotTanlash(mahsulotlar)
    );

    return true;
  } catch (xatolik) {
    console.error('Miqdor qabul xatosi:', xatolik);
    await ctx.reply('❌ Xatolik yuz berdi.');
    return true;
  }
};

// Savatdan olib tashlash
const olibTashlashHandler = async (ctx) => {
  try {
    const index = parseInt(ctx.callbackQuery.data.replace('olib_tashlash_', ''));
    const foydalanuvchi = await foydalanuvchiTopish(ctx);
    const savat = foydalanuvchi.vaqtinchalik?.savat || [];

    if (index >= 0 && index < savat.length) {
      const olibTashlangan = savat.splice(index, 1)[0];
      foydalanuvchi.vaqtinchalik = { ...foydalanuvchi.vaqtinchalik, savat };
      foydalanuvchi.markModified('vaqtinchalik');
      await foydalanuvchi.save();

      await ctx.answerCbQuery(`🗑 ${olibTashlangan.nomi} olib tashlandi!`);

      if (savat.length === 0) {
        const mahsulotlar = await Product.find({ faol: true }).sort({ nomi: 1 });
        await ctx.editMessageText(
          '🛒 Savat bo\'sh. Mahsulotlardan tanlang:',
          keyboards.mahsulotTanlash(mahsulotlar)
        );
      } else {
        let jamiNarx = 0;
        let savatMatni = '🧺 *Savatingiz:*\n\n';
        savat.forEach((item, i) => {
          const narx = item.narxi * item.soni;
          jamiNarx += narx;
          savatMatni += `${i + 1}. *${item.nomi}* — ${item.soni} ${item.birlik || 'dona'}\n`;
          savatMatni += `   💰 ${narxFormat(item.narxi)} x ${item.soni} = ${narxFormat(narx)} so'm\n`;
        });
        savatMatni += `\n💰 *Jami: ${narxFormat(jamiNarx)} so'm*`;

        await ctx.editMessageText(savatMatni, {
          parse_mode: 'Markdown',
          ...keyboards.savatKorsatish(savat),
        });
      }
    }
  } catch (xatolik) {
    console.error('Olib tashlash xatosi:', xatolik);
    await ctx.answerCbQuery('❌ Xatolik!');
  }
};

// Yana qo'shish
const yanaQoshishHandler = async (ctx) => {
  try {
    const foydalanuvchi = await foydalanuvchiTopish(ctx);
    foydalanuvchi.holat = 'buyurtma_mahsulot_tanlash';
    await foydalanuvchi.save();

    const mahsulotlar = await Product.find({ faol: true }).sort({ nomi: 1 });

    await ctx.editMessageText(
      '🛒 Mahsulotlardan tanlang:',
      keyboards.mahsulotTanlash(mahsulotlar)
    );
    await ctx.answerCbQuery();
  } catch (xatolik) {
    console.error('Yana qo\'shish xatosi:', xatolik);
    await ctx.answerCbQuery('❌ Xatolik!');
  }
};

// Savatni tozalash
const savatniTozalashHandler = async (ctx) => {
  try {
    const foydalanuvchi = await foydalanuvchiTopish(ctx);
    foydalanuvchi.vaqtinchalik = { savat: [] };
    foydalanuvchi.holat = 'bosh_menu';
    foydalanuvchi.markModified('vaqtinchalik');
    await foydalanuvchi.save();

    await ctx.editMessageText('🗑 Savat tozalandi.');
    await ctx.answerCbQuery('Savat tozalandi!');
    await ctx.reply('Bosh menyuga qaytdingiz.', keyboards.boshMenu());
  } catch (xatolik) {
    console.error('Savat tozalash xatosi:', xatolik);
    await ctx.answerCbQuery('❌ Xatolik!');
  }
};

// Rasmiylashtirish — telefon so'rash
const rasmiylashtirishHandler = async (ctx) => {
  try {
    const foydalanuvchi = await foydalanuvchiTopish(ctx);
    const savat = foydalanuvchi.vaqtinchalik?.savat || [];

    if (savat.length === 0) {
      await ctx.answerCbQuery('❌ Savat bo\'sh!');
      return;
    }

    foydalanuvchi.holat = 'buyurtma_telefon';
    await foydalanuvchi.save();

    await ctx.answerCbQuery();
    await ctx.reply(
      '📱 *Telefon raqamingizni yuboring:*\n\nTugmani bosing yoki qo\'lda kiriting:',
      {
        parse_mode: 'Markdown',
        ...keyboards.telefonYuborish(),
      }
    );
  } catch (xatolik) {
    console.error('Rasmiylashtirish xatosi:', xatolik);
    await ctx.answerCbQuery('❌ Xatolik!');
  }
};

// Tasdiqlash
const tasdiqlashBuyurtmaHandler = async (ctx) => {
  try {
    const foydalanuvchi = await foydalanuvchiTopish(ctx);
    const savat = foydalanuvchi.vaqtinchalik?.savat || [];

    if (savat.length === 0) {
      await ctx.answerCbQuery('❌ Savat bo\'sh!');
      return;
    }

    let jamiNarx = 0;
    let savatMatni = '🧺 *Savatingiz:*\n\n';
    savat.forEach((item, i) => {
      const narx = item.narxi * item.soni;
      jamiNarx += narx;
      savatMatni += `${i + 1}. *${item.nomi}* — ${item.soni} ${item.birlik || 'dona'}\n`;
      savatMatni += `   💰 ${narxFormat(narx)} so'm\n`;
    });
    savatMatni += `\n💰 *Jami: ${narxFormat(jamiNarx)} so'm*`;

    await ctx.editMessageText(savatMatni, {
      parse_mode: 'Markdown',
      ...keyboards.savatKorsatish(savat),
    });
    await ctx.answerCbQuery();
  } catch (xatolik) {
    console.error('Tasdiqlash xatosi:', xatolik);
    await ctx.answerCbQuery('❌ Xatolik!');
  }
};

// Telefon qabul qilish
const telefonQabulQilish = async (ctx) => {
  try {
    const foydalanuvchi = await foydalanuvchiTopish(ctx);

    if (foydalanuvchi.holat !== 'buyurtma_telefon') return false;

    let telefon = '';

    if (ctx.message.contact) {
      telefon = ctx.message.contact.phone_number;
    } else if (ctx.message.text) {
      telefon = ctx.message.text.trim();
      const telefonRegex = /^[\+]?[0-9]{9,15}$/;
      if (!telefonRegex.test(telefon.replace(/[\s\-\(\)]/g, ''))) {
        await ctx.reply(
          '❌ Noto\'g\'ri telefon raqami!\nMasalan: +998901234567',
          keyboards.telefonYuborish()
        );
        return true;
      }
    }

    foydalanuvchi.vaqtinchalik = { ...foydalanuvchi.vaqtinchalik, telefon };
    foydalanuvchi.holat = 'buyurtma_manzil';
    foydalanuvchi.markModified('vaqtinchalik');
    await foydalanuvchi.save();

    await ctx.reply(
      '📍 *Yetkazib berish manzilini yozing:*\n\nMasalan: Toshkent, Chilonzor, 7-mavze, 15-uy',
      {
        parse_mode: 'Markdown',
        ...keyboards.bekorQilish(),
      }
    );

    return true;
  } catch (xatolik) {
    console.error('Telefon qabul xatosi:', xatolik);
    return true;
  }
};

// =============================================
// MANZIL QABUL + SAQLASH + ADMINGA XABAR
// =============================================
const manzilQabulQilish = async (ctx) => {
  try {
    const foydalanuvchi = await foydalanuvchiTopish(ctx);

    if (foydalanuvchi.holat !== 'buyurtma_manzil') return false;

    const manzil = ctx.message.text.trim();

    if (manzil.length < 5) {
      await ctx.reply('❌ Manzil juda qisqa.', keyboards.bekorQilish());
      return true;
    }

    const savat = foydalanuvchi.vaqtinchalik?.savat || [];
    const telefon = foydalanuvchi.vaqtinchalik?.telefon || '';

    if (savat.length === 0) {
      await ctx.reply('❌ Savat bo\'sh.', keyboards.boshMenu());
      foydalanuvchi.holat = 'bosh_menu';
      foydalanuvchi.vaqtinchalik = {};
      await foydalanuvchi.save();
      return true;
    }

    // Buyurtma raqami
    let buyurtmaRaqami;
    let takrorlanmasin = true;
    while (takrorlanmasin) {
      buyurtmaRaqami = buyurtmaRaqamiYaratish();
      const mavjud = await Order.findOne({ buyurtma_raqami: buyurtmaRaqami });
      if (!mavjud) takrorlanmasin = false;
    }

    // Mahsulotlar va jami narx
    let jamiNarx = 0;
    const mahsulotlar = savat.map((item) => {
      const narx = item.narxi * item.soni;
      jamiNarx += narx;
      return {
        nomi: item.nomi,
        narxi: item.narxi,
        birlik: item.birlik || 'dona',
        soni: item.soni,
      };
    });

    // Buyurtmani saqlash
    const buyurtma = new Order({
      buyurtma_raqami: buyurtmaRaqami,
      foydalanuvchi_id: ctx.from.id,
      foydalanuvchi_ismi: foydalanuvchi.ism,
      mahsulotlar,
      jami_narx: jamiNarx,
      telefon,
      manzil,
    });

    await buyurtma.save();

    // Holatni tozalash
    foydalanuvchi.holat = 'bosh_menu';
    foydalanuvchi.vaqtinchalik = {};
    foydalanuvchi.markModified('vaqtinchalik');
    await foydalanuvchi.save();

    // FOYDALANUVCHIGA XABAR
    let tasdiqXabari =
      `✅ *Buyurtmangiz qabul qilindi!*\n\n` +
      `📦 Buyurtma raqami: \`${buyurtmaRaqami}\`\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n`;

    mahsulotlar.forEach((item, index) => {
      tasdiqXabari += `${index + 1}. ${item.nomi} — ${item.soni} ${item.birlik}\n`;
      tasdiqXabari += `   💰 ${narxFormat(item.narxi)} x ${item.soni} = ${narxFormat(item.narxi * item.soni)} so'm\n`;
    });

    tasdiqXabari +=
      `━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 Jami: *${narxFormat(jamiNarx)} so'm*\n\n` +
      `📱 Telefon: ${telefon}\n` +
      `📍 Manzil: ${manzil}\n\n` +
      `⏳ Tez orada ko'rib chiqiladi.\n` +
      `Rahmat, *Feruz Market*! 🙏`;

    await ctx.reply(tasdiqXabari, {
      parse_mode: 'Markdown',
      ...keyboards.boshMenu(),
    });

    // ADMINGA BILDIRISHNOMA
    const ADMIN_ID = process.env.ADMIN_ID;

    if (ADMIN_ID) {
      let adminXabari = '';
      adminXabari += '🔔🔔🔔 *YANGI BUYURTMA!* 🔔🔔🔔\n\n';
      adminXabari += `📦 Raqami: \`${buyurtmaRaqami}\`\n`;
      adminXabari += `👤 Mijoz: *${foydalanuvchi.ism}*\n`;
      adminXabari += `🆔 ID: \`${ctx.from.id}\`\n`;

      if (foydalanuvchi.username) {
        adminXabari += `📎 @${foydalanuvchi.username}\n`;
      }

      adminXabari += `\n━━━━━━━━━━━━━━━━━━━━━━━\n`;
      adminXabari += `🛒 *Mahsulotlar:*\n\n`;

      mahsulotlar.forEach((item, index) => {
        adminXabari += `  ${index + 1}. *${item.nomi}*\n`;
        adminXabari += `     📏 ${item.soni} ${item.birlik}\n`;
        adminXabari += `     💰 ${narxFormat(item.narxi)} x ${item.soni} = ${narxFormat(item.narxi * item.soni)} so'm\n\n`;
      });

      adminXabari += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
      adminXabari += `💰 *JAMI: ${narxFormat(jamiNarx)} so'm*\n`;
      adminXabari += `━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      adminXabari += `📱 Tel: ${telefon}\n`;
      adminXabari += `📍 Manzil: ${manzil}\n`;
      adminXabari += `🕐 ${new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}`;

      try {
        await ctx.telegram.sendMessage(Number(ADMIN_ID), adminXabari, {
          parse_mode: 'Markdown',
        });
      } catch (adminErr) {
        console.error('Admin xabar xatosi:', adminErr.message);
        try {
          const oddiy =
            `🔔 YANGI BUYURTMA!\n\n` +
            `Raqam: ${buyurtmaRaqami}\n` +
            `Mijoz: ${foydalanuvchi.ism}\n` +
            `Tel: ${telefon}\n` +
            `Manzil: ${manzil}\n` +
            `Jami: ${narxFormat(jamiNarx)} so'm`;
          await ctx.telegram.sendMessage(Number(ADMIN_ID), oddiy);
        } catch (err2) {
          console.error('Ikkinchi urinish xato:', err2.message);
        }
      }
    }

    return true;
  } catch (xatolik) {
    console.error('Manzil qabul xatosi:', xatolik);
    await ctx.reply('❌ Xatolik yuz berdi.', keyboards.boshMenu());
    return true;
  }
};

// Buyurtmalar tarixi
const buyurtmalarTarixiHandler = async (ctx) => {
  try {
    const buyurtmalar = await Order.find({ foydalanuvchi_id: ctx.from.id })
      .sort({ sana: -1 })
      .limit(10);

    if (buyurtmalar.length === 0) {
      return await ctx.reply('📭 Sizda hali buyurtmalar yo\'q.', keyboards.boshMenu());
    }

    let xabar = '📋 *Buyurtmalar tarixingiz:*\n\n';

    const holatBelgisi = {
      yangi: '🆕', qabul_qilindi: '✅', yetkazilmoqda: '🚚',
      yakunlandi: '✔️', bekor_qilindi: '❌',
    };
    const holatNomi = {
      yangi: 'Yangi', qabul_qilindi: 'Qabul qilindi', yetkazilmoqda: 'Yetkazilmoqda',
      yakunlandi: 'Yakunlandi', bekor_qilindi: 'Bekor qilindi',
    };

    buyurtmalar.forEach((b, index) => {
      const sana = new Date(b.sana).toLocaleString('uz-UZ', {
        timeZone: 'Asia/Tashkent',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

      xabar += `${index + 1}. 📦 \`${b.buyurtma_raqami}\`\n`;
      xabar += `   ${holatBelgisi[b.holati] || '❓'} ${holatNomi[b.holati] || b.holati}\n`;

      b.mahsulotlar.forEach((m) => {
        xabar += `   • ${m.nomi} — ${m.soni} ${m.birlik || 'dona'}\n`;
      });

      xabar += `   💰 ${narxFormat(b.jami_narx)} so'm\n`;
      xabar += `   📅 ${sana}\n`;
      if (index < buyurtmalar.length - 1) xabar += `   ─────────────────────\n`;
    });

    await ctx.reply(xabar, { parse_mode: 'Markdown' });
  } catch (xatolik) {
    console.error('Buyurtmalar tarixi xatosi:', xatolik);
    await ctx.reply('❌ Xatolik yuz berdi.');
  }
};

// Yordam
const yordamHandler = async (ctx) => {
  const xabar =
    'ℹ️ *Feruz Market — Yordam*\n\n' +
    '🛍 *Mahsulotlar* — Mahsulotlarni ko\'rish\n' +
    '🛒 *Buyurtma berish* — Yangi buyurtma\n' +
    '📋 *Buyurtmalar tarixi* — Oldingi buyurtmalar\n\n' +
    '🏪 *Feruz Market* — Sifatli mahsulotlar!';
  await ctx.reply(xabar, { parse_mode: 'Markdown' });
};

// Bekor qilish
const bekorQilishHandler = async (ctx) => {
  try {
    const foydalanuvchi = await foydalanuvchiTopish(ctx);
    foydalanuvchi.holat = 'bosh_menu';
    foydalanuvchi.vaqtinchalik = {};
    foydalanuvchi.markModified('vaqtinchalik');
    await foydalanuvchi.save();

    const adminId = Number(process.env.ADMIN_ID);
    const isAdmin = ctx.from.id === adminId;

    await ctx.reply(
      '❌ Bekor qilindi.',
      isAdmin ? keyboards.adminMenu() : keyboards.boshMenu()
    );
  } catch (xatolik) {
    await ctx.reply('Bosh menyu', keyboards.boshMenu());
  }
};

// Inline bekor qilish
const bekorInlineHandler = async (ctx) => {
  try {
    const foydalanuvchi = await foydalanuvchiTopish(ctx);
    foydalanuvchi.holat = 'bosh_menu';
    foydalanuvchi.vaqtinchalik = {};
    foydalanuvchi.markModified('vaqtinchalik');
    await foydalanuvchi.save();

    await ctx.editMessageText('❌ Bekor qilindi.');
    await ctx.answerCbQuery('Bekor qilindi');
  } catch (xatolik) {
    try { await ctx.answerCbQuery('Bekor qilindi'); } catch (e) {}
  }
};

// Matnli xabarlarni holat bo'yicha yo'naltirish
const matnHandler = async (ctx) => {
  try {
    const foydalanuvchi = await foydalanuvchiTopish(ctx);

    if (foydalanuvchi.holat === 'buyurtma_miqdor') {
      return await miqdorQabulQilish(ctx);
    }

    if (foydalanuvchi.holat === 'buyurtma_telefon') {
      return await telefonQabulQilish(ctx);
    }

    if (foydalanuvchi.holat === 'buyurtma_manzil') {
      return await manzilQabulQilish(ctx);
    }

    return false;
  } catch (xatolik) {
    console.error('Matn handler xatosi:', xatolik);
    return false;
  }
};

module.exports = {
  startHandler,
  mahsulotlarHandler,
  buyurtmaBoshlanishi,
  mahsulotTanlashHandler,
  miqdorTanlashHandler,
  miqdorQabulQilish,
  olibTashlashHandler,
  yanaQoshishHandler,
  savatniTozalashHandler,
  rasmiylashtirishHandler,
  tasdiqlashBuyurtmaHandler,
  buyurtmalarTarixiHandler,
  yordamHandler,
  bekorQilishHandler,
  bekorInlineHandler,
  matnHandler,
  telefonQabulQilish,
  manzilQabulQilish,
  foydalanuvchiTopish,
};