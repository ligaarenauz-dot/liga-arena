import {
  db,
} from "@liga-arena/database";

import {
  TeamServiceError,
} from "../modules/teams/team.service.js";

function cleanText(value) {
  return String(
    value ?? "",
  ).trim();
}

function escapeHtml(value) {
  return cleanText(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function getBotToken() {
  return (
    cleanText(
      process.env.TELEGRAM_BOT_TOKEN,
    ) ||
    cleanText(
      process.env.BOT_TOKEN,
    ) ||
    cleanText(
      process.env.TELEGRAM_TOKEN,
    )
  );
}

function delay(milliseconds) {
  return new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        milliseconds,
      ),
  );
}

async function sendTelegramMessage({
  chatId,
  text,
}) {
  const token =
    getBotToken();

  if (!token) {
    throw new TeamServiceError(
      "API serverda Telegram bot token topilmadi.",
      503,
      "TELEGRAM_BOT_TOKEN_MISSING",
    );
  }

  const response =
    await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",

        headers: {
          "content-type":
            "application/json",
        },

        body:
          JSON.stringify({
            chat_id:
              chatId,

            text,

            parse_mode:
              "HTML",

            disable_web_page_preview:
              true,
          }),
      },
    );

  const result =
    await response.json();

  if (
    !response.ok ||
    !result?.ok
  ) {
    throw new Error(
      result?.description ||
      `Telegram HTTP ${response.status}`,
    );
  }

  return result.result;
}

function getExistingNotification(
  game,
  roundId,
  teamId,
) {
  return db
    .prepare(`
      SELECT
        id,
        status,
        attempt_count
          AS attemptCount

      FROM round_notifications

      WHERE
        game = ?
        AND round_id = ?
        AND team_id = ?
    `)
    .get(
      game,
      roundId,
      teamId,
    ) || null;
}

function saveNotificationLog({
  game,
  roundId,
  teamId,
  telegramId,
  notificationType,
  status,
  telegramMessageId = "",
  errorText = "",
}) {
  const now =
    new Date().toISOString();

  db.prepare(`
    INSERT INTO round_notifications (
      game,
      round_id,
      team_id,
      telegram_id,
      notification_type,
      status,
      telegram_message_id,
      error_text,
      attempt_count,
      sent_at,
      updated_at
    )

    VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      1,
      ?,
      ?
    )

    ON CONFLICT(
      game,
      round_id,
      team_id
    )

    DO UPDATE SET
      telegram_id =
        excluded.telegram_id,

      notification_type =
        excluded.notification_type,

      status =
        excluded.status,

      telegram_message_id =
        excluded.telegram_message_id,

      error_text =
        excluded.error_text,

      attempt_count =
        round_notifications.attempt_count + 1,

      sent_at =
        excluded.sent_at,

      updated_at =
        excluded.updated_at
  `).run(
    game,
    roundId,
    teamId,
    cleanText(telegramId),
    notificationType,
    status,
    cleanText(
      telegramMessageId,
    ),
    cleanText(errorText),
    now,
    now,
  );
}

async function deliverNotifications(
  game,
  roundId,
  notifications,
) {
  const summary = {
    total:
      notifications.length,

    sent: 0,
    skipped: 0,
    failed: 0,

    failures: [],
  };

  for (
    const notification of
    notifications
  ) {
    const existing =
      getExistingNotification(
        game,
        roundId,
        notification.teamId,
      );

    if (
      existing?.status ===
      "SENT"
    ) {
      summary.skipped += 1;
      continue;
    }

    const telegramId =
      cleanText(
        notification.telegramId,
      );

    if (!telegramId) {
      saveNotificationLog({
        game,
        roundId,

        teamId:
          notification.teamId,

        telegramId: "",

        notificationType:
          notification.type,

        status:
          "SKIPPED",

        errorText:
          "Captain Telegram ID mavjud emas.",
      });

      summary.skipped += 1;

      continue;
    }

    try {
      const result =
        await sendTelegramMessage({
          chatId:
            telegramId,

          text:
            notification.text,
        });

      saveNotificationLog({
        game,
        roundId,

        teamId:
          notification.teamId,

        telegramId,

        notificationType:
          notification.type,

        status:
          "SENT",

        telegramMessageId:
          result?.message_id,
      });

      summary.sent += 1;
    } catch (error) {
      const message =
        cleanText(
          error?.message,
        ) ||
        "Telegram yuborishda noma’lum xato.";

      saveNotificationLog({
        game,
        roundId,

        teamId:
          notification.teamId,

        telegramId,

        notificationType:
          notification.type,

        status:
          "FAILED",

        errorText:
          message,
      });

      summary.failed += 1;

      summary.failures.push({
        technicalNumber:
          notification.technicalNumber,

        name:
          notification.teamName,

        error:
          message,
      });
    }

    /*
     * Telegram flood-limitga yaqinlashmaslik
     * uchun xabarlar oralig‘ida kichik pauza.
     */
    await delay(80);
  }

  return summary;
}

