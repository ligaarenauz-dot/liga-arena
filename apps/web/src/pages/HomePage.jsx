import {
  ArrowUpRight,
  Crown,
  Radio,
  ShieldCheck,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import GameCard from "../components/GameCard.jsx";

export default function HomePage({
  onRegister,
  onOpenLeagues,
  userName,
}) {
  return (
    <div className="page page--home">
      <section className="hero-card">
        <div className="hero-card__noise" />
        <div className="hero-card__line hero-card__line--one" />
        <div className="hero-card__line hero-card__line--two" />

        <div className="hero-card__content">
          <div className="eyebrow">
            <Radio size={14} />
            SEASON 01 • SARALASH
          </div>

          <p className="hero-card__welcome">
            Xush kelibsiz, {userName}
          </p>

          <h1>
            TOJ SOVG‘A
            <span>QILINMAYDI.</span>
          </h1>

          <p className="hero-card__description">
            Jamoangni tuz. Reytingda ko‘taril. Elita ligasida
            o‘z o‘rningni kurashib qo‘lga kirit.
          </p>

          <div className="hero-card__actions">
            <button
              className="primary-button"
              type="button"
              onClick={onRegister}
            >
              <UserPlus size={18} />
              Jamoa tuzish
            </button>

            <button
              className="secondary-button"
              type="button"
              onClick={onOpenLeagues}
            >
              Ligalarni ko‘rish
              <ArrowUpRight size={18} />
            </button>
          </div>
        </div>

        <Crown className="hero-card__crown" size={156} />
      </section>

      <section className="quick-stats">
        <article>
          <Users size={19} />
          <div>
            <strong>2</strong>
            <span>Yo‘nalish</span>
          </div>
        </article>

        <article>
          <Trophy size={19} />
          <div>
            <strong>4</strong>
            <span>Asosiy liga</span>
          </div>
        </article>

        <article>
          <ShieldCheck size={19} />
          <div>
            <strong>OPEN</strong>
            <span>Ochiq yo‘l</span>
          </div>
        </article>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <div>
            <span>ARENA</span>
            <h2>O‘yinni tanlang</h2>
          </div>

          <button type="button" onClick={onOpenLeagues}>
            Barchasi
          </button>
        </div>

        <div className="game-list">
          <GameCard
            type="pubg"
            title="PUBG MOBILE"
            subtitle="BATTLE ROYALE"
            primaryLeague="SOVEREIGN"
            secondaryLeague="VANGUARD"
            onClick={onOpenLeagues}
          />

          <GameCard
            type="mlbb"
            title="MOBILE LEGENDS"
            subtitle="5V5 MOBA"
            primaryLeague="IMPERIUM"
            secondaryLeague="ABYSSAL"
            onClick={onOpenLeagues}
          />
        </div>
      </section>

      <section className="status-banner">
        <div className="status-banner__icon">
          <Crown size={21} />
        </div>

        <div>
          <span>SARALASH HOLATI</span>
          <strong>Ro‘yxatdan o‘tish tez kunda ochiladi</strong>
        </div>
      </section>
    </div>
  );
}