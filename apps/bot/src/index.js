import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Markup, Telegraf } from "telegraf";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const envPath = path.resolve(currentDirectory, "../.env");

const envResult = dotenv.config({
  path: envPath,
  override: true,
});

if (envResult.error) {
  console.error(`.env fayli o‘qilmadi: ${envPath}`);
  console.error(envResult.error);
  process.exit(1);
}

const BOT_TOKEN = process.env.BOT_TOKEN;
const MINI_APP_URL = process.env.MINI_APP_URL;
const API_URL =
  process.env.API_URL || "http://127.0.0.1:4100";

/*
 * LIGA_ARENA_RULES_AND_CHANNELS_V1
 */

const MANDATORY_CHANNEL_ID = String(
  process.env.MANDATORY_CHANNEL_ID || "",
).trim();

const TELEGRAM_CHANNEL_URL = String(
  process.env.TELEGRAM_CHANNEL_URL || "",
).trim();

const YOUTUBE_URL = String(
  process.env.YOUTUBE_URL || "",
).trim();

const INSTAGRAM_URL = String(
  process.env.INSTAGRAM_URL || "",
).trim();

const TWITCH_URL = String(
  process.env.TWITCH_URL || "",
).trim();

const RULE_TEXTS = {
  liga: [
    "🏆 LIGA ARENA UMUMIY QOIDALARI",
    "",
    "1. Har bir jamoa faqat tasdiqlangan va to‘g‘ri ma’lumot kiritilgan o‘yinchilar bilan qatnashadi.",
    "",
    "2. Jamoa sardori tarkib, o‘yinchi ID raqamlari, nickname va boshqa ma’lumotlarning to‘g‘riligi uchun javob beradi.",
    "",
    "3. Soxta akkaunt, boshqa shaxs nomidan qatnashish, akkaunt almashish va natijaga noqonuniy ta’sir qilish taqiqlanadi.",
    "",
    "4. O‘yinchilar, raqiblar, hakamlar va Liga Arena ma’muriyatiga nisbatan hurmatsizlik, haqorat va tahdidga yo‘l qo‘yilmaydi.",
    "",
    "5. Kelishilgan o‘yin, match-fixing, ataylab yutqazish yoki boshqa jamoaga noqonuniy yordam berish diskvalifikatsiyaga sabab bo‘ladi.",
    "",
    "6. Jamoalar rasmiy taqvim, tur vaqti, lobby ma’lumotlari va ma’muriyat ko‘rsatmalariga rioya qilishi shart.",
    "",
    "7. Liga natijalari tizimda saqlangan rasmiy natijalar asosida hisoblanadi.",
    "",
    "8. Mavsum yakunida yuqori va quyi ligaga o‘tish rasmiy yakuniy jadval asosida amalga oshiriladi.",
    "",
    "9. Shikoyat faqat dalil: video, screenshot yoki aniq texnik ma’lumot bilan ko‘rib chiqiladi.",
    "",
    "10. Qoidabuzarlik holatida ogohlantirish, ochko olib tashlash, texnik mag‘lubiyat yoki diskvalifikatsiya qo‘llanishi mumkin.",
    "",
    "Toj sovg‘a qilinmaydi.",
  ].join("\n"),

  pubg: [
    "🔫 PUBG MOBILE TURNIR QOIDALARI",
    "",
    "1. Har bir tur 4 ta karta natijasidan tashkil topadi.",
    "",
    "2. Jamoaning tur natijasi kartalardagi egallangan o‘rin va kill soni asosida avtomatik hisoblanadi.",
    "",
    "3. Turda o‘ynaydigan va dam oladigan jamoalar Liga Arena rotatsiya tizimi orqali belgilanadi.",
    "",
    "4. Faqat ro‘yxatdan o‘tgan PUBG nickname va PUBG ID egasi qatnashishi mumkin.",
    "",
    "5. Cheat, noqonuniy konfiguratsiya, skript, modifikatsiya yoki uchinchi tomon ustunlik dasturlari taqiqlanadi.",
    "",
    "6. Teaming, stream-sniping, ghosting va raqib joylashuvini tashqi manbadan olish taqiqlanadi.",
    "",
    "7. O‘yin xatosi yoki xaritadagi bug’dan ataylab ustunlik olish qoidabuzarlik hisoblanadi.",
    "",
    "8. Room ID va parolni begona shaxslarga tarqatish mumkin emas.",
    "",
    "9. Internet yoki qurilma muammosi bo‘yicha murojaat faqat dalil bilan ko‘rib chiqiladi.",
    "",
    "10. Yakunlangan va jadvalga chiqarilgan tur natijasi faqat ma’muriyat tasdiqlagan asosli holatda o‘zgartiriladi.",
  ].join("\n"),

  mlbb: [
    "⚔️ MOBILE LEGENDS TURNIR QOIDALARI",
    "",
    "1. Uchrashuv formati liga sozlamasiga qarab BO1, BO3 yoki BO5 bo‘lishi mumkin.",
    "",
    "2. G‘alaba, mag‘lubiyat, map natijalari va umumiy ochko Liga Arena tizimida hisoblanadi.",
    "",
    "3. Faqat ro‘yxatdan o‘tgan MLBB User ID, Server ID va nickname egasi qatnashishi mumkin.",
    "",
    "4. Akkaunt almashish, boshqa o‘yinchini o‘z o‘rniga tushirish va boosting taqiqlanadi.",
    "",
    "5. Cheat, script, map hack, noqonuniy plugin yoki o‘yinga tashqi ta’sir qiluvchi dasturlar taqiqlanadi.",
    "",
    "6. Lobby va draft sozlamalari ma’muriyat tomonidan belgilangan formatga mos bo‘lishi kerak.",
    "",
    "7. Ataylab disconnect qilish, o‘yinni buzish yoki raqibga texnik zarar yetkazishga urinish taqiqlanadi.",
    "",
    "8. Texnik muammo yuz bersa, jamoa sardori darhol ma’muriyatga dalil bilan xabar berishi kerak.",
    "",
    "9. Uchrashuv natijasi ikki jamoa sardori yoki ma’muriyat tomonidan tasdiqlangach rasmiy hisoblanadi.",
    "",
    "10. Mavsum yakuniy o‘rinlari g‘alabalar, mag‘lubiyatlar, map farqi va liga ochkolari asosida belgilanadi.",
  ].join("\n"),

  privacy: [
    "🔐 MAXFIYLIK VA MEDIA ROZILIGI",
    "",
    "1. Ro‘yxatdan o‘tishda kiritilgan Telegram ID, o‘yin ID, nickname va jamoa ma’lumotlari turnirni boshqarish uchun ishlatiladi.",
    "",
    "2. Jamoa nomi, logo, o‘yinchi nickname, liga o‘rni va turnir natijalari Liga Arena sahifalarida e’lon qilinishi mumkin.",
    "",
    "3. Turnir davomida olingan screenshot, video, stream parchasi va natijalar media material sifatida ishlatilishi mumkin.",
    "",
    "4. Telefon raqami, shaxsiy yozishma va turnirga aloqasi bo‘lmagan shaxsiy ma’lumotlar ochiq e’lon qilinmaydi.",
    "",
    "5. Jamoani ro‘yxatdan o‘tkazish orqali sardor va o‘yinchilar amaldagi qoidalar hamda media shartlariga rozilik bildiradi.",
  ].join("\n"),
};
if (!BOT_TOKEN) {
  console.error("BOT_TOKEN topilmadi.");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

async function apiRequest(pathname, options = {}) {
  let response;

  try {
    response = await fetch(`${API_URL}${pathname}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error(
      "Liga Arena serveri bilan aloqa o‘rnatilmadi.",
    );
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message ||
        "So‘rovni bajarishda xatolik yuz berdi.",
    );
  }

  return data;
}

function gameTitle(game) {
  return game === "PUBG"
    ? "PUBG MOBILE"
    : "MOBILE LEGENDS";
}

function roleTitle(role) {
  return role === "RESERVE"
    ? "Zaxira o‘yinchi"
    : "Asosiy o‘yinchi";
}

function getStartPayload(ctx) {
  const text = ctx.message?.text || "";
  const parts = text.split(/\s+/);

  return parts.length > 1
    ? parts.slice(1).join(" ").trim()
    : "";
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(
    String(value || "").trim(),
  );
}

function getTelegramChannelUrl() {
  if (isHttpUrl(TELEGRAM_CHANNEL_URL)) {
    return TELEGRAM_CHANNEL_URL;
  }

  if (MANDATORY_CHANNEL_ID.startsWith("@")) {
    return `https://t.me/${MANDATORY_CHANNEL_ID.slice(1)}`;
  }

  return "";
}

function getMainMenuText(ctx) {
  const firstName =
    ctx.from?.first_name ||
    "o‘yinchi";

  return [
    `Salom, ${firstName}!`,
    "",
    "🏆 LIGA ARENA",
    "",
    "PUBG MOBILE va Mobile Legends jamoalari uchun professional liga va turnir boshqaruv markazi.",
    "",
    "Bu bot orqali:",
    "• jamoani ro‘yxatdan o‘tkazish;",
    "• liga va taqvimni ko‘rish;",
    "• o‘yin qoidalarini o‘qish;",
    "• rasmiy sahifalarga o‘tish mumkin.",
    "",
    "Turnirda qatnashishdan oldin foydalanuvchi shartlari va o‘yin qoidalarini o‘qib chiqing.",
    "",
    "Toj sovg‘a qilinmaydi.",
  ].join("\n");
}

function getStartKeyboard() {
  const buttons = [];

  if (MINI_APP_URL?.startsWith("https://")) {
    buttons.push([
      Markup.button.webApp(
        "🏆 Liga Arenani ochish",
        MINI_APP_URL,
      ),
    ]);
  }

  buttons.push([
    Markup.button.callback(
      "🎮 Jamoa ro‘yxatdan o‘tkazish",
      "register_team",
    ),
  ]);

  buttons.push([
    Markup.button.callback(
      "📊 Ligalar",
      "leagues",
    ),
    Markup.button.callback(
      "📅 Taqvim",
      "schedule",
    ),
  ]);

  buttons.push([
    Markup.button.callback(
      "📜 Foydalanuvchi shartlari",
      "user_terms",
    ),
  ]);

  buttons.push([
    Markup.button.callback(
      "🌐 Rasmiy sahifalar",
      "official_links",
    ),
  ]);

  return Markup.inlineKeyboard(
    buttons,
  );
}

function getTermsKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        "🏆 Liga Arena qoidalari",
        "rules_liga",
      ),
    ],
    [
      Markup.button.callback(
        "🔫 PUBG Mobile qoidalari",
        "rules_pubg",
      ),
    ],
    [
      Markup.button.callback(
        "⚔️ Mobile Legends qoidalari",
        "rules_mlbb",
      ),
    ],
    [
      Markup.button.callback(
        "🔐 Maxfiylik va media",
        "rules_privacy",
      ),
    ],
    [
      Markup.button.callback(
        "⬅️ Asosiy menyu",
        "back_main",
      ),
    ],
  ]);
}

