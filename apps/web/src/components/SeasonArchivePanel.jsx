import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Archive,
  ArrowDown,
  ArrowUp,
  Crown,
  LoaderCircle,
  Minus,
  RefreshCw,
  ShieldAlert,
  Trophy,
} from "lucide-react";

import {
  API_URL,
  getArchivedSeasons,
  getArchivedStandings,
} from "../api/client.js";

import "./SeasonArchivePanel.css";

const leagues = {
  PUBG: [
    {
      value: "SOVEREIGN",
      label: "Sovereign",
    },
    {
      value: "VANGUARD",
      label: "Vanguard",
    },
    {
      value: "ASCENT",
      label: "Ascent",
    },
  ],

  MLBB: [
    {
      value: "IMPERIUM",
      label: "Imperium",
    },
    {
      value: "ABYSSAL",
      label: "Abyssal",
    },
    {
      value: "DAWN",
      label: "Dawn",
    },
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
}) {
  if (zone === "PROMOTE") {
    return (
      <span className="archive-zone archive-zone--promote">
        <ArrowUp size={9} />
        Yuqori ligaga
      </span>
    );
  }

  if (zone === "RELEGATE") {
    return (
      <span className="archive-zone archive-zone--relegate">
        <ArrowDown size={9} />
        Quyi ligaga
      </span>
    );
  }

  if (zone === "STAY") {
    return (
      <span className="archive-zone archive-zone--stay">
        <Minus size={9} />
        Ligada qolgan
      </span>
    );
  }

  return null;
}

