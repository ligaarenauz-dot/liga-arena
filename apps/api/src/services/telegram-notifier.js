import { access } from "node:fs/promises";
import sharp from "sharp";
import {
  basename,
  dirname,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";

const TELEGRAM_API_BASE = "https://api.telegram.org";

const currentDirectory = dirname(
  fileURLToPath(import.meta.url),
);

const uploadsDirectory = resolve(
  currentDirectory,
  "../../uploads",
);

function cleanText(value) {
  return String(value ?? "").trim();
}

function getBotToken() {
  return cleanText(process.env.BOT_TOKEN);
}

function getAdminTelegramIds() {
  return cleanText(process.env.ADMIN_TELEGRAM_IDS)
    .split(",")
    .map((value) => value.trim())
    .filter((value) => /^\d+$/.test(value));
}

function getAdminPanelUrl() {
  return cleanText(process.env.ADMIN_PANEL_URL);
}

function getMimeType(filePath) {
  const lowerPath = String(filePath).toLowerCase();

  if (lowerPath.endsWith(".png")) {
    return "image/png";
  }

  if (
    lowerPath.endsWith(".jpg") ||
    lowerPath.endsWith(".jpeg")
  ) {
    return "image/jpeg";
  }

  if (lowerPath.endsWith(".webp")) {
    return "image/webp";
  }

  return "application/octet-stream";
}

function getLocalUploadPath(urlPath) {
  const normalizedPath = cleanText(urlPath)
    .replaceAll("\\", "/");

  if (!normalizedPath.startsWith("/uploads/")) {
    return null;
  }

  const relativePath = normalizedPath.slice(
    "/uploads/".length,
  );

  const filePath = resolve(
    uploadsDirectory,
    relativePath,
  );

  const safeRoot = `${uploadsDirectory}${sep}`;

  if (
    filePath !== uploadsDirectory &&
    !filePath.startsWith(safeRoot)
  ) {
    return null;
  }

  return filePath;
}

function resolveTeamLogoSource(logoUrl) {
  const normalizedLogoUrl = cleanText(logoUrl);

  if (!normalizedLogoUrl) {
    return {
      localFilePath: null,
      photoUrl: null,
    };
  }

  if (
    normalizedLogoUrl.startsWith("http://") ||
    normalizedLogoUrl.startsWith("https://")
  ) {
    try {
      const parsedUrl = new URL(normalizedLogoUrl);

      const isLocalAddress = [
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
      ].includes(parsedUrl.hostname);

      if (isLocalAddress) {
        return {
          localFilePath: getLocalUploadPath(
            parsedUrl.pathname,
          ),
          photoUrl: null,
        };
      }
    } catch {
      // Noto‘g‘ri URL bo‘lsa pastdagi fallback ishlaydi.
    }

    return {
      localFilePath: null,
      photoUrl: normalizedLogoUrl,
    };
  }

  return {
    localFilePath: getLocalUploadPath(
      normalizedLogoUrl,
    ),
    photoUrl: null,
  };
}

async function telegramJsonRequest(method, payload) {
  const botToken = getBotToken();

  if (!botToken) {
    return {
      skipped: true,
      reason: "BOT_TOKEN_NOT_CONFIGURED",
    };
  }

  const response = await fetch(
    `${TELEGRAM_API_BASE}/bot${botToken}/${method}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  const result = await response
    .json()
    .catch(() => null);

  if (!response.ok || !result?.ok) {
    throw new Error(
      result?.description ||
        `Telegram API xatosi: ${response.status}`,
    );
  }

  return result.result;
}

async function telegramFormRequest(method, formData) {
  const botToken = getBotToken();

  if (!botToken) {
    return {
      skipped: true,
      reason: "BOT_TOKEN_NOT_CONFIGURED",
    };
  }

  const response = await fetch(
    `${TELEGRAM_API_BASE}/bot${botToken}/${method}`,
    {
      method: "POST",
      body: formData,
    },
  );

  const result = await response
    .json()
    .catch(() => null);

  if (!response.ok || !result?.ok) {
    throw new Error(
      result?.description ||
        `Telegram API xatosi: ${response.status}`,
    );
  }

  return result.result;
}

export async function sendTelegramMessage({
  chatId,
  text,
  replyMarkup,
}) {
  if (!chatId) {
    return {
      skipped: true,
      reason: "CHAT_ID_NOT_PROVIDED",
    };
  }

  return telegramJsonRequest("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...(replyMarkup
      ? {
          reply_markup: replyMarkup,
        }
      : {}),
  });
}

export async function sendTelegramPhoto({
  chatId,
  localFilePath,
  photoUrl,
  caption,
  replyMarkup,
}) {
  if (!chatId) {
    return {
      skipped: true,
      reason: "CHAT_ID_NOT_PROVIDED",
    };
  }

  if (localFilePath) {
    await access(localFilePath);

    /*
     * Telegram turli logo formatlarini har doim ham
     * sendPhoto orqali qabul qilmaydi.
     *
     * Shu sabab barcha logolar yuborilishidan oldin
     * standart PNG formatiga aylantiriladi.
     */
    const photoBuffer = await sharp(localFilePath)
      .rotate()
      .resize({
        width: 1280,
        height: 1280,
        fit: "inside",
        withoutEnlargement: true,
      })
      .png({
        compressionLevel: 9,
      })
      .toBuffer();

    const photoBlob = new Blob(
      [photoBuffer],
      {
        type: "image/png",
      },
    );

    const originalName = basename(localFilePath)
      .replace(/\.[^.]+$/, "");

    const telegramFileName =
      `${originalName || "team-logo"}.png`;

    const formData = new FormData();

    formData.append("chat_id", String(chatId));
    formData.append("caption", caption);

    formData.append(
      "photo",
      photoBlob,
      telegramFileName,
    );

    if (replyMarkup) {
      formData.append(
        "reply_markup",
        JSON.stringify(replyMarkup),
      );
    }

    return telegramFormRequest(
      "sendPhoto",
      formData,
    );
  }

  if (photoUrl) {
    return telegramJsonRequest("sendPhoto", {
      chat_id: chatId,
      photo: photoUrl,
      caption,
      ...(replyMarkup
        ? {
            reply_markup: replyMarkup,
          }
        : {}),
    });
  }

  return {
    skipped: true,
    reason: "PHOTO_NOT_PROVIDED",
  };
}

export async function notifyAdminsTeamSubmitted(team) {
  const adminIds = getAdminTelegramIds();

  if (adminIds.length === 0) {
    return {
      skipped: true,
      reason: "ADMIN_TELEGRAM_IDS_NOT_CONFIGURED",
    };
  }

  const gameTitle =
    team.game === "PUBG"
      ? "PUBG MOBILE"
      : "MOBILE LEGENDS";

  const counts = team.counts || {};

  const members = Array.isArray(team.members)
    ? team.members
    : [];

  const captain = members.find(
    (member) => member.role === "CAPTAIN",
  );

  const memberRegions = [
    ...new Set(
      members
        .map((member) => member.region)
        .filter(Boolean),
    ),
  ];

  const caption = [
    "🏆 YANGI JAMOA TEKSHIRUVDA",
    "",
    `Jamoa: ${team.name}`,
    `TAG: ${team.tag}`,
    `O‘yin: ${gameTitle}`,
    `Hudud: ${team.region}`,
    `Tarkib: ${counts.total || 0}/${team.limits?.total || 0}`,
    `Tasdiqlar: ${counts.confirmedCount || 0}/${counts.total || 0}`,
    "",
    `Sardor: ${
      captain?.fullName ||
      captain?.firstName ||
      captain?.nickname ||
      "Ko‘rsatilmagan"
    }`,
    `Sardor IGN: ${captain?.nickname || "Ko‘rsatilmagan"}`,
    `Telefon: ${captain?.phone || "Ko‘rsatilmagan"}`,
    `Tug‘ilgan sana: ${captain?.birthDate || "Ko‘rsatilmagan"}`,
    `Hududlar: ${
      memberRegions.length > 0
        ? memberRegions.join(", ")
        : team.region || "Ko‘rsatilmagan"
    }`,
    "",
    `Media roziligi: ${
      team.mediaConsent ? "✅ Berilgan" : "❌ Berilmagan"
    }`,
    `Liga shartlari: ${
      team.rulesConsent ? "✅ Tasdiqlangan" : "❌ Tasdiqlanmagan"
    }`,
    "",
    "Jamoa Liga Arena admin tekshiruviga yuborildi.",
  ].join("\n");

  const adminPanelUrl = getAdminPanelUrl();

  const replyMarkup =
    adminPanelUrl.startsWith("https://")
      ? {
          inline_keyboard: [
            [
              {
                text: "🔎 Jamoani tekshirish",
                url:
                  `${adminPanelUrl}?team=` +
                  encodeURIComponent(team.id),
              },
            ],
          ],
        }
      : undefined;

  const logoSource = resolveTeamLogoSource(
    team.logoUrl,
  );

  const results = [];

  for (const adminId of adminIds) {
    try {
      let telegramResult;
      let messageType = "text";
      let photoError = null;

      if (
        logoSource.localFilePath ||
        logoSource.photoUrl
      ) {
        try {
          telegramResult = await sendTelegramPhoto({
            chatId: adminId,
            localFilePath:
              logoSource.localFilePath,
            photoUrl: logoSource.photoUrl,
            caption,
            replyMarkup,
          });

          messageType = "photo";
        } catch (error) {
          photoError = error.message;

          console.error(
            "[TELEGRAM LOGO ERROR]",
            {
              teamId: team.id,
              teamName: team.name,
              logoUrl: team.logoUrl,
              localFilePath:
                logoSource.localFilePath,
              photoUrl: logoSource.photoUrl,
              error: error.message,
            },
          );
        }
      }

      if (!telegramResult) {
        telegramResult = await sendTelegramMessage({
          chatId: adminId,
          text: [
            caption,
            "",
            logoSource.localFilePath ||
            logoSource.photoUrl
              ? "⚠️ Logo yuborilmadi, lekin ariza qabul qilindi."
              : "⚠️ Jamoaga logo biriktirilmagan.",
          ].join("\n"),
          replyMarkup,
        });
      }

      results.push({
        adminId,
        sent: true,
        messageType,
        photoError,
        result: telegramResult,
      });
    } catch (error) {
      results.push({
        adminId,
        sent: false,
        error: error.message,
      });
    }
  }

  return {
    skipped: false,
    results,
  };
}

export async function notifyCaptainReviewDecision({
  team,
  decision,
  reason = "",
}) {
  const captainTelegramId = cleanText(
    team.captainTelegramId,
  );

  if (!captainTelegramId) {
    return {
      skipped: true,
      reason: "CAPTAIN_TELEGRAM_ID_NOT_FOUND",
    };
  }

  const approved = decision === "APPROVED";

  const text = approved
    ? [
        "✅ JAMOANGIZ TASDIQLANDI",
        "",
        `Jamoa: ${team.name}`,
        `TAG: ${team.tag}`,
        "",
        "Jamoangiz Liga Arena ma’muriyati tomonidan tasdiqlandi.",
        "Liga va mavsum haqidagi keyingi ma’lumotlar bot orqali yuboriladi.",
      ].join("\n")
    : [
        "❌ JAMOA TEKSHIRUVDAN O‘TMADI",
        "",
        `Jamoa: ${team.name}`,
        `TAG: ${team.tag}`,
        "",
        "Rad etish sababi:",
        reason || "Sabab ko‘rsatilmagan.",
        "",
        "Kamchiliklarni tuzatgach jamoani qayta yuborishingiz mumkin.",
      ].join("\n");

  return sendTelegramMessage({
    chatId: captainTelegramId,
    text,
  });
}