import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock3,
  Edit3,
  Gamepad2,
  LoaderCircle,
  Plus,
  RefreshCw,
  Save,
  Swords,
  Trash2,
  X,
} from "lucide-react";

import {
  createAdminScheduleEvent,
  deleteAdminScheduleEvent,
  getAdminScheduleEvents,
  updateAdminScheduleEvent,
} from "../api/client.js";

import "./AdminScheduleManager.css";

const leagueOptions = {
  PUBG: [
    {
      value: "",
      label: "Umumiy / barcha ligalar",
    },
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
      value: "",
      label: "Umumiy / barcha ligalar",
    },
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

const eventTypes = [
  {
    value: "QUALIFIER",
    label: "Saralash",
  },
  {
    value: "LEAGUE",
    label: "Liga bosqichi",
  },
  {
    value: "PLAYOFF",
    label: "Pley-off",
  },
  {
    value: "FINAL",
    label: "Final",
  },
  {
    value: "SHOWMATCH",
    label: "Ko‘rgazmali o‘yin",
  },
];

const statuses = [
  {
    value: "SCHEDULED",
    label: "Rejalashtirilgan",
  },
  {
    value: "LIVE",
    label: "Jonli",
  },
  {
    value: "FINISHED",
    label: "Yakunlangan",
  },
  {
    value: "POSTPONED",
    label: "Ko‘chirilgan",
  },
  {
    value: "CANCELLED",
    label: "Bekor qilingan",
  },
];

function createEmptyForm() {
  return {
    season: "S01",
    game: "PUBG",
    leagueTier: "",
    eventType: "QUALIFIER",
    title: "",
    stage: "",
    scheduledAt: "",
    status: "SCHEDULED",
    format: "",
    streamUrl: "",
    notes: "",
  };
}

function toLocalDateTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset =
    date.getTimezoneOffset() *
    60 *
    1000;

  return new Date(
    date.getTime() - offset,
  )
    .toISOString()
    .slice(0, 16);
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "uz-UZ",
    {
      timeZone: "Asia/Tashkent",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  ).format(date);
}

