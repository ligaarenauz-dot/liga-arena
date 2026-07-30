import { useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  Copy,
  Crown,
  Link2,
  LoaderCircle,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Send,
  Shield,
  Trash2,
  UserRound,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  addTeamMember,
  createMemberInvite,
  devConfirmAllTeamMembers,
  getTeam,
  removeTeamMember,
  submitTeam,
} from "../api/client.js";
import "./TeamRosterManager.css";

const regions = [
  "Andijon viloyati",
  "Buxoro viloyati",
  "Farg‘ona viloyati",
  "Jizzax viloyati",
  "Xorazm viloyati",
  "Namangan viloyati",
  "Navoiy viloyati",
  "Qashqadaryo viloyati",
  "Qoraqalpog‘iston Respublikasi",
  "Samarqand viloyati",
  "Sirdaryo viloyati",
  "Surxondaryo viloyati",
  "Toshkent viloyati",
  "Toshkent shahri",
];

const emptyPlayer = {
  fullName: "",
  birthDate: "",
  region: "",
  phone: "",
  username: "",
  nickname: "",
  gameUserId: "",
  serverId: "",
  role: "MAIN",
};

function onlyNumbers(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizePhone(value) {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 12);

  if (!digits) {
    return "";
  }

  if (digits.startsWith("998")) {
    return `+${digits}`;
  }

  return `+998${digits.slice(0, 9)}`;
}

