import React from "react";

import {
  getGameLabel,
  getPosterFormat,
  getZoneStyles,
} from "./standingsPosterTheme.js";

function getTeamName(team) {
  return (
    team?.name ||
    team?.teamName ||
    team?.title ||
    team?.tag ||
    "Noma’lum jamoa"
  );
}

function getPosterRow({
  game,
  team,
  index,
  startIndex,
}) {
  const rank =
    Number(team?.rank) ||
    startIndex +
      index +
      1;

  const base = {
    id:
      team?.id ||
      `${rank}-${getTeamName(team)}`,

    rank,

    name:
      getTeamName(team),

    tag:
      team?.tag || "",

    technicalNumber:
      team?.technicalNumber ||
      team?.technical_number ||
      "",

    zone:
      team?.zone || "",
  };

  if (game === "PUBG") {
    return {
      ...base,

      played:
        team?.playedRounds ??
        team?.completedRounds ??
        team?.played ??
        0,

      secondary:
        team?.totalKills ??
        team?.kills ??
        0,

      points:
        team?.totalPoints ??
        team?.points ??
        0,
    };
  }

  return {
    ...base,

    played:
      team?.played ??
      team?.matchesPlayed ??
      0,

    secondary:
      `${
        team?.wins ?? 0
      }/${
        team?.losses ?? 0
      }`,

    points:
      team?.points ?? 0,
  };
}

function formatDateUz() {
  try {
    return new Intl.DateTimeFormat(
      "uz-UZ",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      },
    ).format(
      new Date(),
    );
  } catch {
    return new Date()
      .toLocaleDateString();
  }
}