function getOfficialLinksKeyboard() {
  const buttons = [];

  const telegramUrl =
    getTelegramChannelUrl();

  if (isHttpUrl(telegramUrl)) {
    buttons.push([
      Markup.button.url(
        "📢 Telegram kanal",
        telegramUrl,
      ),
    ]);
  }

  if (isHttpUrl(YOUTUBE_URL)) {
    buttons.push([
      Markup.button.url(
        "▶️ YouTube",
        YOUTUBE_URL,
      ),
    ]);
  }

  if (isHttpUrl(INSTAGRAM_URL)) {
    buttons.push([
      Markup.button.url(
        "📷 Instagram",
        INSTAGRAM_URL,
      ),
    ]);
  }

  if (isHttpUrl(TWITCH_URL)) {
    buttons.push([
      Markup.button.url(
        "🟣 Twitch",
        TWITCH_URL,
      ),
    ]);
  }

  buttons.push([
    Markup.button.callback(
      "⬅️ Asosiy menyu",
      "back_main",
    ),
  ]);

  return Markup.inlineKeyboard(
    buttons,
  );
}

function getSubscriptionKeyboard() {
  const buttons = [];

  const telegramUrl =
    getTelegramChannelUrl();

  if (isHttpUrl(telegramUrl)) {
    buttons.push([
      Markup.button.url(
        "📢 Kanalga obuna bo‘lish",
        telegramUrl,
      ),
    ]);
  }

  buttons.push([
    Markup.button.callback(
      "✅ Obunani tekshirish",
      "check_subscription",
    ),
  ]);

  buttons.push([
    Markup.button.callback(
      "📜 Foydalanuvchi shartlari",
      "user_terms",
    ),
    Markup.button.callback(
      "🌐 Rasmiy sahifalar",
      "official_links",
    ),
  ]);

  return Markup.inlineKeyboard(
    buttons,
  );
}

