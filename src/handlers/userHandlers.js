// Foydalanuvchi (User) handlerlari
const User = require('../../models/User');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const keyboards = require('../keyboards/keyboards');

/**
 * Noyob buyurtma raqamini yaratish
 * Format: FM-YYYYMMDD-XXXX
 */
const buyurtmaRaqamiYaratish = () => {
  const sana = new Date();
  const yil = sana.getFullYear();
  const oy = String(sana.getMonth() + 1).padStart(2, '0');
  const kun = String(sana.getDate()).padStart(2, '0');
  const tasodifiy = Math.floor(1000 + Math.random() * 9000);
  return `FM-${yil}${oy}${kun}-${tasodifiy}`;
};

/**
 * Narxni chiroyli formatda ko'rsatish
 */
const narxFormat = (narx) => {
  return narx.toLocaleString('uz-UZ');
};

/**
 * Foydalanuvchini bazadan topish yoki yaratish
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
 * /start komandasi handleri
 */
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
      `Bizning do'konimizda siz:\n` +
      `🛍 Mahsulotlarni ko'rishingiz\n` +
      `🛒 Buyurtma berishingiz\n` +
      `📋 Buyurtmalar tarixini ko'rishingiz mumkin.\n\n` +
      `Quyidagi tugmalardan birini tanlang:`;

    if (isAdmin) {
      await ctx.reply(xabar, {
        parse_mode: 'Markdown',
        ...keyboards.adminMenu(),
      });
    } else {
      await ctx.reply(xabar, {
        parse_mode: 'Markdown',
        ...keyboards.boshMenu(),
      });
    }
  } catch (xatolik) {
    console.error('Start xatosi:', xatolik);
    await ctx.reply('❌ Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.');
  }
};

/**
 * "Mahsulotlar" tugmasi handleri
 */
const mahsulotlarHandler = async (ctx) => {
  try {
    const mahsulotlar = await Product.find({ faol: true }).sort({ qoshilgan_sana: -1 });

    if (mahsulotlar.length === 0) {
      return await ctx.reply(
        '📭 Hozircha mahsulotlar mavjud emas.\n\nTez orada yangi mahsulotlar qo\'shiladi!'
      );
    }

    let xabar = '🛍 *Feruz Market — Mahsulotlar ro\'yxati:*\n\n';
    xabar += '━━━━━━━━━━━━━━━━━━━━━━━\n';

    mahsulotlar.forEach((m, index) => {
      xabar += `${index + 1}. *${m.nomi}*\n`;
      xabar += `   💰 Narxi: ${narxFormat(m.narxi)} so'm\n`;
      if (index < mahsulotlar.length - 1) {
        xabar += `   ─────────────────────\n`;
      }
    });

    xabar += '━━━━━━━━━━━━━━━━━━━━━━━\n';
    xabar += `\n📦 Jami: ${mahsulotlar.length} ta mahsulot`;
    xabar += `\n\n🛒 Buyurtma berish uchun "Buyurtma berish" tugmasini bosing.`;

    await ctx.reply(xabar, { parse_mode: 'Markdown' });
  } catch (xatolik) {
    console.error('Mahsulotlar xatosi:', xatolik);
    await ctx.reply('❌ Mahsulotlarni yuklashda xatolik yuz berdi.');
  }
};

/**
 * "Buyurtma berish" tugmasi handleri
 */
const buyurtmaBoshlanishi = async (ctx) => {
  try {
    const foydalanuvchi = await foydalanuvchiTopish(ctx);
    const mahsulotlar = await Product.find({ faol: true }).sort({ nomi: 1 });

    if (mahsulotlar.length === 0) {
      return await ctx.reply(
        '📭 Hozircha mahsulotlar mavjud emas.\nBuyurtma berish imkonsiz.'
      );
    }

    foydalanuvchi.holat = 'buyurtma_mahsulot_tanlash';
    foydalanuvchi.vaqtinchalik = { savat: [] };
    await foydalanuvchi.save();

    const xabar =
      '🛒 *Buyurtma berish*\n\n' +
      'Quyidagi mahsulotlardan tanlang.\n' +
      'Bir nechta mahsulot tanlashingiz mumkin.\n' +
      'Tanlash tugagach "✅ Tasdiqlash" tugmasini bosing.';

    await ctx.reply(xabar, {
      parse_mode: 'Markdown',
      ...keyboards.mahsulotTanlash(mahsulotlar),
    });
  } catch (xatolik) {
    console.error('Buyurtma boshlash xatosi:', xatolik);
    await ctx.reply('❌ Xatolik yuz berdi. Qayta urinib ko\'ring.');
  }
};

