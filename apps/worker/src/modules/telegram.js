import {
  confirmMemberInvite,
  getInvitePreview,
  rejectMemberInvite,
} from "./teams.js";

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

function jsonResponse(payload, status = 200) {
  return new Response(
    JSON.stringify(payload, null, 2),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",
      },
    },
  );
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(cleanText(value));
}

function splitCsv(value) {
  return cleanText(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getFrontendUrl(env) {
  const frontendUrl = cleanText(env.FRONTEND_URL);

  if (!frontendUrl.startsWith("https://")) {
    throw new Error(
      "FRONTEND_URL HTTPS manziliga sozlanmagan.",
    );
  }

  return frontendUrl;
}

function getMandatoryChannels(env) {
  const ids = splitCsv(env.MANDATORY_CHANNEL_IDS);
  const urls = splitCsv(env.MANDATORY_CHANNEL_URLS);
  const titles = splitCsv(env.MANDATORY_CHANNEL_TITLES);

  return ids.map((id, index) => {
    const derivedUrl = id.startsWith("@")
      ? `https://t.me/${id.slice(1)}`
      : "";

    return {
      id,
      url: isHttpUrl(urls[index])
        ? urls[index]
        : derivedUrl,
      title:
        titles[index] ||
        (id.startsWith("@")
          ? id
          : `Kanal ${index + 1}`),
    };
  });
}

function getSocialLinks(env) {
  const links = [
    {
      key: "YOUTUBE",
      icon: "▶️",
      title: "YouTube",
      url: cleanText(env.YOUTUBE_URL),
    },
    {
      key: "INSTAGRAM",
      icon: "📷",
      title: "Instagram",
      url: cleanText(env.INSTAGRAM_URL),
    },
    {
      key: "TWITCH",
      icon: "🟣",
      title: "Twitch",
      url: cleanText(env.TWITCH_URL),
    },
  ];

  return links.filter((item) => isHttpUrl(item.url));
}

function getSocialPolicyKey(env) {
  return getSocialLinks(env)
    .map((item) => `${item.key}:${item.url}`)
    .join("|");
}

async function requireSocialDatabase(env) {
  if (
    !env?.DB ||
    typeof env.DB.prepare !== "function"
  ) {
    throw new Error(
      "Ijtimoiy tarmoq tasdig‘i uchun D1 DB binding topilmadi.",
    );
  }

  return env.DB;
}

async function ensureSocialConfirmationTable(env) {
  const database = await requireSocialDatabase(env);

  await database
    .prepare(
      `
        CREATE TABLE IF NOT EXISTS telegram_social_confirmations (
          telegram_user_id TEXT PRIMARY KEY,
          policy_key TEXT NOT NULL,
          confirmed_at TEXT NOT NULL
        )
      `,
    )
    .run();

  return database;
}

async function hasSocialConfirmation(env, userId) {
  const policyKey = getSocialPolicyKey(env);

  if (!policyKey) {
    return true;
  }

  const database =
    await ensureSocialConfirmationTable(env);

  const row =
    await database
      .prepare(
        `
          SELECT
            policy_key AS "policyKey"
          FROM telegram_social_confirmations
          WHERE telegram_user_id = ?
        `,
      )
      .bind(String(userId))
      .first();

  return cleanText(row?.policyKey) === policyKey;
}

async function saveSocialConfirmation(env, userId) {
  const policyKey = getSocialPolicyKey(env);

  if (!policyKey) {
    return;
  }

  const database =
    await ensureSocialConfirmationTable(env);

  await database
    .prepare(
      `
        INSERT INTO telegram_social_confirmations (
          telegram_user_id,
          policy_key,
          confirmed_at
        )
        VALUES (?, ?, ?)
        ON CONFLICT(telegram_user_id)
        DO UPDATE SET
          policy_key = excluded.policy_key,
          confirmed_at = excluded.confirmed_at
      `,
    )
    .bind(
      String(userId),
      policyKey,
      new Date().toISOString(),
    )
    .run();
}

async function telegramRequest(
  env,
  method,
  payload = {},
) {
  const token = cleanText(env.BOT_TOKEN);

  if (!token) {
    throw new Error(
      "BOT_TOKEN Worker secret sifatida sozlanmagan.",
    );
  }

  const response =
    await fetch(
      `https://api.telegram.org/bot${token}/${method}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error(
      `Telegram ${method} noto‘g‘ri javob qaytardi.`,
    );
  }

  if (!response.ok || !result.ok) {
    throw new Error(
      result.description ||
        `Telegram ${method} bajarilmadi.`,
    );
  }

  return result.result;
}

function getStartPayload(text) {
  const parts =
    cleanText(text).split(/\s+/);

  return parts.length > 1
    ? parts.slice(1).join(" ").trim()
    : "";
}

function gameTitle(game) {
  return game === "MLBB"
    ? "Mobile Legends"
    : "PUBG Mobile";
}

function roleTitle(role) {
  if (role === "CAPTAIN") {
    return "Sardor";
  }

  if (role === "RESERVE") {
    return "Zaxira";
  }

  return "Asosiy tarkib";
}

function getMainMenuText(firstName) {
  const safeFirstName =
    cleanText(firstName) || "o‘yinchi";

  return [
    `Salom, ${safeFirstName}!`,
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

function getMainMenuKeyboard(env) {
  const frontendUrl = getFrontendUrl(env);

  return {
    inline_keyboard: [
      [
        {
          text: "🏆 Liga Arenani ochish",
          web_app: {
            url: frontendUrl,
          },
        },
      ],
      [
        {
          text: "🎮 Jamoa ro‘yxatdan o‘tkazish",
          callback_data: "register_team",
        },
      ],
      [
        {
          text: "📊 Ligalar",
          callback_data: "leagues",
        },
        {
          text: "📅 Taqvim",
          callback_data: "schedule",
        },
      ],
      [
        {
          text: "📜 Foydalanuvchi shartlari",
          callback_data: "user_terms",
        },
      ],
      [
        {
          text: "🌐 Rasmiy sahifalar",
          callback_data: "official_links",
        },
      ],
    ],
  };
}

function getWebAppKeyboard(env) {
  const frontendUrl = getFrontendUrl(env);

  return {
    inline_keyboard: [
      [
        {
          text: "🏆 Liga Arenani ochish",
          web_app: {
            url: frontendUrl,
          },
        },
      ],
      [
        {
          text: "🎮 Jamoani ro‘yxatdan o‘tkazish",
          web_app: {
            url: frontendUrl,
          },
        },
      ],
      [
        {
          text: "🌐 Rasmiy sahifalar",
          callback_data: "official_links",
        },
      ],
    ],
  };
}

function getTermsKeyboard() {
  return {
    inline_keyboard: [
      [
        {
          text: "🏆 Liga Arena qoidalari",
          callback_data: "rules_liga",
        },
      ],
      [
        {
          text: "🔫 PUBG Mobile qoidalari",
          callback_data: "rules_pubg",
        },
      ],
      [
        {
          text: "⚔️ Mobile Legends qoidalari",
          callback_data: "rules_mlbb",
        },
      ],
      [
        {
          text: "🔐 Maxfiylik va media",
          callback_data: "rules_privacy",
        },
      ],
      [
        {
          text: "⬅️ Asosiy menyu",
          callback_data: "back_main",
        },
      ],
    ],
  };
}

function getRulePageKeyboard() {
  return {
    inline_keyboard: [
      [
        {
          text: "⬅️ Qoidalar menyusi",
          callback_data: "user_terms",
        },
      ],
      [
        {
          text: "🏠 Asosiy menyu",
          callback_data: "back_main",
        },
      ],
    ],
  };
}

function getOfficialLinksKeyboard(env) {
  const buttons = [];

  for (const channel of getMandatoryChannels(env)) {
    if (!isHttpUrl(channel.url)) {
      continue;
    }

    buttons.push([
      {
        text: `📢 ${channel.title}`,
        url: channel.url,
      },
    ]);
  }

  for (const social of getSocialLinks(env)) {
    buttons.push([
      {
        text: `${social.icon} ${social.title}`,
        url: social.url,
      },
    ]);
  }

  buttons.push([
    {
      text: "⬅️ Asosiy menyu",
      callback_data: "back_main",
    },
  ]);

  return {
    inline_keyboard: buttons,
  };
}

function getAccessKeyboard(env, resume) {
  const buttons = [];

  for (const channel of getMandatoryChannels(env)) {
    if (!isHttpUrl(channel.url)) {
      continue;
    }

    buttons.push([
      {
        text: `📢 ${channel.title}`,
        url: channel.url,
      },
    ]);
  }

  for (const social of getSocialLinks(env)) {
    buttons.push([
      {
        text: `${social.icon} ${social.title} sahifasiga o‘tish`,
        url: social.url,
      },
    ]);
  }

  buttons.push([
    {
      text: "✅ Barchasiga obuna bo‘ldim",
      callback_data: `confirm_access_${resume}`,
    },
  ]);

  buttons.push([
    {
      text: "📜 Foydalanuvchi shartlari",
      callback_data: "user_terms",
    },
    {
      text: "🌐 Rasmiy sahifalar",
      callback_data: "official_links",
    },
  ]);

  return {
    inline_keyboard: buttons,
  };
}

async function sendMessage(
  env,
  chatId,
  text,
  replyMarkup,
) {
  const payload = {
    chat_id: chatId,
    text,
  };

  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  return telegramRequest(
    env,
    "sendMessage",
    payload,
  );
}

async function answerCallbackQuery(
  env,
  callbackQueryId,
  text = "",
  showAlert = false,
) {
  const payload = {
    callback_query_id: callbackQueryId,
    show_alert: showAlert,
  };

  if (text) {
    payload.text = text;
  }

  return telegramRequest(
    env,
    "answerCallbackQuery",
    payload,
  );
}

async function editCallbackMessage(
  env,
  callbackQuery,
  text,
  replyMarkup,
) {
  const message = callbackQuery.message;

  if (!message?.chat?.id) {
    return;
  }

  const payload = {
    chat_id: message.chat.id,
    message_id: message.message_id,
    text,
  };

  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  return telegramRequest(
    env,
    "editMessageText",
    payload,
  );
}

async function editOrSend(
  env,
  callbackQuery,
  text,
  replyMarkup,
) {
  try {
    await editCallbackMessage(
      env,
      callbackQuery,
      text,
      replyMarkup,
    );
  } catch (error) {
    const message =
      cleanText(error?.message);

    if (
      message.toLowerCase().includes(
        "message is not modified",
      )
    ) {
      return;
    }

    await sendMessage(
      env,
      callbackQuery.message.chat.id,
      text,
      replyMarkup,
    );
  }
}

function isSubscribedMember(member) {
  const status = cleanText(member?.status);

  return [
    "creator",
    "administrator",
    "member",
  ].includes(status) ||
    (
      status === "restricted" &&
      member?.is_member !== false
    );
}

async function getTelegramSubscriptionState(
  env,
  userId,
) {
  const channels = getMandatoryChannels(env);

  if (channels.length === 0) {
    return {
      required: false,
      subscribed: true,
      channels: [],
      missingChannels: [],
      checkErrors: [],
    };
  }

  const results =
    await Promise.all(
      channels.map(async (channel) => {
        try {
          const member =
            await telegramRequest(
              env,
              "getChatMember",
              {
                chat_id: channel.id,
                user_id: userId,
              },
            );

          return {
            ...channel,
            status:
              cleanText(member?.status) ||
              "unknown",
            subscribed:
              isSubscribedMember(member),
            error: "",
          };
        } catch (error) {
          return {
            ...channel,
            status: "CHECK_ERROR",
            subscribed: false,
            error:
              error instanceof Error
                ? error.message
                : "A’zolik tekshiruvida xato",
          };
        }
      }),
    );

  return {
    required: true,
    subscribed:
      results.every(
        (channel) => channel.subscribed,
      ),
    channels: results,
    missingChannels:
      results.filter(
        (channel) =>
          !channel.subscribed &&
          !channel.error,
      ),
    checkErrors:
      results.filter(
        (channel) =>
          Boolean(channel.error),
      ),
  };
}

async function getAccessState(env, userId) {
  const telegramState =
    await getTelegramSubscriptionState(
      env,
      userId,
    );

  const socialLinks = getSocialLinks(env);
  let socialConfirmed =
    socialLinks.length === 0;
  let socialError = "";

  if (socialLinks.length > 0) {
    try {
      socialConfirmed =
        await hasSocialConfirmation(
          env,
          userId,
        );
    } catch (error) {
      socialConfirmed = false;
      socialError =
        error instanceof Error
          ? error.message
          : "Ijtimoiy tarmoq tasdig‘ini tekshirib bo‘lmadi.";
    }
  }

  return {
    ...telegramState,
    socialLinks,
    socialConfirmed,
    socialError,
    allowed:
      telegramState.subscribed &&
      socialConfirmed &&
      !socialError,
  };
}

function buildAccessText(state) {
  const lines = [
    "🔐 LIGA ARENA KIRISH NAZORATI",
    "",
    "Liga Arena xizmatlaridan foydalanish uchun rasmiy sahifalarga obuna bo‘lish talab qilinadi.",
    "",
    "TELEGRAM",
  ];

  if (state.channels.length === 0) {
    lines.push("⚠️ Majburiy Telegram kanal sozlanmagan.");
  } else {
    state.channels.forEach((channel, index) => {
      const marker = channel.subscribed
        ? "✅"
        : channel.error
          ? "⚠️"
          : "❌";

      lines.push(
        `${index + 1}. ${marker} ${channel.title}`,
      );
    });
  }

  if (state.socialLinks.length > 0) {
    lines.push("", "IJTIMOIY TARMOQLAR");

    state.socialLinks.forEach(
      (social, index) => {
        lines.push(
          `${index + 1}. ${
            state.socialConfirmed
              ? "✅"
              : "⏳"
          } ${social.title}`,
        );
      },
    );
  }

  lines.push(
    "",
    "1. Telegram kanal tugmasini bosib kanalga a’zo bo‘ling.",
    "2. YouTube, Instagram va mavjud boshqa rasmiy sahifa tugmalarini ochib obuna bo‘ling.",
    "3. Botga qaytib «Barchasiga obuna bo‘ldim» tugmasini bosing.",
    "",
    "Telegram a’zoligi avtomatik tekshiriladi. YouTube va Instagram uchun tugmani bosishingiz obuna bo‘lganingiz haqidagi tasdiq sifatida saqlanadi.",
  );

  if (state.checkErrors.length > 0) {
    lines.push(
      "",
      "⚠️ Telegram a’zoligini tekshirishda texnik xato yuz berdi.",
      "Bot barcha majburiy kanallarda administrator ekanini tekshiring.",
    );
  }

  if (state.socialError) {
    lines.push(
      "",
      "⚠️ Ijtimoiy tarmoq tasdig‘ini saqlash tizimida xato bor.",
    );
  }

  return lines.join("\n");
}

async function sendAccessGate(
  env,
  message,
  state,
  resume,
) {
  await sendMessage(
    env,
    message.chat.id,
    buildAccessText(state),
    getAccessKeyboard(env, resume),
  );
}

async function editAccessGate(
  env,
  callbackQuery,
  state,
  resume,
) {
  await editOrSend(
    env,
    callbackQuery,
    buildAccessText(state),
    getAccessKeyboard(env, resume),
  );
}

async function requireMessageAccess(
  env,
  message,
  resume,
) {
  const state =
    await getAccessState(
      env,
      message.from.id,
    );

  if (state.allowed) {
    return true;
  }

  await sendAccessGate(
    env,
    message,
    state,
    resume,
  );

  return false;
}

async function requireCallbackAccess(
  env,
  callbackQuery,
  resume,
) {
  const state =
    await getAccessState(
      env,
      callbackQuery.from.id,
    );

  if (state.allowed) {
    return true;
  }

  await answerCallbackQuery(
    env,
    callbackQuery.id,
    "Avval rasmiy sahifalarga obuna bo‘ling.",
    true,
  );

  await editAccessGate(
    env,
    callbackQuery,
    state,
    resume,
  );

  return false;
}

async function sendMainMenu(env, message) {
  await sendMessage(
    env,
    message.chat.id,
    getMainMenuText(
      message.from?.first_name,
    ),
    getMainMenuKeyboard(env),
  );
}

async function editMainMenu(
  env,
  callbackQuery,
) {
  await editOrSend(
    env,
    callbackQuery,
    getMainMenuText(
      callbackQuery.from?.first_name,
    ),
    getMainMenuKeyboard(env),
  );
}

async function showUserTerms(
  env,
  chatId,
  callbackQuery,
) {
  const text = [
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
  ].join("\n");

  if (callbackQuery) {
    await editOrSend(
      env,
      callbackQuery,
      text,
      getTermsKeyboard(),
    );
    return;
  }

  await sendMessage(
    env,
    chatId,
    text,
    getTermsKeyboard(),
  );
}

async function showRulePage(
  env,
  callbackQuery,
  ruleText,
) {
  await editOrSend(
    env,
    callbackQuery,
    ruleText,
    getRulePageKeyboard(),
  );
}

async function showOfficialLinks(
  env,
  chatId,
  callbackQuery,
) {
  const configuredLinks = [
    ...getMandatoryChannels(env)
      .map((channel) => channel.url),
    ...getSocialLinks(env)
      .map((social) => social.url),
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

  const text = lines.join("\n");
  const keyboard =
    getOfficialLinksKeyboard(env);

  if (callbackQuery) {
    await editOrSend(
      env,
      callbackQuery,
      text,
      keyboard,
    );
    return;
  }

  await sendMessage(
    env,
    chatId,
    text,
    keyboard,
  );
}

async function showRegisterTeam(
  env,
  callbackQuery,
) {
  await editOrSend(
    env,
    callbackQuery,
    [
      "🎮 JAMOANI RO‘YXATDAN O‘TKAZISH",
      "",
      "Jamoani Liga Arena Mini App orqali ro‘yxatdan o‘tkazing.",
    ].join("\n"),
    {
      inline_keyboard: [
        [
          {
            text: "🏆 Mini App’ni ochish",
            web_app: {
              url: getFrontendUrl(env),
            },
          },
        ],
        [
          {
            text: "⬅️ Asosiy menyu",
            callback_data: "back_main",
          },
        ],
      ],
    },
  );
}

async function showLeagues(
  env,
  callbackQuery,
) {
  await editOrSend(
    env,
    callbackQuery,
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
    {
      inline_keyboard: [
        [
          {
            text: "⬅️ Asosiy menyu",
            callback_data: "back_main",
          },
        ],
      ],
    },
  );
}

async function showSchedule(
  env,
  callbackQuery,
) {
  await editOrSend(
    env,
    callbackQuery,
    "📅 Mavsum taqvimi tasdiqlangach shu bo‘limda ko‘rsatiladi.",
    {
      inline_keyboard: [
        [
          {
            text: "⬅️ Asosiy menyu",
            callback_data: "back_main",
          },
        ],
      ],
    },
  );
}

async function showInvite(
  env,
  message,
  token,
) {
  const invite =
    await getInvitePreview(
      env,
      token,
    );

  if (invite.status === "CONFIRMED") {
    await sendMessage(
      env,
      message.chat.id,
      "✅ Bu taklif allaqachon tasdiqlangan.",
    );
    return;
  }

  if (invite.status === "REJECTED") {
    await sendMessage(
      env,
      message.chat.id,
      "❌ Bu taklif avval rad etilgan.",
    );
    return;
  }

  if (invite.status === "EXPIRED") {
    await sendMessage(
      env,
      message.chat.id,
      "⌛ Bu taklif havolasining muddati tugagan.",
    );
    return;
  }

  await sendMessage(
    env,
    message.chat.id,
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
    {
      inline_keyboard: [
        [
          {
            text: "✅ Jamoaga qo‘shilish",
            callback_data:
              `invite_accept_${token}`,
          },
        ],
        [
          {
            text: "❌ Taklifni rad etish",
            callback_data:
              `invite_reject_${token}`,
          },
        ],
      ],
    },
  );
}

async function handleMessage(
  env,
  message,
) {
  const text = cleanText(message.text);
  const command =
    text
      .split(/\s+/)[0]
      .split("@")[0]
      .toLowerCase();

  if (command === "/rules") {
    await showUserTerms(
      env,
      message.chat.id,
      null,
    );
    return;
  }

  if (command === "/channels") {
    await showOfficialLinks(
      env,
      message.chat.id,
      null,
    );
    return;
  }

  if (command === "/myid") {
    await sendMessage(
      env,
      message.chat.id,
      [
        "🆔 TELEGRAM ID",
        "",
        `Sizning Telegram ID raqamingiz: ${message.from.id}`,
        "",
        "Bu raqam Liga Arena admin sozlamalari uchun ishlatiladi.",
      ].join("\n"),
    );
    return;
  }

  if (command === "/help") {
    await sendMessage(
      env,
      message.chat.id,
      [
        "Liga Arena yordam markazi",
        "",
        "/start — asosiy menyu",
        "/rules — foydalanuvchi va o‘yin qoidalari",
        "/channels — Liga Arena rasmiy sahifalari",
        "/status — tizim holati",
        "/myid — Telegram ID raqamim",
        "/help — yordam",
      ].join("\n"),
    );
    return;
  }

  if (command === "/status") {
    await sendMessage(
      env,
      message.chat.id,
      [
        "✅ Liga Arena tizimi ishlamoqda",
        "",
        "Frontend: faol",
        "API: faol",
        "Database: ulangan",
        "Telegram webhook: faol",
      ].join("\n"),
      getOfficialLinksKeyboard(env),
    );
    return;
  }

  if (command === "/start") {
    const payload = getStartPayload(text);
    const resume =
      payload.startsWith("join_")
        ? payload
        : "main";

    const allowed =
      await requireMessageAccess(
        env,
        message,
        resume,
      );

    if (!allowed) {
      return;
    }

    if (payload.startsWith("join_")) {
      await showInvite(
        env,
        message,
        payload.slice("join_".length),
      );
      return;
    }

    await sendMainMenu(env, message);
    return;
  }

  const allowed =
    await requireMessageAccess(
      env,
      message,
      "main",
    );

  if (!allowed) {
    return;
  }

  await sendMainMenu(env, message);
}

async function handleAccessConfirmation(
  env,
  callbackQuery,
  data,
) {
  const resume =
    data.slice("confirm_access_".length) ||
    "main";

  const telegramState =
    await getTelegramSubscriptionState(
      env,
      callbackQuery.from.id,
    );

  if (!telegramState.subscribed) {
    const state =
      await getAccessState(
        env,
        callbackQuery.from.id,
      );

    await answerCallbackQuery(
      env,
      callbackQuery.id,
      state.checkErrors.length > 0
        ? "Telegram tekshiruvida texnik xato bor."
        : "Telegram kanal a’zoligi hali tasdiqlanmadi.",
      true,
    );

    await editAccessGate(
      env,
      callbackQuery,
      state,
      resume,
    );
    return;
  }

  try {
    await saveSocialConfirmation(
      env,
      callbackQuery.from.id,
    );
  } catch (error) {
    await answerCallbackQuery(
      env,
      callbackQuery.id,
      "Ijtimoiy tarmoq tasdig‘ini saqlab bo‘lmadi.",
      true,
    );

    const state =
      await getAccessState(
        env,
        callbackQuery.from.id,
      );

    await editAccessGate(
      env,
      callbackQuery,
      state,
      resume,
    );
    return;
  }

  await answerCallbackQuery(
    env,
    callbackQuery.id,
    "Obunalar tasdiqlandi ✅",
  );

  if (resume.startsWith("join_")) {
    await editOrSend(
      env,
      callbackQuery,
      [
        "✅ OBUNALAR TASDIQLANDI",
        "",
        "Jamoa taklifi ochilmoqda.",
      ].join("\n"),
    );

    await showInvite(
      env,
      callbackQuery.message,
      resume.slice("join_".length),
    );
    return;
  }

  await editMainMenu(
    env,
    callbackQuery,
  );
}

async function handleCallbackQuery(
  env,
  callbackQuery,
) {
  const data =
    cleanText(callbackQuery.data);

  if (
    data.startsWith(
      "confirm_access_",
    )
  ) {
    await handleAccessConfirmation(
      env,
      callbackQuery,
      data,
    );
    return;
  }

  if (data === "user_terms") {
    await answerCallbackQuery(
      env,
      callbackQuery.id,
    );
    await showUserTerms(
      env,
      callbackQuery.message.chat.id,
      callbackQuery,
    );
    return;
  }

  if (data === "rules_liga") {
    await answerCallbackQuery(
      env,
      callbackQuery.id,
    );
    await showRulePage(
      env,
      callbackQuery,
      RULE_TEXTS.liga,
    );
    return;
  }

  if (data === "rules_pubg") {
    await answerCallbackQuery(
      env,
      callbackQuery.id,
    );
    await showRulePage(
      env,
      callbackQuery,
      RULE_TEXTS.pubg,
    );
    return;
  }

  if (data === "rules_mlbb") {
    await answerCallbackQuery(
      env,
      callbackQuery.id,
    );
    await showRulePage(
      env,
      callbackQuery,
      RULE_TEXTS.mlbb,
    );
    return;
  }

  if (data === "rules_privacy") {
    await answerCallbackQuery(
      env,
      callbackQuery.id,
    );
    await showRulePage(
      env,
      callbackQuery,
      RULE_TEXTS.privacy,
    );
    return;
  }

  if (data === "official_links") {
    await answerCallbackQuery(
      env,
      callbackQuery.id,
    );
    await showOfficialLinks(
      env,
      callbackQuery.message.chat.id,
      callbackQuery,
    );
    return;
  }

  if (data === "back_main") {
    const allowed =
      await requireCallbackAccess(
        env,
        callbackQuery,
        "main",
      );

    if (!allowed) {
      return;
    }

    await answerCallbackQuery(
      env,
      callbackQuery.id,
    );
    await editMainMenu(
      env,
      callbackQuery,
    );
    return;
  }

  if (
    [
      "register_team",
      "leagues",
      "schedule",
    ].includes(data)
  ) {
    const allowed =
      await requireCallbackAccess(
        env,
        callbackQuery,
        "main",
      );

    if (!allowed) {
      return;
    }

    await answerCallbackQuery(
      env,
      callbackQuery.id,
    );

    if (data === "register_team") {
      await showRegisterTeam(
        env,
        callbackQuery,
      );
      return;
    }

    if (data === "leagues") {
      await showLeagues(
        env,
        callbackQuery,
      );
      return;
    }

    await showSchedule(
      env,
      callbackQuery,
    );
    return;
  }

  if (
    data.startsWith(
      "invite_accept_",
    )
  ) {
    const token =
      data.slice(
        "invite_accept_".length,
      );

    const allowed =
      await requireCallbackAccess(
        env,
        callbackQuery,
        `join_${token}`,
      );

    if (!allowed) {
      return;
    }

    await answerCallbackQuery(
      env,
      callbackQuery.id,
      "Tasdiqlanmoqda...",
    );

    const result =
      await confirmMemberInvite(
        env,
        token,
        {
          telegramId:
            String(callbackQuery.from.id),
          firstName:
            cleanText(
              callbackQuery.from.first_name,
            ),
          username:
            cleanText(
              callbackQuery.from.username,
            ),
        },
      );

    await editOrSend(
      env,
      callbackQuery,
      [
        "✅ JAMOAGA QO‘SHILISH TASDIQLANDI",
        "",
        result.message ||
          "Siz jamoaga muvaffaqiyatli qo‘shildingiz.",
      ].join("\n"),
      getWebAppKeyboard(env),
    );
    return;
  }

  if (
    data.startsWith(
      "invite_reject_",
    )
  ) {
    const token =
      data.slice(
        "invite_reject_".length,
      );

    const allowed =
      await requireCallbackAccess(
        env,
        callbackQuery,
        `join_${token}`,
      );

    if (!allowed) {
      return;
    }

    await answerCallbackQuery(
      env,
      callbackQuery.id,
      "Taklif rad etilmoqda...",
    );

    const result =
      await rejectMemberInvite(
        env,
        token,
      );

    await editOrSend(
      env,
      callbackQuery,
      [
        "❌ JAMOA TAKLIFI RAD ETILDI",
        "",
        result.message ||
          "Taklif rad etildi.",
      ].join("\n"),
    );
    return;
  }

  await answerCallbackQuery(
    env,
    callbackQuery.id,
  );
}

export async function getTelegramChannelStatus(
  env,
) {
  const channels =
    getMandatoryChannels(env);
  const socialLinks =
    getSocialLinks(env);

  if (channels.length === 0) {
    return {
      configured: false,
      ready: false,
      message:
        "Majburiy Telegram kanal sozlanmagan.",
      channels: [],
      socialLinks,
    };
  }

  let bot;

  try {
    bot =
      await telegramRequest(
        env,
        "getMe",
      );
  } catch (error) {
    return {
      configured: true,
      ready: false,
      message:
        error instanceof Error
          ? error.message
          : "Telegram bot ma’lumoti olinmadi.",
      channels: [],
      socialLinks,
    };
  }

  const channelResults =
    await Promise.all(
      channels.map(async (channel) => {
        try {
          const [chat, member] =
            await Promise.all([
              telegramRequest(
                env,
                "getChat",
                {
                  chat_id: channel.id,
                },
              ),
              telegramRequest(
                env,
                "getChatMember",
                {
                  chat_id: channel.id,
                  user_id: bot.id,
                },
              ),
            ]);

          const botStatus =
            cleanText(member?.status);
          const botIsAdmin =
            [
              "creator",
              "administrator",
            ].includes(botStatus);

          return {
            ...channel,
            chatTitle:
              cleanText(chat?.title),
            chatType:
              cleanText(chat?.type),
            botStatus,
            botIsAdmin,
            ready: botIsAdmin,
            error: "",
          };
        } catch (error) {
          return {
            ...channel,
            chatTitle: "",
            chatType: "",
            botStatus: "CHECK_ERROR",
            botIsAdmin: false,
            ready: false,
            error:
              error instanceof Error
                ? error.message
                : "Kanal tekshiruvida xato",
          };
        }
      }),
    );

  return {
    configured: true,
    ready:
      channelResults.every(
        (channel) => channel.ready,
      ),
    bot: {
      id: bot.id,
      username: bot.username,
      firstName: bot.first_name,
    },
    channels: channelResults,
    socialLinks,
  };
}

export async function handleTelegramWebhook(
  request,
  env,
) {
  const expectedSecret =
    cleanText(
      env.TELEGRAM_WEBHOOK_SECRET,
    );
  const receivedSecret =
    cleanText(
      request.headers.get(
        "X-Telegram-Bot-Api-Secret-Token",
      ),
    );

  if (
    !expectedSecret ||
    receivedSecret !== expectedSecret
  ) {
    return jsonResponse(
      {
        ok: false,
        error:
          "INVALID_TELEGRAM_WEBHOOK_SECRET",
      },
      403,
    );
  }

  let update;

  try {
    update = await request.json();
  } catch {
    return jsonResponse(
      {
        ok: false,
        error:
          "INVALID_TELEGRAM_UPDATE",
      },
      400,
    );
  }

  try {
    if (update.callback_query) {
      await handleCallbackQuery(
        env,
        update.callback_query,
      );
    } else if (
      update.message?.chat?.id
    ) {
      await handleMessage(
        env,
        update.message,
      );
    }
  } catch (error) {
    console.error(
      "Telegram webhook xatosi:",
      error,
    );

    const chatId =
      update.message?.chat?.id ||
      update.callback_query
        ?.message?.chat?.id;

    if (chatId) {
      try {
        await sendMessage(
          env,
          chatId,
          [
            "⚠️ Liga Arena botida texnik xato yuz berdi.",
            "",
            "Birozdan keyin qayta urinib ko‘ring.",
          ].join("\n"),
        );
      } catch (notificationError) {
        console.error(
          "Telegram xato xabari yuborilmadi:",
          notificationError,
        );
      }
    }
  }

  return jsonResponse({
    ok: true,
  });
}
