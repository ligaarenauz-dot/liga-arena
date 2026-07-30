export const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:4100";

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request(path, options = {}) {
  let response;

  const hasBody =
    options.body !== undefined &&
    options.body !== null;

  const isFormData =
    typeof FormData !== "undefined" &&
    options.body instanceof FormData;

  const headers = {
    ...(options.headers || {}),
  };

  if (hasBody && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      "Backend bilan aloqa o‘rnatilmadi. API ishlayotganini tekshiring.",
      0,
      "NETWORK_ERROR",
    );
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      data?.message || "So‘rovni bajarishda xatolik yuz berdi.",
      response.status,
      data?.error || "API_ERROR",
    );
  }

  return data;
}

export function uploadTeamLogo(file) {
  const formData = new FormData();
  formData.append("logo", file);

  return request("/api/uploads/team-logo", {
    method: "POST",
    body: formData,
  });
}

export function createTeam(payload) {
  return request("/api/teams", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export function getTeam(teamId) {
  return request(`/api/teams/${teamId}`);
}

export async function getApprovedLeagueTeams({
  season = "S01",
  game = "",
} = {}) {
  const parameters = new URLSearchParams();

  parameters.set("status", "APPROVED");
  parameters.set("season", season);

  if (game) {
    parameters.set("game", game);
  }

  const result = await request(
    `/api/teams?${parameters.toString()}`,
  );

  if (Array.isArray(result)) {
    return result;
  }

  if (Array.isArray(result?.teams)) {
    return result.teams;
  }

  return [];
}

export function addTeamMember(teamId, payload) {
  return request(`/api/teams/${teamId}/members`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function removeTeamMember(teamId, memberId) {
  return request(
    `/api/teams/${teamId}/members/${memberId}`,
    {
      method: "DELETE",
    },
  );
}

export function submitTeam(teamId) {
  return request(`/api/teams/${teamId}/submit`, {
    method: "POST",
  });
}
export function createMemberInvite(teamId, memberId) {
  return request(
    `/api/teams/${teamId}/members/${memberId}/invite`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}
export function devConfirmAllTeamMembers(teamId) {
  return request(`/api/teams/${teamId}/dev-confirm-all`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}
function getAdminHeaders(adminSecret) {
  return {
    "X-Admin-Secret": adminSecret,
  };
}

export function getAdminStats(adminSecret) {
  return request("/api/admin/stats", {
    headers: getAdminHeaders(adminSecret),
  });
}

export function getAdminTeams(
  adminSecret,
  {
    status = "PENDING_REVIEW",
    game = "",
  } = {},
) {
  const parameters = new URLSearchParams();

  if (status) {
    parameters.set("status", status);
  }

  if (game) {
    parameters.set("game", game);
  }

  return request(
    `/api/admin/teams?${parameters.toString()}`,
    {
      headers: getAdminHeaders(adminSecret),
    },
  );
}

export function getAdminTeam(
  adminSecret,
  teamId,
) {
  return request(`/api/admin/teams/${teamId}`, {
    headers: getAdminHeaders(adminSecret),
  });
}

export function approveAdminTeam(
  adminSecret,
  teamId,
  adminName,
) {
  return request(
    `/api/admin/teams/${teamId}/approve`,
    {
      method: "POST",
      headers: getAdminHeaders(adminSecret),
      body: JSON.stringify({
        adminName,
      }),
    },
  );
}

export function rejectAdminTeam(
  adminSecret,
  teamId,
  {
    adminName,
    reason,
  },
) {
  return request(
    `/api/admin/teams/${teamId}/reject`,
    {
      method: "POST",
      headers: getAdminHeaders(adminSecret),
      body: JSON.stringify({
        adminName,
        reason,
      }),
    },
  );
}
export function assignAdminTeamLeague(
  adminSecret,
  teamId,
  {
    leagueTier,
    adminName,
  },
) {
  return request(
    `/api/admin/teams/${teamId}/league`,
    {
      method: "POST",
      headers: getAdminHeaders(adminSecret),
      body: JSON.stringify({
        leagueTier,
        adminName,
      }),
    },
  );
}

export function getEligibilityRules() {
  return request("/api/eligibility/rules");
}

export function getTeamEligibility(teamId) {
  return request(
    `/api/teams/${teamId}/eligibility`,
  );
}

export function saveMemberEligibility(
  teamId,
  memberId,
  birthDate,
) {
  return request(
    `/api/teams/${teamId}/members/${memberId}/eligibility`,
    {
      method: "PUT",
      body: JSON.stringify({
        birthDate,
      }),
    },
  );
}

function buildScheduleParameters({
  season = "S01",
  game = "",
  status = "",
  leagueTier = "",
} = {}) {
  const parameters =
    new URLSearchParams();

  parameters.set("season", season);

  if (game) {
    parameters.set("game", game);
  }

  if (status) {
    parameters.set("status", status);
  }

  if (leagueTier) {
    parameters.set(
      "leagueTier",
      leagueTier,
    );
  }

  return parameters.toString();
}

export function getScheduleEvents(
  filters = {},
) {
  return request(
    `/api/schedule?${buildScheduleParameters(
      filters,
    )}`,
  );
}

export function getAdminScheduleEvents(
  adminSecret,
  filters = {},
) {
  return request(
    `/api/admin/schedule?${buildScheduleParameters(
      filters,
    )}`,
    {
      headers:
        getAdminHeaders(adminSecret),
    },
  );
}

export function createAdminScheduleEvent(
  adminSecret,
  payload,
) {
  return request(
    "/api/admin/schedule",
    {
      method: "POST",
      headers:
        getAdminHeaders(adminSecret),
      body: JSON.stringify(payload),
    },
  );
}

export function updateAdminScheduleEvent(
  adminSecret,
  eventId,
  payload,
) {
  return request(
    `/api/admin/schedule/${eventId}`,
    {
      method: "PUT",
      headers:
        getAdminHeaders(adminSecret),
      body: JSON.stringify(payload),
    },
  );
}

export function deleteAdminScheduleEvent(
  adminSecret,
  eventId,
) {
  return request(
    `/api/admin/schedule/${eventId}`,
    {
      method: "DELETE",
      headers:
        getAdminHeaders(adminSecret),
    },
  );
}
function buildStandingsParameters({
  season = "S01",
  game = "",
  leagueTier = "",
} = {}) {
  const parameters =
    new URLSearchParams();

  parameters.set("season", season);

  if (game) {
    parameters.set("game", game);
  }

  if (leagueTier) {
    parameters.set(
      "leagueTier",
      leagueTier,
    );
  }

  return parameters.toString();
}

export function getLeagueStandings(
  filters = {},
) {
  return request(
    `/api/standings?${buildStandingsParameters(
      filters,
    )}`,
  );
}

export function getAdminLeagueStandings(
  adminSecret,
  filters = {},
) {
  return request(
    `/api/admin/standings?${buildStandingsParameters(
      filters,
    )}`,
    {
      headers:
        getAdminHeaders(adminSecret),
    },
  );
}

export function saveAdminTeamStanding(
  adminSecret,
  teamId,
  payload,
) {
  return request(
    `/api/admin/standings/${teamId}`,
    {
      method: "PUT",

      headers:
        getAdminHeaders(adminSecret),

      body:
        JSON.stringify(payload),
    },
  );
}

export function resetAdminTeamStanding(
  adminSecret,
  teamId,
) {
  return request(
    `/api/admin/standings/${teamId}`,
    {
      method: "DELETE",

      headers:
        getAdminHeaders(adminSecret),
    },
  );
}
function buildCompetitionParameters({
  season = "S01",
  game = "PUBG",
  leagueTier = "ASCENT",
  competitionType = "QUALIFIER",
} = {}) {
  const parameters =
    new URLSearchParams();

  parameters.set(
    "season",
    season,
  );

  parameters.set(
    "game",
    game,
  );

  parameters.set(
    "leagueTier",
    leagueTier,
  );

  parameters.set(
    "competitionType",
    competitionType,
  );

  return parameters.toString();
}

export function getSmartCompetitionStandings(
  filters = {},
) {
  return request(
    `/api/competition/standings?${buildCompetitionParameters(
      filters,
    )}`,
  );
}

export function getAdminCompetitionOverview(
  adminSecret,
  filters = {},
) {
  return request(
    `/api/admin/competition/overview?${buildCompetitionParameters(
      filters,
    )}`,

    {
      headers:
        getAdminHeaders(
          adminSecret,
        ),
    },
  );
}

export function saveAdminCompetitionSettings(
  adminSecret,
  payload,
) {
  return request(
    "/api/admin/competition/settings",

    {
      method: "PUT",

      headers:
        getAdminHeaders(
          adminSecret,
        ),

      body:
        JSON.stringify(payload),
    },
  );
}

export function createAdminCompetitionRound(
  adminSecret,
  payload,
) {
  return request(
    "/api/admin/competition/rounds",

    {
      method: "POST",

      headers:
        getAdminHeaders(
          adminSecret,
        ),

      body:
        JSON.stringify(payload),
    },
  );
}

export function getAdminCompetitionRound(
  adminSecret,
  roundId,
) {
  return request(
    `/api/admin/competition/rounds/${roundId}`,

    {
      headers:
        getAdminHeaders(
          adminSecret,
        ),
    },
  );
}

export function saveAdminCompetitionTeamResults(
  adminSecret,
  roundId,
  teamId,
  maps,
) {
  return request(
    `/api/admin/competition/rounds/${roundId}/teams/${teamId}`,

    {
      method: "PUT",

      headers:
        getAdminHeaders(
          adminSecret,
        ),

      body:
        JSON.stringify({
          maps,
        }),
    },
  );
}

export function completeAdminCompetitionRound(
  adminSecret,
  roundId,
) {
  return request(
    `/api/admin/competition/rounds/${roundId}/complete`,

    {
      method: "POST",

      headers:
        getAdminHeaders(
          adminSecret,
        ),

      body:
        JSON.stringify({}),
    },
  );
}

export function deleteAdminCompetitionRound(
  adminSecret,
  roundId,
) {
  return request(
    `/api/admin/competition/rounds/${roundId}`,

    {
      method: "DELETE",

      headers:
        getAdminHeaders(
          adminSecret,
        ),
    },
  );
}
export function getAdminSeasonReadiness(
  adminSecret,
  season = "S01",
) {
  const parameters =
    new URLSearchParams();

  parameters.set(
    "season",
    season,
  );

  return request(
    `/api/admin/seasons/readiness?${parameters.toString()}`,

    {
      headers:
        getAdminHeaders(
          adminSecret,
        ),
    },
  );
}

export function activateAdminNextSeason(
  adminSecret,
  {
    season,
    adminName,
  },
) {
  return request(
    "/api/admin/seasons/activate",

    {
      method: "POST",

      headers:
        getAdminHeaders(
          adminSecret,
        ),

      body:
        JSON.stringify({
          season,
          adminName,
        }),
    },
  );
}
function buildMlbbParameters({
  season = "",
  leagueTier = "DAWN",
} = {}) {
  const parameters =
    new URLSearchParams();

  if (season) {
    parameters.set(
      "season",
      season,
    );
  }

  parameters.set(
    "leagueTier",
    leagueTier,
  );

  return parameters.toString();
}

export function getMlbbStandings(
  filters = {},
) {
  return request(
    `/api/mlbb/standings?${buildMlbbParameters(
      filters,
    )}`,
  );
}

export function getAdminMlbbOverview(
  adminSecret,
  filters = {},
) {
  return request(
    `/api/admin/mlbb/overview?${buildMlbbParameters(
      filters,
    )}`,

    {
      headers:
        getAdminHeaders(
          adminSecret,
        ),
    },
  );
}

export function saveAdminMlbbSettings(
  adminSecret,
  payload,
) {
  return request(
    "/api/admin/mlbb/settings",

    {
      method: "PUT",

      headers:
        getAdminHeaders(
          adminSecret,
        ),

      body:
        JSON.stringify(payload),
    },
  );
}

export function createAdminMlbbRound(
  adminSecret,
  payload,
) {
  return request(
    "/api/admin/mlbb/rounds",

    {
      method: "POST",

      headers:
        getAdminHeaders(
          adminSecret,
        ),

      body:
        JSON.stringify(payload),
    },
  );
}

export function getAdminMlbbRound(
  adminSecret,
  roundId,
) {
  return request(
    `/api/admin/mlbb/rounds/${roundId}`,

    {
      headers:
        getAdminHeaders(
          adminSecret,
        ),
    },
  );
}

export function saveAdminMlbbMatch(
  adminSecret,
  matchId,
  {
    scoreA,
    scoreB,
  },
) {
  return request(
    `/api/admin/mlbb/matches/${matchId}`,

    {
      method: "PUT",

      headers:
        getAdminHeaders(
          adminSecret,
        ),

      body:
        JSON.stringify({
          scoreA,
          scoreB,
        }),
    },
  );
}

export function completeAdminMlbbRound(
  adminSecret,
  roundId,
) {
  return request(
    `/api/admin/mlbb/rounds/${roundId}/complete`,

    {
      method: "POST",

      headers:
        getAdminHeaders(
          adminSecret,
        ),

      body:
        JSON.stringify({}),
    },
  );
}

export function deleteAdminMlbbRound(
  adminSecret,
  roundId,
) {
  return request(
    `/api/admin/mlbb/rounds/${roundId}`,

    {
      method: "DELETE",

      headers:
        getAdminHeaders(
          adminSecret,
        ),
    },
  );
}

export function getCurrentSeason() {
  return request(
    "/api/seasons/current",
  );
}

export function finalizeAdminMlbbSeason(
  adminSecret,
  payload,
) {
  return request(
    "/api/admin/mlbb/finalize",

    {
      method: "POST",

      headers:
        getAdminHeaders(
          adminSecret,
        ),

      body:
        JSON.stringify(payload),
    },
  );
}
export function getArchivedSeasons(
  game = "",
) {
  const parameters =
    new URLSearchParams();

  if (game) {
    parameters.set(
      "game",
      game,
    );
  }

  const query =
    parameters.toString();

  return request(
    `/api/archive/seasons${
      query
        ? `?${query}`
        : ""
    }`,
  );
}

export function getArchivedStandings({
  season,
  game,
  leagueTier,
}) {
  const parameters =
    new URLSearchParams();

  parameters.set(
    "season",
    season,
  );

  parameters.set(
    "game",
    game,
  );

  parameters.set(
    "leagueTier",
    leagueTier,
  );

  return request(
    `/api/archive/standings?${parameters.toString()}`,
  );
}
export function notifyAdminPubgRound(
  adminSecret,
  roundId,
) {
  return request(
    `/api/admin/competition/rounds/${roundId}/notify`,

    {
      method: "POST",

      headers:
        getAdminHeaders(
          adminSecret,
        ),

      body:
        JSON.stringify({}),
    },
  );
}

export function notifyAdminMlbbRound(
  adminSecret,
  roundId,
) {
  return request(
    `/api/admin/mlbb/rounds/${roundId}/notify`,

    {
      method: "POST",

      headers:
        getAdminHeaders(
          adminSecret,
        ),

      body:
        JSON.stringify({}),
    },
  );
}
export function finalizeAdminCompetitionSeason(
  adminSecret,
  payload,
) {
  return request(
    "/api/admin/competition/finalize",

    {
      method: "POST",

      headers:
        getAdminHeaders(
          adminSecret,
        ),

      body:
        JSON.stringify(payload),
    },
  );
}