export async function sendPubgRoundNotifications(
  roundId,
) {
  const round = db
    .prepare(`
      SELECT
        id,
        season,
        game,

        league_tier
          AS leagueTier,

        competition_type
          AS competitionType,

        round_number
          AS roundNumber,

        maps_per_round
          AS mapsPerRound

      FROM competition_rounds

      WHERE id = ?
    `)
    .get(roundId);

  if (!round) {
    throw new TeamServiceError(
      "PUBG turi topilmadi.",
      404,
      "PUBG_NOTIFICATION_ROUND_NOT_FOUND",
    );
  }

  const teams = db
    .prepare(`
      SELECT
        t.id,

        t.technical_number
          AS technicalNumber,

        t.name,

        t.captain_telegram_id
          AS captainTelegramId,

        rt.participation

      FROM competition_round_teams rt

      INNER JOIN teams t
        ON t.id = rt.team_id

      WHERE rt.round_id = ?

      ORDER BY
        t.technical_number ASC
    `)
    .all(roundId);

  const notifications =
    teams.map(
      (team) => {
        const playing =
          team.participation ===
          "PLAY";

        const statusText =
          playing
            ? [
                "✅ <b>Ushbu turda O‘YNAYSIZ</b>",
                "",
                `Format: ${round.mapsPerRound} ta karta`,
                "",
                "Natijalar turnir jadvaliga tur yakunlangach qo‘shiladi.",
              ].join("\n")
            : [
                "💤 <b>Ushbu turda DAM OLASIZ</b>",
                "",
                "Bu tur o‘ynagan turlaringiz soniga qo‘shilmaydi.",
                "Sizga 0 ball yoki 0 kill yozilmaydi.",
              ].join("\n");

        const text = [
          "🏆 <b>LIGA ARENA</b>",
          "",
          `🎮 <b>PUBG MOBILE • ${escapeHtml(
            round.leagueTier,
          )}</b>`,
          `📍 ${round.roundNumber}-TUR`,
          "",
          `<b>${escapeHtml(
            team.technicalNumber,
          )}</b> — ${escapeHtml(
            team.name,
          )}`,
          "",
          statusText,
          "",
          "👑 Toj sovg‘a qilinmaydi.",
        ].join("\n");

        return {
          teamId:
            team.id,

          technicalNumber:
            team.technicalNumber,

          teamName:
            team.name,

          telegramId:
            team.captainTelegramId,

          type:
            playing
              ? "PLAY"
              : "REST",

          text,
        };
      },
    );

  return deliverNotifications(
    "PUBG",
    roundId,
    notifications,
  );
}

