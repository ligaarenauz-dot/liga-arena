import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  Crown,
  Download,
  FileText,
  Gamepad2,
  LoaderCircle,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  Swords,
  UserRound,
  Users,
  X,
} from "lucide-react";
import BrandMark from "../components/BrandMark.jsx";
import AdminScheduleManager from "../components/AdminScheduleManager.jsx";
import AdminStandingsManager from "../components/AdminStandingsManager.jsx";
import AdminMlbbManager from "../components/AdminMlbbManager.jsx";
import AdminSeasonManager from "../components/AdminSeasonManager.jsx";
import {
  API_URL,
  approveAdminTeam,
  assignAdminTeamLeague,
  getAdminStats,
  getAdminTeam,
  getAdminTeams,
  rejectAdminTeam,
} from "../api/client.js";
import "./AdminReviewPage.css";

const statusOptions = [
  {
    value: "PENDING_REVIEW",
    label: "Tekshiruvda",
  },
  {
    value: "APPROVED",
    label: "Tasdiqlangan",
  },
  {
    value: "REJECTED",
    label: "Rad etilgan",
  },
  {
    value: "ALL",
    label: "Barchasi",
  },
];

const leagueOptions = {
  PUBG: [
    {
      value: "SOVEREIGN",
      label: "Sovereign",
      description: "PUBG oliy liga darajasi",
    },
    {
      value: "VANGUARD",
      label: "Vanguard",
      description: "PUBG o‘rta liga darajasi",
    },
    {
      value: "ASCENT",
      label: "Ascent",
      description: "PUBG boshlang‘ich liga darajasi",
    },
  ],

  MLBB: [
    {
      value: "IMPERIUM",
      label: "Imperium",
      description: "MLBB oliy liga darajasi",
    },
    {
      value: "ABYSSAL",
      label: "Abyssal",
      description: "MLBB o‘rta liga darajasi",
    },
    {
      value: "DAWN",
      label: "Dawn",
      description: "MLBB boshlang‘ich liga darajasi",
    },
  ],
};

function leagueTitle(value) {
  const allOptions = [
    ...leagueOptions.PUBG,
    ...leagueOptions.MLBB,
  ];

  return (
    allOptions.find(
      (option) => option.value === value,
    )?.label || value || "Biriktirilmagan"
  );
}

function getLeagueOptions(game) {
  return leagueOptions[game] || [];
}

const rejectionReasons = [
  "Jamoa tarkibi to‘liq shakllantirilmagan.",
  "O‘yinchi yosh chegarasiga mos emas.",
  "O‘yinchi ID yoki server ma’lumotlari noto‘g‘ri.",
  "Telegram tasdiqlari to‘liq bajarilmagan.",
  "Jamoa logotipi Liga Arena talablariga mos emas.",
  "Jamoa nomi yoki TAG qoidalarga mos emas.",
  "Bir yoki bir nechta o‘yinchi boshqa jamoada ro‘yxatdan o‘tgan.",
];

function statusTitle(status) {
  const titles = {
    DRAFT: "Qoralama",
    PENDING_CONFIRMATION: "Tasdiqlar kutilmoqda",
    PENDING_REVIEW: "Tekshiruvda",
    APPROVED: "Tasdiqlangan",
    REJECTED: "Rad etilgan",
    LOCKED: "Yopilgan",
  };

  return titles[status] || status;
}

function gameTitle(game) {
  return game === "PUBG"
    ? "PUBG MOBILE"
    : "MOBILE LEGENDS";
}

function roleTitle(role) {
  if (role === "CAPTAIN") {
    return "Sardor";
  }

  if (role === "RESERVE") {
    return "Zaxira";
  }

  return "Asosiy";
}

