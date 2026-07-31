import {
  ApiError,
  DEFAULT_SEASON,
  cleanText,
  execute,
  inputValue,
  normalizeGame,
  normalizeLeagueTier,
  normalizeSeason,
  queryAll,
  queryFirst,
  randomId,
  requireDatabase,
} from "./tournament-utils.js";

const allowedEventTypes =
  new Set([
    "QUALIFIER",
    "LEAGUE",
    "PLAYOFF",
    "FINAL",
    "SHOWMATCH",
  ]);

const allowedStatuses =
  new Set([
    "SCHEDULED",
    "LIVE",
    "FINISHED",
    "POSTPONED",
    "CANCELLED",
  ]);

function normalizeEventType(value) {
  const eventType =
    cleanText(value)
      .toUpperCase();

  if (
    !allowedEventTypes.has(
      eventType,
    )
  ) {
    throw new ApiError(
      "Turnir bosqichi noto‘g‘ri.",
      400,
      "INVALID_EVENT_TYPE",
    );
  }

  return eventType;
}

function normalizeStatus(value) {
  const status =
    cleanText(
      value ||
      "SCHEDULED",
    ).toUpperCase();

  if (
    !allowedStatuses.has(
      status,
    )
  ) {
    throw new ApiError(
      "Tadbir holati noto‘g‘ri.",
      400,
      "INVALID_EVENT_STATUS",
    );
  }

  return status;
}

function validateTitle(value) {
  const title =
    cleanText(value);

  if (
    title.length < 3 ||
    title.length > 100
  ) {
    throw new ApiError(
      "Tadbir nomi 3–100 belgidan iborat bo‘lishi kerak.",
      400,
      "INVALID_EVENT_TITLE",
    );
  }

  return title;
}

function validateLimitedText(
  value,
  maximum,
  fieldName,
) {
  const text =
    cleanText(value);

  if (
    text.length >
    maximum
  ) {
    throw new ApiError(
      `${fieldName} ${maximum} belgidan oshmasligi kerak.`,
      400,
      "EVENT_TEXT_TOO_LONG",
    );
  }

  return text;
}

function validateScheduledAt(value) {
  const scheduledAt =
    cleanText(value);

  const parsedDate =
    new Date(
      scheduledAt,
    );

  if (
    !scheduledAt ||
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    throw new ApiError(
      "Tadbir sanasi va vaqtini to‘g‘ri kiriting.",
      400,
      "INVALID_EVENT_DATE",
    );
  }

  return parsedDate
    .toISOString();
}

function validateStreamUrl(value) {
  const streamUrl =
    cleanText(value);

  if (!streamUrl) {
    return "";
  }

  let parsedUrl;

  try {
    parsedUrl =
      new URL(
        streamUrl,
      );
  } catch {
    throw new ApiError(
      "Translyatsiya havolasi noto‘g‘ri.",
      400,
      "INVALID_STREAM_URL",
    );
  }

  if (
    parsedUrl.protocol !==
      "http:" &&
    parsedUrl.protocol !==
      "https:"
  ) {
    throw new ApiError(
      "Translyatsiya havolasi HTTP yoki HTTPS bo‘lishi kerak.",
      400,
      "INVALID_STREAM_URL",
    );
  }

  return parsedUrl.toString();
}

