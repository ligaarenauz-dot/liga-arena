import {
  ApiError,
  cleanText,
  executeBatch,
  makeStatement,
  queryAll,
  queryFirst,
  requireDatabase,
} from "./tournament-utils.js";

function chunkArray(
  values,
  size,
) {
  const chunks = [];

  for (
    let index = 0;
    index < values.length;
    index += size
  ) {
    chunks.push(
      values.slice(
        index,
        index + size,
      ),
    );
  }

  return chunks;
}

function escapeHtml(value) {
  return cleanText(
    value,
  )
    .replaceAll(
      "&",
      "&amp;",
    )
    .replaceAll(
      "<",
      "&lt;",
    )
    .replaceAll(
      ">",
      "&gt;",
    );
}

async function sendTelegramMessage(
  env,
  {
    chatId,
    text,
  },
) {
  const token =
    cleanText(
      env.BOT_TOKEN,
    );

  if (!token) {
    throw new ApiError(
      "Worker’da Telegram bot token topilmadi.",
      503,
      "TELEGRAM_BOT_TOKEN_MISSING",
    );
  }

  const response =
    await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method:
          "POST",

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
    await response
      .json()
      .catch(
        () => null,
      );

  if (
    !response.ok ||
    !result?.ok
  ) {
    throw new Error(
      result
        ?.description ||
      `Telegram HTTP ${response.status}`,
    );
  }

  return result.result;
}

async function deliverNotifications(
  env,
  game,
  roundId,
  notifications,
) {
  const database =
    requireDatabase(env);

  const existingRows =
    await queryAll(
      database,
      `
        SELECT
          team_id AS teamId,
          status,
          attempt_count AS attemptCount

        FROM round_notifications

        WHERE
          game = ?
          AND round_id = ?
      `,
      [
        game,
        roundId,
      ],
    );

  const existingMap =
    new Map(
      existingRows.map(
        (row) => [
          row.teamId,
          row,
        ],
      ),
    );

  const summary = {
    total:
      notifications.length,

    sent: 0,
    skipped: 0,
    failed: 0,
    failures: [],
  };

  const logs = [];

  for (
    const notification of
    notifications
  ) {
    const existing =
      existingMap.get(
        notification.teamId,
      );

    if (
      existing?.status ===
      "SENT"
    ) {
      summary.skipped +=
        1;

      continue;
    }

    const telegramId =
      cleanText(
        notification.telegramId,
      );

    const baseLog = {
      game,
      roundId,

      teamId:
        notification.teamId,

      telegramId,

      notificationType:
        notification.type,

      telegramMessageId:
        "",

      errorText:
        "",
    };

    if (!telegramId) {
      logs.push({
        ...baseLog,
        status:
          "SKIPPED",

        errorText:
          "Captain Telegram ID mavjud emas.",
      });

      summary.skipped +=
        1;

      continue;
    }

    try {
      const result =
        await sendTelegramMessage(
          env,
          {
            chatId:
              telegramId,

            text:
              notification.text,
          },
        );

      logs.push({
        ...baseLog,
        status:
          "SENT",

        telegramMessageId:
          cleanText(
            result
              ?.message_id,
          ),
      });

      summary.sent +=
        1;
    } catch (error) {
      const message =
        cleanText(
          error?.message,
        ) ||
        "Telegram yuborishda noma’lum xato.";

      logs.push({
        ...baseLog,
        status:
          "FAILED",

        errorText:
          message,
      });

      summary.failed +=
        1;

      summary.failures.push({
        technicalNumber:
          notification
            .technicalNumber,

        name:
          notification.teamName,

        error:
          message,
      });
    }
  }

  const now =
    new Date()
      .toISOString();

  const statements = [];

  for (
    const logChunk of
    chunkArray(
      logs,
      9,
    )
  ) {
    const placeholders =
      logChunk.map(
        () =>
          "(?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)",
      ).join(", ");

    const parameters = [];

    for (
      const log of
      logChunk
    ) {
      parameters.push(
        log.game,
        log.roundId,
        log.teamId,
        log.telegramId,
        log.notificationType,
        log.status,
        log.telegramMessageId,
        log.errorText,
        now,
        now,
      );
    }

    statements.push(
      makeStatement(
        database,
        `
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

          VALUES ${placeholders}

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
        `,
        parameters,
      ),
    );
  }

  await executeBatch(
    database,
    statements,
  );

  return summary;
}

