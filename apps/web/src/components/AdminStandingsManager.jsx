import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BarChart3,
  BedDouble,
  Check,
  ChevronDown,
  ChevronUp,
  Crown,
  Gamepad2,
  LoaderCircle,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Swords,
  Trash2,
  Trophy,
} from "lucide-react";

import {
  completeAdminCompetitionRound,
  createAdminCompetitionRound,
  deleteAdminCompetitionRound,
  getAdminCompetitionOverview,
  getAdminCompetitionRound,
  notifyAdminPubgRound,
  saveAdminCompetitionSettings,
  saveAdminCompetitionTeamResults,
} from "../api/client.js";

import StandingsPosterModal from "../features/standings-export/StandingsPosterModal.jsx";
import "./AdminStandingsManager.css";

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

const placementPoints = {
  1: 10,
  2: 6,
  3: 5,
  4: 4,
  5: 3,
  6: 2,
  7: 1,
  8: 1,
};

function createEmptyMaps() {
  return Array.from(
    {
      length: 4,
    },

    (_, index) => ({
      mapNumber: index + 1,
      placement: "",
      kills: "",
    }),
  );
}

function createTeamDraft(team) {
  const existingMaps =
    Array.isArray(team.maps)
      ? team.maps
      : [];

  return Array.from(
    {
      length: 4,
    },

    (_, index) => {
      const existing =
        existingMaps.find(
          (map) =>
            map.mapNumber ===
            index + 1,
        );

      return {
        mapNumber:
          index + 1,

        placement:
          existing?.placement ??
          "",

        kills:
          existing?.kills ??
          "",
      };
    },
  );
}

function numberValue(value) {
  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? Math.trunc(parsed)
    : 0;
}

function previewMap(map) {
  const placement =
    numberValue(
      map.placement,
    );

  const kills =
    numberValue(
      map.kills,
    );

  const placementScore =
    placementPoints[
      placement
    ] || 0;

  return {
    kills,
    points:
      placementScore + kills,
  };
}

function previewRound(maps) {
  return maps.reduce(
    (total, map) => {
      const result =
        previewMap(map);

      return {
        kills:
          total.kills +
          result.kills,

        points:
          total.points +
          result.points,
      };
    },

    {
      kills: 0,
      points: 0,
    },
  );
}

