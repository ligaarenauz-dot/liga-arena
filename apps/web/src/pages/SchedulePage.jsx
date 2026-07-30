import { CalendarDays, Clock3, Radio } from "lucide-react";

export default function SchedulePage() {
  return (
    <div className="page">
      <div className="page-heading">
        <span>MAVSUM TAQVIMI</span>
        <h1>Jang kunlari</h1>
        <p>
          Tasdiqlangan uchrashuvlar, PUBG turlari va MLBB
          seriyalari shu sahifada ko‘rsatiladi.
        </p>
      </div>

      <section className="empty-state">
        <div className="empty-state__icon">
          <CalendarDays size={34} />
        </div>

        <span>SEASON 01</span>
        <h2>Taqvim shakllantirilmoqda</h2>
        <p>
          Saralash sanalari tasdiqlangach barcha sardorlarga bot
          orqali avtomatik xabar yuboriladi.
        </p>

        <div className="empty-state__details">
          <div>
            <Clock3 size={17} />
            Avtomatik eslatmalar
          </div>

          <div>
            <Radio size={17} />
            Jonli status
          </div>
        </div>
      </section>
    </div>
  );
}