function normalizePayload(
  payload = {},
) {
  const game =
    normalizeGame(
      inputValue(
        payload,
        "game",
      ),
      "INVALID_SCHEDULE_GAME",
    );

  return {
    season:
      normalizeSeason(
        inputValue(
          payload,
          "season",
          DEFAULT_SEASON,
        ),
      ),

    game,

    leagueTier:
      normalizeLeagueTier(
        game,
        inputValue(
          payload,
          "leagueTier",
          "",
        ),
        {
          allowEmpty: true,
          code:
            "INVALID_EVENT_LEAGUE",
        },
      ),

    eventType:
      normalizeEventType(
        inputValue(
          payload,
          "eventType",
        ),
      ),

    title:
      validateTitle(
        inputValue(
          payload,
          "title",
        ),
      ),

    stage:
      validateLimitedText(
        inputValue(
          payload,
          "stage",
          "",
        ),
        60,
        "Bosqich nomi",
      ),

    scheduledAt:
      validateScheduledAt(
        inputValue(
          payload,
          "scheduledAt",
        ),
      ),

    status:
      normalizeStatus(
        inputValue(
          payload,
          "status",
          "SCHEDULED",
        ),
      ),

    format:
      validateLimitedText(
        inputValue(
          payload,
          "format",
          "",
        ),
        50,
        "Format",
      ),

    streamUrl:
      validateStreamUrl(
        inputValue(
          payload,
          "streamUrl",
          "",
        ),
      ),

    notes:
      validateLimitedText(
        inputValue(
          payload,
          "notes",
          "",
        ),
        500,
        "Izoh",
      ),

    createdBy:
      validateLimitedText(
        inputValue(
          payload,
          "createdBy",
          "Liga Arena Admin",
        ),
        100,
        "Admin ismi",
      ) ||
      "Liga Arena Admin",
  };
}

const scheduleSelect = `
  SELECT
    id,
    season,
    game,
    league_tier AS leagueTier,
    event_type AS eventType,
    title,
    stage,
    scheduled_at AS scheduledAt,
    status,
    format,
    stream_url AS streamUrl,
    notes,
    created_by AS createdBy,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM schedule_events
`;

export async function listScheduleEvents(
  env,
  source = {},
) {
  const database =
    requireDatabase(env);

  const conditions = [
    "season = ?",
  ];

  const parameters = [
    normalizeSeason(
      inputValue(
        source,
        "season",
        DEFAULT_SEASON,
      ),
    ),
  ];

  const gameValue =
    inputValue(
      source,
      "game",
      "",
    );

  let game = "";

  if (cleanText(gameValue)) {
    game =
      normalizeGame(
        gameValue,
        "INVALID_SCHEDULE_GAME",
      );

    conditions.push(
      "game = ?",
    );

    parameters.push(
      game,
    );
  }

  const statusValue =
    inputValue(
      source,
      "status",
      "",
    );

  if (
    cleanText(
      statusValue,
    )
  ) {
    conditions.push(
      "status = ?",
    );

    parameters.push(
      normalizeStatus(
        statusValue,
      ),
    );
  }

  const leagueValue =
    inputValue(
      source,
      "leagueTier",
      "",
    );

  if (
    cleanText(
      leagueValue,
    )
  ) {
    if (!game) {
      throw new ApiError(
        "Liga bo‘yicha filtrlash uchun o‘yin turini ham tanlang.",
        400,
        "EVENT_GAME_REQUIRED",
      );
    }

    conditions.push(
      "league_tier = ?",
    );

    parameters.push(
      normalizeLeagueTier(
        game,
        leagueValue,
        {
          allowEmpty: false,
          code:
            "INVALID_EVENT_LEAGUE",
        },
      ),
    );
  }

  const from =
    inputValue(
      source,
      "from",
      "",
    );

  if (cleanText(from)) {
    conditions.push(
      "scheduled_at >= ?",
    );

    parameters.push(
      validateScheduledAt(
        from,
      ),
    );
  }

  const to =
    inputValue(
      source,
      "to",
      "",
    );

  if (cleanText(to)) {
    conditions.push(
      "scheduled_at <= ?",
    );

    parameters.push(
      validateScheduledAt(
        to,
      ),
    );
  }

  return queryAll(
    database,
    `
      ${scheduleSelect}
      WHERE ${conditions.join(
        " AND ",
      )}
      ORDER BY
        CASE status
          WHEN 'LIVE' THEN 1
          WHEN 'SCHEDULED' THEN 2
          WHEN 'POSTPONED' THEN 3
          WHEN 'FINISHED' THEN 4
          WHEN 'CANCELLED' THEN 5
          ELSE 6
        END,
        scheduled_at ASC
    `,
    parameters,
  );
}

