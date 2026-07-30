import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Crosshair,
  FileCheck2,
  ImagePlus,
  LoaderCircle,
  MapPin,
  Phone,
  ShieldCheck,
  Swords,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import {
  createTeam,
  uploadTeamLogo,
} from "../api/client.js";
import TeamRosterManager from "./TeamRosterManager.jsx";

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

const emptyForm = {
  game: "",
  name: "",
  tag: "",
  region: "",
  fullName: "",
  birthDate: "",
  phone: "",
  nickname: "",
  gameUserId: "",
  serverId: "",
  telegramId: "",
  username: "",
  mediaConsent: false,
  rulesConsent: false,
};

function onlyNumbers(value) {
  return String(value || "").replace(/\D/g, "");
}

function cleanUsername(value) {
  return String(value || "")
    .trim()
    .replace(/^@/, "");
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

export default function TeamRegistrationModal({
  open,
  onClose,
  telegramUser,
  onCreated,
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [regionOpen, setRegionOpen] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdTeam, setCreatedTeam] = useState(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setStep(1);
    setForm({
      ...emptyForm,
      telegramId: telegramUser?.id
        ? String(telegramUser.id)
        : "",
      fullName: [
        telegramUser?.first_name,
        telegramUser?.last_name,
      ]
        .filter(Boolean)
        .join(" "),
      username: telegramUser?.username || "",
    });
    setLogoFile(null);
    setLogoPreview("");
    setRegionOpen(false);
    setError("");
    setSubmitting(false);
    setCreatedTeam(null);
  }, [open, telegramUser]);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview("");
      return undefined;
    }

    const previewUrl = URL.createObjectURL(logoFile);
    setLogoPreview(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [logoFile]);

  const gameTitle = useMemo(() => {
    return form.game === "PUBG"
      ? "PUBG MOBILE"
      : "MOBILE LEGENDS";
  }, [form.game]);

  if (!open) {
    return null;
  }

  const updateField = (field, value) => {
    setError("");

    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const selectGame = (game) => {
    updateField("game", game);

    try {
      window.Telegram?.WebApp?.HapticFeedback
        ?.impactOccurred("light");
    } catch {
      // Telegram tashqarisida ishlamaydi.
    }

    setTimeout(() => {
      setStep(2);
    }, 100);
  };

  const selectLogo = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Logo PNG, JPG yoki WEBP formatida bo‘lishi kerak.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Logo hajmi 2 MB dan oshmasligi kerak.");
      return;
    }

    setError("");
    setLogoFile(file);
  };

  const goNext = () => {
    setError("");

    if (step !== 2) {
      return;
    }

    const teamName = form.name.trim();
    const teamTag = form.tag
      .replace(/\s+/g, "")
      .toUpperCase();

    if (!logoFile) {
      setError("Jamoa logotipini tanlang.");
      return;
    }

    if (teamName.length < 3) {
      setError("Jamoa nomi kamida 3 belgidan iborat bo‘lsin.");
      return;
    }

    if (teamTag.length < 2 || teamTag.length > 8) {
      setError("Jamoa TAG’i 2–8 belgidan iborat bo‘lsin.");
      return;
    }

    setForm((current) => ({
      ...current,
      name: teamName,
      tag: teamTag,
    }));

    setStep(3);
  };

  const goBack = () => {
    setError("");
    setRegionOpen(false);

    if (step > 1) {
      setStep((current) => current - 1);
    }
  };

  const handleSubmit = async () => {
    setError("");

    const telegramId = onlyNumbers(form.telegramId);
    const gameUserId = onlyNumbers(form.gameUserId);
    const serverId = onlyNumbers(form.serverId);
    const fullName = form.fullName
      .trim()
      .replace(/\s+/g, " ");
    const nickname = form.nickname.trim();
    const phone = normalizePhone(form.phone);
    const age = calculateAge(form.birthDate);

    if (
      fullName.length < 5 ||
      !fullName.includes(" ")
    ) {
      setError("Sardorning ism va familiyasini to‘liq kiriting.");
      return;
    }

    if (!form.birthDate) {
      setError("Sardorning tug‘ilgan sanasini kiriting.");
      return;
    }

    if (!Number.isInteger(age) || age < 16) {
      setError("Liga ishtirokchisi kamida 16 yosh bo‘lishi kerak.");
      return;
    }

    if (!form.region) {
      setError("Sardorning yashash viloyatini tanlang.");
      return;
    }

    if (!/^\+998\d{9}$/.test(phone)) {
      setError("Telefon raqamini +998901234567 formatida kiriting.");
      return;
    }

    if (nickname.length < 2) {
      setError("Sardorning IGN — o‘yindagi nomini kiriting.");
      return;
    }

    if (gameUserId.length < 4) {
      setError(
        form.game === "PUBG"
          ? "PUBG ID raqamini to‘g‘ri kiriting."
          : "Mobile Legends User ID raqamini to‘g‘ri kiriting.",
      );
      return;
    }

    if (form.game === "MLBB" && serverId.length < 4) {
      setError("Mobile Legends Server / Zone ID raqamini kiriting.");
      return;
    }

    if (!telegramId) {
      setError("Sardorning Telegram ID raqamini kiriting.");
      return;
    }

    if (!form.mediaConsent) {
      setError(
        "Surat va videolardan ligani yoritishda foydalanish roziligini tasdiqlang.",
      );
      return;
    }

    if (!form.rulesConsent) {
      setError("Liga reglamenti va shartlariga rozilikni tasdiqlang.");
      return;
    }

    setSubmitting(true);

    try {
      const uploadedLogo = await uploadTeamLogo(logoFile);

      const result = await createTeam({
        game: form.game,
        season: "S01",
        name: form.name.trim(),
        tag: form.tag.trim().toUpperCase(),
        region: form.region,
        logoUrl: uploadedLogo.logoUrl,
        mediaConsent: form.mediaConsent,
        rulesConsent: form.rulesConsent,
        captain: {
          telegramId,
          fullName,
          birthDate: form.birthDate,
          region: form.region,
          phone,
          username: cleanUsername(form.username),
          gameUserId,
          serverId: form.game === "MLBB" ? serverId : "",
          nickname,
        },
      });

      setCreatedTeam(result.team);
      onCreated?.(result.team);

      window.Telegram?.WebApp?.HapticFeedback
        ?.notificationOccurred("success");
    } catch (requestError) {
      setError(
        requestError.message ||
          "Jamoani yaratishda xatolik yuz berdi.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="registration-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="registration-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Jamoani ro‘yxatdan o‘tkazish"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="registration-header">
          <div>
            <span>TEAM REGISTRATION</span>
            <h2>
              {createdTeam
                ? "Jamoa yaratildi"
                : "Jamoangni ro‘yxatdan o‘tkaz"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
          >
            <X size={20} />
          </button>
        </header>

        {!createdTeam && (
          <div className="registration-progress">
            {["O‘yin", "Jamoa", "Sardor"].map(
              (label, index) => {
                const number = index + 1;

                return (
                  <div
                    key={label}
                    className={
                      number === step
                        ? "registration-progress__item registration-progress__item--active"
                        : number < step
                          ? "registration-progress__item registration-progress__item--complete"
                          : "registration-progress__item"
                    }
                  >
                    <span>
                      {number < step ? (
                        <Check size={13} />
                      ) : (
                        number
                      )}
                    </span>
                    <small>{label}</small>
                  </div>
                );
              },
            )}
          </div>
        )}

        {createdTeam ? (
          <TeamRosterManager
            team={createdTeam}
            onClose={onClose}
            onTeamChange={(nextTeam) => {
              setCreatedTeam(nextTeam);
              onCreated?.(nextTeam);
            }}
          />
        ) : (
          <>
            <div className="registration-body">
              {step === 1 && (
                <div className="registration-step">
                  <div className="registration-step__heading">
                    <span>01 / GAME</span>
                    <h3>O‘yinni tanlang</h3>
                    <p>
                      Kartani bosishingiz bilan keyingi bosqich
                      avtomatik ochiladi.
                    </p>
                  </div>

                  <button
                    className="registration-game"
                    type="button"
                    onClick={() => selectGame("PUBG")}
                  >
                    <div>
                      <Crosshair size={24} />
                    </div>

                    <section>
                      <span>BATTLE ROYALE</span>
                      <strong>PUBG MOBILE</strong>
                      <small>4 asosiy o‘yinchi</small>
                    </section>

                    <ChevronRight size={19} />
                  </button>

                  <button
                    className="registration-game"
                    type="button"
                    onClick={() => selectGame("MLBB")}
                  >
                    <div>
                      <Swords size={24} />
                    </div>

                    <section>
                      <span>5V5 MOBA</span>
                      <strong>MOBILE LEGENDS</strong>
                      <small>5 asosiy va 1 zaxira</small>
                    </section>

                    <ChevronRight size={19} />
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="registration-step">
                  <div className="registration-step__heading">
                    <span>02 / TEAM</span>
                    <h3>Jamoa ma’lumotlari</h3>
                    <p>
                      Logo, jamoa nomi va TAG’ni kiriting.
                    </p>
                  </div>

                  <label className="team-logo-picker">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={selectLogo}
                    />

                    <div className="team-logo-picker__preview">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Jamoa logotipi"
                        />
                      ) : (
                        <ImagePlus size={29} />
                      )}
                    </div>

                    <section>
                      <span>JAMOA LOGOTIPI</span>
                      <strong>
                        {logoFile
                          ? logoFile.name
                          : "Logo yuklash"}
                      </strong>
                      <small>PNG, JPG yoki WEBP • 2 MB gacha</small>
                    </section>

                    <Upload size={19} />
                  </label>

                  <label className="registration-field">
                    <span>Jamoa nomi</span>
                    <input
                      type="text"
                      value={form.name}
                      maxLength={32}
                      placeholder="Masalan: Golden Wolves"
                      onChange={(event) =>
                        updateField("name", event.target.value)
                      }
                    />
                  </label>

                  <label className="registration-field">
                    <span>Jamoa TAG</span>
                    <input
                      type="text"
                      value={form.tag}
                      maxLength={8}
                      placeholder="Masalan: GW"
                      onChange={(event) =>
                        updateField(
                          "tag",
                          event.target.value.toUpperCase(),
                        )
                      }
                    />
                  </label>

                </div>
              )}

              {step === 3 && (
                <div className="registration-step">
                  <div className="registration-step__heading">
                    <span>03 / CAPTAIN</span>
                    <h3>Sardor ma’lumotlari</h3>
                    <p>
                      Sardor jamoaning rasmiy vakili va asosiy
                      aloqa shaxsi hisoblanadi.
                    </p>
                  </div>

                  <label className="registration-field">
                    <span>Ism va familiya</span>
                    <div className="registration-input-icon">
                      <UserRound size={16} />
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
                    </div>
                  </label>

                  <div className="registration-row">
                    <label className="registration-field">
                      <span>Tug‘ilgan sana</span>
                      <div className="registration-input-icon">
                        <CalendarDays size={16} />
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
                      </div>
                      <small>
                        Minimal yosh: 16+
                        {form.birthDate &&
                          ` • ${calculateAge(form.birthDate)} yosh`}
                      </small>
                    </label>

                    <label className="registration-field">
                      <span>Telefon raqami</span>
                      <div className="registration-input-icon">
                        <Phone size={16} />
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

                  <div className="region-picker">
                    <span>Yashash viloyati</span>

                    <button
                      className={
                        regionOpen
                          ? "region-picker__button region-picker__button--open"
                          : "region-picker__button"
                      }
                      type="button"
                      onClick={() =>
                        setRegionOpen((current) => !current)
                      }
                    >
                      <MapPin size={17} />

                      <strong>
                        {form.region || "Viloyatni tanlang"}
                      </strong>

                      <ChevronDown size={18} />
                    </button>

                    {regionOpen && (
                      <div className="region-picker__menu">
                        {regions.map((region) => (
                          <button
                            key={region}
                            type="button"
                            onClick={() => {
                              updateField("region", region);
                              setRegionOpen(false);
                            }}
                          >
                            <MapPin size={14} />
                            <span>{region}</span>

                            {form.region === region && (
                              <Check size={15} />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="registration-row">
                    <label className="registration-field">
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

                    <label className="registration-field">
                      <span>Telegram ID</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={form.telegramId}
                        readOnly={Boolean(telegramUser?.id)}
                        placeholder="123456789"
                        onChange={(event) =>
                          updateField(
                            "telegramId",
                            onlyNumbers(event.target.value),
                          )
                        }
                      />
                    </label>
                  </div>

                  <label className="registration-field">
                    <span>IGN — o‘yindagi nom</span>
                    <input
                      type="text"
                      value={form.nickname}
                      placeholder="Masalan: ARLI"
                      onChange={(event) =>
                        updateField(
                          "nickname",
                          event.target.value,
                        )
                      }
                    />
                  </label>

                  <div
                    className={
                      form.game === "MLBB"
                        ? "registration-row"
                        : ""
                    }
                  >
                    <label className="registration-field">
                      <span>
                        {form.game === "PUBG"
                          ? "PUBG ID"
                          : "Mobile Legends User ID"}
                      </span>

                      <input
                        type="text"
                        inputMode="numeric"
                        value={form.gameUserId}
                        placeholder={
                          form.game === "PUBG"
                            ? "PUBG ID raqami"
                            : "User ID raqami"
                        }
                        onChange={(event) =>
                          updateField(
                            "gameUserId",
                            onlyNumbers(event.target.value),
                          )
                        }
                      />
                    </label>

                    {form.game === "MLBB" && (
                      <label className="registration-field">
                        <span>Server / Zone ID</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={form.serverId}
                          placeholder="Server / Zone ID"
                          onChange={(event) =>
                            updateField(
                              "serverId",
                              onlyNumbers(event.target.value),
                            )
                          }
                        />
                      </label>
                    )}
                  </div>

                  <section className="registration-consents">
                    <label
                      className={
                        form.mediaConsent
                          ? "registration-consent registration-consent--checked"
                          : "registration-consent"
                      }
                    >
                      <input
                        type="checkbox"
                        checked={form.mediaConsent}
                        onChange={(event) =>
                          updateField(
                            "mediaConsent",
                            event.target.checked,
                          )
                        }
                      />

                      <span>
                        {form.mediaConsent && (
                          <Check size={14} />
                        )}
                      </span>

                      <ImagePlus size={20} />

                      <div>
                        <strong>Media roziligi</strong>
                        <p>
                          Jamoa a’zolarining surat, video, ovoz,
                          nickname va o‘yin lavhalaridan Liga Arena
                          streamlari, yangiliklari hamda ijtimoiy
                          tarmoqlarida foydalanishga roziman.
                        </p>
                      </div>
                    </label>

                    <label
                      className={
                        form.rulesConsent
                          ? "registration-consent registration-consent--checked"
                          : "registration-consent"
                      }
                    >
                      <input
                        type="checkbox"
                        checked={form.rulesConsent}
                        onChange={(event) =>
                          updateField(
                            "rulesConsent",
                            event.target.checked,
                          )
                        }
                      />

                      <span>
                        {form.rulesConsent && (
                          <Check size={14} />
                        )}
                      </span>

                      <FileCheck2 size={20} />

                      <div>
                        <strong>Liga shartlariga rozilik</strong>
                        <p>
                          Liga reglamenti, yosh talabi, anti-cheat,
                          intizomiy qoidalar va shaxsiy ma’lumotlarni
                          qayta ishlash shartlariga roziman.
                        </p>
                      </div>
                    </label>
                  </section>
                </div>
              )}

              {error && (
                <div className="registration-error">
                  {error}
                </div>
              )}
            </div>

            {step > 1 && (
              <footer className="registration-footer">
                <button
                  className="registration-back"
                  type="button"
                  disabled={submitting}
                  onClick={goBack}
                >
                  <ArrowLeft size={17} />
                  Orqaga
                </button>

                {step === 2 ? (
                  <button
                    className="registration-primary"
                    type="button"
                    onClick={goNext}
                  >
                    Davom etish
                    <ChevronRight size={18} />
                  </button>
                ) : (
                  <button
                    className="registration-primary"
                    type="button"
                    disabled={submitting}
                    onClick={handleSubmit}
                  >
                    {submitting ? (
                      <>
                        Saqlanmoqda
                        <LoaderCircle
                          className="registration-spinner"
                          size={18}
                        />
                      </>
                    ) : (
                      <>
                        Jamoani yaratish
                        <ShieldCheck size={18} />
                      </>
                    )}
                  </button>
                )}
              </footer>
            )}
          </>
        )}
      </section>
    </div>
  );
}