export default function AdminStandingsManager({
  adminSecret,
  adminName,
}) {
  const [expanded, setExpanded] =
    useState(false);

  const [season, setSeason] =
    useState("S01");

  const [game, setGame] =
    useState("PUBG");

  const [leagueTier, setLeagueTier] =
    useState("ASCENT");

  const [
    competitionType,
    setCompetitionType,
  ] = useState("QUALIFIER");

  const [overview, setOverview] =
    useState(null);
  const [posterOpen, setPosterOpen] =
    useState(false);

  const [
    selectedRound,
    setSelectedRound,
  ] = useState(null);

  const [drafts, setDrafts] =
    useState({});

  const [settingsDraft, setSettingsDraft] =
    useState({
      activeTeamsPerRound: 25,
      promoteCount: 25,
      relegateCount: 25,
    });

  const [teamSearch, setTeamSearch] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [roundLoading, setRoundLoading] =
    useState(false);

  const [notifyingRound, setNotifyingRound] =
    useState(false);

  const [savingTeamId, setSavingTeamId] =
    useState("");

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const loadOverview = async () => {
    if (!adminSecret) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result =
        await getAdminCompetitionOverview(
          adminSecret,
          {
            season,
            game,
            leagueTier,
            competitionType,
          },
        );

      setOverview(result);

      setSettingsDraft({
        activeTeamsPerRound:
          result.settings
            .activeTeamsPerRound,

        promoteCount:
          result.settings
            .promoteCount,

        relegateCount:
          result.settings
            .relegateCount,
      });
    } catch (requestError) {
      setError(
        requestError.message,
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (expanded) {
      setSelectedRound(null);
      setDrafts({});
      loadOverview();
    }
  }, [
    expanded,
    season,
    game,
    leagueTier,
    competitionType,
    adminSecret,
  ]);

  const changeGame = (
    nextGame,
  ) => {
    setGame(nextGame);

    setLeagueTier(
      leagues[
        nextGame
      ][
        leagues[nextGame].length -
          1
      ].value,
    );
  };

  const saveSettings = async () => {
    setError("");
    setNotice("");

    try {
      await saveAdminCompetitionSettings(
        adminSecret,
        {
          season,
          game,
          leagueTier,
          competitionType,

          activeTeamsPerRound:
            Number(
              settingsDraft
                .activeTeamsPerRound,
            ),

          promoteCount:
            Number(
              settingsDraft
                .promoteCount,
            ),

          relegateCount:
            Number(
              settingsDraft
                .relegateCount,
            ),

          adminName,
        },
      );

      setNotice(
        "Musobaqa sozlamalari saqlandi.",
      );

      await loadOverview();
    } catch (requestError) {
      setError(
        requestError.message,
      );
    }
  };

  const createRound = async () => {
    setRoundLoading(true);
    setError("");
    setNotice("");

    try {
      const result =
        await createAdminCompetitionRound(
          adminSecret,
          {
            season,
            game,
            leagueTier,
            competitionType,
            adminName,
          },
        );

      setNotice(
        `${result.round.roundNumber}-tur yaratildi.`,
      );

      await loadOverview();

      await openRound(
        result.round.id,
      );
    } catch (requestError) {
      setError(
        requestError.message,
      );
    } finally {
      setRoundLoading(false);
    }
  };

  const openRound = async (
    roundId,
  ) => {
    setRoundLoading(true);
    setError("");

    try {
      const result =
        await getAdminCompetitionRound(
          adminSecret,
          roundId,
        );

      setSelectedRound(
        result.round,
      );

      const nextDrafts = {};

      for (
        const team of
        result.round.playingTeams
      ) {
        nextDrafts[team.id] =
          createTeamDraft(team);
      }

      setDrafts(nextDrafts);
    } catch (requestError) {
      setError(
        requestError.message,
      );
    } finally {
      setRoundLoading(false);
    }
  };

  const updateMap = (
    teamId,
    mapIndex,
    field,
    value,
  ) => {
    setDrafts(
      (current) => {
        const maps =
          current[teamId] ||
          createEmptyMaps();

        const nextMaps =
          maps.map(
            (map, index) =>
              index === mapIndex
                ? {
                    ...map,
                    [field]: value,
                  }
                : map,
          );

        return {
          ...current,
          [teamId]:
            nextMaps,
        };
      },
    );
  };

  const saveTeam = async (
    team,
  ) => {
    const maps =
      drafts[team.id] ||
      createEmptyMaps();

    const incomplete =
      maps.some(
        (map) =>
          !String(
            map.placement,
          ).trim() ||
          String(
            map.kills,
          ).trim() === "",
      );

    if (incomplete) {
      setError(
        `${team.technicalNumber} — ${team.name}: 4 ta kartaning o‘rni va killari to‘liq kiritilmagan.`,
      );

      return;
    }

    setSavingTeamId(
      team.id,
    );

    setError("");
    setNotice("");

    try {
      const result =
        await saveAdminCompetitionTeamResults(
          adminSecret,
          selectedRound.id,
          team.id,

          maps.map(
            (map) => ({
              placement:
                Number(
                  map.placement,
                ),

              kills:
                Number(
                  map.kills,
                ),
            }),
          ),
        );

      setSelectedRound(
        result.round,
      );

      const nextDrafts = {};

      for (
        const roundTeam of
        result.round.playingTeams
      ) {
        nextDrafts[
          roundTeam.id
        ] = createTeamDraft(
          roundTeam,
        );
      }

      setDrafts(nextDrafts);

      setNotice(
        `${team.technicalNumber} — ${team.name} natijalari saqlandi.`,
      );

      await loadOverview();
    } catch (requestError) {
      setError(
        requestError.message,
      );
    } finally {
      setSavingTeamId("");
    }
  };

  const notifyRound = async () => {
    if (!selectedRound?.id) {
      return;
    }

    setNotifyingRound(true);
    setError("");
    setNotice("");

    try {
      const result =
        await notifyAdminPubgRound(
          adminSecret,
          selectedRound.id,
        );

      const summary =
        result.summary;

      setNotice(
        `Telegram: ${summary.sent} yuborildi • ${summary.skipped} o'tkazib yuborildi • ${summary.failed} xato.`,
      );
    } catch (requestError) {
      setError(
        requestError.message,
      );
    } finally {
      setNotifyingRound(false);
    }
  };

  const completeRound = async () => {
    setRoundLoading(true);
    setError("");
    setNotice("");

    try {
      const result =
        await completeAdminCompetitionRound(
          adminSecret,
          selectedRound.id,
        );

      setSelectedRound(
        result.round,
      );

      setNotice(
        `${result.round.roundNumber}-tur muvaffaqiyatli yakunlandi.`,
      );

      await loadOverview();
    } catch (requestError) {
      setError(
        requestError.message,
      );
    } finally {
      setRoundLoading(false);
    }
  };

  const removeRound = async (
    round,
  ) => {
    const accepted =
      window.confirm(
        `${round.roundNumber}-turni barcha natijalari bilan o‘chirasizmi?`,
      );

    if (!accepted) {
      return;
    }

    setRoundLoading(true);
    setError("");
    setNotice("");

    try {
      await deleteAdminCompetitionRound(
        adminSecret,
        round.id,
      );

      if (
        selectedRound?.id ===
        round.id
      ) {
        setSelectedRound(null);
        setDrafts({});
      }

      setNotice(
        `${round.roundNumber}-tur o‘chirildi.`,
      );

      await loadOverview();
    } catch (requestError) {
      setError(
        requestError.message,
      );
    } finally {
      setRoundLoading(false);
    }
  };

  const filteredTeams =
    useMemo(() => {
      const teams =
        selectedRound
          ?.playingTeams ||
        [];

      const search =
        teamSearch
          .trim()
          .toLowerCase();

      if (!search) {
        return teams;
      }

      return teams.filter(
        (team) =>
          team.name
            .toLowerCase()
            .includes(search) ||
          team.tag
            .toLowerCase()
            .includes(search) ||
          team.technicalNumber
            .toLowerCase()
            .includes(search),
      );
    }, [
      selectedRound,
      teamSearch,
    ]);

  return (
    <section className="admin-smart-tournament">
      <button
        type="button"
        className="admin-smart-toggle"
        onClick={() =>
          setExpanded(
            (current) => !current,
          )
        }
      >
        <div>
          <BarChart3 size={22} />

          <section>
            <span>
              SMART TOURNAMENT
            </span>

            <strong>
              PUBG turlari va avtomatik ball
            </strong>

            <small>
              PUBG: 4 ta karta, dam olish
              rotatsiyasi va fairness nazorati
            </small>
          </section>
        </div>

        {expanded ? (
          <ChevronUp size={18} />
        ) : (
          <ChevronDown size={18} />
        )}
      </button>

      {expanded && (
        <div className="admin-smart-content">
          <div className="admin-smart-filters">
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

            <input
              className="admin-smart-season-input"
              type="text"
              value={season}
              maxLength={10}
              aria-label="Mavsum"
              onChange={(event) =>
                setSeason(
                  event.target.value
                    .toUpperCase(),
                )
              }
            />

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

            <button
              type="button"
              disabled={loading}
              onClick={loadOverview}
            >
              <RefreshCw
                size={15}
                className={
                  loading
                    ? "admin-smart-spin"
                    : ""
                }
              />
            </button>
            {/* LIGA_ARENA_STANDINGS_POSTER_BUTTON */}
            <button
              type="button"
              title="Turnir jadvalini poster qilish"
              disabled={
                loading ||
                !overview?.standings?.length
              }
              onClick={() =>
                setPosterOpen(true)
              }
              style={{
                width: "auto",
                minWidth: "112px",
                padding: "0 14px",
              }}
            >
              Poster
            </button>

            <StandingsPosterModal
              open={posterOpen}
              onClose={() =>
                setPosterOpen(false)
              }
              game={game}
              season={season}
              leagueTier={leagueTier}
              standings={
                overview?.standings || []
              }
              title={`${leagueTier} turnir jadvali`}
              subtitle={`${season} • ${
                competitionType ===
                "QUALIFIER"
                  ? "Saralash"
                  : "Liga mavsumi"
              }`}
            />
          </div>

          {error && (
            <div className="admin-smart-alert admin-smart-alert--error">
              {error}
            </div>
          )}

          {notice && (
            <div className="admin-smart-alert admin-smart-alert--success">
              {notice}
            </div>
          )}

          {loading || !overview ? (
            <div className="admin-smart-empty">
              <LoaderCircle
                size={29}
                className="admin-smart-spin"
              />

              <strong>
                Musobaqa ma’lumotlari
                yuklanmoqda
              </strong>
            </div>
          ) : (
            <>
              <div className="admin-smart-settings">
                <header>
                  <div>
                    <span>
                      COMPETITION SETTINGS
                    </span>

                    <h3>
                      Musobaqa sozlamalari
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={saveSettings}
                  >
                    <Save size={15} />
                    Saqlash
                  </button>
                </header>

                <div>
                  <label>
                    <span>
                      Bir turda o‘ynaydi
                    </span>

                    <input
                      type="number"
                      min="1"
                      value={
                        settingsDraft
                          .activeTeamsPerRound
                      }
                      onChange={(event) =>
                        setSettingsDraft(
                          (current) => ({
                            ...current,

                            activeTeamsPerRound:
                              event.target
                                .value,
                          }),
                        )
                      }
                    />
                  </label>

                  <label>
                    <span>
                      Yuqori ligaga
                    </span>

                    <input
                      type="number"
                      min="0"
                      value={
                        settingsDraft
                          .promoteCount
                      }
                      onChange={(event) =>
                        setSettingsDraft(
                          (current) => ({
                            ...current,

                            promoteCount:
                              event.target
                                .value,
                          }),
                        )
                      }
                    />
                  </label>

                  <label>
                    <span>
                      Quyi ligaga
                    </span>

                    <input
                      type="number"
                      min="0"
                      value={
                        settingsDraft
                          .relegateCount
                      }
                      onChange={(event) =>
                        setSettingsDraft(
                          (current) => ({
                            ...current,

                            relegateCount:
                              event.target
                                .value,
                          }),
                        )
                      }
                    />
                  </label>

                  <label>
                    <span>
                      Har bir tur
                    </span>

                    <input
                      type="text"
                      value="4 ta karta"
                      readOnly
                    />
                  </label>
                </div>
              </div>

              <div
                className={
                  overview.fairness
                    .canFinalize
                    ? "admin-fairness admin-fairness--success"
                    : overview.fairness
                        .playDifference <= 1
                      ? "admin-fairness"
                      : "admin-fairness admin-fairness--danger"
                }
              >
                <ShieldAlert size={23} />

                <section>
                  <span>
                    SEASON FAIRNESS CONTROL
                  </span>

                  <strong>
                    {overview.fairness
                      .canFinalize
                      ? "Barcha jamoalar teng o‘ynagan"
                      : overview.fairness
                            .playDifference <=
                          1
                        ? "Rotatsiya normal holatda"
                        : "O‘yinlar sonida farq mavjud"}
                  </strong>

                  <div>
                    <small>
                      Jamoalar:{" "}
                      {
                        overview.fairness
                          .teamCount
                      }
                    </small>

                    <small>
                      Eng kam:{" "}
                      {
                        overview.fairness
                          .minimumPlayed
                      }{" "}
                      tur
                    </small>

                    <small>
                      Eng ko‘p:{" "}
                      {
                        overview.fairness
                          .maximumPlayed
                      }{" "}
                      tur
                    </small>

                    <small>
                      Farq:{" "}
                      {
                        overview.fairness
                          .playDifference
                      }{" "}
                      tur
                    </small>
                  </div>

                  {overview.fairness
                    .issues.map(
                      (issue) => (
                        <p key={issue}>
                          {issue}
                        </p>
                      ),
                    )}
                </section>
              </div>

              <div className="admin-rounds-control">
                <header>
                  <div>
                    <span>
                      ROUNDS
                    </span>

                    <h3>
                      Musobaqa turlari
                    </h3>
                  </div>

                  <button
                    type="button"
                    disabled={roundLoading}
                    onClick={createRound}
                  >
                    {roundLoading ? (
                      <LoaderCircle
                        size={15}
                        className="admin-smart-spin"
                      />
                    ) : (
                      <Plus size={15} />
                    )}

                    Keyingi turni yaratish
                  </button>
                </header>

                {overview.rounds.length ===
                0 ? (
                  <div className="admin-smart-empty admin-smart-empty--small">
                    <Trophy size={25} />

                    <strong>
                      Hali tur yaratilmagan
                    </strong>
                  </div>
                ) : (
                  <div className="admin-round-list">
                    {overview.rounds.map(
                      (round) => (
                        <article
                          key={round.id}
                          className={
                            selectedRound
                              ?.id ===
                            round.id
                              ? "active"
                              : ""
                          }
                        >
                          <button
                            type="button"
                            onClick={() =>
                              openRound(
                                round.id,
                              )
                            }
                          >
                            <strong>
                              {
                                round.roundNumber
                              }
                              -tur
                            </strong>

                            <span>
                              {
                                round.status
                              }
                            </span>

                            <small>
                              O‘ynaydi:{" "}
                              {
                                round.playingTeams
                              }
                              {" • "}
                              Dam:{" "}
                              {
                                round.restTeams
                              }
                              {" • "}
                              Tayyor:{" "}
                              {
                                round.readyTeams
                              }
                              /
                              {
                                round.playingTeams
                              }
                            </small>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              removeRound(
                                round,
                              )
                            }
                          >
                            <Trash2
                              size={14}
                            />
                          </button>
                        </article>
                      ),
                    )}
                  </div>
                )}
              </div>

              {selectedRound && (
                <div className="admin-round-editor">
                  <header>
                    <div>
                      <span>
                        ROUND RESULTS
                      </span>

                      <h3>
                        {
                          selectedRound
                            .roundNumber
                        }
                        -tur natijalari
                      </h3>

                      <p>
                        Har bir jamoa uchun
                        4 ta kartadagi o‘rin va
                        kill sonini kiriting.
                      </p>
                    </div>

                    <div className="admin-round-header-actions">
                      <button
                        type="button"
                        className="admin-round-notify-button"
                        disabled={
                          notifyingRound
                        }
                        onClick={
                          notifyRound
                        }
                      >
                        {notifyingRound
                          ? "Yuborilmoqda..."
                          : "Telegramga yuborish"}
                      </button>

                      <button
                        type="button"
                        disabled={
                          roundLoading ||
                          selectedRound.status ===
                            "COMPLETED"
                        }
                        onClick={
                          completeRound
                        }
                      >
                      <Check size={15} />

                      {selectedRound.status ===
                      "COMPLETED"
                        ? "Tur jadvalga chiqarilgan"
                        : "Turni yakunlash va jadvalga chiqarish"}
                      </button>
                    </div>
                  </header>

                  {selectedRound
                    .restTeams.length >
                    0 && (
                    <div className="admin-rest-teams">
                      <div>
                        <BedDouble
                          size={19}
                        />

                        <section>
                          <span>
                            DAM OLADI
                          </span>

                          <strong>
                            Bu turda qatnashmaydigan
                            jamoalar
                          </strong>
                        </section>
                      </div>

                      <div>
                        {selectedRound.restTeams.map(
                          (team) => (
                            <span
                              key={team.id}
                            >
                              {
                                team.technicalNumber
                              }
                              {" — "}
                              {team.name}
                            </span>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                  <label className="admin-team-search">
                    <Search size={15} />

                    <input
                      type="text"
                      value={teamSearch}
                      placeholder="Texnik raqam, jamoa yoki TAG..."
                      onChange={(event) =>
                        setTeamSearch(
                          event.target.value,
                        )
                      }
                    />
                  </label>

                  <div className="admin-round-team-list">
                    {filteredTeams.map(
                      (team) => {
                        const maps =
                          drafts[
                            team.id
                          ] ||
                          createEmptyMaps();

                        const preview =
                          previewRound(
                            maps,
                          );

                        return (
                          <article
                            key={team.id}
                          >
                            <header>
                              <div>
                                <span>
                                  {
                                    team.technicalNumber
                                  }
                                </span>

                                <strong>
                                  {
                                    team.name
                                  }
                                </strong>

                                <small>
                                  {
                                    team.tag
                                  }
                                  {" • "}
                                  {
                                    team.region
                                  }
                                </small>
                              </div>

                              <div>
                                <span>
                                  TUR NATIJASI
                                </span>

                                <strong>
                                  {
                                    preview.kills
                                  }{" "}
                                  kill
                                  {" • "}
                                  {
                                    preview.points
                                  }{" "}
                                  ball
                                </strong>
                              </div>
                            </header>

                            <div className="admin-map-grid">
                              {maps.map(
                                (
                                  map,
                                  mapIndex,
                                ) => {
                                  const mapPreview =
                                    previewMap(
                                      map,
                                    );

                                  return (
                                    <section
                                      key={
                                        map.mapNumber
                                      }
                                    >
                                      <header>
                                        {
                                          map.mapNumber
                                        }
                                        -karta

                                        <span>
                                          {
                                            mapPreview.points
                                          }{" "}
                                          ball
                                        </span>
                                      </header>

                                      <label>
                                        <span>
                                          O‘rin
                                        </span>

                                        <input
                                          type="number"
                                          min="1"
                                          max="100"
                                          value={
                                            map.placement
                                          }
                                          onChange={(
                                            event,
                                          ) =>
                                            updateMap(
                                              team.id,
                                              mapIndex,
                                              "placement",
                                              event
                                                .target
                                                .value,
                                            )
                                          }
                                        />
                                      </label>

                                      <label>
                                        <span>
                                          Kill
                                        </span>

                                        <input
                                          type="number"
                                          min="0"
                                          value={
                                            map.kills
                                          }
                                          onChange={(
                                            event,
                                          ) =>
                                            updateMap(
                                              team.id,
                                              mapIndex,
                                              "kills",
                                              event
                                                .target
                                                .value,
                                            )
                                          }
                                        />
                                      </label>
                                    </section>
                                  );
                                },
                              )}
                            </div>

                            <footer>
                              <span>
                                {team.complete
                                  ? "✓ Natija saqlangan"
                                  : "Natija kutilmoqda"}
                              </span>

                              <button
                                type="button"
                                disabled={
                                  savingTeamId ===
                                  team.id
                                }
                                onClick={() =>
                                  saveTeam(team)
                                }
                              >
                                {savingTeamId ===
                                team.id ? (
                                  <LoaderCircle
                                    size={15}
                                    className="admin-smart-spin"
                                  />
                                ) : (
                                  <Save
                                    size={15}
                                  />
                                )}

                                4 ta kartani
                                saqlash
                              </button>
                            </footer>
                          </article>
                        );
                      },
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}