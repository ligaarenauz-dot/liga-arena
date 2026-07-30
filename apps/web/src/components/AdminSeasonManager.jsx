import {
  useEffect,
  useState,
} from "react";

import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronUp,
  Crown,
  LoaderCircle,
  Minus,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

import {
  activateAdminNextSeason,
  getAdminSeasonReadiness,
} from "../api/client.js";

import "./AdminSeasonManager.css";

function leagueTitle(value) {
  const titles = {
    SOVEREIGN: "Sovereign",
    VANGUARD: "Vanguard",
    ASCENT: "Ascent",

    IMPERIUM: "Imperium",
    ABYSSAL: "Abyssal",
    DAWN: "Dawn",
  };

  return (
    titles[value] ||
    value ||
    "Belgilanmagan"
  );
}

function MovementIcon({
  movement,
}) {
  if (movement === "PROMOTED") {
    return <ArrowUp size={14} />;
  }

  if (movement === "RELEGATED") {
    return <ArrowDown size={14} />;
  }

  return <Minus size={14} />;
}

export default function AdminSeasonManager({
  adminSecret,
  adminName,
}) {
  const [expanded, setExpanded] =
    useState(false);

  const [season, setSeason] =
    useState("S01");

  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [activating, setActivating] =
    useState(false);

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const loadReadiness = async () => {
    if (!adminSecret) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result =
        await getAdminSeasonReadiness(
          adminSecret,
          season,
        );

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
    if (expanded) {
      loadReadiness();
    }
  }, [
    expanded,
    season,
    adminSecret,
  ]);

  const activateSeason =
    async () => {
      if (!data?.canActivate) {
        setError(
          "Keyingi mavsumni ochish uchun barcha liga va divisionlarning saralashi yakunlangan bo‘lishi kerak.",
        );

        return;
      }

      const accepted =
        window.confirm(
          `${data.sourceSeason} mavsumini yopib, ${data.targetSeason} mavsumini faollashtirasizmi?\n\n${data.teamCount} ta jamoa yangi mavsum ligalariga o‘tkaziladi.\n\nEski mavsum yakuniy natijalari tarixda saqlanadi.`,
        );

      if (!accepted) {
        return;
      }

      setActivating(true);
      setError("");
      setNotice("");

      try {
        const result =
          await activateAdminNextSeason(
            adminSecret,
            {
              season:
                data.sourceSeason,

              adminName:
                adminName ||
                "Liga Arena Admin",
            },
          );

        setData(
          result.readiness,
        );

        setNotice(
          `${result.readiness.targetSeason} mavsumi faollashtirildi.`,
        );
      } catch (requestError) {
        setError(
          requestError.message,
        );
      } finally {
        setActivating(false);
      }
    };

  return (
    <section className="admin-season-manager">
      <button
        type="button"
        className="admin-season-toggle"
        onClick={() =>
          setExpanded(
            (current) => !current,
          )
        }
      >
        <div>
          <CalendarRange size={22} />

          <section>
            <span>
              NEXT SEASON CONTROL
            </span>

            <strong>
              Mavsum boshqaruvi
            </strong>

            <small>
              Promotion, relegation va
              yangi mavsumni faollashtirish
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
        <div className="admin-season-content">
          <div className="admin-season-toolbar">
            <label>
              <span>
                Tekshirilayotgan mavsum
              </span>

              <input
                type="text"
                value={season}
                maxLength={10}
                onChange={(event) =>
                  setSeason(
                    event.target.value
                      .toUpperCase(),
                  )
                }
              />
            </label>

            <button
              type="button"
              disabled={loading}
              onClick={loadReadiness}
            >
              <RefreshCw
                size={15}
                className={
                  loading
                    ? "admin-season-spin"
                    : ""
                }
              />

              Yangilash
            </button>
          </div>

          {error && (
            <div className="admin-season-alert admin-season-alert--error">
              {error}
            </div>
          )}

          {notice && (
            <div className="admin-season-alert admin-season-alert--success">
              {notice}
            </div>
          )}

          {loading || !data ? (
            <div className="admin-season-empty">
              <LoaderCircle
                size={28}
                className="admin-season-spin"
              />

              <strong>
                Mavsum holati
                tekshirilmoqda
              </strong>
            </div>
          ) : (
            <>
              <div
                className={
                  data.activated
                    ? "admin-season-readiness admin-season-readiness--activated"
                    : data.canActivate
                      ? "admin-season-readiness admin-season-readiness--ready"
                      : "admin-season-readiness"
                }
              >
                <div>
                  {data.activated ? (
                    <Check size={25} />
                  ) : data.canActivate ? (
                    <Crown size={25} />
                  ) : (
                    <ShieldAlert size={25} />
                  )}

                  <section>
                    <span>
                      SEASON STATUS
                    </span>

                    <strong>
                      {data.activated
                        ? `${data.targetSeason} mavsumi faollashtirilgan`
                        : data.canActivate
                          ? `${data.targetSeason} mavsumiga o‘tish tayyor`
                          : "Barcha divisionlar hali tayyor emas"}
                    </strong>

                    <p>
                      {data.sourceSeason}
                      {" "}
                      <ArrowRight size={11} />
                      {" "}
                      {data.targetSeason}
                    </p>
                  </section>
                </div>

                {!data.activated && (
                  <button
                    type="button"
                    disabled={
                      activating ||
                      !data.canActivate
                    }
                    onClick={activateSeason}
                  >
                    {activating ? (
                      <LoaderCircle
                        size={16}
                        className="admin-season-spin"
                      />
                    ) : (
                      <Crown size={16} />
                    )}

                    {data.targetSeason}
                    {" "}
                    mavsumini ochish
                  </button>
                )}
              </div>

              <div className="admin-season-stats">
                <article>
                  <span>
                    JAMI JAMOA
                  </span>

                  <strong>
                    {data.teamCount}
                  </strong>
                </article>

                <article>
                  <span>
                    TAYYOR
                  </span>

                  <strong>
                    {data.readyTeamCount}
                  </strong>
                </article>

                <article className="promoted">
                  <ArrowUp size={16} />

                  <span>
                    YUQORIGA
                  </span>

                  <strong>
                    {data.promotedCount}
                  </strong>
                </article>

                <article>
                  <Minus size={16} />

                  <span>
                    QOLADI
                  </span>

                  <strong>
                    {data.stayedCount}
                  </strong>
                </article>

                <article className="relegated">
                  <ArrowDown size={16} />

                  <span>
                    QUYIGA
                  </span>

                  <strong>
                    {data.relegatedCount}
                  </strong>
                </article>
              </div>

              {data.blockedTeams?.length >
                0 && (
                <div className="admin-season-blocked">
                  <header>
                    <ShieldAlert size={17} />

                    <div>
                      <span>
                        BLOCKING TEAMS
                      </span>

                      <strong>
                        {
                          data.blockedTeamCount
                        }{" "}
                        ta jamoa tayyor emas
                      </strong>
                    </div>
                  </header>

                  <div>
                    {data.blockedTeams.map(
                      (team) => (
                        <article
                          key={team.id}
                        >
                          <span>
                            {
                              team.technicalNumber
                            }
                          </span>

                          <strong>
                            {team.name}
                          </strong>

                          <small>
                            {team.game}
                            {" • "}
                            {leagueTitle(
                              team.leagueTier,
                            )}
                          </small>

                          <p>
                            {team.reason}
                          </p>
                        </article>
                      ),
                    )}
                  </div>
                </div>
              )}

              {data.teams?.length >
                0 && (
                <div className="admin-season-movements">
                  <header>
                    <span>
                      TEAM MOVEMENTS
                    </span>

                    <strong>
                      Keyingi mavsum
                      joylashuvi
                    </strong>
                  </header>

                  <div>
                    {data.teams.map(
                      (team) => (
                        <article
                          key={
                            team.teamId ||
                            team.id
                          }
                          className={`movement-${team.movement?.toLowerCase()}`}
                        >
                          <MovementIcon
                            movement={
                              team.movement
                            }
                          />

                          <section>
                            <span>
                              {
                                team.technicalNumber
                              }
                            </span>

                            <strong>
                              {team.teamName ||
                                team.name}
                            </strong>

                            <small>
                              {team.game}
                            </small>
                          </section>

                          <div>
                            <span>
                              {leagueTitle(
                                team.sourceLeagueTier ||
                                  team.leagueTier,
                              )}
                            </span>

                            <ArrowRight
                              size={12}
                            />

                            <strong>
                              {leagueTitle(
                                team.targetLeagueTier ||
                                  team.nextLeagueTier,
                              )}
                            </strong>
                          </div>
                        </article>
                      ),
                    )}
                  </div>
                </div>
              )}

              {data.activated && (
                <div className="admin-season-activated">
                  <Check size={18} />

                  <div>
                    <strong>
                      Mavsum almashtirilgan
                    </strong>

                    <span>
                      {data.activatedAt}
                      {" • "}
                      {data.activatedBy}
                    </span>
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