export async function sendMlbbRoundNotifications(
  roundId,
) {
  const round = db
    .prepare(`
      SELECT
        id,
        season,

        league_tier
          AS leagueTier,

        round_number
          AS roundNumber,

        best_of
          AS bestOf

      FROM mlbb_rounds

      WHERE id = ?
    `)
    .get(roundId);

  if (!round) {
    throw new TeamServiceError(
      "MLBB turi topilmadi.",
      404,
      "MLBB_NOTIFICATION_ROUND_NOT_FOUND",
    );
  }

  const matches = db
    .prepare(`
      SELECT
        a.id
          AS teamAId,

        a.technical_number
          AS teamATechnicalNumber,

        a.name
          AS teamAName,

        a.captain_telegram_id
          AS teamATelegramId,

        b.id
          AS teamBId,

        b.technical_number
          AS teamBTechnicalNumber,

        b.name
          AS teamBName,

        b.captain_telegram_id
          AS teamBTelegramId

      FROM mlbb_matches m

      INNER JOIN teams a
        ON a.id = m.team_a_id

      INNER JOIN teams b
        ON b.id = m.team_b_id

      WHERE m.round_id = ?

      ORDER BY
        a.technical_number ASC
    `)
    .all(roundId);

  const byeTeam = db
    .prepare(`
      SELECT
        t.id,

        t.technical_number
          AS technicalNumber,

        t.name,

        t.captain_telegram_id
          AS captainTelegramId

      FROM mlbb_round_byes b

      INNER JOIN teams t
        ON t.id = b.team_id

      WHERE b.round_id = ?
    `)
    .get(roundId) || null;

  const notifications = [];

  for (const match of matches) {
    notifications.push({
      teamId:
        match.teamAId,

      technicalNumber:
        match.teamATechnicalNumber,

      teamName:
        match.teamAName,

      telegramId:
        match.teamATelegramId,

      type:
        "MATCH",

      text: [
        "🏆 <b>LIGA ARENA</b>",
        "",
        `⚔️ <b>MOBILE LEGENDS • ${escapeHtml(
          round.leagueTier,
        )}</b>`,
        `📍 ${round.roundNumber}-TUR`,
        "",
        `<b>${escapeHtml(
          match.teamATechnicalNumber,
        )}</b> — ${escapeHtml(
          match.teamAName,
        )}`,
        "",
        "✅ <b>Ushbu turda O‘YNAYSIZ</b>",
        "",
        `⚔️ Raqib: <b>${escapeHtml(
          match.teamBTechnicalNumber,
        )} — ${escapeHtml(
          match.teamBName,
        )}</b>`,
        `🎯 Format: BO${round.bestOf}`,
        "",
        "👑 Toj sovg‘a qilinmaydi.",
      ].join("\n"),
    });

    notifications.push({
      teamId:
        match.teamBId,

      technicalNumber:
        match.teamBTechnicalNumber,

      teamName:
        match.teamBName,

      telegramId:
        match.teamBTelegramId,

      type:
        "MATCH",

      text: [
        "🏆 <b>LIGA ARENA</b>",
        "",
        `⚔️ <b>MOBILE LEGENDS • ${escapeHtml(
          round.leagueTier,
        )}</b>`,
        `📍 ${round.roundNumber}-TUR`,
        "",
        `<b>${escapeHtml(
          match.teamBTechnicalNumber,
        )}</b> — ${escapeHtml(
          match.teamBName,
        )}`,
        "",
        "✅ <b>Ushbu turda O‘YNAYSIZ</b>",
        "",
        `⚔️ Raqib: <b>${escapeHtml(
          match.teamATechnicalNumber,
        )} — ${escapeHtml(
          match.teamAName,
        )}</b>`,
        `🎯 Format: BO${round.bestOf}`,
        "",
        "👑 Toj sovg‘a qilinmaydi.",
      ].join("\n"),
    });
  }

  if (byeTeam) {
    notifications.push({
      teamId:
        byeTeam.id,

      technicalNumber:
        byeTeam.technicalNumber,

      teamName:
        byeTeam.name,

      telegramId:
        byeTeam.captainTelegramId,

      type:
        "REST",

      text: [
        "🏆 <b>LIGA ARENA</b>",
        "",
        `⚔️ <b>MOBILE LEGENDS • ${escapeHtml(
          round.leagueTier,
        )}</b>`,
        `📍 ${round.roundNumber}-TUR`,
        "",
        `<b>${escapeHtml(
          byeTeam.technicalNumber,
        )}</b> — ${escapeHtml(
          byeTeam.name,
        )}`,
        "",
        "💤 <b>Ushbu turda DAM OLASIZ</b>",
        "",
        "Round-robin rotatsiyasi bo‘yicha bu turda uchrashuv yo‘q.",
        "Bu holat mag‘lubiyat sifatida hisoblanmaydi.",
        "",
        "👑 Toj sovg‘a qilinmaydi.",
      ].join("\n"),
    });
  }

  return deliverNotifications(
    "MLBB",
    roundId,
    notifications,
  );
}