import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarDays,
  Clock3,
  ExternalLink,
  Gamepad2,
  LoaderCircle,
  Radio,
  RefreshCw,
  ShieldCheck,
  Swords,
  Trophy,
} from "lucide-react";

import {
  getScheduleEvents,
} from "../api/client.js";

import "./ScheduleEventsPanel.css";

const leagueNames = {
  SOVEREIGN: "Sovereign",
  VANGUARD: "Vanguard",
  ASCENT: "Ascent",
  IMPERIUM: "Imperium",
  ABYSSAL: "Abyssal",
  DAWN: "Dawn",
};

const typeNames = {
  QUALIFIER: "Saralash",
  LEAGUE: "Liga bosqichi",
  PLAYOFF: "Pley-off",
  FINAL: "Final",
  SHOWMATCH: "Ko‘rgazmali o‘yin",
};

const statusNames = {
  SCHEDULED: "Rejalashtirilgan",
  LIVE: "Jonli",
  FINISHED: "Yakunlangan",
  POSTPONED: "Ko‘chirilgan",
  CANCELLED: "Bekor qilingan",
};

function formatEventDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      date: value,
      time: "",
    };
  }

  return {
    date:
      new Intl.DateTimeFormat(
        "uz-UZ",
        {
          timeZone: "Asia/Tashkent",
          day: "2-digit",
          month: "long",
          year: "numeric",
        },
      ).format(date),

    time:
      new Intl.DateTimeFormat(
        "uz-UZ",
        {
          timeZone: "Asia/Tashkent",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        },
      ).format(date),
  };
}

function isRelevantEvent(
  event,
  currentTeam,
) {
  if (!currentTeam) {
    return false;
  }

  if (
    event.game !== currentTeam.game
  ) {
    return false;
  }

  if (
    event.leagueTier &&
    currentTeam.leagueTier
  ) {
    return (
      event.leagueTier ===
      currentTeam.leagueTier
    );
  }

  return true;
}

