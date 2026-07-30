import {
  CalendarDays,
  Home,
  Trophy,
  UserRound,
} from "lucide-react";

const items = [
  {
    id: "home",
    label: "Asosiy",
    icon: Home,
  },
  {
    id: "leagues",
    label: "Ligalar",
    icon: Trophy,
  },
  {
    id: "schedule",
    label: "Taqvim",
    icon: CalendarDays,
  },
  {
    id: "profile",
    label: "Profil",
    icon: UserRound,
  },
];

export default function BottomNav({ activeTab, onChange }) {
  return (
    <nav className="bottom-nav" aria-label="Asosiy menyu">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            className={`bottom-nav__item ${
              isActive ? "bottom-nav__item--active" : ""
            }`}
            type="button"
            onClick={() => onChange(item.id)}
          >
            <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}