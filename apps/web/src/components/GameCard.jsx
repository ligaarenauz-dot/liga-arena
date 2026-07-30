import { ChevronRight, Crosshair, Shield, Swords } from "lucide-react";

export default function GameCard({
  type,
  title,
  subtitle,
  primaryLeague,
  secondaryLeague,
  onClick,
}) {
  const isPubg = type === "pubg";

  return (
    <button className="game-card" type="button" onClick={onClick}>
      <div className="game-card__glow" />

      <div className="game-card__icon">
        {isPubg ? <Crosshair size={22} /> : <Swords size={22} />}
      </div>

      <div className="game-card__content">
        <span className="game-card__subtitle">{subtitle}</span>
        <h3>{title}</h3>

        <div className="game-card__leagues">
          <span>
            <Shield size={13} />
            {primaryLeague}
          </span>

          <span>{secondaryLeague}</span>
        </div>
      </div>

      <ChevronRight className="game-card__arrow" size={20} />
    </button>
  );
}