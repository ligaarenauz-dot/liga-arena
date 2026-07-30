import { useState } from "react";
import logoUrl from "../assets/liga-arena-logo.png";

export default function BrandMark({ compact = false }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className={`brand-mark ${compact ? "brand-mark--compact" : ""}`}>
      {!imageFailed ? (
        <img
          className="brand-mark__image"
          src={logoUrl}
          alt="Liga Arena"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="brand-mark__fallback" aria-label="Liga Arena">
          <span className="brand-mark__letter brand-mark__letter--light">
            L
          </span>
          <span className="brand-mark__letter brand-mark__letter--gold">
            A
          </span>
        </div>
      )}

      {!compact && (
        <div className="brand-mark__text">
          <span>LIGA</span>
          <strong>ARENA</strong>
        </div>
      )}
    </div>
  );
}