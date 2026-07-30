import {
  useEffect,
  useState,
} from "react";

import {
  Check,
  ChevronDown,
  ChevronUp,
  Crown,
  Gamepad2,
  LoaderCircle,
  Minus,
  Plus,
  RefreshCw,
  Save,
  ShieldAlert,
  Trash2,
  Users,
} from "lucide-react";

import {
  completeAdminMlbbRound,
  createAdminMlbbRound,
  deleteAdminMlbbRound,
  finalizeAdminMlbbSeason,
  getAdminMlbbOverview,
  getAdminMlbbRound,
  getCurrentSeason,
  notifyAdminMlbbRound,
  saveAdminMlbbMatch,
  saveAdminMlbbSettings,
} from "../api/client.js";

import StandingsPosterModal from "../features/standings-export/StandingsPosterModal.jsx";
import "./AdminMlbbManager.css";

const leagues = [
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
];

function createScoreDraft(
  match,
) {
  return {
    scoreA:
      match.scoreA ?? "",

    scoreB:
      match.scoreB ?? "",
  };
}

export default function AdminMlbbManager({
  adminSecret,
  adminName,
}) {
  const [expanded, setExpanded] =
    useState(false);

  const [season, setSeason] =
    useState("S01");

  const [leagueTier, setLeagueTier] =
    useState("DAWN");

  const [overview, setOverview] =
    useState(null);
  const [posterOpen, setPosterOpen] =
    useState(false);

  const [selectedRound, setSelectedRound] =
    useState(null);

  const [scores, setScores] =
    useState({});

  const [loading, setLoading] =
    useState(false);

  const [savingId, setSavingId] =
    useState("");

  const [notifyingRound, setNotifyingRound] =
    useState(false);

  const [finalizing, setFinalizing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const [settingsDraft, setSettingsDraft] =
    useState({
      bestOf: 3,
      winPoints: 3,
      lossPoints: 0,
      promoteCount: 25,
      relegateCount: 25,
    });

  const loadOverview =
    async () => {
      if (!adminSecret) {
        return;
      }

      setLoading(true);
      setError("");

      try {
        const result =
          await getAdminMlbbOverview(
            adminSecret,
            {
              season,
              leagueTier,
            },
          );

        setOverview(result);

        setSettingsDraft({
          bestOf:
            result.settings.bestOf,

          winPoints:
            result.settings.winPoints,

          lossPoints:
            result.settings.lossPoints,

          promoteCount:
            result.settings.promoteCount,

          relegateCount:
            result.settings.relegateCount,
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
    if (!expanded) {
      return;
    }

    getCurrentSeason()
      .then((result) => {
        if (result?.season) {
          setSeason(
            result.season,
          );
        }
      })
      .catch(() => {});
  }, [expanded]);

  useEffect(() => {
    if (expanded) {
      setSelectedRound(null);
      loadOverview();
    }
  }, [
    expanded,
    season,
    leagueTier,
    adminSecret,
  ]);

  const openRound =
    async (roundId) => {
      setLoading(true);
      setError("");

      try {
        const result =
          await getAdminMlbbRound(
            adminSecret,
            roundId,
          );

        setSelectedRound(
          result.round,
        );

        const nextScores = {};

        result.round.matches.forEach(
          (match) => {
            nextScores[match.id] =
              createScoreDraft(
                match,
              );
          },
        );

        setScores(nextScores);
      } catch (requestError) {
        setError(
          requestError.message,
        );
      } finally {
        setLoading(false);
      }
    };

  const createRound =
    async () => {
      setLoading(true);
      setError("");
      setNotice("");

      try {
        const result =
          await createAdminMlbbRound(
            adminSecret,
            {
              season,
              leagueTier,
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
        setLoading(false);
      }
    };

  const updateScore = (
    matchId,
    field,
    value,
  ) => {
    setScores(
      (current) => ({
        ...current,

        [matchId]: {
          ...(current[matchId] || {
            scoreA: "",
            scoreB: "",
          }),

          [field]: value,
        },
      }),
    );
  };

  const saveMatch =
    async (match) => {
      const draft =
        scores[match.id];

      if (
        draft?.scoreA === "" ||
        draft?.scoreB === ""
      ) {
        setError(
          "Ikkala jamoa hisobini ham kiriting.",
        );

        return;
      }

      setSavingId(match.id);
      setError("");
      setNotice("");

      try {
        const result =
          await saveAdminMlbbMatch(
            adminSecret,
            match.id,
            {
              scoreA:
                Number(
                  draft.scoreA,
                ),

              scoreB:
                Number(
                  draft.scoreB,
                ),
            },
          );

        setSelectedRound(
          result.round,
        );

        const nextScores = {};

        result.round.matches.forEach(
          (roundMatch) => {
            nextScores[
              roundMatch.id
            ] =
              createScoreDraft(
                roundMatch,
              );
          },
        );

        setScores(nextScores);

        setNotice(
          "Seriya natijasi saqlandi.",
        );

        await loadOverview();
      } catch (requestError) {
        setError(
          requestError.message,
        );
      } finally {
        setSavingId("");
      }
    };

  const notifyRound =
    async () => {
      if (!selectedRound?.id) {
        return;
      }

      setNotifyingRound(true);
      setError("");
      setNotice("");

      try {
        const result =
          await notifyAdminMlbbRound(
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

  const completeRound =
    async () => {
      setLoading(true);
      setError("");
      setNotice("");

      try {
        const result =
          await completeAdminMlbbRound(
            adminSecret,
            selectedRound.id,
          );

        setSelectedRound(
          result.round,
        );

        setNotice(
          `${result.round.roundNumber}-tur jadvalga chiqarildi.`,
        );

        await loadOverview();
      } catch (requestError) {
        setError(
          requestError.message,
        );
      } finally {
        setLoading(false);
      }
    };

  const finalizeSeason =
    async () => {
      if (
        !overview?.fairness
          ?.canFinalize
      ) {
        setError(
          "MLBB mavsumini yakunlash uchun barcha turlar tugashi va promotion/relegation zonalari uchun yetarli jamoa bo‘lishi kerak.",
        );

        return;
      }

      const accepted =
        window.confirm(
          `${season} ${leagueTier} MLBB mavsumini rasmiy yakunlaysizmi?\n\nYakuniy jadval muzlatiladi va keyingi mavsum liga joylashuvlari belgilanadi.`,
        );

      if (!accepted) {
        return;
      }

      setFinalizing(true);
      setError("");
      setNotice("");

      try {
        const result =
          await finalizeAdminMlbbSeason(
            adminSecret,
            {
              season,
              leagueTier,
              adminName,
            },
          );

        setOverview(
          result.overview,
        );

        setSelectedRound(null);

        setNotice(
          `${season} MLBB mavsumi rasmiy yakunlandi.`,
        );
      } catch (requestError) {
        setError(
          requestError.message,
        );
      } finally {
        setFinalizing(false);
      }
    };

  const removeRound =
    async (round) => {
      const accepted =
        window.confirm(
          `${round.roundNumber}-turni o‘chirasizmi?`,
        );

      if (!accepted) {
        return;
      }

      setLoading(true);
      setError("");

      try {
        await deleteAdminMlbbRound(
          adminSecret,
          round.id,
        );

        if (
          selectedRound?.id ===
          round.id
        ) {
          setSelectedRound(null);
        }

        await loadOverview();
      } catch (requestError) {
        setError(
          requestError.message,
        );
      } finally {
        setLoading(false);
      }
    };

  const saveSettings =
    async () => {
      setError("");
      setNotice("");

      try {
        const result =
          await saveAdminMlbbSettings(
            adminSecret,
            {
              season,
              leagueTier,

              bestOf:
                Number(
                  settingsDraft.bestOf,
                ),

              winPoints:
                Number(
                  settingsDraft.winPoints,
                ),

              lossPoints:
                Number(
                  settingsDraft.lossPoints,
                ),

              promoteCount:
                Number(
                  settingsDraft.promoteCount,
                ),

              relegateCount:
                Number(
                  settingsDraft.relegateCount,
                ),

              adminName,
            },
          );

        setSettingsDraft({
          bestOf:
            result.settings.bestOf,

          winPoints:
            result.settings.winPoints,

          lossPoints:
            result.settings.lossPoints,

          promoteCount:
            result.settings.promoteCount,

          relegateCount:
            result.settings.relegateCount,
        });

        setNotice(
          "MLBB hisoblash sozlamalari saqlandi.",
        );

        await loadOverview();
      } catch (requestError) {
        setError(
          requestError.message,
        );
      }
    };

  return (
    <section className="admin-mlbb-manager">
      <button
        type="button"
        className="admin-mlbb-toggle"
        onClick={() =>
          setExpanded(
            (current) => !current,
          )
        }
      >
        <div>
          <Gamepad2 size={22} />

          <section>
            <span>
              MLBB LEAGUE CONTROL
            </span>

            <strong>
              Mobile Legends turnirlari
            </strong>

            <small>
              Round-robin, BO3 va
              avtomatik turnir jadvali
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
        <div className="admin-mlbb-content">
          <div className="admin-mlbb-toolbar">
            <input
              value={season}
              readOnly
            />

            <select
              value={leagueTier}
              onChange={(event) =>
                setLeagueTier(
                  event.target.value,
                )
              }
            >
              {leagues.map(
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
              onClick={loadOverview}
              disabled={loading}
            >
              <RefreshCw
                size={15}
              />
            </button>
            {/* LIGA_ARENA_STANDINGS_POSTER_BUTTON */}
            <button
              type="button"
              title="MLBB jadvalini poster qilish"
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
              game="MLBB"
              season={season}
              leagueTier={leagueTier}
              standings={
                overview?.standings || []
              }
              title={`${leagueTier} turnir jadvali`}
              subtitle={`${season} • Mobile Legends liga jadvali`}
            />
          </div>

          {error && (
            <div className="admin-mlbb-alert admin-mlbb-alert--error">
              {error}
            </div>
          )}

          {notice && (
            <div className="admin-mlbb-alert admin-mlbb-alert--success">
              {notice}
            </div>
          )}

          {loading && !overview ? (
            <div className="admin-mlbb-empty">
              <LoaderCircle
                className="admin-mlbb-spin"
                size={28}
              />

              <strong>
                MLBB ma’lumotlari
                yuklanmoqda
              </strong>
            </div>
          ) : overview && (
            <>
              <div className="admin-mlbb-settings">
                <label>
                  <span>Format</span>

                  <select
                    value={
                      settingsDraft.bestOf
                    }
                    onChange={(event) =>
                      setSettingsDraft(
                        (current) => ({
                          ...current,

                          bestOf:
                            event.target
                              .value,
                        }),
                      )
                    }
                  >
                    <option value="1">
                      BO1
                    </option>

                    <option value="3">
                      BO3
                    </option>

                    <option value="5">
                      BO5
                    </option>
                  </select>
                </label>

                <label>
                  <span>
                    G‘alaba bali
                  </span>

                  <input
                    type="number"
                    min="0"
                    value={
                      settingsDraft
                        .winPoints
                    }
                    onChange={(event) =>
                      setSettingsDraft(
                        (current) => ({
                          ...current,

                          winPoints:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />
                </label>

                <label>
                  <span>
                    Mag‘lubiyat bali
                  </span>

                  <input
                    type="number"
                    min="0"
                    value={
                      settingsDraft
                        .lossPoints
                    }
                    onChange={(event) =>
                      setSettingsDraft(
                        (current) => ({
                          ...current,

                          lossPoints:
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
                            event.target.value,
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
                            event.target.value,
                        }),
                      )
                    }
                  />
                </label>

                <button
                  type="button"
                  disabled={
                    Boolean(
                      overview.finalization,
                    )
                  }
                  onClick={saveSettings}
                >
                  <Save size={15} />
                  Saqlash
                </button>
              </div>

              <div className="admin-mlbb-fairness">
                <ShieldAlert size={20} />

                <section>
                  <span>
                    ROUND ROBIN CONTROL
                  </span>

                  <strong>
                    {overview.fairness
                      .seasonComplete
                      ? "Barcha uchrashuvlar yakunlangan"
                      : `${overview.fairness.remainingRounds} ta tur qoldi`}
                  </strong>

                  <p>
                    Jamoalar:{" "}
                    {
                      overview.fairness
                        .teamCount
                    }
                    {" • "}
                    Turlar:{" "}
                    {
                      overview.fairness
                        .completedRounds
                    }
                    /
                    {
                      overview.fairness
                        .totalRounds
                    }
                    {" • "}
                    O‘yin farqi:{" "}
                    {
                      overview.fairness
                        .playDifference
                    }
                  </p>
                </section>
              </div>

              <div
                className={
                  overview.finalization
                    ? "admin-mlbb-finalization admin-mlbb-finalization--done"
                    : "admin-mlbb-finalization"
                }
              >
                <div>
                  <Crown size={23} />

                  <section>
                    <span>
                      MLBB SEASON FINALIZATION
                    </span>

                    <strong>
                      {overview.finalization
                        ? "MLBB mavsumi rasmiy yakunlangan"
                        : overview.fairness.canFinalize
                          ? "MLBB mavsumini yakunlashga tayyor"
                          : "MLBB mavsumi davom etmoqda"}
                    </strong>

                    <p>
                      {overview.finalization
                        ? `${overview.finalization.season} → ${overview.finalization.nextSeason}`
                        : `Top ${overview.settings.promoteCount} yuqoriga • Bottom ${overview.settings.relegateCount} quyiga`}
                    </p>
                  </section>
                </div>

                {overview.finalization ? (
                  <div className="admin-mlbb-finalized-badge">
                    <Check size={15} />
                    NATIJA MUZLATILGAN
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={
                      finalizing ||
                      !overview.fairness
                        .canFinalize
                    }
                    onClick={finalizeSeason}
                  >
                    {finalizing ? (
                      <LoaderCircle
                        size={15}
                        className="admin-mlbb-spin"
                      />
                    ) : (
                      <Crown size={15} />
                    )}

                    MLBB mavsumini yakunlash
                  </button>
                )}
              </div>

              <div className="admin-mlbb-rounds">
                <header>
                  <div>
                    <span>
                      MATCH ROUNDS
                    </span>

                    <h3>
                      MLBB turlari
                    </h3>
                  </div>

                  <button
                    type="button"
                    disabled={
                      loading ||
                      Boolean(
                        overview.finalization,
                      ) ||
                      overview.fairness
                        .remainingRounds ===
                        0
                    }
                    onClick={createRound}
                  >
                    <Plus size={15} />

                    Keyingi turni yaratish
                  </button>
                </header>

                <div className="admin-mlbb-round-list">
                  {overview.rounds.map(
                    (round) => (
                      <article
                        key={round.id}
                        className={
                          selectedRound?.id ===
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
                            {
                              round.completedMatches
                            }
                            /
                            {round.matches}
                            {" "}
                            uchrashuv
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
              </div>

              {selectedRound && (
                <div className="admin-mlbb-editor">
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
                        -tur
                      </h3>
                    </div>

                    <div className="admin-mlbb-round-actions">
                      <button
                        type="button"
                        className="admin-mlbb-notify-button"
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
                          loading ||
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

                  {selectedRound.byeTeam && (
                    <div className="admin-mlbb-bye">
                      <Minus size={17} />

                      <div>
                        <span>
                          BU TURDA DAM OLADI
                        </span>

                        <strong>
                          {
                            selectedRound
                              .byeTeam
                              .technicalNumber
                          }
                          {" — "}
                          {
                            selectedRound
                              .byeTeam
                              .name
                          }
                        </strong>
                      </div>
                    </div>
                  )}

                  <div className="admin-mlbb-match-list">
                    {selectedRound.matches.map(
                      (match) => {
                        const draft =
                          scores[
                            match.id
                          ] ||
                          createScoreDraft(
                            match,
                          );

                        return (
                          <article
                            key={match.id}
                          >
                            <div className="admin-mlbb-team">
                              <span>
                                {
                                  match.teamATechnicalNumber
                                }
                              </span>

                              <strong>
                                {
                                  match.teamAName
                                }
                              </strong>

                              <small>
                                {
                                  match.teamATag
                                }
                              </small>
                            </div>

                            <div className="admin-mlbb-score">
                              <input
                                type="number"
                                min="0"
                                value={
                                  draft.scoreA
                                }
                                disabled={
                                  selectedRound.status ===
                                  "COMPLETED"
                                }
                                onChange={(event) =>
                                  updateScore(
                                    match.id,
                                    "scoreA",
                                    event.target
                                      .value,
                                  )
                                }
                              />

                              <span>:</span>

                              <input
                                type="number"
                                min="0"
                                value={
                                  draft.scoreB
                                }
                                disabled={
                                  selectedRound.status ===
                                  "COMPLETED"
                                }
                                onChange={(event) =>
                                  updateScore(
                                    match.id,
                                    "scoreB",
                                    event.target
                                      .value,
                                  )
                                }
                              />
                            </div>

                            <div className="admin-mlbb-team admin-mlbb-team--right">
                              <span>
                                {
                                  match.teamBTechnicalNumber
                                }
                              </span>

                              <strong>
                                {
                                  match.teamBName
                                }
                              </strong>

                              <small>
                                {
                                  match.teamBTag
                                }
                              </small>
                            </div>

                            <button
                              type="button"
                              disabled={
                                savingId ===
                                  match.id ||
                                selectedRound.status ===
                                  "COMPLETED"
                              }
                              onClick={() =>
                                saveMatch(
                                  match,
                                )
                              }
                            >
                              {savingId ===
                              match.id ? (
                                <LoaderCircle
                                  size={14}
                                  className="admin-mlbb-spin"
                                />
                              ) : (
                                <Save
                                  size={14}
                                />
                              )}
                            </button>
                          </article>
                        );
                      },
                    )}
                  </div>
                </div>
              )}

              <div className="admin-mlbb-standings">
                <header>
                  <span>
                    LIVE STANDINGS
                  </span>

                  <h3>
                    Joriy jadval
                  </h3>
                </header>

                {overview.standings.length ===
                0 ? (
                  <div className="admin-mlbb-empty admin-mlbb-empty--small">
                    <Users size={24} />
                    Jamoalar topilmadi
                  </div>
                ) : (
                  <div>
                    {overview.standings.map(
                      (team) => (
                        <article
                          key={team.id}
                        >
                          <span>
                            #{team.rank}
                          </span>

                          <section>
                            <strong>
                              {team.name}
                            </strong>

                            <small>
                              {
                                team.technicalNumber
                              }
                            </small>
                          </section>

                          <div>
                            <span>
                              {team.played}
                              {" O‘"}
                            </span>

                            <span>
                              {team.wins}
                              {" G‘"}
                            </span>

                            <span>
                              {team.losses}
                              {" M"}
                            </span>

                            <span>
                              Map{" "}
                              {team.mapDifference >
                              0
                                ? "+"
                                : ""}
                              {
                                team.mapDifference
                              }
                            </span>

                            <strong>
                              {team.points}
                              {" ball"}
                            </strong>
                          </div>
                        </article>
                      ),
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}