/**
 * Mahsulot tanlash (inline tugma) handleri
 */
const mahsulotTanlashHandler = async (ctx) => {
  try {
    const mahsulotId = ctx.callbackQuery.data.replace('tanlash_', '');
    const foydalanuvchi = await foydalanuvchiTopish(ctx);

    const mahsulot = await Product.findById(mahsulotId);
    if (!mahsulot) {
      return await ctx.answerCbQuery('❌ Mahsulot topilmadi!');
    }

    const savat = foydalanuvchi.vaqtinchalik?.savat || [];

    const mavjudIndex = savat.findIndex((item) => item.id === mahsulotId);
    if (mavjudIndex !== -1) {
      savat[mavjudIndex].soni += 1;
    } else {
      savat.push({
        id: mahsulotId,
        nomi: mahsulot.nomi,
        narxi: mahsulot.narxi,
        soni: 1,
      });
    }

    foydalanuvchi.vaqtinchalik = { savat };
    foydalanuvchi.markModified('vaqtinchalik');
    await foydalanuvchi.save();

    let jamiNarx = 0;
    let savatMatni = '🧺 *Sizning savatingiz:*\n\n';
    savat.forEach((item, index) => {
      const narx = item.narxi * item.soni;
      jamiNarx += narx;
      savatMatni += `${index + 1}. ${item.nomi} x${item.soni} = ${narxFormat(narx)} so'm\n`;
    });
    savatMatni += `\n💰 *Jami: ${narxFormat(jamiNarx)} so'm*`;
    savatMatni += '\n\n🗑 Mahsulotni olib tashlash uchun ustiga bosing.';

    await ctx.answerCbQuery(`✅ ${mahsulot.nomi} savatga qo'shildi!`);

    await ctx.editMessageText(savatMatni, {
      parse_mode: 'Markdown',
      ...keyboards.savatKorsatish(savat),
    });
  } catch (xatolik) {
    console.error('Mahsulot tanlash xatosi:', xatolik);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
  }
};

/**
 * Savatdan mahsulot olib tashlash
 */
