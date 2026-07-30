import { useEffect, useMemo, useState } from "react";
import { Crown } from "lucide-react";
import BrandMark from "./components/BrandMark.jsx";
import BottomNav from "./components/BottomNav.jsx";
import TeamRegistrationModal from "./components/TeamRegistrationModal.jsx";
import TeamRosterManager from "./components/TeamRosterManager.jsx";
import ScheduleEventsPanel from "./components/ScheduleEventsPanel.jsx";
import LeagueTeamsPanel from "./components/LeagueTeamsPanel.jsx";
import LeagueStandingsPanel from "./components/LeagueStandingsPanel.jsx";
import SeasonArchivePanel from "./components/SeasonArchivePanel.jsx";
import HomePage from "./pages/HomePage.jsx";
import LeaguesPage from "./pages/LeaguesPage.jsx";
import SchedulePage from "./pages/SchedulePage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import { getTeam } from "./api/client.js";
import "./registration.css";

function triggerHaptic() {
  try {
    window.Telegram?.WebApp?.HapticFeedback
      ?.impactOccurred("light");
  } catch {
    // Oddiy brauzerda Telegram haptic mavjud bo‘lmaydi.
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [telegramUser, setTelegramUser] = useState(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [teamManagerOpen, setTeamManagerOpen] = useState(false);
  const [lastCreatedTeam, setLastCreatedTeam] = useState(null);

  useEffect(() => {
    const telegram = window.Telegram?.WebApp;

    if (!telegram) {
      return;
    }

    telegram.ready();
    telegram.expand();
    telegram.setHeaderColor?.("#070809");
    telegram.setBackgroundColor?.("#070809");

    if (telegram.initDataUnsafe?.user) {
      setTelegramUser(telegram.initDataUnsafe.user);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restoreSavedTeam() {
      const savedTeamId = localStorage.getItem(
        "ligaArenaTeamId",
      );

      if (!savedTeamId) {
        return;
      }

      try {
        const team = await getTeam(savedTeamId);

        if (!cancelled) {
          setLastCreatedTeam(team);
        }
      } catch {
        localStorage.removeItem("ligaArenaTeamId");
      }
    }

    restoreSavedTeam();

    return () => {
      cancelled = true;
    };
  }, []);

  const userName = useMemo(() => {
    if (telegramUser?.first_name) {
      return telegramUser.first_name;
    }

    const captain = lastCreatedTeam?.members?.find(
      (member) => member.role === "CAPTAIN",
    );

    return captain?.firstName || "chempion";
  }, [telegramUser, lastCreatedTeam]);

  const saveTeam = (team) => {
    setLastCreatedTeam(team);

    if (team?.id) {
      localStorage.setItem("ligaArenaTeamId", team.id);
    }
  };

  const changeTab = (nextTab) => {
    triggerHaptic();
    setActiveTab(nextTab);
  };

  const openRegister = () => {
    triggerHaptic();
    setRegisterOpen(true);
  };

  const openTeamArea = () => {
    triggerHaptic();

    if (lastCreatedTeam) {
      setTeamManagerOpen(true);
      return;
    }

    setRegisterOpen(true);
  };

  const renderPage = () => {
    switch (activeTab) {
      case "leagues":
        return (
          <>
            <LeaguesPage />

            <LeagueTeamsPanel
              mode="leagues"
              currentTeam={lastCreatedTeam}
            />

            <LeagueStandingsPanel
              currentTeam={lastCreatedTeam}
            />

            <SeasonArchivePanel />
          </>
        );

      case "schedule":
        return (
          <>
            <SchedulePage />

            <ScheduleEventsPanel
              currentTeam={lastCreatedTeam}
            />
          </>
        );

      case "profile":
        return (
          <>
            <ProfilePage
              telegramUser={telegramUser}
              createdTeam={lastCreatedTeam}
              onOpenTeam={openTeamArea}
              onRegister={openRegister}
            />

            <LeagueTeamsPanel
              mode="profile"
              currentTeam={lastCreatedTeam}
            />
          </>
        );

      case "home":
      default:
        return (
          <HomePage
            userName={userName}
            onRegister={openRegister}
            onOpenLeagues={() => changeTab("leagues")}
          />
        );
    }
  };

  return (
    <div className="app">
      <div className="app-background">
        <div className="app-background__glow" />
        <div className="app-background__grid" />
      </div>

      <div className="app-shell">
        <header className="top-bar">
          <BrandMark compact />

          <div className="top-bar__brand">
            <span>LIGA</span>
            <strong>ARENA</strong>
          </div>

          <button
            className="profile-mini"
            type="button"
            onClick={() => changeTab("profile")}
            aria-label="Profilni ochish"
          >
            <Crown size={18} />
          </button>
        </header>

        <main className="app-content">{renderPage()}</main>

        <BottomNav
          activeTab={activeTab}
          onChange={changeTab}
        />
      </div>

      <TeamRegistrationModal
        open={registerOpen}
        telegramUser={telegramUser}
        onClose={() => setRegisterOpen(false)}
        onCreated={saveTeam}
      />

      {teamManagerOpen && lastCreatedTeam && (
        <div
          className="registration-backdrop"
          role="presentation"
          onMouseDown={() => setTeamManagerOpen(false)}
        >
          <section
            className="registration-modal team-manager-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Jamoani boshqarish"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <TeamRosterManager
              team={lastCreatedTeam}
              onClose={() => setTeamManagerOpen(false)}
              onTeamChange={saveTeam}
            />
          </section>
        </div>
      )}
    </div>
  );
}