function calculateAge(birthDate) {
  if (!birthDate) {
    return null;
  }

  const [year, month, day] = birthDate
    .split("-")
    .map(Number);

  const today = new Date();
  let age = today.getFullYear() - year;

  if (
    today.getMonth() + 1 < month ||
    (
      today.getMonth() + 1 === month &&
      today.getDate() < day
    )
  ) {
    age -= 1;
  }

  return age;
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

function statusTitle(status) {
  if (status === "CONFIRMED") {
    return "Tasdiqlangan";
  }

  if (status === "REJECTED") {
    return "Rad etilgan";
  }

  return "Tasdiq kutilmoqda";
}

function teamStatusTitle(status) {
  const titles = {
    DRAFT: "Tarkib tuzilmoqda",
    PENDING_CONFIRMATION: "Tasdiqlar kutilmoqda",
    PENDING_REVIEW: "Admin tekshiruvida",
    APPROVED: "Jamoa tasdiqlangan",
    REJECTED: "Jamoa rad etilgan",
    LOCKED: "Tarkib yopilgan",
  };

  return titles[status] || status;
}

export default function TeamRosterManager({
  team,
  onTeamChange,
  onClose,
}) {
  const [currentTeam, setCurrentTeam] = useState(team);
  const [form, setForm] = useState(emptyPlayer);
  const [formOpen, setFormOpen] = useState(
    ["DRAFT", "PENDING_CONFIRMATION"].includes(team.status),
  );
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [inviteLoadingId, setInviteLoadingId] = useState("");
  const [copiedMemberId, setCopiedMemberId] = useState("");
  const [submittingTeam, setSubmittingTeam] = useState(false);
  const [devConfirming, setDevConfirming] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const counts = currentTeam.counts || {};
  const limits = currentTeam.limits || {};

  const mainCount = Number(counts.mainCount || 0);
  const reserveCount = Number(counts.reserveCount || 0);
  const totalCount = Number(counts.total || 0);
  const confirmedCount = Number(counts.confirmedCount || 0);

  const rosterEditable = [
    "DRAFT",
    "PENDING_CONFIRMATION",
  ].includes(currentTeam.status);

  const mainComplete =
    mainCount === Number(limits.main || 0);

  const reserveComplete =
    currentTeam.game === "MLBB"
      ? reserveCount === Number(limits.reserve || 0)
      : reserveCount <= Number(limits.reserve || 0);

  const rosterComplete =
    mainComplete && reserveComplete;

  const allConfirmed =
    totalCount > 0 &&
    confirmedCount === totalCount;

  const consentsComplete =
    Boolean(currentTeam.mediaConsent) &&
    Boolean(currentTeam.rulesConsent);

  const canSubmit =
    rosterEditable &&
    rosterComplete &&
    allConfirmed &&
    consentsComplete;

  const gameTitle =
    currentTeam.game === "PUBG"
      ? "PUBG MOBILE"
      : "MOBILE LEGENDS";

  const logoUrl = useMemo(() => {
    if (!currentTeam.logoUrl) {
      return "";
    }

    if (currentTeam.logoUrl.startsWith("http")) {
      return currentTeam.logoUrl;
    }

    const apiUrl =
      import.meta.env.VITE_API_URL ||
      "http://127.0.0.1:4100";

    return `${apiUrl}${currentTeam.logoUrl}`;
  }, [currentTeam.logoUrl]);

  const syncTeam = (nextTeam) => {
    setCurrentTeam(nextTeam);
    onTeamChange?.(nextTeam);
  };

  const clearMessages = () => {
    setError("");
    setNotice("");
  };

  const updateField = (field, value) => {
    clearMessages();

    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const refreshTeam = async () => {
    setRefreshing(true);
    clearMessages();

    try {
      const latestTeam = await getTeam(currentTeam.id);

      syncTeam(latestTeam);

      if (
        !["DRAFT", "PENDING_CONFIRMATION"].includes(
          latestTeam.status,
        )
      ) {
        setFormOpen(false);
      }

      setNotice("Tarkib ma’lumotlari yangilandi.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setRefreshing(false);
    }
  };

  const addPlayer = async () => {
    clearMessages();

    if (!rosterEditable) {
      setError("Jamoa tarkibi hozir tahrirlash uchun yopiq.");
      return;
    }

    const fullName = form.fullName
      .trim()
      .replace(/\s+/g, " ");
    const nickname = form.nickname.trim();
    const gameUserId = onlyNumbers(form.gameUserId);
    const serverId = onlyNumbers(form.serverId);
    const phone = normalizePhone(form.phone);
    const age = calculateAge(form.birthDate);
    const minimumAge = Number(
      currentTeam.minimumAge || 16,
    );

    if (
      fullName.length < 5 ||
      !fullName.includes(" ")
    ) {
      setError("O‘yinchining ism va familiyasini to‘liq kiriting.");
      return;
    }

    if (!form.birthDate) {
      setError("O‘yinchining tug‘ilgan sanasini kiriting.");
      return;
    }

    if (!Number.isInteger(age) || age < minimumAge) {
      setError(
        `O‘yinchi kamida ${minimumAge} yosh bo‘lishi kerak.`,
      );
      return;
    }

    if (!form.region) {
      setError("O‘yinchining yashash viloyatini tanlang.");
      return;
    }

    if (!/^\+998\d{9}$/.test(phone)) {
      setError("Telefon raqamini +998901234567 formatida kiriting.");
      return;
    }

    if (nickname.length < 2) {
      setError("O‘yinchining IGN — o‘yindagi nomini kiriting.");
      return;
    }

    if (gameUserId.length < 4) {
      setError(
        currentTeam.game === "PUBG"
          ? "PUBG ID raqami noto‘g‘ri."
          : "Mobile Legends User ID raqami noto‘g‘ri.",
      );
      return;
    }

    if (
      currentTeam.game === "MLBB" &&
      serverId.length < 4
    ) {
      setError(
        "Mobile Legends Server / Zone ID raqamini kiriting.",
      );
      return;
    }

    if (
      form.role === "MAIN" &&
      mainCount >= Number(limits.main)
    ) {
      setError("Asosiy tarkib joylari to‘lgan.");
      return;
    }

    if (
      form.role === "RESERVE" &&
      reserveCount >= Number(limits.reserve)
    ) {
      setError("Zaxira tarkibi joylari to‘lgan.");
      return;
    }

    setLoading(true);

    try {
      const result = await addTeamMember(
        currentTeam.id,
        {
          fullName,
          birthDate: form.birthDate,
          region: form.region,
          phone,
          username: form.username
            .trim()
            .replace(/^@/, ""),
          nickname,
          gameUserId,
          serverId:
            currentTeam.game === "MLBB"
              ? serverId
              : "",
          role: form.role,
        },
      );

      syncTeam(result.team);
      setForm(emptyPlayer);
      setFormOpen(false);
      setRoleMenuOpen(false);
      setNotice("O‘yinchi tarkibga qo‘shildi.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const deletePlayer = async (memberId) => {
    if (!rosterEditable) {
      setError("Jamoa tarkibi hozir tahrirlash uchun yopiq.");
      return;
    }

    setDeletingId(memberId);
    clearMessages();

    try {
      const result = await removeTeamMember(
        currentTeam.id,
        memberId,
      );

      syncTeam(result.team);
      setNotice("O‘yinchi tarkibdan olib tashlandi.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeletingId("");
    }
  };

  const generateInvite = async (memberId) => {
    if (!rosterEditable) {
      setError("Jamoa tarkibi hozir tahrirlash uchun yopiq.");
      return;
    }

    setInviteLoadingId(memberId);
    setCopiedMemberId("");
    clearMessages();

    try {
      const result = await createMemberInvite(
        currentTeam.id,
        memberId,
      );

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(
          result.inviteLink,
        );
      }

      setCopiedMemberId(memberId);
      setNotice(
        "Tasdiqlash havolasi yaratildi va nusxalandi.",
      );

      window.setTimeout(() => {
        setCopiedMemberId("");
      }, 2500);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setInviteLoadingId("");
    }
  };

  const confirmAllForDevelopment = async () => {
    setDevConfirming(true);
    clearMessages();

    try {
      const result = await devConfirmAllTeamMembers(
        currentTeam.id,
      );

      syncTeam(result.team);

      setNotice(
        `${result.confirmedCount} ta o‘yinchi test rejimida tasdiqlandi.`,
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDevConfirming(false);
    }
  };

  const sendForReview = async () => {
    clearMessages();

    if (!rosterComplete) {
      setError(
        "Avval jamoaning majburiy tarkibini to‘ldiring.",
      );
      return;
    }

    if (!allConfirmed) {
      setError(
        "Barcha o‘yinchilar Telegram orqali tasdiqlashi kerak.",
      );
      return;
    }

    setSubmittingTeam(true);

    try {
      const result = await submitTeam(currentTeam.id);

      syncTeam(result.team);
      setFormOpen(false);
      setRoleMenuOpen(false);

      setNotice(
        "Jamoa admin tekshiruviga yuborildi.",
      );

      try {
        window.Telegram?.WebApp?.HapticFeedback
          ?.notificationOccurred("success");
      } catch {
        // Telegram tashqarisida ishlamaydi.
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmittingTeam(false);
    }
  };

  return (
    <div className="roster-manager">
      <header className="roster-hero">
        <div className="roster-team-logo">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={currentTeam.name}
            />
          ) : (
            <Shield size={30} />
          )}
        </div>

        <div className="roster-team-identity">
          <span>{gameTitle}</span>
          <h3>{currentTeam.name}</h3>

          <div>
            <strong>{currentTeam.tag}</strong>
            <small>{currentTeam.region}</small>

            {currentTeam.technicalNumber && (
              <span className="roster-technical-number">
                TEXNIK RAQAM:{" "}
                {currentTeam.technicalNumber}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Yopish"
        >
          <X size={20} />
        </button>
      </header>

      <section className="roster-progress">
        <article>
          <Users size={19} />

          <div>
            <span>ASOSIY TARKIB</span>
            <strong>
              {mainCount} / {limits.main}
            </strong>
          </div>
        </article>

        <article>
          <UserRound size={19} />

          <div>
            <span>ZAXIRA</span>
            <strong>
              {reserveCount} / {limits.reserve}
            </strong>
          </div>
        </article>

        <article>
          <Crown size={19} />

          <div>
            <span>TASDIQLANGAN</span>
            <strong>
              {confirmedCount} / {totalCount}
            </strong>
          </div>
        </article>
      </section>

      <section className="roster-list-section">
        <div className="roster-section-title">
          <div>
            <span>TEAM ROSTER</span>
            <h4>Jamoa tarkibi</h4>
          </div>

          <button
            type="button"
            disabled={refreshing}
            onClick={refreshTeam}
            aria-label="Tarkibni yangilash"
          >
            <RefreshCw
              className={refreshing ? "roster-spin" : ""}
              size={17}
            />
          </button>
        </div>

        <div className="roster-list">
          {currentTeam.members.map((member) => (
            <article
              className="roster-member"
              key={member.id}
            >
              <div
                className={`roster-member__avatar roster-member__avatar--${member.role.toLowerCase()}`}
              >
                {member.role === "CAPTAIN" ? (
                  <Crown size={17} />
                ) : (
                  <UserRound size={17} />
                )}
              </div>

              <div className="roster-member__identity">
                <div>
                  <strong>{member.nickname}</strong>
                  <span>{roleTitle(member.role)}</span>
                </div>

                <p>
                  {member.fullName ||
                    member.firstName ||
                    "O‘yinchi"}
                  {" • "}
                  {member.age ?? "—"} yosh
                  {" • "}
                  {member.region || "Hudud kiritilmagan"}
                </p>

                <small className="roster-member__details">
                  {member.phone || "Telefon kiritilmagan"}
                  {" • "}
                  {currentTeam.game === "PUBG"
                    ? `PUBG ID: ${member.gameUserId}`
                    : `User ID: ${member.gameUserId} • Zone: ${member.serverId}`}
                </small>
              </div>

              <div
                className={`roster-member__status roster-member__status--${member.confirmationStatus.toLowerCase()}`}
              >
                {member.confirmationStatus ===
                  "CONFIRMED" && <Check size={13} />}

                <span>
                  {statusTitle(
                    member.confirmationStatus,
                  )}
                </span>
              </div>

              {rosterEditable &&
                member.role !== "CAPTAIN" &&
                member.confirmationStatus !==
                  "CONFIRMED" && (
                  <button
                    className="roster-member__invite"
                    type="button"
                    disabled={
                      inviteLoadingId === member.id
                    }
                    onClick={() =>
                      generateInvite(member.id)
                    }
                    aria-label="Tasdiqlash havolasi"
                  >
                    {inviteLoadingId === member.id ? (
                      <LoaderCircle
                        className="roster-spin"
                        size={15}
                      />
                    ) : copiedMemberId === member.id ? (
                      <Check size={15} />
                    ) : (
                      <Link2 size={15} />
                    )}
                  </button>
                )}

              {rosterEditable &&
                member.role !== "CAPTAIN" && (
                  <button
                    className="roster-member__delete"
                    type="button"
                    disabled={
                      deletingId === member.id
                    }
                    onClick={() =>
                      deletePlayer(member.id)
                    }
                    aria-label="O‘yinchini o‘chirish"
                  >
                    {deletingId === member.id ? (
                      <LoaderCircle
                        className="roster-spin"
                        size={16}
                      />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                )}
            </article>
          ))}
        </div>
      </section>

      {rosterEditable &&
        !formOpen &&
        totalCount < Number(limits.total) && (
          <button
            className="roster-add-trigger"
            type="button"
            onClick={() => {
              setFormOpen(true);
              clearMessages();
            }}
          >
            <Plus size={18} />
            Yangi o‘yinchi qo‘shish
          </button>
        )}

      {rosterEditable &&
        formOpen &&
        totalCount < Number(limits.total) && (
          <section className="roster-form">
            <div className="roster-section-title">
              <div>
                <span>NEW PLAYER</span>
                <h4>O‘yinchi qo‘shish</h4>
              </div>

              {totalCount > 1 && (
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                >
                  <X size={17} />
                </button>
              )}
            </div>

            <div className="roster-role-picker">
              <span>O‘yinchi roli</span>

              <button
                type="button"
                onClick={() =>
                  setRoleMenuOpen(
                    (current) => !current,
                  )
                }
              >
                <Shield size={16} />
                <strong>{roleTitle(form.role)}</strong>
                <span>▼</span>
              </button>

              {roleMenuOpen && (
                <div className="roster-role-menu">
                  <button
                    type="button"
                    disabled={
                      mainCount >= Number(limits.main)
                    }
                    onClick={() => {
                      updateField("role", "MAIN");
                      setRoleMenuOpen(false);
                    }}
                  >
                    <Shield size={15} />

                    <div>
                      <strong>Asosiy o‘yinchi</strong>
                      <span>
                        {mainCount} / {limits.main}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={
                      reserveCount >=
                      Number(limits.reserve)
                    }
                    onClick={() => {
                      updateField("role", "RESERVE");
                      setRoleMenuOpen(false);
                    }}
                  >
                    <UserRound size={15} />

                    <div>
                      <strong>Zaxira o‘yinchi</strong>
                      <span>
                        {reserveCount} /{" "}
                        {limits.reserve}
                      </span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <label>
              <span>Ism va familiya</span>

              <input
                type="text"
                value={form.fullName}
                placeholder="Aliyev Islombek"
                onChange={(event) =>
                  updateField(
                    "fullName",
                    event.target.value,
                  )
                }
              />
            </label>

            <div className="roster-form-row">
              <label>
                <span>Tug‘ilgan sana</span>

                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(event) =>
                    updateField(
                      "birthDate",
                      event.target.value,
                    )
                  }
                />

                {form.birthDate && (
                  <small>
                    {calculateAge(form.birthDate)} yosh
                    {" • "}
                    Minimal talab: {currentTeam.minimumAge || 16}+
                  </small>
                )}
              </label>

              <label>
                <span>Telefon raqami</span>

                <div className="roster-input-icon">
                  <Phone size={15} />

                  <input
                    type="tel"
                    value={form.phone}
                    placeholder="+998901234567"
                    onChange={(event) =>
                      updateField(
                        "phone",
                        normalizePhone(
                          event.target.value,
                        ),
                      )
                    }
                  />
                </div>
              </label>
            </div>

            <label>
              <span>Yashash viloyati</span>

              <div className="roster-input-icon">
                <MapPin size={15} />

                <select
                  value={form.region}
                  onChange={(event) =>
                    updateField(
                      "region",
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    Viloyatni tanlang
                  </option>

                  {regions.map((region) => (
                    <option
                      value={region}
                      key={region}
                    >
                      {region}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <div className="roster-form-row">
              <label>
                <span>Telegram username</span>

                <input
                  type="text"
                  value={form.username}
                  placeholder="@username"
                  onChange={(event) =>
                    updateField(
                      "username",
                      event.target.value,
                    )
                  }
                />
              </label>

              <label>
                <span>IGN — o‘yindagi nom</span>

                <input
                  type="text"
                  value={form.nickname}
                  placeholder="Masalan: WOLF"
                  onChange={(event) =>
                    updateField(
                      "nickname",
                      event.target.value,
                    )
                  }
                />
              </label>
            </div>

            <div
              className={
                currentTeam.game === "MLBB"
                  ? "roster-form-row"
                  : ""
              }
            >
              <label>
                <span>
                  {currentTeam.game === "PUBG"
                    ? "PUBG ID"
                    : "Mobile Legends User ID"}
                </span>

                <input
                  type="text"
                  inputMode="numeric"
                  value={form.gameUserId}
                  placeholder={
                    currentTeam.game === "PUBG"
                      ? "PUBG ID raqami"
                      : "User ID raqami"
                  }
                  onChange={(event) =>
                    updateField(
                      "gameUserId",
                      onlyNumbers(
                        event.target.value,
                      ),
                    )
                  }
                />
              </label>

              {currentTeam.game === "MLBB" && (
                <label>
                  <span>Server / Zone ID</span>

                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.serverId}
                    placeholder="Server / Zone ID"
                    onChange={(event) =>
                      updateField(
                        "serverId",
                        onlyNumbers(
                          event.target.value,
                        ),
                      )
                    }
                  />
                </label>
              )}
            </div>

            <button
              className="roster-submit-player"
              type="button"
              disabled={loading}
              onClick={addPlayer}
            >
              {loading ? (
                <>
                  Qo‘shilmoqda
                  <LoaderCircle
                    className="roster-spin"
                    size={17}
                  />
                </>
              ) : (
                <>
                  O‘yinchini qo‘shish
                  <Plus size={17} />
                </>
              )}
            </button>
          </section>
        )}

      {error && (
        <div className="roster-message roster-message--error">
          {error}
        </div>
      )}

      {notice && (
        <div className="roster-message roster-message--success">
          <Check size={15} />
          {notice}
        </div>
      )}

      <section
        className={
          rosterComplete
            ? "roster-readiness roster-readiness--complete"
            : "roster-readiness"
        }
      >
        <div>
          {rosterComplete ? (
            <Check size={20} />
          ) : (
            <Shield size={20} />
          )}
        </div>

        <section>
          <span>
            {rosterComplete
              ? "TARKIB TO‘LDI"
              : "TARKIB TO‘LIQ EMAS"}
          </span>

          <strong>
            {rosterComplete
              ? `${confirmedCount}/${totalCount} o‘yinchi tasdiqlagan`
              : `Yana ${Math.max(
                  Number(limits.main) - mainCount,
                  0,
                )} ta asosiy o‘yinchi kerak`}
          </strong>
        </section>
      </section>

      <section
        className={
          currentTeam.status === "PENDING_REVIEW"
            ? "roster-review roster-review--submitted"
            : currentTeam.status === "APPROVED"
              ? "roster-review roster-review--approved"
              : currentTeam.status === "REJECTED"
                ? "roster-review roster-review--rejected"
                : "roster-review"
        }
      >
        <div className="roster-review__header">
          <div>
            {currentTeam.status ===
            "PENDING_REVIEW" ? (
              <LoaderCircle size={21} />
            ) : currentTeam.status ===
              "APPROVED" ? (
              <Check size={21} />
            ) : (
              <Send size={21} />
            )}
          </div>

          <section>
            <span>REGISTRATION STATUS</span>

            <strong>
              {teamStatusTitle(currentTeam.status)}
            </strong>
          </section>
        </div>

        {currentTeam.status === "PENDING_REVIEW" ? (
          <p>
            Jamoa Liga Arena administratsiyasi tomonidan
            tekshirilmoqda. Qaror chiqquncha tarkib
            o‘zgartirilmaydi.
          </p>
        ) : currentTeam.status === "APPROVED" ? (
          <p>
            Jamoa tasdiqlandi va mavsum ishtirokchilari
            ro‘yxatiga qo‘shildi.
          </p>
        ) : currentTeam.status === "REJECTED" ? (
          <p>
            Jamoa tekshiruvdan o‘tmadi. Admin sababini
            keyingi bosqichda shu yerda ko‘rsatamiz.
          </p>
        ) : (
          <>
            <div className="roster-review__checks">
              <div
                className={
                  rosterComplete
                    ? "roster-review__check roster-review__check--complete"
                    : "roster-review__check"
                }
              >
                {rosterComplete ? (
                  <Check size={15} />
                ) : (
                  <Shield size={15} />
                )}

                <span>Tarkib to‘liq</span>
              </div>

              <div
                className={
                  allConfirmed
                    ? "roster-review__check roster-review__check--complete"
                    : "roster-review__check"
                }
              >
                {allConfirmed ? (
                  <Check size={15} />
                ) : (
                  <Users size={15} />
                )}

                <span>
                  Tasdiqlar {confirmedCount}/{totalCount}
                </span>
              </div>

              <div
                className={
                  consentsComplete
                    ? "roster-review__check roster-review__check--complete"
                    : "roster-review__check"
                }
              >
                {consentsComplete ? (
                  <Check size={15} />
                ) : (
                  <Shield size={15} />
                )}

                <span>Roziliklar 2/2</span>
              </div>
            </div>

            {import.meta.env.DEV &&
              rosterEditable &&
              totalCount > 1 &&
              !allConfirmed && (
                <button
                  className="roster-review__dev"
                  type="button"
                  disabled={devConfirming}
                  onClick={confirmAllForDevelopment}
                >
                  {devConfirming ? (
                    <>
                      Test tasdiqlanmoqda
                      <LoaderCircle
                        className="roster-spin"
                        size={16}
                      />
                    </>
                  ) : (
                    <>
                      DEV: Barchasini tasdiqlash
                      <Zap size={16} />
                    </>
                  )}
                </button>
              )}

            <button
              className="roster-review__submit"
              type="button"
              disabled={!canSubmit || submittingTeam}
              onClick={sendForReview}
            >
              {submittingTeam ? (
                <>
                  Yuborilmoqda
                  <LoaderCircle
                    className="roster-spin"
                    size={17}
                  />
                </>
              ) : (
                <>
                  Admin tekshiruviga yuborish
                  <Send size={17} />
                </>
              )}
            </button>

            {!rosterComplete && (
              <small>
                Avval majburiy tarkibni to‘ldiring.
              </small>
            )}

            {rosterComplete && !allConfirmed && (
              <small>
                Barcha o‘yinchilar bot orqali tasdiqlashi
                kerak.
              </small>
            )}
          </>
        )}
      </section>

      <div className="roster-next-note">
        <Copy size={17} />

        <p>
          Admin tekshiruviga yuborilgach tarkib
          vaqtincha yopiladi.
        </p>
      </div>
    </div>
  );
}