export async function sendPubgRoundNotifications(
  env,
  roundId,
) {
  const database =
    requireDatabase(env);

  const round =
    await queryFirst(
      database,
      `
        SELECT
          id,
          season,
          game,
          league_tier AS leagueTier,
          competition_type AS competitionType,
          round_number AS roundNumber,
          maps_per_round AS mapsPerRound

        FROM competition_rounds

        WHERE id = ?

        LIMIT 1
      `,
      [
        cleanText(
          roundId,
        ),
      ],
    );

  if (!round) {
    throw new ApiError(
      "PUBG turi topilmadi.",
      404,
      "PUBG_NOTIFICATION_ROUND_NOT_FOUND",
    );
  }

  const teams =
    await queryAll(
      database,
      `
        SELECT
          t.id,
          t.technical_number AS technicalNumber,
          t.name,
          t.captain_telegram_id AS captainTelegramId,
          rt.participation

        FROM competition_round_teams rt

        INNER JOIN teams t
          ON t.id = rt.team_id

        WHERE rt.round_id = ?

        ORDER BY
          t.technical_number ASC
      `,
      [
        cleanText(
          roundId,
        ),
      ],
    );

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
                `Format: ${Number(round.mapsPerRound || 4)} ta karta`,
                "",
                "Natijalar turnir jadvaliga tur yakunlangach qo‘shiladi.",
              ].join(
                "\n",
              )
            : [
                "💤 <b>Ushbu turda DAM OLASIZ</b>",
                "",
                "Bu tur o‘ynagan turlaringiz soniga qo‘shilmaydi.",
                "Sizga 0 ball yoki 0 kill yozilmaydi.",
              ].join(
                "\n",
              );

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

          text: [
            "🏆 <b>LIGA ARENA</b>",
            "",
            `🎮 <b>PUBG MOBILE • ${escapeHtml(round.leagueTier)}</b>`,
            `📍 ${Number(round.roundNumber || 0)}-TUR`,
            "",
            `<b>${escapeHtml(team.technicalNumber)}</b> — ${escapeHtml(team.name)}`,
            "",
            statusText,
            "",
            "👑 Toj sovg‘a qilinmaydi.",
          ].join(
            "\n",
          ),
        };
      },
    );

  return deliverNotifications(
    env,
    "PUBG",
    cleanText(
      roundId,
    ),
    notifications,
  );
}

export async function sendMlbbRoundNotifications(
  env,
  roundId,
) {
  const database =
    requireDatabase(env);

  const round =
    await queryFirst(
      database,
      `
        SELECT
          id,
          season,
          league_tier AS leagueTier,
          round_number AS roundNumber,
          best_of AS bestOf

        FROM mlbb_rounds

        WHERE id = ?

        LIMIT 1
      `,
      [
        cleanText(
          roundId,
        ),
      ],
    );

  if (!round) {
    throw new ApiError(
      "MLBB turi topilmadi.",
      404,
      "MLBB_NOTIFICATION_ROUND_NOT_FOUND",
    );
  }

  const [
    matches,
    byeTeam,
  ] =
    await Promise.all([
      queryAll(
        database,
        `
          SELECT
            a.id AS teamAId,
            a.technical_number AS teamATechnicalNumber,
            a.name AS teamAName,
            a.captain_telegram_id AS teamATelegramId,
            b.id AS teamBId,
            b.technical_number AS teamBTechnicalNumber,
            b.name AS teamBName,
            b.captain_telegram_id AS teamBTelegramId

          FROM mlbb_matches m

          INNER JOIN teams a
            ON a.id = m.team_a_id

          INNER JOIN teams b
            ON b.id = m.team_b_id

          WHERE m.round_id = ?

          ORDER BY
            a.technical_number ASC
        `,
        [
          cleanText(
            roundId,
          ),
        ],
      ),

      queryFirst(
        database,
        `
          SELECT
            t.id,
            t.technical_number AS technicalNumber,
            t.name,
            t.captain_telegram_id AS captainTelegramId

          FROM mlbb_round_byes b

          INNER JOIN teams t
            ON t.id = b.team_id

          WHERE b.round_id = ?

          LIMIT 1
        `,
        [
          cleanText(
            roundId,
          ),
        ],
      ),
    ]);

  const notifications = [];

  for (
    const match of
    matches
  ) {
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
        `⚔️ <b>MOBILE LEGENDS • ${escapeHtml(round.leagueTier)}</b>`,
        `📍 ${Number(round.roundNumber || 0)}-TUR`,
        "",
        `<b>${escapeHtml(match.teamATechnicalNumber)}</b> — ${escapeHtml(match.teamAName)}`,
        "",
        "✅ <b>Ushbu turda O‘YNAYSIZ</b>",
        "",
        `⚔️ Raqib: <b>${escapeHtml(match.teamBTechnicalNumber)} — ${escapeHtml(match.teamBName)}</b>`,
        `🎯 Format: BO${Number(round.bestOf || 3)}`,
        "",
        "👑 Toj sovg‘a qilinmaydi.",
      ].join(
        "\n",
      ),
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
        `⚔️ <b>MOBILE LEGENDS • ${escapeHtml(round.leagueTier)}</b>`,
        `📍 ${Number(round.roundNumber || 0)}-TUR`,
        "",
        `<b>${escapeHtml(match.teamBTechnicalNumber)}</b> — ${escapeHtml(match.teamBName)}`,
        "",
        "✅ <b>Ushbu turda O‘YNAYSIZ</b>",
        "",
        `⚔️ Raqib: <b>${escapeHtml(match.teamATechnicalNumber)} — ${escapeHtml(match.teamAName)}</b>`,
        `🎯 Format: BO${Number(round.bestOf || 3)}`,
        "",
        "👑 Toj sovg‘a qilinmaydi.",
      ].join(
        "\n",
      ),
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
        `⚔️ <b>MOBILE LEGENDS • ${escapeHtml(round.leagueTier)}</b>`,
        `📍 ${Number(round.roundNumber || 0)}-TUR`,
        "",
        `<b>${escapeHtml(byeTeam.technicalNumber)}</b> — ${escapeHtml(byeTeam.name)}`,
        "",
        "💤 <b>Ushbu turda DAM OLASIZ</b>",
        "",
        "Round-robin rotatsiyasi bo‘yicha bu turda uchrashuv yo‘q.",
        "Bu holat mag‘lubiyat sifatida hisoblanmaydi.",
        "",
        "👑 Toj sovg‘a qilinmaydi.",
      ].join(
        "\n",
      ),
    });
  }

  return deliverNotifications(
    env,
    "MLBB",
    cleanText(
      roundId,
    ),
    notifications,
  );
}
