import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Crown,
  Gamepad2,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Swords,
  Trophy,
  Users,
} from "lucide-react";

import {
  API_URL,
  getApprovedLeagueTeams,
  getTeam,
} from "../api/client.js";

import "./LeagueTeamsPanel.css";

const leagueConfig = {
  PUBG: {
    gameTitle: "PUBG MOBILE",
    leagueTitle: "PUBG LEAGUE",

    tiers: [
      {
        value: "SOVEREIGN",
        label: "Sovereign",
        description:
          "Liga Arenaning eng yuqori PUBG divizioni.",
      },
      {
        value: "VANGUARD",
        label: "Vanguard",
        description:
          "Yuqori raqobatdagi PUBG jamoalari divizioni.",
      },
      {
        value: "ASCENT",
        label: "Ascent",
        description:
          "Liga sari ko‘tarilayotgan yangi jamoalar divizioni.",
      },
    ],
  },

  MLBB: {
    gameTitle: "MOBILE LEGENDS",
    leagueTitle: "MLBB LEAGUE",

    tiers: [
      {
        value: "IMPERIUM",
        label: "Imperium",
        description:
          "Liga Arenaning eng yuqori MLBB divizioni.",
      },
      {
        value: "ABYSSAL",
        label: "Abyssal",
        description:
          "Kuchli va barqaror MLBB jamoalari divizioni.",
      },
      {
        value: "DAWN",
        label: "Dawn",
        description:
          "Yangi MLBB jamoalari rivojlanish divizioni.",
      },
    ],
  },
};

function resolveLogo(logoUrl) {
  if (!logoUrl) {
    return "";
  }

  if (
    logoUrl.startsWith("http://") ||
    logoUrl.startsWith("https://")
  ) {
    return logoUrl;
  }

  return `${API_URL}${
    logoUrl.startsWith("/") ? "" : "/"
  }${logoUrl}`;
}

function leagueTitle(value) {
  const allTiers = [
    ...leagueConfig.PUBG.tiers,
    ...leagueConfig.MLBB.tiers,
  ];

  return (
    allTiers.find(
      (tier) => tier.value === value,
    )?.label || ""
  );
}

function statusTitle(status) {
  const titles = {
    DRAFT: "Ro‘yxatdan o‘tish davom etmoqda",
    PENDING_CONFIRMATION:
      "O‘yinchilar tasdig‘i kutilmoqda",
    PENDING_REVIEW: "Admin tekshiruvida",
    APPROVED: "Jamoa tasdiqlangan",
    REJECTED: "Ariza rad etilgan",
    LOCKED: "Jamoa yopilgan",
  };

  return titles[status] || status;
}

function TeamLogo({
  team,
  size = "normal",
}) {
  const logo = resolveLogo(team?.logoUrl);

  return (
    <div
      className={`league-team-logo league-team-logo--${size}`}
    >
      {logo ? (
        <img
          src={logo}
          alt={`${team.name} logosi`}
        />
      ) : (
        <Crown size={22} />
      )}
    </div>
  );
}

function LeagueProfileCard({
  team,
}) {
  const [displayTeam, setDisplayTeam] =
    useState(team);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    setDisplayTeam(team);
  }, [team]);

  const refreshTeam = async () => {
    if (!team?.id) {
      return;
    }

    setRefreshing(true);
    setError("");

    try {
      const result =
        await getTeam(team.id);

      setDisplayTeam(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setRefreshing(false);
    }
  };

  if (!displayTeam) {
    return null;
  }

  const assignedLeague =
    leagueTitle(
      displayTeam.leagueTier,
    );

  const approved =
    displayTeam.status === "APPROVED";

  return (
    <section className="profile-league-card">
      <div className="profile-league-card__top">
        <div>
          <span>MY LEAGUE STATUS</span>
          <h2>Jamoaning liga holati</h2>
        </div>

        <button
          type="button"
          disabled={refreshing}
          onClick={refreshTeam}
          aria-label="Liga holatini yangilash"
        >
          <RefreshCw
            className={
              refreshing
                ? "league-panel-spin"
                : ""
            }
            size={16}
          />
        </button>
      </div>

      <article
        className={
          assignedLeague
            ? "profile-league-team profile-league-team--assigned"
            : "profile-league-team"
        }
      >
        <TeamLogo
          team={displayTeam}
          size="large"
        />

        <section>
          <div className="profile-league-team__game">
            {displayTeam.game === "PUBG" ? (
              <Gamepad2 size={14} />
            ) : (
              <Swords size={14} />
            )}

            <span>
              {leagueConfig[
                displayTeam.game
              ]?.gameTitle || displayTeam.game}
            </span>
          </div>

          <h3>{displayTeam.name}</h3>

          <div className="profile-league-team__tag">
            {displayTeam.tag}
          </div>

          {displayTeam.technicalNumber && (
            <div className="profile-team-technical-number">
              TEXNIK RAQAM:{" "}
              <strong>
                {displayTeam.technicalNumber}
              </strong>
            </div>
          )}
        </section>

        <div className="profile-league-team__status">
          {assignedLeague ? (
            <>
              <Crown size={20} />

              <span>LIGA DARAJASI</span>

              <strong>
                {assignedLeague}
              </strong>
            </>
          ) : approved ? (
            <>
              <ShieldCheck size={20} />

              <span>JAMOA TASDIQLANDI</span>

              <strong>
                Liga belgilanmoqda
              </strong>
            </>
          ) : (
            <>
              <Users size={20} />

              <span>ARIZA HOLATI</span>

              <strong>
                {statusTitle(
                  displayTeam.status,
                )}
              </strong>
            </>
          )}
        </div>
      </article>

      {displayTeam.nextSeason &&
        displayTeam.nextLeagueTier && (
          <div className="profile-next-season">
            <Crown size={18} />

            <section>
              <span>
                KEYINGI MAVSUM
              </span>

              <strong>
                {displayTeam.nextSeason}
                {" • "}
                {leagueTitle(
                  displayTeam.nextLeagueTier,
                )}
              </strong>

              <small>
                Saralash natijasi bo‘yicha
                keyingi mavsum joylashuvi
              </small>
            </section>
          </div>
        )}

      <div className="profile-league-card__meta">
        <span>
          <strong>Mavsum</strong>
          {displayTeam.season || "S01"}
        </span>

        <span>
          <strong>Holat</strong>
          {statusTitle(
            displayTeam.status,
          )}
        </span>

        <span>
          <strong>Tarkib</strong>
          {displayTeam.counts?.total ||
            displayTeam.members?.length ||
            0}{" "}
          o‘yinchi
        </span>
      </div>

      {error && (
        <p className="profile-league-card__error">
          {error}
        </p>
      )}
    </section>
  );
}

