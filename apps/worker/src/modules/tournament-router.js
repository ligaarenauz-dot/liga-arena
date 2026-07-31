import {
  jsonResponse,
} from "../lib/http.js";

import {
  requireAdmin,
} from "./admin.js";

import {
  getEligibilityRules,
  getTeamEligibility,
  saveMemberEligibility,
} from "./eligibility.js";

import {
  createScheduleEvent,
  deleteScheduleEvent,
  getScheduleEvent,
  listScheduleEvents,
  updateScheduleEvent,
} from "./schedule.js";

import {
  listLeagueStandings,
  resetTeamStanding,
  saveTeamStanding,
} from "./standings.js";

import {
  completeCompetitionRound,
  createCompetitionRound,
  deleteCompetitionRound,
  finalizeCompetitionSeason,
  getCompetitionOverview,
  getCompetitionRound,
  getCompetitionStandings,
  saveCompetitionSettings,
  saveCompetitionTeamResults,
} from "./competition.js";

import {
  completeMlbbRound,
  createMlbbRound,
  deleteMlbbRound,
  finalizeMlbbSeason,
  getMlbbOverview,
  getMlbbRound,
  getMlbbStandings,
  saveMlbbMatchResult,
  saveMlbbSettings,
} from "./mlbb.js";

import {
  activateNextSeason,
  getSeasonReadiness,
} from "./seasons.js";

import {
  getArchivedStandings,
  listArchivedSeasons,
} from "./archive.js";

import {
  sendMlbbRoundNotifications,
  sendPubgRoundNotifications,
} from "./round-notifications.js";

function decodePart(value) {
  try {
    return decodeURIComponent(
      value,
    );
  } catch {
    return value;
  }
}

