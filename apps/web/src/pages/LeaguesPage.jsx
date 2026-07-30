import {
  ChevronRight,
  Crown,
  Crosshair,
  Shield,
  Sparkles,
  Swords,
} from "lucide-react";

const groups = [
  {
    game: "PUBG MOBILE",
    icon: Crosshair,
    accent: "SOVEREIGN",
    tiers: [
      {
        name: "SOVEREIGN",
        description: "Eng yuqori PUBG MOBILE liga darajasi.",
        badge: "ELITE",
      },
      {
        name: "VANGUARD",
        description: "Sovereign sari kurashadigan raqobat maydoni.",
        badge: "PRO",
      },
      {
        name: "ASCENT",
        description: "Yangi jamoalar uchun ochiq divizionlar.",
        badge: "OPEN",
      },
    ],
  },
  {
    game: "MOBILE LEGENDS",
    icon: Swords,
    accent: "IMPERIUM",
    tiers: [
      {
        name: "IMPERIUM",
        description: "Eng kuchli MLBB jamoalari hukmronlik qiladigan liga.",
        badge: "ELITE",
      },
      {
        name: "ABYSSAL",
        description: "Imperium yo‘llanmasi uchun asosiy kurash.",
        badge: "PRO",
      },
      {
        name: "DAWN",
        description: "Yangi jamoalar uchun ochiq divizionlar.",
        badge: "OPEN",
      },
    ],
  },
];

export default function LeaguesPage() {
  return (
    <div className="page">
      <div className="page-heading">
        <span>LIGA TIZIMI</span>
        <h1>Elita sari yo‘l</h1>
        <p>
          Har bir pog‘ona natija bilan egallanadi. Hech bir o‘rin
          doimiy ravishda sovg‘a qilinmaydi.
        </p>
      </div>

      <div className="league-groups">
        {groups.map((group) => {
          const Icon = group.icon;

          return (
            <section className="league-group" key={group.game}>
              <div className="league-group__header">
                <div className="league-group__game-icon">
                  <Icon size={22} />
                </div>

                <div>
                  <span>GAME DIVISION</span>
                  <h2>{group.game}</h2>
                </div>

                <Crown size={22} />
              </div>

              <div className="league-tier-list">
                {group.tiers.map((tier, index) => (
                  <article className="league-tier" key={tier.name}>
                    <div className="league-tier__number">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <div className="league-tier__body">
                      <div>
                        <h3>{tier.name}</h3>
                        <span>{tier.badge}</span>
                      </div>

                      <p>{tier.description}</p>
                    </div>

                    <ChevronRight size={18} />
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="elite-message">
        <Sparkles size={20} />
        <div>
          <strong>Compete. Rise. Become legend.</strong>
          <span>Yo‘l hamma uchun ochiq. Cho‘qqi faqat kuchlilar uchun.</span>
        </div>
      </div>
    </div>
  );
}