export default function StandingsPoster({
  title = "Turnir jadvali",
  subtitle = "Official Standings",
  game = "PUBG",
  season = "S01",
  leagueTier = "LEAGUE",
  format = "instagram",
  standings = [],
  pageNumber = 1,
  pageCount = 1,
  startIndex = 0,
  totalTeams = 0,
}) {
  const posterFormat =
    getPosterFormat(format);

  const rows =
    standings.map(
      (team, index) =>
        getPosterRow({
          game,
          team,
          index,
          startIndex,
        }),
    );

  const gridTemplate =
    game === "PUBG"
      ? "76px minmax(0, 1.7fr) 130px 130px 130px"
      : "76px minmax(0, 1.7fr) 130px 140px 130px";

  const secondaryTitle =
    game === "PUBG"
      ? "Kill"
      : "G‘/M";

  const rangeStart =
    rows.length > 0
      ? startIndex + 1
      : 0;

  const rangeEnd =
    startIndex +
    rows.length;

  return (
    <div
      style={{
        width:
          `${posterFormat.width}px`,

        height:
          `${posterFormat.height}px`,

        padding:
          "50px 52px 38px",

        boxSizing:
          "border-box",

        position:
          "relative",

        overflow:
          "hidden",

        color:
          "#f8fafc",

        background:
          "radial-gradient(circle at 14% 0%, rgba(217,166,45,0.22), transparent 29%), radial-gradient(circle at 95% 40%, rgba(30,64,175,0.22), transparent 32%), linear-gradient(180deg, #070b14 0%, #0a101d 48%, #060a12 100%)",

        fontFamily:
          "Inter, Arial, sans-serif",
      }}
    >
      <div
        style={{
          position:
            "absolute",

          inset:
            0,

          background:
            "linear-gradient(135deg, rgba(255,255,255,0.035), transparent 30%, transparent 70%, rgba(217,166,45,0.055))",

          pointerEvents:
            "none",
        }}
      />

      <div
        style={{
          position:
            "relative",

          zIndex:
            1,

          height:
            "100%",

          display:
            "flex",

          flexDirection:
            "column",

          gap:
            "24px",
        }}
      >
        <header
          style={{
            display:
              "flex",

            alignItems:
              "flex-start",

            justifyContent:
              "space-between",

            gap:
              "24px",
          }}
        >
          <section
            style={{
              maxWidth:
                "68%",
            }}
          >
            <div
              style={{
                display:
                  "inline-flex",

                alignItems:
                  "center",

                gap:
                  "10px",

                padding:
                  "9px 15px",

                borderRadius:
                  "999px",

                border:
                  "1px solid rgba(234,179,52,0.42)",

                background:
                  "rgba(117,82,17,0.24)",

                color:
                  "#f8d77d",

                fontSize:
                  "15px",

                fontWeight:
                  800,

                letterSpacing:
                  "0.12em",
              }}
            >
              <span>♛</span>
              <span>LIGA ARENA</span>
            </div>

            <h1
              style={{
                margin:
                  "18px 0 7px",

                fontSize:
                  "44px",

                lineHeight:
                  1.05,

                fontWeight:
                  900,

                letterSpacing:
                  "-0.035em",

                textTransform:
                  "uppercase",
              }}
            >
              {title}
            </h1>

            <p
              style={{
                margin:
                  0,

                color:
                  "#aeb9ca",

                fontSize:
                  "17px",

                fontWeight:
                  600,
              }}
            >
              {subtitle}
            </p>
          </section>

          <aside
            style={{
              width:
                "272px",

              padding:
                "19px 21px",

              borderRadius:
                "22px",

              border:
                "1px solid rgba(148,163,184,0.20)",

              background:
                "linear-gradient(180deg, rgba(15,23,42,0.94), rgba(15,23,42,0.76))",

              boxShadow:
                "0 18px 50px rgba(0,0,0,0.26)",
            }}
          >
            <span
              style={{
                color:
                  "#7f8da3",

                fontSize:
                  "13px",

                fontWeight:
                  800,

                letterSpacing:
                  "0.12em",
              }}
            >
              OFFICIAL STANDINGS
            </span>

            <strong
              style={{
                display:
                  "block",

                marginTop:
                  "8px",

                color:
                  "#ffffff",

                fontSize:
                  "23px",

                lineHeight:
                  1.15,
              }}
            >
              {getGameLabel(game)}
            </strong>

            <div
              style={{
                display:
                  "grid",

                gap:
                  "7px",

                marginTop:
                  "14px",

                color:
                  "#cbd5e1",

                fontSize:
                  "14px",
              }}
            >
              <span>
                Mavsum:{" "}
                <b>{season}</b>
              </span>

              <span>
                Liga:{" "}
                <b>{leagueTier}</b>
              </span>

              <span>
                Sana:{" "}
                <b>{formatDateUz()}</b>
              </span>
            </div>
          </aside>
        </header>

        <main
          style={{
            flex:
              1,

            minHeight:
              0,

            padding:
              "17px",

            borderRadius:
              "25px",

            border:
              "1px solid rgba(148,163,184,0.16)",

            background:
              "rgba(9,15,27,0.82)",

            boxShadow:
              "0 24px 75px rgba(0,0,0,0.30)",
          }}
        >
          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                gridTemplate,

              gap:
                "10px",

              padding:
                "0 16px 13px",

              color:
                "#76859b",

              fontSize:
                "13px",

              fontWeight:
                800,

              letterSpacing:
                "0.11em",

              textTransform:
                "uppercase",
            }}
          >
            <span>#</span>
            <span>Jamoa</span>

            <span
              style={{
                textAlign:
                  "center",
              }}
            >
              {game === "PUBG"
                ? "Turlar"
                : "O‘yin"}
            </span>

            <span
              style={{
                textAlign:
                  "center",
              }}
            >
              {secondaryTitle}
            </span>

            <span
              style={{
                textAlign:
                  "center",
              }}
            >
              Ball
            </span>
          </div>

          <div
            style={{
              display:
                "flex",

              flexDirection:
                "column",

              gap:
                "8px",
            }}
          >
            {rows.map((row) => {
              const zone =
                getZoneStyles(
                  row.zone,
                );

              const isPodium =
                row.rank <= 3;

              return (
                <article
                  key={row.id}
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      gridTemplate,

                    gap:
                      "10px",

                    alignItems:
                      "center",

                    minHeight:
                      "56px",

                    padding:
                      "9px 16px",

                    boxSizing:
                      "border-box",

                    borderRadius:
                      "16px",

                    border:
                      isPodium
                        ? "1px solid rgba(234,179,52,0.52)"
                        : zone.border,

                    background:
                      isPodium
                        ? "linear-gradient(135deg, rgba(118,83,19,0.60), rgba(15,23,42,0.94))"
                        : zone.background,
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",

                      alignItems:
                        "center",

                      gap:
                        "8px",

                      fontSize:
                        "21px",

                      fontWeight:
                        900,

                      color:
                        isPodium
                          ? "#f8d77d"
                          : "#f8fafc",
                    }}
                  >
                    <span>
                      {row.rank}
                    </span>

                    <small
                      style={{
                        color:
                          zone.color,

                        fontSize:
                          "12px",
                      }}
                    >
                      {zone.badge}
                    </small>
                  </div>

                  <section
                    style={{
                      minWidth:
                        0,
                    }}
                  >
                    <strong
                      style={{
                        display:
                          "block",

                        overflow:
                          "hidden",

                        color:
                          "#ffffff",

                        fontSize:
                          "19px",

                        textOverflow:
                          "ellipsis",

                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {row.name}
                    </strong>

                    <span
                      style={{
                        display:
                          "block",

                        overflow:
                          "hidden",

                        marginTop:
                          "2px",

                        color:
                          zone.color,

                        fontSize:
                          "12px",

                        fontWeight:
                          700,

                        textOverflow:
                          "ellipsis",

                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {[
                        row.technicalNumber,
                        row.tag,
                        zone.label,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </span>
                  </section>

                  <strong
                    style={{
                      textAlign:
                        "center",

                      fontSize:
                        "20px",
                    }}
                  >
                    {row.played}
                  </strong>

                  <strong
                    style={{
                      textAlign:
                        "center",

                      fontSize:
                        "20px",
                    }}
                  >
                    {row.secondary}
                  </strong>

                  <strong
                    style={{
                      textAlign:
                        "center",

                      color:
                        isPodium
                          ? "#f8d77d"
                          : "#ffffff",

                      fontSize:
                        "22px",
                    }}
                  >
                    {row.points}
                  </strong>
                </article>
              );
            })}
          </div>
        </main>

        <footer
          style={{
            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "space-between",

            gap:
              "16px",

            color:
              "#8592a6",

            fontSize:
              "14px",

            fontWeight:
              650,
          }}
        >
          <span>
            Toj sovg‘a qilinmaydi.
          </span>

          <span>
            {rangeStart}–{rangeEnd}
            {" / "}
            {totalTeams} jamoa
          </span>

          <strong
            style={{
              color:
                "#f1d17b",
            }}
          >
            {pageNumber}/{pageCount}
          </strong>
        </footer>
      </div>
    </div>
  );
}