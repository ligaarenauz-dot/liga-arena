import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  Crown,
  LoaderCircle,
  Save,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";

import BrandMark from "../components/BrandMark.jsx";

import {
  getTeam,
  getTeamEligibility,
  saveMemberEligibility,
} from "../api/client.js";

import "./EligibilityPage.css";

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
  if (status === "ELIGIBLE") {
    return "Mos keladi";
  }

  if (status === "UNDERAGE") {
    return "Yoshi yetmaydi";
  }

  return "Sana kiritilmagan";
}

export default function EligibilityPage() {
  const teamId = useMemo(
    () =>
      localStorage.getItem(
        "ligaArenaTeamId",
      ),
    [],
  );

  const [team, setTeam] = useState(null);
  const [eligibility, setEligibility] =
    useState(null);

  const [dates, setDates] = useState({});
  const [savingMemberId, setSavingMemberId] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = async () => {
    if (!teamId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [teamResult, eligibilityResult] =
        await Promise.all([
          getTeam(teamId),
          getTeamEligibility(teamId),
        ]);

      setTeam(teamResult.team);
      setEligibility(
        eligibilityResult.eligibility,
      );

      const nextDates = {};

      for (
        const member of
        eligibilityResult.eligibility.members
      ) {
        nextDates[member.memberId] =
          member.birthDate || "";
      }

      setDates(nextDates);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveBirthDate = async (memberId) => {
    setSavingMemberId(memberId);
    setError("");
    setNotice("");

    try {
      const result =
        await saveMemberEligibility(
          teamId,
          memberId,
          dates[memberId] || "",
        );

      setEligibility(result.eligibility);

      setNotice(
        "Tug‘ilgan sana saqlandi.",
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingMemberId("");
    }
  };

  if (loading) {
    return (
      <div className="eligibility-state">
        <LoaderCircle
          className="eligibility-spin"
          size={34}
        />

        <strong>
          Yosh ma’lumotlari yuklanmoqda
        </strong>
      </div>
    );
  }

  if (!teamId) {
    return (
      <div className="eligibility-state">
        <AlertTriangle size={34} />

        <strong>
          Jamoa topilmadi
        </strong>

        <p>
          Avval Liga Arena ichida jamoa yarating.
        </p>

        <button
          type="button"
          onClick={() => {
            window.location.href = "/";
          }}
        >
          Bosh sahifaga qaytish
        </button>
      </div>
    );
  }

  return (
    <div className="eligibility-page">
      <header className="eligibility-header">
        <button
          type="button"
          onClick={() => {
            window.location.href = "/";
          }}
        >
          <ArrowLeft size={19} />
        </button>

        <BrandMark compact />

        <div>
          <span>LIGA ARENA</span>
          <strong>YOSH TEKSHIRUVI</strong>
        </div>
      </header>

      <main className="eligibility-main">
        <section className="eligibility-hero">
          <span>PLAYER ELIGIBILITY</span>

          <h1>
            Tug‘ilgan sana va yosh chegarasi
          </h1>

          <p>
            Har bir o‘yinchining haqiqiy
            tug‘ilgan sanasini kiriting.
            Bu ma’lumot faqat jamoa sardori
            va Liga Arena administratsiyasiga
            ko‘rinadi.
          </p>
        </section>

        {team && (
          <section className="eligibility-team">
            <div>
              <Crown size={20} />

              <section>
                <span>
                  {team.game === "PUBG"
                    ? "PUBG MOBILE"
                    : "MOBILE LEGENDS"}
                </span>

                <strong>{team.name}</strong>

                <small>
                  {team.tag} • {team.region}
                </small>
              </section>
            </div>

            <div>
              Minimal yosh
              <strong>
                {eligibility?.minimumAge || 16}+
              </strong>
            </div>
          </section>
        )}

        {eligibility && (
          <section className="eligibility-stats">
            <article>
              <Users size={18} />

              <div>
                <span>JAMI</span>
                <strong>
                  {eligibility.counts.total}
                </strong>
              </div>
            </article>

            <article>
              <ShieldCheck size={18} />

              <div>
                <span>MOS KELADI</span>
                <strong>
                  {eligibility.counts.eligible}
                </strong>
              </div>
            </article>

            <article>
              <AlertTriangle size={18} />

              <div>
                <span>YOSHI YETMAYDI</span>
                <strong>
                  {eligibility.counts.underage}
                </strong>
              </div>
            </article>

            <article>
              <CalendarDays size={18} />

              <div>
                <span>KIRITILMAGAN</span>
                <strong>
                  {eligibility.counts.missing}
                </strong>
              </div>
            </article>
          </section>
        )}

        {error && (
          <div className="eligibility-alert eligibility-alert--error">
            {error}
          </div>
        )}

        {notice && (
          <div className="eligibility-alert eligibility-alert--success">
            {notice}
          </div>
        )}

        <section className="eligibility-members">
          {eligibility?.members.map(
            (member) => (
              <article key={member.memberId}>
                <div className="eligibility-member-icon">
                  {member.role === "CAPTAIN" ? (
                    <Crown size={19} />
                  ) : (
                    <UserRound size={19} />
                  )}
                </div>

                <section>
                  <div className="eligibility-member-heading">
                    <div>
                      <strong>
                        {member.nickname}
                      </strong>

                      <span>
                        {roleTitle(member.role)}
                      </span>
                    </div>

                    <div
                      className={
                        member.status === "ELIGIBLE"
                          ? "eligibility-status eligibility-status--ok"
                          : member.status === "UNDERAGE"
                            ? "eligibility-status eligibility-status--danger"
                            : "eligibility-status"
                      }
                    >
                      {member.status ===
                      "ELIGIBLE" ? (
                        <Check size={13} />
                      ) : member.status ===
                        "UNDERAGE" ? (
                        <X size={13} />
                      ) : (
                        <CalendarDays size={13} />
                      )}

                      {statusTitle(member.status)}
                    </div>
                  </div>

                  <div className="eligibility-date-row">
                    <label>
                      <span>Tug‘ilgan sana</span>

                      <input
                        type="date"
                        value={
                          dates[
                            member.memberId
                          ] || ""
                        }
                        onChange={(event) =>
                          setDates(
                            (currentDates) => ({
                              ...currentDates,
                              [member.memberId]:
                                event.target.value,
                            }),
                          )
                        }
                      />
                    </label>

                    <button
                      type="button"
                      disabled={
                        savingMemberId ===
                        member.memberId
                      }
                      onClick={() =>
                        saveBirthDate(
                          member.memberId,
                        )
                      }
                    >
                      {savingMemberId ===
                      member.memberId ? (
                        <LoaderCircle
                          className="eligibility-spin"
                          size={16}
                        />
                      ) : (
                        <Save size={16} />
                      )}

                      Saqlash
                    </button>
                  </div>

                  {member.birthDate && (
                    <small>
                      Hisoblangan yosh:{" "}
                      <strong>
                        {member.age} yosh
                      </strong>
                      {" • "}
                      Minimal talab:{" "}
                      {member.minimumAge} yosh
                    </small>
                  )}
                </section>
              </article>
            ),
          )}
        </section>

        {eligibility?.allEligible && (
          <section className="eligibility-ready">
            <ShieldCheck size={22} />

            <div>
              <strong>
                Barcha o‘yinchilar yosh
                talabiga mos
              </strong>

              <p>
                Jamoa yosh bo‘yicha Liga Arena
                tekshiruviga tayyor.
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}