export default function ScheduleEventsPanel({
  currentTeam,
}) {
  const [events, setEvents] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [gameFilter, setGameFilter] =
    useState("");

  const [scope, setScope] =
    useState("UPCOMING");

  const loadEvents = async () => {
    setLoading(true);
    setError("");

    try {
      const result =
        await getScheduleEvents({
          season:
            currentTeam?.season || "S01",

          game: gameFilter,
        });

      setEvents(
        Array.isArray(result?.events)
          ? result.events
          : [],
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [
    gameFilter,
    currentTeam?.season,
  ]);

  const visibleEvents =
    useMemo(() => {
      if (scope === "ALL") {
        return events;
      }

      if (scope === "FINISHED") {
        return events.filter(
          (event) =>
            event.status === "FINISHED" ||
            event.status === "CANCELLED",
        );
      }

      return events.filter(
        (event) =>
          event.status === "SCHEDULED" ||
          event.status === "LIVE" ||
          event.status === "POSTPONED",
      );
    }, [events, scope]);

  return (
    <section className="schedule-events-panel">
      <header className="schedule-events-panel__header">
        <div>
          <span>OFFICIAL SCHEDULE</span>
          <h1>Turnir jadvali</h1>

          <p>
            Liga Arena saralash, liga,
            pley-off va final tadbirlari.
          </p>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={loadEvents}
        >
          <RefreshCw
            size={16}
            className={
              loading
                ? "schedule-events-spin"
                : ""
            }
          />

          Yangilash
        </button>
      </header>

      <div className="schedule-events-filters">
        <div>
          <button
            type="button"
            className={
              gameFilter === ""
                ? "active"
                : ""
            }
            onClick={() =>
              setGameFilter("")
            }
          >
            Barchasi
          </button>

          <button
            type="button"
            className={
              gameFilter === "PUBG"
                ? "active"
                : ""
            }
            onClick={() =>
              setGameFilter("PUBG")
            }
          >
            PUBG
          </button>

          <button
            type="button"
            className={
              gameFilter === "MLBB"
                ? "active"
                : ""
            }
            onClick={() =>
              setGameFilter("MLBB")
            }
          >
            MLBB
          </button>
        </div>

        <div>
          <button
            type="button"
            className={
              scope === "UPCOMING"
                ? "active"
                : ""
            }
            onClick={() =>
              setScope("UPCOMING")
            }
          >
            Kutilmoqda
          </button>

          <button
            type="button"
            className={
              scope === "FINISHED"
                ? "active"
                : ""
            }
            onClick={() =>
              setScope("FINISHED")
            }
          >
            Yakunlangan
          </button>

          <button
            type="button"
            className={
              scope === "ALL"
                ? "active"
                : ""
            }
            onClick={() =>
              setScope("ALL")
            }
          >
            Hammasi
          </button>
        </div>
      </div>

      {loading ? (
        <div className="schedule-events-state">
          <LoaderCircle
            size={31}
            className="schedule-events-spin"
          />

          <strong>
            Jadval yuklanmoqda
          </strong>
        </div>
      ) : error ? (
        <div className="schedule-events-state schedule-events-state--error">
          <ShieldCheck size={27} />

          <strong>
            Jadvalni yuklab bo‘lmadi
          </strong>

          <p>{error}</p>
        </div>
      ) : visibleEvents.length === 0 ? (
        <div className="schedule-events-state">
          <CalendarDays size={31} />

          <strong>
            Hozircha tadbir mavjud emas
          </strong>

          <p>
            Admin yangi turnir tadbirini
            qo‘shganda shu yerda chiqadi.
          </p>
        </div>
      ) : (
        <div className="schedule-events-list">
          {visibleEvents.map((event) => {
            const date =
              formatEventDate(
                event.scheduledAt,
              );

            const relevant =
              isRelevantEvent(
                event,
                currentTeam,
              );

            return (
              <article
                key={event.id}
                className={
                  relevant
                    ? "schedule-event-card schedule-event-card--relevant"
                    : "schedule-event-card"
                }
              >
                <div className="schedule-event-card__date">
                  <CalendarDays size={18} />
                  <strong>{date.date}</strong>

                  <span>
                    <Clock3 size={13} />
                    {date.time}
                  </span>
                </div>

                <section>
                  <div className="schedule-event-card__badges">
                    <span
                      className={
                        event.game === "PUBG"
                          ? "schedule-game-badge schedule-game-badge--pubg"
                          : "schedule-game-badge schedule-game-badge--mlbb"
                      }
                    >
                      {event.game === "PUBG" ? (
                        <Gamepad2 size={12} />
                      ) : (
                        <Swords size={12} />
                      )}

                      {event.game}
                    </span>

                    <span>
                      {typeNames[
                        event.eventType
                      ] || event.eventType}
                    </span>

                    {event.leagueTier && (
                      <span>
                        <Trophy size={11} />

                        {leagueNames[
                          event.leagueTier
                        ] || event.leagueTier}
                      </span>
                    )}

                    {relevant && (
                      <span className="schedule-relevant-badge">
                        SIZNING LIGANGIZ
                      </span>
                    )}
                  </div>

                  <h3>{event.title}</h3>

                  <p>
                    {event.stage ||
                      "Liga Arena turnir tadbiri"}
                  </p>

                  <div className="schedule-event-card__meta">
                    {event.format && (
                      <span>
                        Format:{" "}
                        <strong>
                          {event.format}
                        </strong>
                      </span>
                    )}

                    <span>
                      Mavsum:{" "}
                      <strong>
                        {event.season}
                      </strong>
                    </span>
                  </div>

                  {event.notes && (
                    <small>
                      {event.notes}
                    </small>
                  )}
                </section>

                <aside>
                  <div
                    className={`schedule-event-status schedule-event-status--${event.status.toLowerCase()}`}
                  >
                    {event.status === "LIVE" && (
                      <Radio size={13} />
                    )}

                    {statusNames[
                      event.status
                    ] || event.status}
                  </div>

                  {event.streamUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        window.open(
                          event.streamUrl,
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                    >
                      <ExternalLink size={14} />
                      Translyatsiya
                    </button>
                  )}
                </aside>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}