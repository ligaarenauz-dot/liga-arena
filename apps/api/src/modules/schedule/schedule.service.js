import { randomUUID } from "node:crypto";
import { db } from "@liga-arena/database";

import {
  TeamServiceError,
} from "../teams/team.service.js";

const DEFAULT_SEASON = "S01";

const allowedEventTypes = new Set([
  "QUALIFIER",
  "LEAGUE",
  "PLAYOFF",
  "FINAL",
  "SHOWMATCH",
]);

const allowedStatuses = new Set([
  "SCHEDULED",
  "LIVE",
  "FINISHED",
  "POSTPONED",
  "CANCELLED",
]);

const allowedLeagueTiers = {
  PUBG: new Set([
    "",
    "SOVEREIGN",
    "VANGUARD",
    "ASCENT",
  ]),

  MLBB: new Set([
    "",
    "IMPERIUM",
    "ABYSSAL",
    "DAWN",
  ]),
};

function cleanText(value) {
  return String(value ?? "").trim();
}

function normalizeGame(value) {
  const game =
    cleanText(value).toUpperCase();

  if (!["PUBG", "MLBB"].includes(game)) {
    throw new TeamServiceError(
      "O‘yin turi PUBG yoki MLBB bo‘lishi kerak.",
      400,
      "INVALID_SCHEDULE_GAME",
    );
  }

  return game;
}

function normalizeEventType(value) {
  const eventType =
    cleanText(value).toUpperCase();

  if (!allowedEventTypes.has(eventType)) {
    throw new TeamServiceError(
      "Turnir bosqichi noto‘g‘ri.",
      400,
      "INVALID_EVENT_TYPE",
    );
  }

  return eventType;
}

function normalizeStatus(value) {
  const status =
    cleanText(value || "SCHEDULED")
      .toUpperCase();

  if (!allowedStatuses.has(status)) {
    throw new TeamServiceError(
      "Tadbir holati noto‘g‘ri.",
      400,
      "INVALID_EVENT_STATUS",
    );
  }

  return status;
}

function normalizeLeagueTier(
  game,
  value,
) {
  const leagueTier =
    cleanText(value).toUpperCase();

  if (
    !allowedLeagueTiers[game]
      ?.has(leagueTier)
  ) {
    throw new TeamServiceError(
      "Liga darajasi tanlangan o‘yinga mos emas.",
      400,
      "INVALID_EVENT_LEAGUE",
    );
  }

  return leagueTier;
}