async function editOrReply(
  ctx,
  text,
  keyboard,
) {
  if (ctx.callbackQuery?.message) {
    try {
      await ctx.editMessageText(
        text,
        keyboard,
      );

      return;
    } catch (error) {
      const message =
        String(
          error?.description ||
          error?.message ||
          "",
        );

      if (
        message.includes(
          "message is not modified",
        )
      ) {
        return;
      }
    }
  }

  await ctx.reply(
    text,
    keyboard,
  );
}

async function getSubscriptionState(
  userId,
) {
  if (!MANDATORY_CHANNEL_ID) {
    return {
      required: false,
      subscribed: true,
      status: "NOT_CONFIGURED",
      error: null,
    };
  }

  try {
    const member =
      await bot.telegram.getChatMember(
        MANDATORY_CHANNEL_ID,
        userId,
      );

    const status =
      member?.status || "unknown";

    const subscribed =
      [
        "creator",
        "administrator",
        "member",
      ].includes(status) ||
      (
        status === "restricted" &&
        member?.is_member !== false
      );

    return {
      required: true,
      subscribed,
      status,
      error: null,
    };
  } catch (error) {
    console.error(
      "Majburiy kanal obunasini tekshirishda xato:",
      error,
    );

    return {
      required: true,
      subscribed: false,
      status: "CHECK_ERROR",
      error,
    };
  }
}