export default function AdminScheduleManager({
  adminSecret,
  adminName,
}) {
  const [expanded, setExpanded] =
    useState(false);

  const [events, setEvents] =
    useState([]);

  const [form, setForm] =
    useState(createEmptyForm);

  const [editingId, setEditingId] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const [gameFilter, setGameFilter] =
    useState("");

  const loadEvents = async () => {
    if (!adminSecret) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result =
        await getAdminScheduleEvents(
          adminSecret,
          {
            game: gameFilter,
          },
        );

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
    if (expanded) {
      loadEvents();
    }
  }, [
    expanded,
    gameFilter,
    adminSecret,
  ]);

  const currentLeagues =
    useMemo(
      () =>
        leagueOptions[form.game] ||
        [],
      [form.game],
    );

  const updateForm = (
    field,
    value,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(createEmptyForm());
    setEditingId("");
  };

  const editEvent = (event) => {
    setEditingId(event.id);

    setForm({
      season:
        event.season || "S01",

      game:
        event.game || "PUBG",

      leagueTier:
        event.leagueTier || "",

      eventType:
        event.eventType ||
        "QUALIFIER",

      title:
        event.title || "",

      stage:
        event.stage || "",

      scheduledAt:
        toLocalDateTime(
          event.scheduledAt,
        ),

      status:
        event.status ||
        "SCHEDULED",

      format:
        event.format || "",

      streamUrl:
        event.streamUrl || "",

      notes:
        event.notes || "",
    });

    setError("");
    setNotice("");

    document
      .querySelector(
        ".admin-schedule-form",
      )
      ?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
  };

  const saveEvent = async (
    submitEvent,
  ) => {
    submitEvent.preventDefault();

    if (!form.scheduledAt) {
      setError(
        "Tadbir sanasi va vaqtini kiriting.",
      );

      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    const payload = {
      ...form,

      scheduledAt:
        new Date(
          form.scheduledAt,
        ).toISOString(),

      createdBy:
        adminName ||
        "Liga Arena Admin",
    };

    try {
      if (editingId) {
        await updateAdminScheduleEvent(
          adminSecret,
          editingId,
          payload,
        );

        setNotice(
          "Jadval tadbiri yangilandi.",
        );
      } else {
        await createAdminScheduleEvent(
          adminSecret,
          payload,
        );

        setNotice(
          "Yangi jadval tadbiri yaratildi.",
        );
      }

      resetForm();
      await loadEvents();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const removeEvent = async (
    event,
  ) => {
    const accepted =
      window.confirm(
        `"${event.title}" tadbirini o‘chirasizmi?`,
      );

    if (!accepted) {
      return;
    }

    setError("");
    setNotice("");

    try {
      await deleteAdminScheduleEvent(
        adminSecret,
        event.id,
      );

      if (editingId === event.id) {
        resetForm();
      }

      setNotice(
        "Jadval tadbiri o‘chirildi.",
      );

      await loadEvents();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <section className="admin-schedule-manager">
      <button
        type="button"
        className="admin-schedule-toggle"
        onClick={() =>
          setExpanded(
            (current) => !current,
          )
        }
      >
        <div>
          <CalendarDays size={21} />

          <section>
            <span>TOURNAMENT CONTROL</span>
            <strong>
              Jadval boshqaruvi
            </strong>

            <small>
              Saralash, liga, pley-off
              va final tadbirlarini boshqaring
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
        <div className="admin-schedule-content">
          {error && (
            <div className="admin-schedule-alert admin-schedule-alert--error">
              {error}
            </div>
          )}

          {notice && (
            <div className="admin-schedule-alert admin-schedule-alert--success">
              {notice}
            </div>
          )}

          <form
            className="admin-schedule-form"
            onSubmit={saveEvent}
          >
            <header>
              <div>
                <span>
                  {editingId
                    ? "EDIT EVENT"
                    : "CREATE EVENT"}
                </span>

                <h3>
                  {editingId
                    ? "Tadbirni tahrirlash"
                    : "Yangi tadbir yaratish"}
                </h3>
              </div>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                >
                  <X size={15} />
                  Bekor qilish
                </button>
              )}
            </header>

            <div className="admin-schedule-form__grid">
              <label>
                <span>O‘yin</span>

                <select
                  value={form.game}
                  onChange={(event) => {
                    updateForm(
                      "game",
                      event.target.value,
                    );

                    updateForm(
                      "leagueTier",
                      "",
                    );
                  }}
                >
                  <option value="PUBG">
                    PUBG Mobile
                  </option>

                  <option value="MLBB">
                    Mobile Legends
                  </option>
                </select>
              </label>

              <label>
                <span>Liga darajasi</span>

                <select
                  value={form.leagueTier}
                  onChange={(event) =>
                    updateForm(
                      "leagueTier",
                      event.target.value,
                    )
                  }
                >
                  {currentLeagues.map(
                    (league) => (
                      <option
                        value={league.value}
                        key={
                          league.value ||
                          "ALL"
                        }
                      >
                        {league.label}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                <span>Turnir bosqichi</span>

                <select
                  value={form.eventType}
                  onChange={(event) =>
                    updateForm(
                      "eventType",
                      event.target.value,
                    )
                  }
                >
                  {eventTypes.map(
                    (type) => (
                      <option
                        value={type.value}
                        key={type.value}
                      >
                        {type.label}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                <span>Holati</span>

                <select
                  value={form.status}
                  onChange={(event) =>
                    updateForm(
                      "status",
                      event.target.value,
                    )
                  }
                >
                  {statuses.map(
                    (status) => (
                      <option
                        value={status.value}
                        key={status.value}
                      >
                        {status.label}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="wide">
                <span>Tadbir nomi</span>

                <input
                  type="text"
                  value={form.title}
                  placeholder="PUBG Ascent — Saralash 1-kun"
                  maxLength={100}
                  required
                  onChange={(event) =>
                    updateForm(
                      "title",
                      event.target.value,
                    )
                  }
                />
              </label>

              <label>
                <span>Bosqich yoki guruh</span>

                <input
                  type="text"
                  value={form.stage}
                  placeholder="A guruhi / 1-raund"
                  maxLength={60}
                  onChange={(event) =>
                    updateForm(
                      "stage",
                      event.target.value,
                    )
                  }
                />
              </label>

              <label>
                <span>Sana va vaqt</span>

                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  required
                  onChange={(event) =>
                    updateForm(
                      "scheduledAt",
                      event.target.value,
                    )
                  }
                />
              </label>

              <label>
                <span>Format</span>

                <input
                  type="text"
                  value={form.format}
                  placeholder="BO3 / 6 ta xarita"
                  maxLength={50}
                  onChange={(event) =>
                    updateForm(
                      "format",
                      event.target.value,
                    )
                  }
                />
              </label>

              <label>
                <span>Translyatsiya havolasi</span>

                <input
                  type="url"
                  value={form.streamUrl}
                  placeholder="https://youtube.com/..."
                  onChange={(event) =>
                    updateForm(
                      "streamUrl",
                      event.target.value,
                    )
                  }
                />
              </label>

              <label className="wide">
                <span>Qo‘shimcha izoh</span>

                <textarea
                  value={form.notes}
                  placeholder="Jamoalar 30 daqiqa oldin tayyor bo‘lishi kerak."
                  maxLength={500}
                  onChange={(event) =>
                    updateForm(
                      "notes",
                      event.target.value,
                    )
                  }
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
            >
              {saving ? (
                <LoaderCircle
                  className="admin-schedule-spin"
                  size={17}
                />
              ) : editingId ? (
                <Save size={17} />
              ) : (
                <Plus size={17} />
              )}

              {editingId
                ? "O‘zgarishlarni saqlash"
                : "Jadvalga qo‘shish"}
            </button>
          </form>

          <div className="admin-schedule-list">
            <header>
              <div>
                <span>SCHEDULE EVENTS</span>
                <h3>
                  Yaratilgan tadbirlar
                </h3>
              </div>

              <div>
                <select
                  value={gameFilter}
                  onChange={(event) =>
                    setGameFilter(
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    Barcha o‘yinlar
                  </option>
                  <option value="PUBG">
                    PUBG
                  </option>
                  <option value="MLBB">
                    MLBB
                  </option>
                </select>

                <button
                  type="button"
                  disabled={loading}
                  onClick={loadEvents}
                >
                  <RefreshCw
                    size={15}
                    className={
                      loading
                        ? "admin-schedule-spin"
                        : ""
                    }
                  />
                </button>
              </div>
            </header>

            {loading ? (
              <div className="admin-schedule-empty">
                <LoaderCircle
                  className="admin-schedule-spin"
                  size={28}
                />

                <strong>
                  Jadval yuklanmoqda
                </strong>
              </div>
            ) : events.length === 0 ? (
              <div className="admin-schedule-empty">
                <CalendarDays size={28} />

                <strong>
                  Tadbir mavjud emas
                </strong>
              </div>
            ) : (
              <div>
                {events.map((event) => (
                  <article key={event.id}>
                    <div className="admin-schedule-event-game">
                      {event.game === "PUBG" ? (
                        <Gamepad2 size={17} />
                      ) : (
                        <Swords size={17} />
                      )}

                      <span>{event.game}</span>
                    </div>

                    <section>
                      <div>
                        <strong>
                          {event.title}
                        </strong>

                        <span>
                          {event.status}
                        </span>
                      </div>

                      <p>
                        {event.stage ||
                          event.eventType}
                      </p>

                      <small>
                        <Clock3 size={12} />
                        {formatDate(
                          event.scheduledAt,
                        )}

                        {event.leagueTier
                          ? ` • ${event.leagueTier}`
                          : ""}
                      </small>
                    </section>

                    <div className="admin-schedule-event-actions">
                      <button
                        type="button"
                        onClick={() =>
                          editEvent(event)
                        }
                      >
                        <Edit3 size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          removeEvent(event)
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}