export async function handleTournamentRequest(
  request,
  env,
  url,
  readJsonBody,
) {
  const pathname =
    url.pathname;

  const method =
    request.method;

  if (
    pathname.startsWith(
      "/api/admin/",
    )
  ) {
    requireAdmin(
      request,
      env,
    );
  }

  if (
    method === "GET" &&
    pathname ===
      "/api/eligibility/rules"
  ) {
    return jsonResponse({
      rules:
        getEligibilityRules(
          env,
        ),
    });
  }

  const teamEligibilityMatch =
    pathname.match(
      /^\/api\/teams\/([^/]+)\/eligibility$/,
    );

  if (
    method === "GET" &&
    teamEligibilityMatch
  ) {
    return jsonResponse({
      eligibility:
        await getTeamEligibility(
          env,
          decodePart(
            teamEligibilityMatch[1],
          ),
        ),
    });
  }

  const memberEligibilityMatch =
    pathname.match(
      /^\/api\/teams\/([^/]+)\/members\/([^/]+)\/eligibility$/,
    );

  if (
    method === "PUT" &&
    memberEligibilityMatch
  ) {
    const payload =
      await readJsonBody(
        request,
      );

    return jsonResponse({
      message:
        "O‘yinchining yosh ma’lumoti saqlandi.",

      eligibility:
        await saveMemberEligibility(
          env,
          decodePart(
            memberEligibilityMatch[1],
          ),
          decodePart(
            memberEligibilityMatch[2],
          ),
          payload,
        ),
    });
  }

  if (
    method === "GET" &&
    pathname ===
      "/api/schedule"
  ) {
    return jsonResponse({
      events:
        await listScheduleEvents(
          env,
          url.searchParams,
        ),
    });
  }

  const publicScheduleMatch =
    pathname.match(
      /^\/api\/schedule\/([^/]+)$/,
    );

  if (
    method === "GET" &&
    publicScheduleMatch
  ) {
    return jsonResponse({
      event:
        await getScheduleEvent(
          env,
          decodePart(
            publicScheduleMatch[1],
          ),
        ),
    });
  }

  if (
    method === "GET" &&
    pathname ===
      "/api/admin/schedule"
  ) {
    return jsonResponse({
      events:
        await listScheduleEvents(
          env,
          url.searchParams,
        ),
    });
  }

  if (
    method === "POST" &&
    pathname ===
      "/api/admin/schedule"
  ) {
    const payload =
      await readJsonBody(
        request,
      );

    return jsonResponse(
      {
        message:
          "Jadval tadbiri yaratildi.",

        event:
          await createScheduleEvent(
            env,
            payload,
          ),
      },
      201,
    );
  }

  const adminScheduleMatch =
    pathname.match(
      /^\/api\/admin\/schedule\/([^/]+)$/,
    );

  if (
    method === "PUT" &&
    adminScheduleMatch
  ) {
    const payload =
      await readJsonBody(
        request,
      );

    return jsonResponse({
      message:
        "Jadval tadbiri yangilandi.",

      event:
        await updateScheduleEvent(
          env,
          decodePart(
            adminScheduleMatch[1],
          ),
          payload,
        ),
    });
  }

  if (
    method === "DELETE" &&
    adminScheduleMatch
  ) {
    return jsonResponse({
      message:
        "Jadval tadbiri o‘chirildi.",

      result:
        await deleteScheduleEvent(
          env,
          decodePart(
            adminScheduleMatch[1],
          ),
        ),
    });
  }

  if (
    method === "GET" &&
    pathname ===
      "/api/standings"
  ) {
    return jsonResponse({
      standings:
        await listLeagueStandings(
          env,
          url.searchParams,
        ),
    });
  }

  if (
    method === "GET" &&
    pathname ===
      "/api/admin/standings"
  ) {
    return jsonResponse({
      standings:
        await listLeagueStandings(
          env,
          url.searchParams,
        ),
    });
  }

  const adminStandingMatch =
    pathname.match(
      /^\/api\/admin\/standings\/([^/]+)$/,
    );

  if (
    method === "PUT" &&
    adminStandingMatch
  ) {
    const payload =
      await readJsonBody(
        request,
      );

    return jsonResponse({
      message:
        "Jamoa natijalari saqlandi.",

      standings:
        await saveTeamStanding(
          env,
          decodePart(
            adminStandingMatch[1],
          ),
          payload,
        ),
    });
  }

  if (
    method === "DELETE" &&
    adminStandingMatch
  ) {
    return jsonResponse({
      message:
        "Jamoa natijalari nolga qaytarildi.",

      standings:
        await resetTeamStanding(
          env,
          decodePart(
            adminStandingMatch[1],
          ),
        ),
    });
  }

  if (
    method === "GET" &&
    pathname ===
      "/api/competition/standings"
  ) {
    return jsonResponse(
      await getCompetitionStandings(
        env,
        url.searchParams,
      ),
    );
  }

  if (
    method === "GET" &&
    pathname ===
      "/api/admin/competition/overview"
  ) {
    return jsonResponse(
      await getCompetitionOverview(
        env,
        url.searchParams,
      ),
    );
  }

  if (
    method === "PUT" &&
    pathname ===
      "/api/admin/competition/settings"
  ) {
    const payload =
      await readJsonBody(
        request,
      );

    return jsonResponse({
      message:
        "Musobaqa sozlamalari saqlandi.",

      settings:
        await saveCompetitionSettings(
          env,
          payload,
        ),
    });
  }

  if (
    method === "POST" &&
    pathname ===
      "/api/admin/competition/rounds"
  ) {
    const payload =
      await readJsonBody(
        request,
      );

    return jsonResponse(
      {
        message:
          "Yangi tur yaratildi.",

        round:
          await createCompetitionRound(
            env,
            payload,
          ),
      },
      201,
    );
  }

  const competitionRoundMatch =
    pathname.match(
      /^\/api\/admin\/competition\/rounds\/([^/]+)$/,
    );

  if (
    method === "GET" &&
    competitionRoundMatch
  ) {
    return jsonResponse({
      round:
        await getCompetitionRound(
          env,
          decodePart(
            competitionRoundMatch[1],
          ),
        ),
    });
  }

  if (
    method === "DELETE" &&
    competitionRoundMatch
  ) {
    return jsonResponse({
      message:
        "Tur o‘chirildi.",

      result:
        await deleteCompetitionRound(
          env,
          decodePart(
            competitionRoundMatch[1],
          ),
        ),
    });
  }

  const competitionTeamMatch =
    pathname.match(
      /^\/api\/admin\/competition\/rounds\/([^/]+)\/teams\/([^/]+)$/,
    );

  if (
    method === "PUT" &&
    competitionTeamMatch
  ) {
    const payload =
      await readJsonBody(
        request,
      );

    return jsonResponse({
      message:
        "Jamoaning 4 ta karta natijasi saqlandi.",

      round:
        await saveCompetitionTeamResults(
          env,
          decodePart(
            competitionTeamMatch[1],
          ),
          decodePart(
            competitionTeamMatch[2],
          ),
          payload,
        ),
    });
  }

  const competitionCompleteMatch =
    pathname.match(
      /^\/api\/admin\/competition\/rounds\/([^/]+)\/complete$/,
    );

  if (
    method === "POST" &&
    competitionCompleteMatch
  ) {
    return jsonResponse({
      message:
        "Tur yakunlandi.",

      round:
        await completeCompetitionRound(
          env,
          decodePart(
            competitionCompleteMatch[1],
          ),
        ),
    });
  }

  const competitionNotifyMatch =
    pathname.match(
      /^\/api\/admin\/competition\/rounds\/([^/]+)\/notify$/,
    );

  if (
    method === "POST" &&
    competitionNotifyMatch
  ) {
    return jsonResponse({
      message:
        "PUBG tur bildirishnomalari qayta ishlandi.",

      summary:
        await sendPubgRoundNotifications(
          env,
          decodePart(
            competitionNotifyMatch[1],
          ),
        ),
    });
  }

  if (
    method === "POST" &&
    pathname ===
      "/api/admin/competition/finalize"
  ) {
    const payload =
      await readJsonBody(
        request,
      );

    return jsonResponse({
      message:
        "PUBG saralashi rasmiy yakunlandi va keyingi mavsum ligalari belgilandi.",

      overview:
        await finalizeCompetitionSeason(
          env,
          payload,
        ),
    });
  }

  if (
    method === "GET" &&
    pathname ===
      "/api/mlbb/standings"
  ) {
    return jsonResponse(
      await getMlbbStandings(
        env,
        url.searchParams,
      ),
    );
  }

  if (
    method === "GET" &&
    pathname ===
      "/api/admin/mlbb/overview"
  ) {
    return jsonResponse(
      await getMlbbOverview(
        env,
        url.searchParams,
      ),
    );
  }

  if (
    method === "PUT" &&
    pathname ===
      "/api/admin/mlbb/settings"
  ) {
    const payload =
      await readJsonBody(
        request,
      );

    return jsonResponse({
      message:
        "MLBB sozlamalari saqlandi.",

      settings:
        await saveMlbbSettings(
          env,
          payload,
        ),
    });
  }

  if (
    method === "POST" &&
    pathname ===
      "/api/admin/mlbb/rounds"
  ) {
    const payload =
      await readJsonBody(
        request,
      );

    return jsonResponse(
      {
        message:
          "MLBB turi yaratildi.",

        round:
          await createMlbbRound(
            env,
            payload,
          ),
      },
      201,
    );
  }

  const mlbbRoundMatch =
    pathname.match(
      /^\/api\/admin\/mlbb\/rounds\/([^/]+)$/,
    );

  if (
    method === "GET" &&
    mlbbRoundMatch
  ) {
    return jsonResponse({
      round:
        await getMlbbRound(
          env,
          decodePart(
            mlbbRoundMatch[1],
          ),
        ),
    });
  }

  if (
    method === "DELETE" &&
    mlbbRoundMatch
  ) {
    return jsonResponse({
      message:
        "MLBB turi o‘chirildi.",

      result:
        await deleteMlbbRound(
          env,
          decodePart(
            mlbbRoundMatch[1],
          ),
        ),
    });
  }

  const mlbbMatchMatch =
    pathname.match(
      /^\/api\/admin\/mlbb\/matches\/([^/]+)$/,
    );

  if (
    method === "PUT" &&
    mlbbMatchMatch
  ) {
    const payload =
      await readJsonBody(
        request,
      );

    return jsonResponse({
      message:
        "MLBB seriya natijasi saqlandi.",

      round:
        await saveMlbbMatchResult(
          env,
          decodePart(
            mlbbMatchMatch[1],
          ),
          payload,
        ),
    });
  }

  const mlbbCompleteMatch =
    pathname.match(
      /^\/api\/admin\/mlbb\/rounds\/([^/]+)\/complete$/,
    );

  if (
    method === "POST" &&
    mlbbCompleteMatch
  ) {
    return jsonResponse({
      message:
        "MLBB turi jadvalga chiqarildi.",

      round:
        await completeMlbbRound(
          env,
          decodePart(
            mlbbCompleteMatch[1],
          ),
        ),
    });
  }

  const mlbbNotifyMatch =
    pathname.match(
      /^\/api\/admin\/mlbb\/rounds\/([^/]+)\/notify$/,
    );

  if (
    method === "POST" &&
    mlbbNotifyMatch
  ) {
    return jsonResponse({
      message:
        "MLBB tur bildirishnomalari qayta ishlandi.",

      summary:
        await sendMlbbRoundNotifications(
          env,
          decodePart(
            mlbbNotifyMatch[1],
          ),
        ),
    });
  }

  if (
    method === "POST" &&
    pathname ===
      "/api/admin/mlbb/finalize"
  ) {
    const payload =
      await readJsonBody(
        request,
      );

    return jsonResponse({
      message:
        "MLBB mavsumi yakunlandi va keyingi mavsum ligalari belgilandi.",

      overview:
        await finalizeMlbbSeason(
          env,
          payload,
        ),
    });
  }

  if (
    method === "GET" &&
    pathname ===
      "/api/admin/seasons/readiness"
  ) {
    return jsonResponse(
      await getSeasonReadiness(
        env,
        url.searchParams,
      ),
    );
  }

  if (
    method === "POST" &&
    pathname ===
      "/api/admin/seasons/activate"
  ) {
    const payload =
      await readJsonBody(
        request,
      );

    return jsonResponse({
      message:
        "Keyingi mavsum muvaffaqiyatli faollashtirildi.",

      readiness:
        await activateNextSeason(
          env,
          payload,
        ),
    });
  }

  if (
    method === "GET" &&
    pathname ===
      "/api/archive/seasons"
  ) {
    return jsonResponse({
      seasons:
        await listArchivedSeasons(
          env,
          url.searchParams,
        ),
    });
  }

  if (
    method === "GET" &&
    pathname ===
      "/api/archive/standings"
  ) {
    return jsonResponse(
      await getArchivedStandings(
        env,
        url.searchParams,
      ),
    );
  }

  return null;
}