function validateTitle(value) {
  const title = cleanText(value);

  if (
    title.length < 3 ||
    title.length > 100
  ) {
    throw new TeamServiceError(
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
  const text = cleanText(value);

  if (text.length > maximum) {
    throw new TeamServiceError(
      `${fieldName} ${maximum} belgidan oshmasligi kerak.`,
      400,
      "EVENT_TEXT_TOO_LONG",
    );
  }

  return text;
}

function validateScheduledAt(value) {
  const scheduledAt = cleanText(value);
  const parsedDate = new Date(scheduledAt);

  if (
    !scheduledAt ||
    Number.isNaN(parsedDate.getTime())
  ) {
    throw new TeamServiceError(
      "Tadbir sanasi va vaqtini to‘g‘ri kiriting.",
      400,
      "INVALID_EVENT_DATE",
    );
  }

  return parsedDate.toISOString();
}

function validateStreamUrl(value) {
  const streamUrl = cleanText(value);

  if (!streamUrl) {
    return "";
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(streamUrl);
  } catch {
    throw new TeamServiceError(
      "Translyatsiya havolasi noto‘g‘ri.",
      400,
      "INVALID_STREAM_URL",
    );
  }

  if (
    !["http:", "https:"].includes(
      parsedUrl.protocol,
    )
  ) {
    throw new TeamServiceError(
      "Translyatsiya havolasi HTTP yoki HTTPS bo‘lishi kerak.",
      400,
      "INVALID_STREAM_URL",
    );
  }

  return parsedUrl.toString();
}

function getRawScheduleEvent(eventId) {
  return db
    .prepare(`
      SELECT *
      FROM schedule_events
      WHERE id = ?
    `)
    .get(eventId);
}

function normalizePayload(payload = {}) {
  const game =
    normalizeGame(payload.game);

  return {
    season:
      cleanText(payload.season) ||
      DEFAULT_SEASON,

    game,

    leagueTier:
      normalizeLeagueTier(
        game,
        payload.leagueTier,
      ),

    eventType:
      normalizeEventType(
        payload.eventType,
      ),

    title:
      validateTitle(payload.title),

    stage:
      validateLimitedText(
        payload.stage,
        60,
        "Bosqich nomi",
      ),

    scheduledAt:
      validateScheduledAt(
        payload.scheduledAt,
      ),

    status:
      normalizeStatus(payload.status),

    format:
      validateLimitedText(
        payload.format,
        50,
        "Format",
      ),

    streamUrl:
      validateStreamUrl(
        payload.streamUrl,
      ),

    notes:
      validateLimitedText(
        payload.notes,
        500,
        "Izoh",
      ),

    createdBy:
      validateLimitedText(
        payload.createdBy ||
          "Liga Arena Admin",
        100,
        "Admin ismi",
      ) || "Liga Arena Admin",
  };
}

export function listScheduleEvents({
  season = DEFAULT_SEASON,
  game,
  status,
  leagueTier,
  from,
  to,
} = {}) {
  const conditions = ["season = ?"];
  const parameters = [
    cleanText(season) || DEFAULT_SEASON,
  ];

  if (game) {
    conditions.push("game = ?");
    parameters.push(normalizeGame(game));
  }

  if (status) {
    conditions.push("status = ?");
    parameters.push(
      normalizeStatus(status),
    );
  }

  if (leagueTier) {
    const normalizedGame =
      game ? normalizeGame(game) : null;

    if (!normalizedGame) {
      throw new TeamServiceError(
        "Liga bo‘yicha filtrlash uchun o‘yin turini ham tanlang.",
        400,
        "EVENT_GAME_REQUIRED",
      );
    }

    conditions.push("league_tier = ?");
    parameters.push(
      normalizeLeagueTier(
        normalizedGame,
        leagueTier,
      ),
    );
  }

  if (from) {
    conditions.push("scheduled_at >= ?");
    parameters.push(
      validateScheduledAt(from),
    );
  }

  if (to) {
    conditions.push("scheduled_at <= ?");
    parameters.push(
      validateScheduledAt(to),
    );
  }

  return db
    .prepare(`
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
      WHERE ${conditions.join(" AND ")}
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
    `)
    .all(...parameters);
}

export function createScheduleEvent(
  payload = {},
) {
  const event =
    normalizePayload(payload);

  const eventId = randomUUID();
  const now =
    new Date().toISOString();

  db.prepare(`
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
  `).run(
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
  );

  return getScheduleEvent(eventId);
}

export function getScheduleEvent(eventId) {
  const event = db
    .prepare(`
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
      WHERE id = ?
    `)
    .get(eventId);

  if (!event) {
    throw new TeamServiceError(
      "Jadval tadbiri topilmadi.",
      404,
      "SCHEDULE_EVENT_NOT_FOUND",
    );
  }

  return event;
}

export function updateScheduleEvent(
  eventId,
  payload = {},
) {
  const existing =
    getRawScheduleEvent(eventId);

  if (!existing) {
    throw new TeamServiceError(
      "Jadval tadbiri topilmadi.",
      404,
      "SCHEDULE_EVENT_NOT_FOUND",
    );
  }

  const event =
    normalizePayload({
      season:
        payload.season ??
        existing.season,

      game:
        payload.game ??
        existing.game,

      leagueTier:
        payload.leagueTier ??
        existing.league_tier,

      eventType:
        payload.eventType ??
        existing.event_type,

      title:
        payload.title ??
        existing.title,

      stage:
        payload.stage ??
        existing.stage,

      scheduledAt:
        payload.scheduledAt ??
        existing.scheduled_at,

      status:
        payload.status ??
        existing.status,

      format:
        payload.format ??
        existing.format,

      streamUrl:
        payload.streamUrl ??
        existing.stream_url,

      notes:
        payload.notes ??
        existing.notes,

      createdBy:
        payload.createdBy ??
        existing.created_by,
    });

  const now =
    new Date().toISOString();

  db.prepare(`
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
  `).run(
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
    eventId,
  );

  return getScheduleEvent(eventId);
}

export function deleteScheduleEvent(
  eventId,
) {
  const existing =
    getRawScheduleEvent(eventId);

  if (!existing) {
    throw new TeamServiceError(
      "Jadval tadbiri topilmadi.",
      404,
      "SCHEDULE_EVENT_NOT_FOUND",
    );
  }

  db.prepare(`
    DELETE FROM schedule_events
    WHERE id = ?
  `).run(eventId);

  return {
    id: eventId,
    deleted: true,
  };
}