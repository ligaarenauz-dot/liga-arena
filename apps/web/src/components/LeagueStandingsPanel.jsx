import {
  useEffect,
  useState,
} from "react";

import {
  ArrowDown,
  ArrowUp,
  Crown,
  Gamepad2,
  LoaderCircle,
  Minus,
  RefreshCw,
  ShieldAlert,
  Swords,
  Trophy,
} from "lucide-react";

import {
  API_URL,
  getMlbbStandings,
  getSmartCompetitionStandings,
} from "../api/client.js";

import "./LeagueStandingsPanel.css";

const leagues = {
  PUBG: [
    { value: "SOVEREIGN", label: "Sovereign" },
    { value: "VANGUARD", label: "Vanguard" },
    { value: "ASCENT", label: "Ascent" },
  ],

  MLBB: [
    { value: "IMPERIUM", label: "Imperium" },
    { value: "ABYSSAL", label: "Abyssal" },
    { value: "DAWN", label: "Dawn" },
  ],
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
    logoUrl.startsWith("/")
      ? ""
      : "/"
  }${logoUrl}`;
}

function ZoneBadge({
  zone,
  final,
}) {
  if (zone === "PROMOTE") {
    return (
      <span className="smart-zone smart-zone--promote">
        <ArrowUp size={10} />
        {final
          ? "Yuqori ligaga"
          : "Yuqori zona"}
      </span>
    );
  }

  if (zone === "RELEGATE") {
    return (
      <span className="smart-zone smart-zone--relegate">
        <ArrowDown size={10} />
        {final
          ? "Quyi ligaga"
          : "Quyi zona"}
      </span>
    );
  }

  if (zone === "STAY") {
    return (
      <span className="smart-zone smart-zone--stay">
        <Minus size={10} />
        Divisionda qoladi
      </span>
    );
  }

  return null;
}

export default function LeagueStandingsPanel({
  currentTeam,
}) {
  const initialGame =
    currentTeam?.game ||
    "PUBG";

  const [game, setGame] =
    useState(initialGame);

  const [leagueTier, setLeagueTier] =
    useState(
      currentTeam?.leagueTier ||
      leagues[initialGame][
        leagues[initialGame].length - 1
      ].value,
    );

  const [competitionType, setCompetitionType] =
    useState("QUALIFIER");

  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const changeGame = (
    nextGame,
  ) => {
    setGame(nextGame);

    setLeagueTier(
      leagues[nextGame][
        leagues[nextGame].length - 1
      ].value,
    );
  };

  const loadStandings =
    async () => {
      setLoading(true);
      setError("");

      try {
        const season =
          currentTeam?.season || "";

        const result =
          game === "PUBG"
            ? await getSmartCompetitionStandings({
                season,
                game: "PUBG",
                leagueTier,
                competitionType,
              })
            : await getMlbbStandings({
                season,
                leagueTier,
              });

        setData(result);
      } catch (requestError) {
        setError(
          requestError.message,
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadStandings();
  }, [
    game,
    leagueTier,
    competitionType,
    currentTeam?.season,
  ]);

  const standings =
    data?.standings || [];

  return (
    <section className="smart-standings-panel">
      <header className="smart-standings-header">
        <div>
          <span>OFFICIAL RANKING</span>

          <h2>
            Liga turnir jadvali
          </h2>

          <p>
            {game === "PUBG"
              ? "Turlar, killar va avtomatik ball."
              : "Seriyalar, g‘alabalar va avtomatik MLBB reytingi."}
          </p>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={loadStandings}
        >
          <RefreshCw
            size={16}
            className={
              loading
                ? "smart-standings-spin"
                : ""
            }
          />
          Yangilash
        </button>
      </header>

      <div className="smart-standings-filters">
        <div>
          <button
            type="button"
            className={
              game === "PUBG"
                ? "active"
                : ""
            }
            onClick={() =>
              changeGame("PUBG")
            }
          >
            <Gamepad2 size={14} />
            PUBG
          </button>

          <button
            type="button"
            className={
              game === "MLBB"
                ? "active"
                : ""
            }
            onClick={() =>
              changeGame("MLBB")
            }
          >
            <Swords size={14} />
            MLBB
          </button>
        </div>

        <select
          value={leagueTier}
          onChange={(event) =>
            setLeagueTier(
              event.target.value,
            )
          }
        >
          {leagues[game].map(
            (league) => (
              <option
                key={league.value}
                value={league.value}
              >
                {league.label}
              </option>
            ),
          )}
        </select>

        {game === "PUBG" && (
          <select
            value={competitionType}
            onChange={(event) =>
              setCompetitionType(
                event.target.value,
              )
            }
          >
            <option value="QUALIFIER">
              Saralash
            </option>

            <option value="LEAGUE">
              Liga mavsumi
            </option>
          </select>
        )}
      </div>

      {data?.fairness && (
        <div className="smart-fairness">
          <ShieldAlert size={17} />

          <section>
            <strong>
              {game === "PUBG"
                ? data.fairness.canFinalize
                  ? "Barcha jamoalar teng o‘ynagan"
                  : data.fairness.provisional
                    ? "Vaqtinchalik reyting"
                    : "Turnir davom etmoqda"
                : data.fairness.seasonComplete
                  ? "MLBB liga mavsumi yakunlangan"
                  : `${data.fairness.remainingRounds} ta tur qoldi`}
            </strong>

            <span>
              {game === "PUBG" ? (
                <>
                  Eng kam:{" "}
                  {data.fairness.minimumPlayed}
                  {" • "}
                  Eng ko‘p:{" "}
                  {data.fairness.maximumPlayed}
                </>
              ) : (
                <>
                  Turlar:{" "}
                  {data.fairness.completedRounds}
                  /
                  {data.fairness.totalRounds}
                  {" • "}
                  O‘yin farqi:{" "}
                  {data.fairness.playDifference}
                </>
              )}
            </span>
          </section>
        </div>
      )}

      {loading ? (
        <div className="smart-standings-state">
          <LoaderCircle
            size={30}
            className="smart-standings-spin"
          />

          <strong>
            Jadval yuklanmoqda
          </strong>
        </div>
      ) : error ? (
        <div className="smart-standings-state smart-standings-state--error">
          <ShieldAlert size={27} />
          <strong>
            Jadvalni yuklab bo‘lmadi
          </strong>
          <p>{error}</p>
        </div>
      ) : standings.length === 0 ? (
        <div className="smart-standings-state">
          <Trophy size={29} />
          <strong>
            Ushbu ligada jamoa mavjud emas
          </strong>
        </div>
      ) : game === "PUBG" ? (
        <div className="smart-standings-table">
          <header>
            <span>#</span>
            <span>Jamoa</span>
            <span>Turlar</span>
            <span>Kill</span>
            <span>Ball</span>
          </header>

          {standings.map(
            (team) => {
              const logo =
                resolveLogo(
                  team.logoUrl,
                );

              return (
                <article
                  key={team.id}
                  className={
                    currentTeam?.id ===
                    team.id
                      ? "smart-standing-row smart-standing-row--current"
                      : "smart-standing-row"
                  }
                >
                  <div className="smart-standing-rank">
                    {team.rank === 1
                      ? <Crown size={16} />
                      : team.rank}
                  </div>

                  <div className="smart-standing-team">
                    <div>
                      {logo ? (
                        <img
                          src={logo}
                          alt=""
                        />
                      ) : (
                        <Crown size={16} />
                      )}
                    </div>

                    <section>
                      <strong>
                        {team.name}
                      </strong>

                      <span>
                        {team.tag}
                      </span>

                      <ZoneBadge
                        zone={team.zone}
                        final={
                          team.zoneFinal
                        }
                      />
                    </section>
                  </div>

                  <strong>
                    {team.playedRounds}
                  </strong>

                  <strong>
                    {team.totalKills}
                  </strong>

                  <strong className="smart-standing-points">
                    {team.totalPoints}
                  </strong>
                </article>
              );
            },
          )}
        </div>
      ) : (
        <div className="mlbb-public-table">
          <header>
            <span>#</span>
            <span>Jamoa</span>
            <span>O‘yin</span>
            <span>G‘</span>
            <span>M</span>
            <span>Ball</span>
          </header>

          {standings.map(
            (team) => {
              const logo =
                resolveLogo(
                  team.logoUrl,
                );

              return (
                <article
                  key={team.id}
                  className={
                    currentTeam?.id ===
                    team.id
                      ? "mlbb-public-row mlbb-public-row--current"
                      : "mlbb-public-row"
                  }
                >
                  <div>
                    {team.rank === 1
                      ? <Crown size={15} />
                      : team.rank}
                  </div>

                  <div className="smart-standing-team">
                    <div>
                      {logo ? (
                        <img
                          src={logo}
                          alt=""
                        />
                      ) : (
                        <Crown size={15} />
                      )}
                    </div>

                    <section>
                      <strong>
                        {team.name}
                      </strong>

                      <span>
                        {team.tag}
                        {" • "}
                        Map{" "}
                        {team.mapDifference > 0
                          ? "+"
                          : ""}
                        {team.mapDifference}
                      </span>

                      {team.zone === "PROMOTE" && (
                        <span className="mlbb-zone mlbb-zone--promote">
                          <ArrowUp size={9} />

                          {team.zoneFinal
                            ? "MLBB yuqori ligaga"
                            : "Yuqori zona"}
                        </span>
                      )}

                      {team.zone === "STAY" && (
                        <span className="mlbb-zone mlbb-zone--stay">
                          <Minus size={9} />
                          Ligada qoladi
                        </span>
                      )}

                      {team.zone === "RELEGATE" && (
                        <span className="mlbb-zone mlbb-zone--relegate">
                          <ArrowDown size={9} />

                          {team.zoneFinal
                            ? "MLBB quyi ligaga"
                            : "Quyi zona"}
                        </span>
                      )}
                    </section>
                  </div>

                  <strong>
                    {team.played}
                  </strong>

                  <strong>
                    {team.wins}
                  </strong>

                  <strong>
                    {team.losses}
                  </strong>

                  <strong className="smart-standing-points">
                    {team.points}
                  </strong>
                </article>
              );
            },
          )}
        </div>
      )}
    </section>
  );
}