async function sendSubscriptionGate(
  ctx,
  state,
) {
  const lines = [
    "🔐 LIGA ARENA KIRISH NAZORATI",
    "",
    "Liga Arena xizmatlaridan foydalanish uchun rasmiy Telegram kanalga obuna bo‘lish majburiy.",
    "",
    "1. «Kanalga obuna bo‘lish» tugmasini bosing.",
    "2. Kanalga qo‘shiling.",
    "3. Botga qaytib «Obunani tekshirish» tugmasini bosing.",
  ];

  if (state?.status === "CHECK_ERROR") {
    lines.push(
      "",
      "⚠️ Obunani tekshirishda texnik xato yuz berdi.",
      "Bot rasmiy kanalga administrator qilib qo‘shilganini tekshiring.",
    );
  }

  await editOrReply(
    ctx,
    lines.join("\n"),
    getSubscriptionKeyboard(),
  );
}

async function requireSubscription(
  ctx,
) {
  const state =
    await getSubscriptionState(
      ctx.from.id,
    );

  if (state.subscribed) {
    return true;
  }

  await sendSubscriptionGate(
    ctx,
    state,
  );

  return false;
}

async function sendMainMenu(ctx) {
  await ctx.reply(
    getMainMenuText(ctx),
    getStartKeyboard(),
  );
}

async function showUserTerms(ctx) {
  await editOrReply(
    ctx,
    [
      "📜 FOYDALANUVCHI SHARTLARI",
      "",
      "Liga Arena turnirida qatnashishdan oldin quyidagi bo‘limlarni o‘qib chiqing:",
      "",
      "🏆 Liga Arena umumiy qoidalari",
      "🔫 PUBG Mobile turnir qoidalari",
      "⚔️ Mobile Legends turnir qoidalari",
      "🔐 Maxfiylik va media roziligi",
      "",
      "Jamoani ro‘yxatdan o‘tkazish amaldagi qoidalar va shartlarga rozilik bildirish hisoblanadi.",
    ].join("\n"),
    getTermsKeyboard(),
  );
}