export default function SeasonArchivePanel() {
  const [game, setGame] =
    useState("PUBG");

  const [season, setSeason] =
    useState("");

  const [leagueTier, setLeagueTier] =
    useState("ASCENT");

  const [availableSeasons, setAvailableSeasons] =
    useState([]);

  const [archive, setArchive] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const seasons =
    useMemo(
      () =>
        availableSeasons
          .filter(
            (item) =>
              item.game === game,
          )
          .map(
            (item) =>
              item.season,
          )
          .filter(
            (
              value,
              index,
              array,
            ) =>
              array.indexOf(
                value,
              ) === index,
          ),
      [
        availableSeasons,
        game,
      ],
    );

  const loadSeasonList =
    async () => {
      try {
        const result =
          await getArchivedSeasons();

        setAvailableSeasons(
          Array.isArray(
            result?.seasons,
          )
            ? result.seasons
            : [],
        );
      } catch (requestError) {
        setError(
          requestError.message,
        );
      }
    };

  useEffect(() => {
    loadSeasonList();
  }, []);

  useEffect(() => {
    const nextSeasons =
      availableSeasons
        .filter(
          (item) =>
            item.game === game,
        )
        .map(
          (item) =>
            item.season,
        );

    if (
      nextSeasons.length > 0
    ) {
      if (
        !nextSeasons.includes(
          season,
        )
      ) {
        setSeason(
          nextSeasons[0],
        );
      }
    } else {
      setSeason("");
      setArchive(null);
    }
  }, [
    game,
    availableSeasons,
  ]);

  const loadArchive =
    async () => {
      if (!season) {
        setArchive(null);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const result =
          await getArchivedStandings({
            season,
            game,
            leagueTier,
          });

        setArchive(result);
      } catch (requestError) {
        setArchive(null);

        setError(
          requestError.message,
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    if (season) {
      loadArchive();
    }
  }, [
    season,
    game,
    leagueTier,
  ]);

  const changeGame = (
    nextGame,
  ) => {
    setGame(nextGame);

    setLeagueTier(
      leagues[nextGame][
        leagues[nextGame].length -
          1
      ].value,
    );
  };

  const standings =
    archive?.standings || [];

  return (
    <section className="season-archive-panel">
      <header className="season-archive-header">
        <div>
          <span>
            SEASON HISTORY
          </span>

          <h2>
            Mavsum arxivi
          </h2>

          <p>
            Yakunlangan mavsumlarning
            rasmiy va o‘zgarmaydigan
            turnir jadvallari.
          </p>
        </div>

        <Archive size={25} />
      </header>

      <div className="season-archive-controls">
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
            MLBB
          </button>
        </div>

        <select
          value={season}
          disabled={
            seasons.length === 0
          }
          onChange={(event) =>
            setSeason(
              event.target.value,
            )
          }
        >
          {seasons.length === 0 ? (
            <option value="">
              Arxiv mavjud emas
            </option>
          ) : (
            seasons.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ),
            )
          )}
        </select>

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

        <button
          type="button"
          disabled={
            loading ||
            !season
          }
          onClick={loadArchive}
        >
          <RefreshCw
            size={15}
            className={
              loading
                ? "season-archive-spin"
                : ""
            }
          />
        </button>
      </div>

      {loading ? (
        <div className="season-archive-state">
          <LoaderCircle
            size={29}
            className="season-archive-spin"
          />

          <strong>
            Arxiv yuklanmoqda
          </strong>
        </div>
      ) : error ? (
        <div className="season-archive-state season-archive-state--error">
          <ShieldAlert size={25} />

          <strong>
            Arxivni yuklab bo‘lmadi
          </strong>

          <p>
            {error}
          </p>
        </div>
      ) : !season ? (
        <div className="season-archive-state">
          <Archive size={28} />

          <strong>
            Hali yakunlangan mavsum yo‘q
          </strong>

          <p>
            Mavsum rasmiy yakunlangach
            shu yerda avtomatik paydo
            bo‘ladi.
          </p>
        </div>
      ) : !archive?.finalization ? (
        <div className="season-archive-state">
          <Trophy size={27} />

          <strong>
            Bu liga uchun arxiv mavjud emas
          </strong>

          <p>
            {season} mavsumidagi
            {` ${leagueTier} `}
            hali rasmiy yakunlanmagan.
          </p>
        </div>
      ) : (
        <>
          <div className="season-archive-summary">
            <div>
              <span>
                MAVSUM
              </span>

              <strong>
                {
                  archive.finalization
                    .season
                }
              </strong>
            </div>

            <div>
              <span>
                JAMOALAR
              </span>

              <strong>
                {
                  archive.finalization
                    .teamCount
                }
              </strong>
            </div>

            <div>
              <span>
                TURLAR
              </span>

              <strong>
                {
                  archive.finalization
                    .completedRounds
                }
              </strong>
            </div>

            <div>
              <span>
                KEYINGI MAVSUM
              </span>

              <strong>
                {
                  archive.finalization
                    .nextSeason
                }
              </strong>
            </div>
          </div>

          {game === "PUBG" ? (
            <div className="season-archive-table season-archive-table--pubg">
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
                      key={
                        team.teamId
                      }
                    >
                      <div className="season-archive-rank">
                        {team.rank === 1 ? (
                          <Crown size={15} />
                        ) : (
                          team.rank
                        )}
                      </div>

                      <div className="season-archive-team">
                        <div>
                          {logo ? (
                            <img
                              src={logo}
                              alt=""
                            />
                          ) : (
                            <Crown
                              size={15}
                            />
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
                            zone={
                              team.zone
                            }
                          />
                        </section>
                      </div>

                      <strong>
                        {
                          team.playedRounds
                        }
                      </strong>

                      <strong>
                        {
                          team.totalKills
                        }
                      </strong>

                      <strong className="season-archive-points">
                        {
                          team.totalPoints
                        }
                      </strong>
                    </article>
                  );
                },
              )}
            </div>
          ) : (
            <div className="season-archive-table season-archive-table--mlbb">
              <header>
                <span>#</span>
                <span>Jamoa</span>
                <span>O‘yin</span>
                <span>G‘</span>
                <span>M</span>
                <span>Map ±</span>
                <span>Ball</span>
              </header>

              {standings.map(
                (team) => (
                  <article
                    key={
                      team.teamId
                    }
                  >
                    <div className="season-archive-rank">
                      {team.rank === 1 ? (
                        <Crown size={15} />
                      ) : (
                        team.rank
                      )}
                    </div>

                    <div className="season-archive-team">
                      <div>
                        <Crown
                          size={15}
                        />
                      </div>

                      <section>
                        <strong>
                          {team.name}
                        </strong>

                        <span>
                          {team.tag}
                        </span>

                        <ZoneBadge
                          zone={
                            team.zone
                          }
                        />
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

                    <strong>
                      {team.mapDifference >
                      0
                        ? "+"
                        : ""}
                      {
                        team.mapDifference
                      }
                    </strong>

                    <strong className="season-archive-points">
                      {team.points}
                    </strong>
                  </article>
                ),
              )}
            </div>
          )}

          <footer className="season-archive-footer">
            <span>
              Rasmiy yakunlangan:
            </span>

            <strong>
              {
                archive.finalization
                  .finalizedAt
              }
            </strong>
          </footer>
        </>
      )}
    </section>
  );
}