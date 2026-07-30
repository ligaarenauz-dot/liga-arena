import {
  BadgeCheck,
  ChevronRight,
  Crown,
  Gamepad2,
  Plus,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

function getStatusTitle(status) {
  const titles = {
    DRAFT: "Tarkib tuzilmoqda",
    PENDING_CONFIRMATION: "O‘yinchilar tasdig‘i kutilmoqda",
    PENDING_REVIEW: "Admin tekshiruvida",
    APPROVED: "Tasdiqlangan",
    REJECTED: "Rad etilgan",
    LOCKED: "Tarkib yopilgan",
  };

  return titles[status] || "Ro‘yxatdan o‘tmagan";
}

export default function ProfilePage({
  telegramUser,
  createdTeam,
  onOpenTeam,
  onRegister,
}) {
  const captain = createdTeam?.members?.find(
    (member) => member.role === "CAPTAIN",
  );

  const fullName =
    [
      telegramUser?.first_name,
      telegramUser?.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    captain?.firstName ||
    "Liga Arena foydalanuvchisi";

  const username = telegramUser?.username
    ? `@${telegramUser.username}`
    : captain?.username
      ? `@${captain.username}`
      : "Telegram orqali ochilganda profil aniqlanadi";

  const apiUrl =
    import.meta.env.VITE_API_URL ||
    "http://127.0.0.1:4100";

  const logoUrl = createdTeam?.logoUrl
    ? createdTeam.logoUrl.startsWith("http")
      ? createdTeam.logoUrl
      : `${apiUrl}${createdTeam.logoUrl}`
    : "";

  const gameTitle =
    createdTeam?.game === "PUBG"
      ? "PUBG MOBILE"
      : createdTeam?.game === "MLBB"
        ? "MOBILE LEGENDS"
        : "";

  return (
    <div className="page">
      <div className="page-heading">
        <span>PLAYER IDENTITY</span>
        <h1>Profil</h1>
        <p>
          Jamoalar, o‘yinchi ID raqamlari va liga tarixi shu
          profilga biriktiriladi.
        </p>
      </div>

      <section className="profile-card">
        <div className="profile-card__avatar">
          {telegramUser?.photo_url ? (
            <img src={telegramUser.photo_url} alt={fullName} />
          ) : (
            <UserRound size={33} />
          )}
        </div>

        <div className="profile-card__identity">
          <span>TELEGRAM ACCOUNT</span>
          <h2>{fullName}</h2>
          <p>{username}</p>
        </div>

        <BadgeCheck
          className="profile-card__verified"
          size={24}
        />
      </section>

      {createdTeam ? (
        <button
          className="profile-team-card"
          type="button"
          onClick={onOpenTeam}
        >
          <div className="profile-team-card__logo">
            {logoUrl ? (
              <img src={logoUrl} alt={createdTeam.name} />
            ) : (
              <Crown size={25} />
            )}
          </div>

          <div className="profile-team-card__body">
            <span>MENING JAMOAM</span>
            <h2>{createdTeam.name}</h2>

            <div>
              <strong>{createdTeam.tag}</strong>
              <small>{gameTitle}</small>
            </div>

            <p>{getStatusTitle(createdTeam.status)}</p>
          </div>

          <ChevronRight size={20} />
        </button>
      ) : (
        <button
          className="profile-team-empty"
          type="button"
          onClick={onRegister}
        >
          <div>
            <Plus size={23} />
          </div>

          <section>
            <span>JAMOA TOPILMADI</span>
            <strong>Yangi jamoa ro‘yxatdan o‘tkazish</strong>
          </section>

          <ChevronRight size={19} />
        </button>
      )}

      <div className="profile-options">
        <button
          type="button"
          onClick={createdTeam ? onOpenTeam : onRegister}
        >
          <div>
            <Users size={21} />
          </div>

          <section>
            <span>JAMOA TARKIBI</span>
            <strong>
              {createdTeam
                ? `${createdTeam.counts?.total || 0} nafar o‘yinchi`
                : "Jamoa yaratish"}
            </strong>
          </section>

          <ChevronRight size={18} />
        </button>

        <button
          type="button"
          onClick={createdTeam ? onOpenTeam : onRegister}
        >
          <div>
            <Gamepad2 size={21} />
          </div>

          <section>
            <span>O‘YIN PROFILLARI</span>
            <strong>
              {createdTeam
                ? "ID raqamlari va tasdiqlar"
                : "PUBG va MLBB ID raqamlari"}
            </strong>
          </section>

          <ChevronRight size={18} />
        </button>

        <button
          type="button"
          onClick={createdTeam ? onOpenTeam : onRegister}
        >
          <div>
            <ShieldCheck size={21} />
          </div>

          <section>
            <span>STATUS</span>
            <strong>
              {createdTeam
                ? getStatusTitle(createdTeam.status)
                : "Ro‘yxatdan o‘tmagan"}
            </strong>
          </section>

          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}