const olibTashlashHandler = async (ctx) => {
  try {
    const index = parseInt(ctx.callbackQuery.data.replace('olib_tashlash_', ''));
    const foydalanuvchi = await foydalanuvchiTopish(ctx);
    const savat = foydalanuvchi.vaqtinchalik?.savat || [];

    if (index >= 0 && index < savat.length) {
      const olibTashlangan = savat.splice(index, 1)[0];
      foydalanuvchi.vaqtinchalik = { savat };
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
        let savatMatni = '🧺 *Sizning savatingiz:*\n\n';
        savat.forEach((item, i) => {
          const narx = item.narxi * item.soni;
          jamiNarx += narx;
          savatMatni += `${i + 1}. ${item.nomi} x${item.soni} = ${narxFormat(narx)} so'm\n`;
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

/**
 * "Yana qo'shish" tugmasi handleri
 */
const yanaQoshishHandler = async (ctx) => {
  try {
    const mahsulotlar = await Product.find({ faol: true }).sort({ nomi: 1 });

    await ctx.editMessageText(
      '🛒 Qo\'shimcha mahsulotlardan tanlang:',
      keyboards.mahsulotTanlash(mahsulotlar)
    );
    await ctx.answerCbQuery();
  } catch (xatolik) {
    console.error('Yana qo\'shish xatosi:', xatolik);
    await ctx.answerCbQuery('❌ Xatolik!');
  }
};

/**
 * Savatni tozalash handleri
 */
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

/**
 * Buyurtmani rasmiylashtirish — telefon so'rash
 */
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
      '📱 *Telefon raqamingizni yuboring.*\n\nQuyidagi tugmani bosing yoki qo\'lda kiriting (masalan: +998901234567):',
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

/**
 * Tasdiqlash (buyurtmani ko'rib chiqish)
 */
const tasdiqlashBuyurtmaHandler = async (ctx) => {
  try {
    const foydalanuvchi = await foydalanuvchiTopish(ctx);
    const savat = foydalanuvchi.vaqtinchalik?.savat || [];

    if (savat.length === 0) {
      await ctx.answerCbQuery('❌ Savat bo\'sh! Avval mahsulot tanlang.');
      return;
    }

    let jamiNarx = 0;
    let savatMatni = '🧺 *Sizning savatingiz:*\n\n';
    savat.forEach((item, i) => {
      const narx = item.narxi * item.soni;
      jamiNarx += narx;
      savatMatni += `${i + 1}. ${item.nomi} x${item.soni} = ${narxFormat(narx)} so'm\n`;
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

/**
 * Telefon raqamini qabul qilish
 */
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
          '❌ Noto\'g\'ri telefon raqami formati!\n\nIltimos, to\'g\'ri format kiriting: +998901234567',
          keyboards.telefonYuborish()
        );
        return true;
      }
    }

    foydalanuvchi.vaqtinchalik = {
      ...foydalanuvchi.vaqtinchalik,
      telefon,
    };
    foydalanuvchi.holat = 'buyurtma_manzil';
    foydalanuvchi.markModified('vaqtinchalik');
    await foydalanuvchi.save();

    await ctx.reply(
      '📍 *Yetkazib berish manzilingizni yozing:*\n\nMasalan: Toshkent sh., Chilonzor tumani, 7-mavze, 15-uy',
      {
        parse_mode: 'Markdown',
        ...keyboards.bekorQilish(),
      }
    );

    return true;
  } catch (xatolik) {
    console.error('Telefon qabul qilish xatosi:', xatolik);
    await ctx.reply('❌ Xatolik yuz berdi.');
    return true;
  }
};

/**
 * =============================================
 * MANZIL QABUL QILISH VA ADMINGA XABAR YUBORISH
 * Bu funksiya eng muhim qism!
 * =============================================
 */
const manzilQabulQilish = async (ctx) => {
  try {
    const foydalanuvchi = await foydalanuvchiTopish(ctx);

    if (foydalanuvchi.holat !== 'buyurtma_manzil') return false;

    const manzil = ctx.message.text.trim();

    if (manzil.length < 5) {
      await ctx.reply(
        '❌ Manzil juda qisqa. Iltimos, to\'liq manzil kiriting.',
        keyboards.bekorQilish()
      );
      return true;
    }

    const savat = foydalanuvchi.vaqtinchalik?.savat || [];
    const telefon = foydalanuvchi.vaqtinchalik?.telefon || '';

    if (savat.length === 0) {
      await ctx.reply('❌ Savat bo\'sh. Buyurtma bekor qilindi.', keyboards.boshMenu());
      foydalanuvchi.holat = 'bosh_menu';
      foydalanuvchi.vaqtinchalik = {};
      await foydalanuvchi.save();
      return true;
    }

    // Buyurtma raqamini yaratish
    let buyurtmaRaqami;
    let takrorlanmasin = true;
    while (takrorlanmasin) {
      buyurtmaRaqami = buyurtmaRaqamiYaratish();
      const mavjud = await Order.findOne({ buyurtma_raqami: buyurtmaRaqami });
      if (!mavjud) takrorlanmasin = false;
    }

    // Jami narxni hisoblash
    let jamiNarx = 0;
    const mahsulotlar = savat.map((item) => {
      const narx = item.narxi * item.soni;
      jamiNarx += narx;
      return {
        nomi: item.nomi,
        narxi: item.narxi,
        soni: item.soni,
      };
    });

    // Buyurtmani bazaga saqlash
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

    // Foydalanuvchi holatini tozalash
    foydalanuvchi.holat = 'bosh_menu';
    foydalanuvchi.vaqtinchalik = {};
    foydalanuvchi.markModified('vaqtinchalik');
    await foydalanuvchi.save();

    // =============================================
    // 1-QADAM: FOYDALANUVCHIGA TASDIQLASH XABARI
    // =============================================
    let tasdiqXabari =
      `✅ *Buyurtmangiz qabul qilindi!*\n\n` +
      `📦 Buyurtma raqami: \`${buyurtmaRaqami}\`\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n`;

    mahsulotlar.forEach((item, index) => {
      tasdiqXabari += `${index + 1}. ${item.nomi} x${item.soni} = ${narxFormat(item.narxi * item.soni)} so'm\n`;
    });

    tasdiqXabari +=
      `━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 Jami: *${narxFormat(jamiNarx)} so'm*\n\n` +
      `📱 Telefon: ${telefon}\n` +
      `📍 Manzil: ${manzil}\n\n` +
      `⏳ Buyurtmangiz tez orada ko'rib chiqiladi.\n` +
      `Rahmat, *Feruz Market*ni tanlaganingiz uchun! 🙏`;

    await ctx.reply(tasdiqXabari, {
      parse_mode: 'Markdown',
      ...keyboards.boshMenu(),
    });

    // =============================================
    // 2-QADAM: ADMINGA BILDIRISHNOMA YUBORISH
    // BU QISM ENG MUHIM!!!
    // =============================================
    const ADMIN_ID = process.env.ADMIN_ID;

    console.log('========================================');
    console.log('ADMIN_ID:', ADMIN_ID);
    console.log('ADMIN_ID turi:', typeof ADMIN_ID);
    console.log('Buyurtma raqami:', buyurtmaRaqami);
    console.log('Foydalanuvchi:', foydalanuvchi.ism);
    console.log('========================================');

    if (!ADMIN_ID) {
      console.error('❌ ADMIN_ID .env faylida topilmadi!');
      return true;
    }

    // Admin xabarini tayyorlash
    let adminXabari = '';
    adminXabari += '🔔🔔🔔 *YANGI BUYURTMA KELDI!* 🔔🔔🔔\n\n';
    adminXabari += `📦 Buyurtma raqami: \`${buyurtmaRaqami}\`\n`;
    adminXabari += `👤 Mijoz ismi: *${foydalanuvchi.ism}*\n`;
    adminXabari += `🆔 Telegram ID: \`${ctx.from.id}\`\n`;

    if (foydalanuvchi.username) {
      adminXabari += `📎 Username: @${foydalanuvchi.username}\n`;
    }

    adminXabari += `\n━━━━━━━━━━━━━━━━━━━━━━━\n`;
    adminXabari += `🛒 *Buyurtma qilingan mahsulotlar:*\n\n`;

    mahsulotlar.forEach((item, index) => {
      adminXabari += `  ${index + 1}. *${item.nomi}*\n`;
      adminXabari += `     Soni: ${item.soni} ta\n`;
      adminXabari += `     Narxi: ${narxFormat(item.narxi)} so'm\n`;
      adminXabari += `     Jami: ${narxFormat(item.narxi * item.soni)} so'm\n\n`;
    });

    adminXabari += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
    adminXabari += `💰 *UMUMIY NARX: ${narxFormat(jamiNarx)} so'm*\n`;
    adminXabari += `━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    adminXabari += `📱 Telefon: ${telefon}\n`;
    adminXabari += `📍 Manzil: ${manzil}\n\n`;
    adminXabari += `🕐 Buyurtma vaqti: ${new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}`;

    // ADMINGA YUBORISH
    try {
      console.log('📤 Adminga xabar yuborilmoqda...');
      console.log('Admin chat_id:', Number(ADMIN_ID));

      await ctx.telegram.sendMessage(Number(ADMIN_ID), adminXabari, {
        parse_mode: 'Markdown',
      });

      console.log('✅ Adminga xabar muvaffaqiyatli yuborildi!');
    } catch (adminXatosi) {
      console.error('❌ ADMINGA XABAR YUBORISHDA XATOLIK:');
      console.error('Xatolik nomi:', adminXatosi.name);
      console.error('Xatolik xabari:', adminXatosi.message);
      console.error('Xatolik kodi:', adminXatosi.code);
      console.error('To\'liq xatolik:', JSON.stringify(adminXatosi, null, 2));

      // Agar Markdown xatolik bersa, oddiy matn sifatida yuborish
      try {
        console.log('📤 Oddiy matn sifatida qayta yuborilmoqda...');

        const oddiyXabar =
          `🔔 YANGI BUYURTMA KELDI!\n\n` +
          `Buyurtma raqami: ${buyurtmaRaqami}\n` +
          `Mijoz: ${foydalanuvchi.ism}\n` +
          `Telefon: ${telefon}\n` +
          `Manzil: ${manzil}\n` +
          `Jami narx: ${narxFormat(jamiNarx)} so'm\n` +
          `Vaqt: ${new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}`;

        await ctx.telegram.sendMessage(Number(ADMIN_ID), oddiyXabar);

        console.log('✅ Oddiy matn sifatida yuborildi!');
      } catch (ikkinchiXatolik) {
        console.error('❌❌ IKKINCHI URINISH HAM XATO:');
        console.error(ikkinchiXatolik.message);
      }
    }

    return true;
  } catch (xatolik) {
    console.error('Manzil qabul qilish xatosi:', xatolik);
    await ctx.reply('❌ Buyurtmani saqlashda xatolik yuz berdi.', keyboards.boshMenu());
    return true;
  }
};

/**
 * "Buyurtmalar tarixi" tugmasi handleri
 */
const buyurtmalarTarixiHandler = async (ctx) => {
  try {
    const buyurtmalar = await Order.find({ foydalanuvchi_id: ctx.from.id })
      .sort({ sana: -1 })
      .limit(10);

    if (buyurtmalar.length === 0) {
      return await ctx.reply(
        '📭 Sizda hali buyurtmalar yo\'q.\n\n🛒 Buyurtma berish uchun "Buyurtma berish" tugmasini bosing.',
        keyboards.boshMenu()
      );
    }

    let xabar = '📋 *Buyurtmalar tarixingiz:*\n\n';

    const holatBelgisi = {
      yangi: '🆕',
      qabul_qilindi: '✅',
      yetkazilmoqda: '🚚',
      yakunlandi: '✔️',
      bekor_qilindi: '❌',
    };

    const holatNomi = {
      yangi: 'Yangi',
      qabul_qilindi: 'Qabul qilindi',
      yetkazilmoqda: 'Yetkazilmoqda',
      yakunlandi: 'Yakunlandi',
      bekor_qilindi: 'Bekor qilindi',
    };

    buyurtmalar.forEach((b, index) => {
      const sana = new Date(b.sana).toLocaleString('uz-UZ', {
        timeZone: 'Asia/Tashkent',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      xabar += `${index + 1}. 📦 \`${b.buyurtma_raqami}\`\n`;
      xabar += `   ${holatBelgisi[b.holati] || '❓'} Holat: ${holatNomi[b.holati] || b.holati}\n`;

      b.mahsulotlar.forEach((m) => {
        xabar += `   • ${m.nomi} x${m.soni}\n`;
      });

      xabar += `   💰 Jami: ${narxFormat(b.jami_narx)} so'm\n`;
      xabar += `   📅 ${sana}\n`;

      if (index < buyurtmalar.length - 1) {
        xabar += `   ─────────────────────\n`;
      }
    });

    xabar += `\n📌 Oxirgi ${buyurtmalar.length} ta buyurtma ko'rsatilmoqda.`;

    await ctx.reply(xabar, { parse_mode: 'Markdown' });
  } catch (xatolik) {
    console.error('Buyurtmalar tarixi xatosi:', xatolik);
    await ctx.reply('❌ Buyurtmalar tarixini yuklashda xatolik yuz berdi.');
  }
};

/**
 * "Yordam" tugmasi handleri
 */
const yordamHandler = async (ctx) => {
  const xabar =
    'ℹ️ *Feruz Market — Yordam*\n\n' +
    '🛍 *Mahsulotlar* — Mavjud mahsulotlarni ko\'rish\n' +
    '🛒 *Buyurtma berish* — Yangi buyurtma berish\n' +
    '📋 *Buyurtmalar tarixi* — Oldingi buyurtmalaringiz\n\n' +
    '📞 Savollar bo\'lsa: @feruz_market_admin\n\n' +
    '🏪 *Feruz Market* — Sifatli mahsulotlar, qulay narxlar!';

  await ctx.reply(xabar, { parse_mode: 'Markdown' });
};

/**
 * "Bekor qilish" tugmasi handleri
 */
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
      '❌ Amal bekor qilindi.\n\nBosh menyuga qaytdingiz.',
      isAdmin ? keyboards.adminMenu() : keyboards.boshMenu()
    );
  } catch (xatolik) {
    console.error('Bekor qilish xatosi:', xatolik);
    await ctx.reply('Bosh menyuga qaytdingiz.', keyboards.boshMenu());
  }
};

/**
 * Inline "bekor qilish" handleri
 */
const bekorInlineHandler = async (ctx) => {
  try {
    const foydalanuvchi = await foydalanuvchiTopish(ctx);
    foydalanuvchi.holat = 'bosh_menu';
    foydalanuvchi.vaqtinchalik = {};
    foydalanuvchi.markModified('vaqtinchalik');
    await foydalanuvchi.save();

    await ctx.editMessageText('❌ Amal bekor qilindi.');
    await ctx.answerCbQuery('Bekor qilindi');
  } catch (xatolik) {
    console.error('Bekor inline xatosi:', xatolik);
    try {
      await ctx.answerCbQuery('Bekor qilindi');
    } catch (e) {}
  }
};

/**
 * Matnli xabarlarni holat bo'yicha yo'naltirish
 */
const matnHandler = async (ctx) => {
  try {
    const foydalanuvchi = await foydalanuvchiTopish(ctx);

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