function calculateMemberAge(birthDate) {
  if (!birthDate) {
    return null;
  }

  const date = new Date(`${birthDate}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const today = new Date();

  let age =
    today.getFullYear() -
    date.getFullYear();

  const monthDifference =
    today.getMonth() -
    date.getMonth();

  if (
    monthDifference < 0 ||
    (
      monthDifference === 0 &&
      today.getDate() < date.getDate()
    )
  ) {
    age -= 1;
  }

  return age;
}

function formatMemberBirthDate(birthDate) {
  if (!birthDate) {
    return "Kiritilmagan";
  }

  const date = new Date(`${birthDate}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return birthDate;
  }

  return new Intl.DateTimeFormat(
    "uz-UZ",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(date);
}

function formatConsentDate(value) {
  if (!value) {
    return "Tasdiqlanmagan";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "uz-UZ",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

function resolveLogo(logoUrl) {
  if (!logoUrl) {
    return "";
  }

  return logoUrl.startsWith("http")
    ? logoUrl
    : `${API_URL}${logoUrl}`;
}

function buildTeamMediaText(team) {
  const members = Array.isArray(team?.members)
    ? team.members
    : [];

  const memberLines = members.map(
    (member, index) => {
      const gameId = [
        member.gameUserId,
        member.serverId
          ? `Server: ${member.serverId}`
          : "",
      ]
        .filter(Boolean)
        .join(" • ");

      const calculatedAge =
        member.age ??
        calculateMemberAge(
          member.birthDate,
        );

      return [
        `${index + 1}. ${member.nickname}`,
        `   ${roleTitle(member.role)}`,
        member.fullName
          ? `   Ism: ${member.fullName}`
          : "",
        Number.isInteger(calculatedAge)
          ? `   Yosh: ${calculatedAge}`
          : "",
        member.region
          ? `   Hudud: ${member.region}`
          : "",
        member.phone
          ? `   Telefon: ${member.phone}`
          : "",
        gameId
          ? `   ID: ${gameId}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
    },
  );

  return [
    "🏆 LIGA ARENA — JAMOA PROFILI",
    "",
    `Jamoa: ${team?.name || "Noma’lum"}`,
    `TAG: ${team?.tag || "—"}`,
    `O‘yin: ${gameTitle(team?.game)}`,
    `Hudud: ${team?.region || "—"}`,
    `Mavsum: ${team?.season || "Season 01"}`,
    `Liga: ${leagueTitle(team?.leagueTier)}`,
    "",
    `Tarkib: ${team?.counts?.total || members.length}/${team?.limits?.total || members.length}`,
    `Telegram tasdiqlari: ${team?.counts?.confirmedCount || 0}/${team?.counts?.total || members.length}`,
    "",
    "JAMOA TARKIBI",
    "",
    ...memberLines,
    "",
    "Toj sovg‘a qilinmaydi.",
    "Compete. Rise. Become legend.",
  ].join("\n");
}

function getLogoExtension(contentType, logoUrl) {
  const extensions = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
  };

  if (extensions[contentType]) {
    return extensions[contentType];
  }

  const urlExtension = String(logoUrl || "")
    .split("?")[0]
    .split(".")
    .pop()
    .toLowerCase();

  if (
    ["png", "jpg", "jpeg", "webp", "gif"].includes(
      urlExtension,
    )
  ) {
    return urlExtension === "jpeg"
      ? "jpg"
      : urlExtension;
  }

  return "png";
}

function buildAutomaticTeamValidation(team) {
  if (!team) {
    return {
      valid: false,
      errors: [],
      minimumAge: 16,
    };
  }

  const members = Array.isArray(team.members)
    ? team.members
    : [];

  const counts = team.counts || {};
  const limits = team.limits || {};

  const minimumAge =
    Number.parseInt(
      team.eligibility?.minimumAge,
      10,
    ) || 16;

  const errors = [];

  const mainCount =
    Number(counts.mainCount || 0);

  const reserveCount =
    Number(counts.reserveCount || 0);

  const totalCount =
    Number(counts.total || 0);

  const confirmedCount =
    Number(counts.confirmedCount || 0);

  if (!team.logoUrl) {
    errors.push("Jamoa logosi yuklanmagan.");
  }

  if (
    mainCount !== Number(limits.main || 0)
  ) {
    errors.push(
      `Asosiy tarkib ${limits.main || 0} nafar bo‘lishi kerak.`,
    );
  }

  if (
    team.game === "MLBB" &&
    reserveCount !==
      Number(limits.reserve || 0)
  ) {
    errors.push(
      `MLBB uchun ${limits.reserve || 0} nafar zaxira o‘yinchi kerak.`,
    );
  }

  if (
    team.game === "PUBG" &&
    reserveCount >
      Number(limits.reserve || 0)
  ) {
    errors.push(
      "PUBG zaxira tarkibi belgilangan limitdan oshgan.",
    );
  }

  if (
    totalCount === 0 ||
    confirmedCount !== totalCount
  ) {
    errors.push(
      `Telegram tasdiqlari ${confirmedCount}/${totalCount}.`,
    );
  }

  if (!team.mediaConsent) {
    errors.push(
      "Media roziligi berilmagan.",
    );
  }

  if (!team.rulesConsent) {
    errors.push(
      "Liga shartlari tasdiqlanmagan.",
    );
  }

  for (const member of members) {
    const playerName =
      member.nickname ||
      member.fullName ||
      member.firstName ||
      "O‘yinchi";

    if (
      !member.fullName ||
      !String(member.fullName).trim().includes(" ")
    ) {
      errors.push(
        `${playerName}: ism-familiya to‘liq emas.`,
      );
    }

    const age =
      member.age ??
      calculateMemberAge(member.birthDate);

    if (!Number.isInteger(age)) {
      errors.push(
        `${playerName}: tug‘ilgan sana kiritilmagan.`,
      );
    } else if (age < minimumAge) {
      errors.push(
        `${playerName}: ${age} yosh, minimal talab ${minimumAge}.`,
      );
    }

    if (!member.region) {
      errors.push(
        `${playerName}: viloyat kiritilmagan.`,
      );
    }

    if (
      !/^\+998\d{9}$/.test(
        String(member.phone || ""),
      )
    ) {
      errors.push(
        `${playerName}: telefon raqami noto‘g‘ri.`,
      );
    }

    if (
      String(member.gameUserId || "").length < 4
    ) {
      errors.push(
        team.game === "PUBG"
          ? `${playerName}: PUBG ID noto‘g‘ri.`
          : `${playerName}: User ID noto‘g‘ri.`,
      );
    }

    if (
      team.game === "MLBB" &&
      String(member.serverId || "").length < 3
    ) {
      errors.push(
        `${playerName}: Server / Zone ID noto‘g‘ri.`,
      );
    }

    if (
      member.confirmationStatus !==
      "CONFIRMED"
    ) {
      errors.push(
        `${playerName}: Telegram tasdig‘i yo‘q.`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    minimumAge,
  };
}

export default function AdminReviewPage() {
  const [adminSecret, setAdminSecret] = useState(
    sessionStorage.getItem("ligaArenaAdminSecret") || "",
  );

  const [draftSecret, setDraftSecret] = useState("");
  const [adminName, setAdminName] = useState(
    sessionStorage.getItem("ligaArenaAdminName") ||
      "Liga Arena Admin",
  );

  const [statusFilter, setStatusFilter] =
    useState("PENDING_REVIEW");

  const [gameFilter, setGameFilter] = useState("");
  const [stats, setStats] = useState(null);
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);

  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] =
    useState(false);

  const [decisionLoading, setDecisionLoading] =
    useState(false);

  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [mediaLoading, setMediaLoading] =
    useState(false);

  const [mediaCopied, setMediaCopied] =
    useState(false);

  const [leagueDraft, setLeagueDraft] =
    useState("");

  const [leagueLoading, setLeagueLoading] =
    useState(false);

  const teamValidation = useMemo(
    () =>
      buildAutomaticTeamValidation(
        selectedTeam,
      ),
    [selectedTeam],
  );

  const selectedLogo = useMemo(() => {
    return resolveLogo(selectedTeam?.logoUrl);
  }, [selectedTeam]);

  const logout = () => {
    sessionStorage.removeItem("ligaArenaAdminSecret");
    setAdminSecret("");
    setDraftSecret("");
    setTeams([]);
    setStats(null);
    setSelectedTeam(null);
  };

  const handleUnauthorized = (requestError) => {
    if (requestError?.status === 401) {
      logout();
      setError("Admin maxfiy kaliti noto‘g‘ri.");
      return true;
    }

    return false;
  };

  const loadDashboard = async (
    secret = adminSecret,
  ) => {
    if (!secret) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [statsResult, teamsResult] =
        await Promise.all([
          getAdminStats(secret),
          getAdminTeams(secret, {
            status: statusFilter,
            game: gameFilter,
          }),
        ]);

      setStats(statsResult.stats);
      setTeams(teamsResult.teams);
    } catch (requestError) {
      if (!handleUnauthorized(requestError)) {
        setError(requestError.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminSecret) {
      loadDashboard();
    }
  }, [
    adminSecret,
    statusFilter,
    gameFilter,
  ]);

  const login = async (event) => {
    event.preventDefault();

    const secret = draftSecret.trim();

    if (!secret) {
      setError("Admin maxfiy kalitini kiriting.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await getAdminStats(secret);

      sessionStorage.setItem(
        "ligaArenaAdminSecret",
        secret,
      );

      sessionStorage.setItem(
        "ligaArenaAdminName",
        adminName.trim() || "Liga Arena Admin",
      );

      setAdminSecret(secret);
      setDraftSecret("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const openTeam = async (teamId) => {
    setDetailLoading(true);
    setError("");
    setNotice("");
    setRejectMode(false);
    setRejectReason("");

    try {
      const result = await getAdminTeam(
        adminSecret,
        teamId,
      );

      setSelectedTeam(result.team);

      setLeagueDraft(
        result.team.leagueTier || "",
      );
    } catch (requestError) {
      if (!handleUnauthorized(requestError)) {
        setError(requestError.message);
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const approveTeam = async () => {
    if (!selectedTeam) {
      return;
    }

    setDecisionLoading(true);
    setError("");
    setNotice("");

    try {
      const result = await approveAdminTeam(
        adminSecret,
        selectedTeam.id,
        adminName,
      );

      setSelectedTeam(result.team);
      setNotice("Jamoa tasdiqlandi.");
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDecisionLoading(false);
    }
  };

  const rejectTeam = async () => {
    if (!selectedTeam) {
      return;
    }

    if (rejectReason.trim().length < 5) {
      setError(
        "Rad etish sababini kamida 5 belgi bilan yozing.",
      );
      return;
    }

    setDecisionLoading(true);
    setError("");
    setNotice("");

    try {
      const result = await rejectAdminTeam(
        adminSecret,
        selectedTeam.id,
        {
          adminName,
          reason: rejectReason.trim(),
        },
      );

      setSelectedTeam(result.team);
      setRejectMode(false);
      setRejectReason("");
      setNotice("Jamoa rad etildi.");
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDecisionLoading(false);
    }
  };

  const saveLeagueAssignment = async () => {
    if (!selectedTeam) {
      return;
    }

    if (!leagueDraft) {
      setError(
        "Jamoa uchun liga darajasini tanlang.",
      );

      return;
    }

    setLeagueLoading(true);
    setError("");
    setNotice("");

    try {
      const result =
        await assignAdminTeamLeague(
          adminSecret,
          selectedTeam.id,
          {
            leagueTier: leagueDraft,
            adminName,
          },
        );

      setSelectedTeam(result.team);

      setLeagueDraft(
        result.team.leagueTier || "",
      );

      setNotice(
        `Jamoa ${leagueTitle(
          result.team.leagueTier,
        )} ligasiga biriktirildi.`,
      );

      await loadDashboard();
    } catch (requestError) {
      if (!handleUnauthorized(requestError)) {
        setError(requestError.message);
      }
    } finally {
      setLeagueLoading(false);
    }
  };

  const downloadTeamLogo = async () => {
    if (!selectedTeam?.logoUrl) {
      setError("Bu jamoaga logo biriktirilmagan.");
      return;
    }

    setMediaLoading(true);
    setError("");
    setNotice("");

    try {
      const logoUrl = resolveLogo(
        selectedTeam.logoUrl,
      );

      const response = await fetch(logoUrl);

      if (!response.ok) {
        throw new Error(
          "Jamoa logosini yuklab bo‘lmadi.",
        );
      }

      const blob = await response.blob();

      const extension = getLogoExtension(
        blob.type,
        logoUrl,
      );

      const safeName = String(
        selectedTeam.tag ||
          selectedTeam.name ||
          "liga-arena-team",
      )
        .trim()
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const objectUrl =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = objectUrl;
      link.download =
        `${safeName || "team"}-logo.${extension}`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 1000);

      setNotice(
        "Jamoa logosi yuklab olindi.",
      );
    } catch (downloadError) {
      setError(downloadError.message);
    } finally {
      setMediaLoading(false);
    }
  };

  const copyTeamMediaText = async () => {
    if (!selectedTeam) {
      return;
    }

    const mediaText =
      buildTeamMediaText(selectedTeam);

    setError("");
    setNotice("");

    try {
      if (
        navigator.clipboard &&
        window.isSecureContext
      ) {
        await navigator.clipboard.writeText(
          mediaText,
        );
      } else {
        const textarea =
          document.createElement("textarea");

        textarea.value = mediaText;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";

        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        const copied =
          document.execCommand("copy");

        textarea.remove();

        if (!copied) {
          throw new Error(
            "Matnni nusxalash amalga oshmadi.",
          );
        }
      }

      setMediaCopied(true);
      setNotice(
        "Jamoa uchun post matni nusxalandi.",
      );

      window.setTimeout(() => {
        setMediaCopied(false);
      }, 2500);
    } catch (copyError) {
      setError(copyError.message);
    }
  };

  const toggleRejectReason = (reason) => {
    setRejectReason((currentValue) => {
      const reasonLine = `• ${reason}`;

      const currentLines = currentValue
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      if (currentLines.includes(reasonLine)) {
        return currentLines
          .filter((line) => line !== reasonLine)
          .join("\n");
      }

      return [
        ...currentLines,
        reasonLine,
      ].join("\n");
    });
  };

  if (!adminSecret) {
    return (
      <div className="admin-login">
        <div className="admin-login__glow" />

        <form
          className="admin-login__card"
          onSubmit={login}
        >
          <BrandMark />

          <span>ADMIN CONTROL</span>
          <h1>Review Center</h1>

          <p>
            Jamoalarni tekshirish va qaror chiqarish uchun
            admin maxfiy kalitini kiriting.
          </p>

          <label>
            <span>Admin ismi</span>

            <input
              type="text"
              value={adminName}
              onChange={(event) =>
                setAdminName(event.target.value)
              }
              placeholder="Liga Arena Admin"
            />
          </label>

          <label>
            <span>Maxfiy kalit</span>

            <input
              type="password"
              value={draftSecret}
              onChange={(event) =>
                setDraftSecret(event.target.value)
              }
              placeholder="ADMIN_SECRET"
            />
          </label>

          {error && (
            <div className="admin-alert admin-alert--error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                Tekshirilmoqda
                <LoaderCircle
                  className="admin-spin"
                  size={18}
                />
              </>
            ) : (
              <>
                Admin panelga kirish
                <ShieldCheck size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-app">
      <header className="admin-header">
        <BrandMark compact />

        <div>
          <span>LIGA ARENA</span>
          <strong>ADMIN REVIEW CENTER</strong>
        </div>

        <button
          type="button"
          onClick={logout}
          aria-label="Chiqish"
        >
          <LogOut size={18} />
        </button>
      </header>

      <main className="admin-main">
        <section className="admin-heading">
          <div>
            <span>SEASON 01</span>
            <h1>Jamoalarni tekshirish</h1>
            <p>
              Tarkib, o‘yin ID raqamlari va Telegram
              tasdiqlarini ko‘rib chiqing.
            </p>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => loadDashboard()}
          >
            <RefreshCw
              className={loading ? "admin-spin" : ""}
              size={18}
            />
            Yangilash
          </button>
        </section>

        <section className="admin-stats">
          <article>
            <Clock3 size={20} />
            <div>
              <span>TEKSHIRUVDA</span>
              <strong>
                {stats?.statuses?.PENDING_REVIEW || 0}
              </strong>
            </div>
          </article>

          <article>
            <Check size={20} />
            <div>
              <span>TASDIQLANGAN</span>
              <strong>
                {stats?.statuses?.APPROVED || 0}
              </strong>
            </div>
          </article>

          <article>
            <X size={20} />
            <div>
              <span>RAD ETILGAN</span>
              <strong>
                {stats?.statuses?.REJECTED || 0}
              </strong>
            </div>
          </article>

          <article>
            <Users size={20} />
            <div>
              <span>JAMI JAMOA</span>
              <strong>{stats?.total || 0}</strong>
            </div>
          </article>
        </section>

        <section className="admin-filters">
          <div className="admin-filter-group">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={
                  statusFilter === option.value
                    ? "admin-filter admin-filter--active"
                    : "admin-filter"
                }
                onClick={() =>
                  setStatusFilter(option.value)
                }
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="admin-filter-group">
            <button
              type="button"
              className={
                gameFilter === ""
                  ? "admin-filter admin-filter--active"
                  : "admin-filter"
              }
              onClick={() => setGameFilter("")}
            >
              Barcha o‘yinlar
            </button>

            <button
              type="button"
              className={
                gameFilter === "PUBG"
                  ? "admin-filter admin-filter--active"
                  : "admin-filter"
              }
              onClick={() => setGameFilter("PUBG")}
            >
              PUBG
            </button>

            <button
              type="button"
              className={
                gameFilter === "MLBB"
                  ? "admin-filter admin-filter--active"
                  : "admin-filter"
              }
              onClick={() => setGameFilter("MLBB")}
            >
              MLBB
            </button>
          </div>
        </section>

        {error && (
          <div className="admin-alert admin-alert--error">
            {error}
          </div>
        )}

        {notice && (
          <div className="admin-alert admin-alert--success">
            {notice}
          </div>
        )}

        <AdminScheduleManager
          adminSecret={adminSecret}
          adminName={adminName}
        />

        <AdminStandingsManager
          adminSecret={adminSecret}
          adminName={adminName}
        />

        <AdminMlbbManager
          adminSecret={adminSecret}
          adminName={adminName}
        />

        <AdminSeasonManager
          adminSecret={adminSecret}
          adminName={adminName}
        />

        <section className="admin-team-list">
          {loading ? (
            <div className="admin-empty">
              <LoaderCircle
                className="admin-spin"
                size={32}
              />
              <strong>Ma’lumotlar yuklanmoqda</strong>
            </div>
          ) : teams.length === 0 ? (
            <div className="admin-empty">
              <Search size={32} />
              <strong>Jamoalar topilmadi</strong>
              <span>
                Tanlangan filtr bo‘yicha ariza yo‘q.
              </span>
            </div>
          ) : (
            teams.map((team) => (
              <button
                className="admin-team-card"
                type="button"
                key={team.id}
                onClick={() => openTeam(team.id)}
              >
                <div className="admin-team-card__logo">
                  {team.logoUrl ? (
                    <img
                      src={resolveLogo(team.logoUrl)}
                      alt={team.name}
                    />
                  ) : (
                    <Crown size={24} />
                  )}
                </div>

                <div className="admin-team-card__body">
                  <span>{gameTitle(team.game)}</span>

                  {team.technicalNumber && (
                    <small className="admin-team-technical-number">
                      {team.technicalNumber}
                    </small>
                  )}

                  <h2>{team.name}</h2>

                  <div>
                    <strong>{team.tag}</strong>
                    <small>{team.region}</small>
                  </div>
                </div>

                <div className="admin-team-card__counts">
                  <span>
                    {team.confirmedCount}/{team.memberCount}
                  </span>
                  <small>Tasdiq</small>
                </div>

                <div
                  className={`admin-status admin-status--${team.status.toLowerCase()}`}
                >
                  {statusTitle(team.status)}
                </div>

                <ChevronRight size={19} />
              </button>
            ))
          )}
        </section>
      </main>

      {(selectedTeam || detailLoading) && (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onMouseDown={() =>
            !decisionLoading && setSelectedTeam(null)
          }
        >
          <section
            className="admin-review-modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            {detailLoading && !selectedTeam ? (
              <div className="admin-empty">
                <LoaderCircle
                  className="admin-spin"
                  size={34}
                />
                <strong>Jamoa ochilmoqda</strong>
              </div>
            ) : (
              <>
                <header className="admin-review-header">
                  <div className="admin-review-header__logo">
                    {selectedLogo ? (
                      <img
                        src={selectedLogo}
                        alt={selectedTeam.name}
                      />
                    ) : (
                      <Crown size={27} />
                    )}
                  </div>

                  <div>
                    <span>
                      {gameTitle(selectedTeam.game)}
                    </span>
                    <h2>{selectedTeam.name}</h2>
                    <p>
                      {selectedTeam.tag} •{" "}
                      {selectedTeam.region}
                    </p>

                    {selectedTeam.technicalNumber && (
                      <small className="admin-review-technical-number">
                        TEXNIK RAQAM:{" "}
                        <strong>
                          {selectedTeam.technicalNumber}
                        </strong>
                      </small>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedTeam(null)}
                  >
                    <X size={20} />
                  </button>
                </header>

                <section className="admin-review-summary">
                  <article>
                    <Users size={18} />
                    <span>Tarkib</span>
                    <strong>
                      {selectedTeam.counts?.total || 0}/
                      {selectedTeam.limits?.total || 0}
                    </strong>
                  </article>

                  <article>
                    <ShieldCheck size={18} />
                    <span>Tasdiq</span>
                    <strong>
                      {selectedTeam.counts
                        ?.confirmedCount || 0}
                      /
                      {selectedTeam.counts?.total || 0}
                    </strong>
                  </article>

                  <article>
                    {selectedTeam.game === "PUBG" ? (
                      <Gamepad2 size={18} />
                    ) : (
                      <Swords size={18} />
                    )}
                    <span>Holat</span>
                    <strong>
                      {statusTitle(selectedTeam.status)}
                    </strong>
                  </article>
                </section>

                {selectedTeam.status ===
                  "APPROVED" && (
                  <section className="admin-league-assignment">
                    <div className="admin-section-title">
                      <span>LEAGUE PLACEMENT</span>
                      <h3>Jamoani ligaga biriktirish</h3>
                    </div>

                    <div className="admin-league-assignment__current">
                      <Crown size={22} />

                      <div>
                        <span>HOZIRGI LIGA</span>

                        <strong>
                          {leagueTitle(
                            selectedTeam.leagueTier,
                          )}
                        </strong>

                        {selectedTeam.leagueAssignedAt && (
                          <small>
                            {formatConsentDate(
                              selectedTeam.leagueAssignedAt,
                            )}

                            {selectedTeam.leagueAssignedBy
                              ? ` • ${selectedTeam.leagueAssignedBy}`
                              : ""}
                          </small>
                        )}
                      </div>
                    </div>

                    <div className="admin-league-assignment__form">
                      <label>
                        <span>
                          {selectedTeam.game === "PUBG"
                            ? "PUBG liga darajasi"
                            : "Mobile Legends liga darajasi"}
                        </span>

                        <select
                          value={leagueDraft}
                          onChange={(event) =>
                            setLeagueDraft(
                              event.target.value,
                            )
                          }
                        >
                          <option value="">
                            Liga darajasini tanlang
                          </option>

                          {getLeagueOptions(
                            selectedTeam.game,
                          ).map((option) => (
                            <option
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <button
                        type="button"
                        disabled={
                          leagueLoading ||
                          !leagueDraft
                        }
                        onClick={saveLeagueAssignment}
                      >
                        {leagueLoading ? (
                          <LoaderCircle
                            className="admin-spin"
                            size={17}
                          />
                        ) : (
                          <Crown size={17} />
                        )}

                        {selectedTeam.leagueTier
                          ? "Liga darajasini yangilash"
                          : "Ligaga biriktirish"}
                      </button>
                    </div>

                    <div className="admin-league-assignment__options">
                      {getLeagueOptions(
                        selectedTeam.game,
                      ).map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={
                            leagueDraft === option.value
                              ? "admin-league-option admin-league-option--active"
                              : "admin-league-option"
                          }
                          onClick={() =>
                            setLeagueDraft(
                              option.value,
                            )
                          }
                        >
                          <strong>
                            {option.label}
                          </strong>

                          <span>
                            {option.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                <section className="admin-media-kit">
                  <div className="admin-section-title">
                    <span>TEAM MEDIA KIT</span>
                    <h3>Logo va post materiallari</h3>
                  </div>

                  <div className="admin-media-kit__content">
                    <div className="admin-media-kit__preview">
                      {selectedLogo ? (
                        <img
                          src={selectedLogo}
                          alt={`${selectedTeam.name} logosi`}
                        />
                      ) : (
                        <div>
                          <Crown size={30} />
                          <span>
                            Logo biriktirilmagan
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="admin-media-kit__information">
                      <FileText size={19} />

                      <div>
                        <strong>
                          Stream va yangiliklar uchun
                        </strong>

                        <p>
                          Original logoni yuklab oling yoki
                          jamoa haqidagi tayyor post matnini
                          nusxalang.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="admin-media-kit__actions">
                    <button
                      type="button"
                      disabled={
                        mediaLoading ||
                        !selectedTeam.logoUrl
                      }
                      onClick={downloadTeamLogo}
                    >
                      {mediaLoading ? (
                        <LoaderCircle
                          className="admin-spin"
                          size={17}
                        />
                      ) : (
                        <Download size={17} />
                      )}

                      Logo yuklab olish
                    </button>

                    <button
                      type="button"
                      onClick={copyTeamMediaText}
                    >
                      {mediaCopied ? (
                        <Check size={17} />
                      ) : (
                        <Copy size={17} />
                      )}

                      {mediaCopied
                        ? "Nusxalandi"
                        : "Post matnini nusxalash"}
                    </button>
                  </div>
                </section>

                <section
                  className={
                    teamValidation.valid
                      ? "admin-auto-validation admin-auto-validation--success"
                      : "admin-auto-validation admin-auto-validation--danger"
                  }
                >
                  <div className="admin-section-title">
                    <span>AUTOMATIC VERIFICATION</span>
                    <h3>Avtomatik tekshiruv</h3>
                  </div>

                  {teamValidation.valid ? (
                    <div className="admin-auto-validation__ready">
                      <ShieldCheck size={22} />

                      <div>
                        <strong>
                          Jamoa barcha talablarga mos
                        </strong>

                        <p>
                          Tarkib, yosh, aloqa ma’lumotlari,
                          Telegram tasdiqlari va roziliklar
                          muvaffaqiyatli tekshirildi.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="admin-auto-validation__warning">
                        <AlertTriangle size={20} />

                        <div>
                          <strong>
                            Jamoani hozir tasdiqlab bo‘lmaydi
                          </strong>

                          <p>
                            Quyidagi kamchiliklar tuzatilishi
                            kerak:
                          </p>
                        </div>
                      </div>

                      <div className="admin-auto-validation__issues">
                        {teamValidation.errors.map(
                          (validationError, index) => (
                            <div
                              key={`${validationError}-${index}`}
                            >
                              <X size={14} />
                              <span>
                                {validationError}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </>
                  )}
                </section>
                <section className="admin-consent-review">
                  <div className="admin-section-title">
                    <span>CONSENT &amp; RULES</span>
                    <h3>Rozilik va liga shartlari</h3>
                  </div>

                  <div className="admin-consent-review__grid">
                    <article
                      className={
                        selectedTeam.mediaConsent
                          ? "admin-consent-card admin-consent-card--approved"
                          : "admin-consent-card admin-consent-card--missing"
                      }
                    >
                      <div>
                        {selectedTeam.mediaConsent
                          ? "✓"
                          : "!"}
                      </div>

                      <section>
                        <span>MEDIA ROZILIGI</span>

                        <strong>
                          {selectedTeam.mediaConsent
                            ? "Rozilik berilgan"
                            : "Rozilik berilmagan"}
                        </strong>

                        <p>
                          Surat, video, ovoz va o‘yin
                          lavhalaridan liga materiallarida
                          foydalanish.
                        </p>

                        <small>
                          Versiya:{" "}
                          {selectedTeam.mediaPolicyVersion ||
                            "Ko‘rsatilmagan"}
                        </small>
                      </section>
                    </article>

                    <article
                      className={
                        selectedTeam.rulesConsent
                          ? "admin-consent-card admin-consent-card--approved"
                          : "admin-consent-card admin-consent-card--missing"
                      }
                    >
                      <div>
                        {selectedTeam.rulesConsent
                          ? "✓"
                          : "!"}
                      </div>

                      <section>
                        <span>LIGA SHARTLARI</span>

                        <strong>
                          {selectedTeam.rulesConsent
                            ? "Shartlar tasdiqlangan"
                            : "Shartlar tasdiqlanmagan"}
                        </strong>

                        <p>
                          Reglament, yosh chegarasi,
                          intizomiy va anti-cheat
                          qoidalariga rozilik.
                        </p>

                        <small>
                          Reglament:{" "}
                          {selectedTeam.rulesVersion ||
                            "Ko‘rsatilmagan"}
                        </small>
                      </section>
                    </article>
                  </div>

                  <div className="admin-consent-review__meta">
                    <span>
                      <strong>Rozilik sanasi:</strong>{" "}
                      {formatConsentDate(
                        selectedTeam.consentedAt,
                      )}
                    </span>

                    <span>
                      <strong>Telegram ID:</strong>{" "}
                      {selectedTeam.consentTelegramId ||
                        selectedTeam.captainTelegramId ||
                        "Ko‘rsatilmagan"}
                    </span>
                  </div>
                </section>

                <section className="admin-review-members">
                  <div className="admin-section-title">
                    <span>TEAM ROSTER</span>
                    <h3>Jamoa tarkibi</h3>
                  </div>

                  {selectedTeam.members.map((member) => (
                    <article key={member.id}>
                      <div>
                        {member.role === "CAPTAIN" ? (
                          <Crown size={17} />
                        ) : (
                          <UserRound size={17} />
                        )}
                      </div>

                      <section>
                        <div>
                          <strong>
                            {member.nickname}
                          </strong>
                          <span>
                            {roleTitle(member.role)}
                          </span>
                        </div>

                        <p className="admin-member-full-name">
                          {member.fullName ||
                            member.firstName ||
                            "Ism-familiya kiritilmagan"}
                        </p>

                        <div className="admin-member-details">
                          <span>
                            <strong>Tug‘ilgan sana</strong>

                            {formatMemberBirthDate(
                              member.birthDate,
                            )}

                            {Number.isInteger(
                              member.age ??
                                calculateMemberAge(
                                  member.birthDate,
                                ),
                            )
                              ? ` • ${
                                  member.age ??
                                  calculateMemberAge(
                                    member.birthDate,
                                  )
                                } yosh`
                              : ""}
                          </span>

                          <span>
                            <strong>Yashash hududi</strong>

                            {member.region ||
                              "Kiritilmagan"}
                          </span>

                          <span>
                            <strong>Telefon</strong>

                            {member.phone ||
                              "Kiritilmagan"}
                          </span>

                          <span>
                            <strong>
                              {selectedTeam.game === "PUBG"
                                ? "PUBG ID"
                                : "Mobile Legends User ID"}
                            </strong>

                            {member.gameUserId ||
                              "Kiritilmagan"}
                          </span>

                          {selectedTeam.game === "MLBB" && (
                            <span>
                              <strong>
                                Server / Zone ID
                              </strong>

                              {member.serverId ||
                                "Kiritilmagan"}
                            </span>
                          )}

                          <span>
                            <strong>Telegram</strong>

                            {member.username
                              ? `@${member.username}`
                              : member.telegramId ||
                                "Biriktirilmagan"}
                          </span>
                        </div>
                      </section>

                      <div
                        className={
                          member.confirmationStatus ===
                          "CONFIRMED"
                            ? "admin-member-confirm admin-member-confirm--ok"
                            : "admin-member-confirm"
                        }
                      >
                        {member.confirmationStatus ===
                        "CONFIRMED"
                          ? "Tasdiqlangan"
                          : "Kutilmoqda"}
                      </div>
                    </article>
                  ))}
                </section>

                {selectedTeam.reviews?.length > 0 && (
                  <section className="admin-review-history">
                    <div className="admin-section-title">
                      <span>DECISION HISTORY</span>
                      <h3>Qarorlar tarixi</h3>
                    </div>

                    {selectedTeam.reviews.map((review) => (
                      <article key={review.id}>
                        <strong>
                          {review.decision === "APPROVED"
                            ? "Tasdiqlangan"
                            : "Rad etilgan"}
                        </strong>

                        <span>{review.adminName}</span>

                        {review.reason && (
                          <p>{review.reason}</p>
                        )}
                      </article>
                    ))}
                  </section>
                )}

                {selectedTeam.status ===
                  "PENDING_REVIEW" && (
                  <footer className="admin-review-actions">
                    {rejectMode && (
                      <div className="admin-rejection-box">
                        <div className="admin-rejection-heading">
                          <span>RAD ETISH SABABLARI</span>
                          <strong>
                            Bir yoki bir nechta sababni tanlang
                          </strong>
                        </div>

                        <div className="admin-rejection-presets">
                          {rejectionReasons.map((reason) => {
                            const reasonLine = `• ${reason}`;
                            const selected =
                              rejectReason
                                .split("\n")
                                .includes(reasonLine);

                            return (
                              <button
                                key={reason}
                                type="button"
                                className={
                                  selected
                                    ? "admin-rejection-preset admin-rejection-preset--active"
                                    : "admin-rejection-preset"
                                }
                                onClick={() =>
                                  toggleRejectReason(reason)
                                }
                              >
                                {selected ? (
                                  <Check size={14} />
                                ) : (
                                  <X size={14} />
                                )}

                                {reason}
                              </button>
                            );
                          })}
                        </div>

                        <label>
                          <span>
                            Sardorga yuboriladigan izoh
                          </span>

                          <textarea
                            value={rejectReason}
                            maxLength={500}
                            placeholder="Tayyor sababni tanlang yoki qo‘shimcha izoh yozing..."
                            onChange={(event) =>
                              setRejectReason(
                                event.target.value,
                              )
                            }
                          />

                          <small className="admin-rejection-counter">
                            {rejectReason.length}/500
                          </small>
                        </label>
                      </div>
                    )}

                    <div>
                      <button
                        className="admin-reject-button"
                        type="button"
                        disabled={decisionLoading}
                        onClick={() => {
                          if (rejectMode) {
                            rejectTeam();
                          } else {
                            setRejectMode(true);
                          }
                        }}
                      >
                        {decisionLoading &&
                        rejectMode ? (
                          <LoaderCircle
                            className="admin-spin"
                            size={17}
                          />
                        ) : (
                          <X size={17} />
                        )}

                        {rejectMode
                          ? "Rad etishni tasdiqlash"
                          : "Rad etish"}
                      </button>

                      <button
                        className="admin-approve-button"
                        type="button"
                        disabled={
                          decisionLoading ||
                          rejectMode ||
                          !teamValidation.valid
                        }
                        onClick={approveTeam}
                      >
                        {decisionLoading &&
                        !rejectMode ? (
                          <LoaderCircle
                            className="admin-spin"
                            size={17}
                          />
                        ) : (
                          <Check size={17} />
                        )}

                        Tasdiqlash
                      </button>
                    </div>
                  </footer>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}