async function showRulePage(
  ctx,
  ruleText,
) {
  await editOrReply(
    ctx,
    ruleText,
    Markup.inlineKeyboard([
      [
        Markup.button.callback(
          "⬅️ Qoidalar menyusi",
          "user_terms",
        ),
      ],
      [
        Markup.button.callback(
          "🏠 Asosiy menyu",
          "back_main",
        ),
      ],
    ]),
  );
}

async function showOfficialLinks(
  ctx,
) {
  const configuredLinks = [
    getTelegramChannelUrl(),
    YOUTUBE_URL,
    INSTAGRAM_URL,
    TWITCH_URL,
  ].filter(isHttpUrl);

  const lines = [
    "🌐 LIGA ARENA RASMIY SAHIFALARI",
    "",
    "Yangiliklar, turnir anonslari, jadval posterlari, natijalar va jonli efirlar rasmiy sahifalarda e’lon qilinadi.",
    "",
    "📢 Telegram — asosiy va majburiy axborot kanali",
    "▶️ YouTube — video, sharh va jonli efirlar",
    "📷 Instagram — poster, natija va qisqa yangiliklar",
    "🟣 Twitch — qo‘shimcha jonli efir platformasi",
  ];

  if (configuredLinks.length === 0) {
    lines.push(
      "",
      "⚠️ Rasmiy havolalar hali sozlanmagan.",
    );
  }

  await editOrReply(
    ctx,
    lines.join("\n"),
    getOfficialLinksKeyboard(),
  );
}

async function showInvite(ctx, token) {
  try {
    const result = await apiRequest(
      `/api/invites/${encodeURIComponent(token)}`,
    );

    const invite = result.invite;

    if (invite.status === "CONFIRMED") {
      await ctx.reply(
        "✅ Bu taklif allaqachon tasdiqlangan.",
      );
      return;
    }

    if (invite.status === "REJECTED") {
      await ctx.reply(
        "❌ Bu taklif avval rad etilgan.",
      );
      return;
    }

    if (invite.status === "EXPIRED") {
      await ctx.reply(
        "⌛ Bu tasdiqlash havolasining muddati tugagan.",
      );
      return;
    }

    await ctx.reply(
      [
        "🏆 JAMOA TAKLIFI",
        "",
        `Jamoa: ${invite.teamName}`,
        `TAG: ${invite.teamTag}`,
        `O‘yin: ${gameTitle(invite.game)}`,
        `Hudud: ${invite.region}`,
        "",
        `Nickname: ${invite.memberNickname}`,
        `Rol: ${roleTitle(invite.memberRole)}`,
        "",
        "Bu jamoaga qo‘shilishni tasdiqlaysizmi?",
      ].join("\n"),
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "✅ Jamoaga qo‘shilish",
            `invite_accept_${token}`,
          ),
        ],
        [
          Markup.button.callback(
            "❌ Taklifni rad etish",
            `invite_reject_${token}`,
          ),
        ],
      ]),
    );
  } catch (error) {
    await ctx.reply(
      [
        "⚠️ Taklifni ochib bo‘lmadi.",
        "",
        error.message,
      ].join("\n"),
    );
  }
}

bot.start(async (ctx) => {
  const payload =
    getStartPayload(ctx);

  if (payload.startsWith("join_")) {
    const token =
      payload.slice(
        "join_".length,
      );

    await showInvite(
      ctx,
      token,
    );

    return;
  }

  const allowed =
    await requireSubscription(
      ctx,
    );

  if (!allowed) {
    return;
  }

  await sendMainMenu(ctx);
});