function LeagueTeamCard({
  team,
  isCurrentTeam,
}) {
  return (
    <article
      className={
        isCurrentTeam
          ? "league-team-card league-team-card--current"
          : "league-team-card"
      }
    >
      <TeamLogo team={team} />

      <section>
        <div>
          <h4>{team.name}</h4>

          {isCurrentTeam && (
            <span>SIZNING JAMOANGIZ</span>
          )}
        </div>

        <p>
          {team.tag}
          {" • "}
          {team.region ||
            "Hudud ko‘rsatilmagan"}
        </p>

        <small>
          {team.memberCount || 0} o‘yinchi
        </small>
      </section>

      <ShieldCheck size={16} />
    </article>
  );
}

function LeagueGameSection({
  game,
  teams,
  currentTeam,
}) {
  const config =
    leagueConfig[game];

  return (
    <section className="league-game-section">
      <header className="league-game-section__header">
        <div>
          {game === "PUBG" ? (
            <Gamepad2 size={23} />
          ) : (
            <Swords size={23} />
          )}

          <section>
            <span>
              {config.leagueTitle}
            </span>

            <h2>{config.gameTitle}</h2>
          </section>
        </div>

        <div>
          <Users size={16} />
          {teams.length} jamoa
        </div>
      </header>

      <div className="league-tier-grid">
        {config.tiers.map((tier) => {
          const tierTeams =
            teams.filter(
              (team) =>
                team.leagueTier ===
                tier.value,
            );

          return (
            <article
              className="league-tier-column"
              key={tier.value}
            >
              <header>
                <Crown size={18} />

                <section>
                  <span>DIVISION</span>
                  <h3>{tier.label}</h3>
                </section>

                <strong>
                  {tierTeams.length}
                </strong>
              </header>

              <p>{tier.description}</p>

              <div className="league-tier-teams">
                {tierTeams.length > 0 ? (
                  tierTeams.map((team) => (
                    <LeagueTeamCard
                      key={team.id}
                      team={team}
                      isCurrentTeam={
                        currentTeam?.id ===
                        team.id
                      }
                    />
                  ))
                ) : (
                  <div className="league-tier-empty">
                    <Trophy size={20} />

                    <span>
                      Hozircha jamoa
                      biriktirilmagan
                    </span>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function LeagueDirectory({
  currentTeam,
}) {
  const [teams, setTeams] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadTeams = async () => {
    setLoading(true);
    setError("");

    try {
      const result =
        await getApprovedLeagueTeams({
          season:
            currentTeam?.season || "S01",
        });

      setTeams(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, [currentTeam?.season]);

  const pubgTeams = useMemo(
    () =>
      teams.filter(
        (team) => team.game === "PUBG",
      ),
    [teams],
  );

  const mlbbTeams = useMemo(
    () =>
      teams.filter(
        (team) => team.game === "MLBB",
      ),
    [teams],
  );

  return (
    <section className="league-directory">
      <header className="league-directory__title">
        <div>
          <span>OFFICIAL DIVISIONS</span>

          <h1>Liga jamoalari</h1>

          <p>
            Admin tomonidan tasdiqlangan va
            liga darajasiga biriktirilgan
            jamoalar.
          </p>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={loadTeams}
        >
          <RefreshCw
            className={
              loading
                ? "league-panel-spin"
                : ""
            }
            size={16}
          />

          Yangilash
        </button>
      </header>

      {loading ? (
        <div className="league-directory__state">
          <LoaderCircle
            className="league-panel-spin"
            size={30}
          />

          <strong>
            Liga jamoalari yuklanmoqda
          </strong>
        </div>
      ) : error ? (
        <div className="league-directory__state league-directory__state--error">
          <ShieldCheck size={26} />

          <strong>
            Jamoalarni yuklab bo‘lmadi
          </strong>

          <p>{error}</p>
        </div>
      ) : (
        <>
          <LeagueGameSection
            game="PUBG"
            teams={pubgTeams}
            currentTeam={currentTeam}
          />

          <LeagueGameSection
            game="MLBB"
            teams={mlbbTeams}
            currentTeam={currentTeam}
          />
        </>
      )}
    </section>
  );
}

export default function LeagueTeamsPanel({
  mode = "leagues",
  currentTeam,
}) {
  if (mode === "profile") {
    return (
      <LeagueProfileCard
        team={currentTeam}
      />
    );
  }

  return (
    <LeagueDirectory
      currentTeam={currentTeam}
    />
  );
}