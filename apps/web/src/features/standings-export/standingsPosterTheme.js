export const POSTER_FORMATS = {
  instagram: {
    key: "instagram",
    label: "Instagram / Telegram",
    width: 1080,
    height: 1350,
    rowsPerPage: 12,
  },

  square: {
    key: "square",
    label: "Kvadrat 1:1",
    width: 1080,
    height: 1080,
    rowsPerPage: 8,
  },
};

export function getPosterFormat(
  formatKey = "instagram",
) {
  return (
    POSTER_FORMATS[formatKey] ||
    POSTER_FORMATS.instagram
  );
}

export function getGameLabel(
  game,
) {
  if (game === "PUBG") {
    return "PUBG MOBILE";
  }

  if (game === "MLBB") {
    return "MOBILE LEGENDS";
  }

  return String(
    game || "LIGA",
  );
}

export function getZoneStyles(
  zone,
) {
  const normalizedZone =
    String(zone || "")
      .trim()
      .toUpperCase();

  if (
    normalizedZone === "PROMOTE" ||
    normalizedZone === "PROMOTION"
  ) {
    return {
      badge: "▲",
      label: "Yuqori liga zonasi",
      background:
        "linear-gradient(135deg, rgba(20,83,45,0.96), rgba(16,185,129,0.18))",
      border:
        "1px solid rgba(52,211,153,0.48)",
      color:
        "#bbf7d0",
    };
  }

  if (
    normalizedZone === "RELEGATE" ||
    normalizedZone === "RELEGATION"
  ) {
    return {
      badge: "▼",
      label: "Quyi liga zonasi",
      background:
        "linear-gradient(135deg, rgba(127,29,29,0.96), rgba(239,68,68,0.16))",
      border:
        "1px solid rgba(248,113,113,0.48)",
      color:
        "#fecaca",
    };
  }

  if (normalizedZone === "STAY") {
    return {
      badge: "—",
      label: "Ligada qoladi",
      background:
        "linear-gradient(135deg, rgba(30,41,59,0.96), rgba(71,85,105,0.20))",
      border:
        "1px solid rgba(148,163,184,0.32)",
      color:
        "#e2e8f0",
    };
  }

  return {
    badge: "•",
    label: "Joriy natija",
    background:
      "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(30,64,175,0.14))",
    border:
      "1px solid rgba(96,165,250,0.26)",
    color:
      "#bfdbfe",
  };
}