bot.action(
  "check_subscription",
  async (ctx) => {
    await ctx.answerCbQuery(
      "Obuna tekshirilmoqda...",
    );

    const state =
      await getSubscriptionState(
        ctx.from.id,
      );

    if (!state.subscribed) {
      await sendSubscriptionGate(
        ctx,
        state,
      );

      return;
    }

    await editOrReply(
      ctx,
      [
        "✅ OBUNA TASDIQLANDI",
        "",
        "Liga Arena rasmiy kanaliga obunangiz muvaffaqiyatli tasdiqlandi.",
        "",
        getMainMenuText(ctx),
      ].join("\n"),
      getStartKeyboard(),
    );
  },
);

bot.action(
  "user_terms",
  async (ctx) => {
    await ctx.answerCbQuery();
    await showUserTerms(ctx);
  },
);

bot.action(
  "rules_liga",
  async (ctx) => {
    await ctx.answerCbQuery();
    await showRulePage(
      ctx,
      RULE_TEXTS.liga,
    );
  },
);

bot.action(
  "rules_pubg",
  async (ctx) => {
    await ctx.answerCbQuery();
    await showRulePage(
      ctx,
      RULE_TEXTS.pubg,
    );
  },
);

bot.action(
  "rules_mlbb",
  async (ctx) => {
    await ctx.answerCbQuery();
    await showRulePage(
      ctx,
      RULE_TEXTS.mlbb,
    );
  },
);

bot.action(
  "rules_privacy",
  async (ctx) => {
    await ctx.answerCbQuery();
    await showRulePage(
      ctx,
      RULE_TEXTS.privacy,
    );
  },
);

bot.action(
  "official_links",
  async (ctx) => {
    await ctx.answerCbQuery();
    await showOfficialLinks(ctx);
  },
);

bot.action(
  "back_main",
  async (ctx) => {
    await ctx.answerCbQuery();

    const allowed =
      await requireSubscription(
        ctx,
      );

    if (!allowed) {
      return;
    }

    await editOrReply(
      ctx,
      getMainMenuText(ctx),
      getStartKeyboard(),
    );
  },
);
bot.action(
  /^invite_accept_(.+)$/,
  async (ctx) => {
    await ctx.answerCbQuery("Tasdiqlanmoqda...");

    const token = ctx.match[1];

    try {
      const result = await apiRequest(
        `/api/invites/${encodeURIComponent(token)}/confirm`,
        {
          method: "POST",
          body: JSON.stringify({
            telegramId: String(ctx.from.id),
            firstName: ctx.from.first_name || "",
            username: ctx.from.username || "",
          }),
        },
      );

      const invite = result.invite;

      await ctx.editMessageText(
        [
          "✅ JAMOAGA QO‘SHILDINGIZ",
          "",
          `Jamoa: ${invite.teamName}`,
          `O‘yin: ${gameTitle(invite.game)}`,
          `Nickname: ${invite.memberNickname}`,
          "",
          "Sizning Telegram profilingiz jamoa tarkibiga biriktirildi.",
        ].join("\n"),
      );
    } catch (error) {
      await ctx.reply(
        [
          "⚠️ Tasdiqlash amalga oshmadi.",
          "",
          error.message,
        ].join("\n"),
      );
    }
  },
);

bot.action(
  /^invite_reject_(.+)$/,
  async (ctx) => {
    await ctx.answerCbQuery("Rad etilmoqda...");

    const token = ctx.match[1];

    try {
      const result = await apiRequest(
        `/api/invites/${encodeURIComponent(token)}/reject`,
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );

      await ctx.editMessageText(
        [
          "❌ TAKLIF RAD ETILDI",
          "",
          `Jamoa: ${result.invite.teamName}`,
          "",
          "Sardor yangi tasdiqlash havolasi yaratishi mumkin.",
        ].join("\n"),
      );
    } catch (error) {
      await ctx.reply(
        [
          "⚠️ Taklifni rad etib bo‘lmadi.",
          "",
          error.message,
        ].join("\n"),
      );
    }
  },
);