export async function getScheduleEvent(
  env,
  eventId,
) {
  const database =
    requireDatabase(env);

  const event =
    await queryFirst(
      database,
      `
        ${scheduleSelect}
        WHERE id = ?
        LIMIT 1
      `,
      [
        cleanText(
          eventId,
        ),
      ],
    );

  if (!event) {
    throw new ApiError(
      "Jadval tadbiri topilmadi.",
      404,
      "SCHEDULE_EVENT_NOT_FOUND",
    );
  }

  return event;
}

export async function createScheduleEvent(
  env,
  payload = {},
) {
  const database =
    requireDatabase(env);

  const event =
    normalizePayload(
      payload,
    );

  const eventId =
    randomId();

  const now =
    new Date()
      .toISOString();

  await execute(
    database,
    `
      INSERT INTO schedule_events (
        id,
        season,
        game,
        league_tier,
        event_type,
        title,
        stage,
        scheduled_at,
        status,
        format,
        stream_url,
        notes,
        created_by,
        created_at,
        updated_at
      )
      VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `,
    [
      eventId,
      event.season,
      event.game,
      event.leagueTier,
      event.eventType,
      event.title,
      event.stage,
      event.scheduledAt,
      event.status,
      event.format,
      event.streamUrl,
      event.notes,
      event.createdBy,
      now,
      now,
    ],
  );

  return getScheduleEvent(
    env,
    eventId,
  );
}

export async function updateScheduleEvent(
  env,
  eventId,
  payload = {},
) {
  const database =
    requireDatabase(env);

  const existing =
    await queryFirst(
      database,
      `
        SELECT *
        FROM schedule_events
        WHERE id = ?
        LIMIT 1
      `,
      [
        cleanText(
          eventId,
        ),
      ],
    );

  if (!existing) {
    throw new ApiError(
      "Jadval tadbiri topilmadi.",
      404,
      "SCHEDULE_EVENT_NOT_FOUND",
    );
  }

  const event =
    normalizePayload({
      season:
        inputValue(
          payload,
          "season",
          existing.season,
        ),

      game:
        inputValue(
          payload,
          "game",
          existing.game,
        ),

      leagueTier:
        inputValue(
          payload,
          "leagueTier",
          existing.league_tier,
        ),

      eventType:
        inputValue(
          payload,
          "eventType",
          existing.event_type,
        ),

      title:
        inputValue(
          payload,
          "title",
          existing.title,
        ),

      stage:
        inputValue(
          payload,
          "stage",
          existing.stage,
        ),

      scheduledAt:
        inputValue(
          payload,
          "scheduledAt",
          existing.scheduled_at,
        ),

      status:
        inputValue(
          payload,
          "status",
          existing.status,
        ),

      format:
        inputValue(
          payload,
          "format",
          existing.format,
        ),

      streamUrl:
        inputValue(
          payload,
          "streamUrl",
          existing.stream_url,
        ),

      notes:
        inputValue(
          payload,
          "notes",
          existing.notes,
        ),

      createdBy:
        inputValue(
          payload,
          "createdBy",
          existing.created_by,
        ),
    });

  const now =
    new Date()
      .toISOString();

  await execute(
    database,
    `
      UPDATE schedule_events
      SET
        season = ?,
        game = ?,
        league_tier = ?,
        event_type = ?,
        title = ?,
        stage = ?,
        scheduled_at = ?,
        status = ?,
        format = ?,
        stream_url = ?,
        notes = ?,
        updated_at = ?
      WHERE id = ?
    `,
    [
      event.season,
      event.game,
      event.leagueTier,
      event.eventType,
      event.title,
      event.stage,
      event.scheduledAt,
      event.status,
      event.format,
      event.streamUrl,
      event.notes,
      now,
      cleanText(
        eventId,
      ),
    ],
  );

  return getScheduleEvent(
    env,
    eventId,
  );
}

export async function deleteScheduleEvent(
  env,
  eventId,
) {
  await getScheduleEvent(
    env,
    eventId,
  );

  const database =
    requireDatabase(env);

  await execute(
    database,
    `
      DELETE FROM schedule_events
      WHERE id = ?
    `,
    [
      cleanText(
        eventId,
      ),
    ],
  );

  return {
    id:
      cleanText(
        eventId,
      ),

    deleted: true,
  };
}