bot.command("myid", async (ctx) => {
  await ctx.reply(
    [
      "🆔 TELEGRAM ID",
      "",
      `Sizning Telegram ID raqamingiz: ${ctx.from.id}`,
      "",
      "Bu raqam Liga Arena admin sozlamalari uchun ishlatiladi.",
    ].join("\n"),
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    [
      "Liga Arena yordam markazi",
      "",
      "/start — asosiy menyu",
      "/rules — foydalanuvchi va o‘yin qoidalari",
      "/channels — rasmiy sahifalar",
      "/status — tizim holati",
      "/help — yordam",
    ].join("\n"),
  );
});

bot.command("rules", async (ctx) => {
  await showUserTerms(ctx);
});

bot.command("channels", async (ctx) => {
  await showOfficialLinks(ctx);
});
bot.command("status", async (ctx) => {
  try {
    const health = await apiRequest("/api/health");

    await ctx.reply(
      [
        "✅ Liga Arena tizimi ishlamoqda",
        "",
        `API: ${health.healthy ? "faol" : "nofaol"}`,
        `Versiya: ${health.version}`,
        `Database: ${health.database}`,
      ].join("\n"),
    );
  } catch {
    await ctx.reply(
      [
        "⚠️ Bot ishlamoqda, lekin backend bilan aloqa yo‘q.",
        "",
        "API server ishga tushirilganini tekshiring.",
      ].join("\n"),
    );
  }
});

bot.action("register_team", async (ctx) => {
  await ctx.answerCbQuery();

  const allowed =
    await requireSubscription(
      ctx,
    );

  if (!allowed) {
    return;
  }

  if (MINI_APP_URL?.startsWith("https://")) {
    await ctx.reply(
      "Jamoani Liga Arena Mini App orqali ro‘yxatdan o‘tkazing.",
      Markup.inlineKeyboard([
        [
          Markup.button.webApp(
            "🏆 Mini App’ni ochish",
            MINI_APP_URL,
          ),
        ],
      ]),
    );

    return;
  }

  await ctx.reply(
    [
      "Jamoalarni ro‘yxatdan o‘tkazish Mini App orqali amalga oshiriladi.",
      "",
      "Hozir loyiha lokal test rejimida ishlamoqda.",
    ].join("\n"),
  );
});

bot.action("leagues", async (ctx) => {
  await ctx.answerCbQuery();

  const allowed =
    await requireSubscription(
      ctx,
    );

  if (!allowed) {
    return;
  }

  await ctx.reply(
    [
      "🏆 LIGA ARENA",
      "",
      "PUBG MOBILE:",
      "• SOVEREIGN",
      "• VANGUARD",
      "• ASCENT",
      "",
      "MOBILE LEGENDS:",
      "• IMPERIUM",
      "• ABYSSAL",
      "• DAWN",
    ].join("\n"),
  );
});

bot.action("schedule", async (ctx) => {
  await ctx.answerCbQuery();

  const allowed =
    await requireSubscription(
      ctx,
    );

  if (!allowed) {
    return;
  }

  await ctx.reply(
    "📅 Mavsum taqvimi tasdiqlangach shu bo‘limda ko‘rsatiladi.",
  );
});

bot.catch((error, ctx) => {
  console.error(
    `Telegram bot xatosi, update ${ctx.update.update_id}:`,
    error,
  );
});

async function startBot() {
  const botInfo = await bot.telegram.getMe();

  console.log("");
  console.log(
    `Telegram bilan aloqa o‘rnatildi: @${botInfo.username}`,
  );

  await bot.telegram.setMyCommands([
    {
      command: "start",
      description: "Liga Arena menyusi",
    },
    {
      command: "status",
      description: "Tizim holati",
    },
    {
      command: "myid",
      description: "Telegram ID raqamim",
    },
    {
      command: "rules",
      description: "Liga va o‘yin qoidalari",
    },
    {
      command: "channels",
      description: "Liga Arena rasmiy sahifalari",
    },
    {
      command: "help",
      description: "Yordam",
    },
  ]);

  await bot.launch();

  console.log("Liga Arena Telegram bot ishga tushdi.");
  console.log("");
}

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

startBot().catch((error) => {
  console.error(
    "Botni ishga tushirishda xatolik:",
    error,
  );

  process.exit(1);
});