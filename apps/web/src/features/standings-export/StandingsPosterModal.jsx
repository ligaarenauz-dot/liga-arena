import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import JSZip from "jszip";

import StandingsPoster from "./StandingsPoster.jsx";

import {
  buildStandingsFileName,
  downloadBlob,
  downloadDataUrl,
  renderStandingsImage,
  sanitizeFileNamePart,
} from "./exportStandingsImage.js";

import {
  getPosterFormat,
  POSTER_FORMATS,
} from "./standingsPosterTheme.js";

function splitIntoPages(
  standings,
  pageSize,
) {
  const pages = [];

  for (
    let index = 0;
    index < standings.length;
    index += pageSize
  ) {
    pages.push(
      standings.slice(
        index,
        index + pageSize,
      ),
    );
  }

  return pages.length > 0
    ? pages
    : [[]];
}

async function dataUrlToBlob(
  dataUrl,
) {
  const response =
    await fetch(dataUrl);

  return response.blob();
}

export default function StandingsPosterModal({
  open,
  onClose,
  game = "PUBG",
  season = "S01",
  leagueTier = "LEAGUE",
  standings = [],
  title = "Turnir jadvali",
  subtitle = "Official Standings",
}) {
  const previewRef =
    useRef(null);

  const pageRefs =
    useRef([]);

  const [
    format,
    setFormat,
  ] = useState(
    "instagram",
  );

  const [
    pageIndex,
    setPageIndex,
  ] = useState(0);

  const [
    exporting,
    setExporting,
  ] = useState(false);

  const [
    progress,
    setProgress,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const formatInfo =
    getPosterFormat(format);

  const pages =
    useMemo(
      () =>
        splitIntoPages(
          Array.isArray(standings)
            ? standings
            : [],

          formatInfo.rowsPerPage,
        ),

      [
        standings,
        formatInfo.rowsPerPage,
      ],
    );

  const safePageIndex =
    Math.min(
      pageIndex,
      pages.length - 1,
    );

  const currentPage =
    pages[safePageIndex] ||
    [];

  useEffect(
    () => {
      setPageIndex(0);
      pageRefs.current = [];
    },
    [
      format,
      standings,
    ],
  );

  if (!open) {
    return null;
  }

  const previewScale =
    format === "square"
      ? 0.47
      : 0.43;

  async function exportCurrentPage() {
    setError("");
    setProgress("");
    setExporting(true);

    try {
      const dataUrl =
        await renderStandingsImage({
          element:
            previewRef.current,
        });

      downloadDataUrl(
        dataUrl,

        buildStandingsFileName({
          game,
          season,
          leagueTier,
          format,
          pageNumber:
            safePageIndex + 1,
        }),
      );
    } catch (exportError) {
      setError(
        exportError?.message ||
          "Posterni eksport qilib bo‘lmadi.",
      );
    } finally {
      setExporting(false);
      setProgress("");
    }
  }

  async function exportAllPages() {
    setError("");
    setExporting(true);

    try {
      const zip =
        new JSZip();

      await new Promise(
        (resolve) => {
          window.requestAnimationFrame(
            resolve,
          );
        },
      );

      for (
        let index = 0;
        index < pages.length;
        index += 1
      ) {
        setProgress(
          `${
            index + 1
          }/${pages.length} sahifa tayyorlanmoqda`,
        );

        const element =
          pageRefs.current[index];

        if (!element) {
          throw new Error(
            `${
              index + 1
            }-sahifa elementi topilmadi.`,
          );
        }

        const dataUrl =
          await renderStandingsImage({
            element,
          });

        const blob =
          await dataUrlToBlob(
            dataUrl,
          );

        zip.file(
          buildStandingsFileName({
            game,
            season,
            leagueTier,
            format,
            pageNumber:
              index + 1,
          }),

          blob,
        );
      }

      setProgress(
        "ZIP fayl yig‘ilmoqda",
      );

      const zipBlob =
        await zip.generateAsync({
          type: "blob",
          compression:
            "DEFLATE",

          compressionOptions: {
            level: 6,
          },
        });

      const zipName = [
        "liga-arena",
        sanitizeFileNamePart(game),
        sanitizeFileNamePart(season),
        sanitizeFileNamePart(
          leagueTier,
        ),
        sanitizeFileNamePart(format),
        "posters.zip",
      ].join("-");

      downloadBlob(
        zipBlob,
        zipName,
      );
    } catch (exportError) {
      setError(
        exportError?.message ||
          "Barcha posterlarni eksport qilib bo‘lmadi.",
      );
    } finally {
      setExporting(false);
      setProgress("");
    }
  }

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position:
            "fixed",

          inset:
            0,

          zIndex:
            5000,

          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "center",

          padding:
            "20px",

          background:
            "rgba(1,4,11,0.88)",

          backdropFilter:
            "blur(12px)",
        }}
      >
        <div
          style={{
            width:
              "min(96vw, 1180px)",

            maxHeight:
              "94vh",

            overflow:
              "auto",

            padding:
              "22px",

            border:
              "1px solid rgba(148,163,184,0.20)",

            borderRadius:
              "24px",

            background:
              "linear-gradient(180deg, #0b111d, #070b12)",

            boxShadow:
              "0 35px 120px rgba(0,0,0,0.55)",
          }}
        >
          <header
            style={{
              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "space-between",

              gap:
                "16px",

              marginBottom:
                "18px",

              flexWrap:
                "wrap",
            }}
          >
            <section>
              <span
                style={{
                  color:
                    "#d4a936",

                  fontSize:
                    "12px",

                  fontWeight:
                    900,

                  letterSpacing:
                    "0.13em",
                }}
              >
                SOCIAL MEDIA EXPORT
              </span>

              <h2
                style={{
                  margin:
                    "5px 0 0",

                  color:
                    "#ffffff",

                  fontSize:
                    "27px",
                }}
              >
                Jadval posterini yaratish
              </h2>
            </section>

            <button
              type="button"
              onClick={onClose}
              disabled={exporting}
              style={{
                padding:
                  "11px 16px",

                border:
                  "1px solid rgba(148,163,184,0.28)",

                borderRadius:
                  "12px",

                color:
                  "#f8fafc",

                background:
                  "#111827",

                cursor:
                  "pointer",
              }}
            >
              Yopish
            </button>
          </header>

          <div
            style={{
              display:
                "flex",

              gap:
                "10px",

              marginBottom:
                "17px",

              flexWrap:
                "wrap",
            }}
          >
            <select
              value={format}
              disabled={exporting}
              onChange={(event) =>
                setFormat(
                  event.target.value,
                )
              }
              style={{
                minWidth:
                  "215px",

                padding:
                  "11px 13px",

                border:
                  "1px solid rgba(148,163,184,0.25)",

                borderRadius:
                  "12px",

                color:
                  "#ffffff",

                background:
                  "#111827",
              }}
            >
              {Object.values(
                POSTER_FORMATS,
              ).map(
                (option) => (
                  <option
                    key={option.key}
                    value={option.key}
                  >
                    {option.label}
                    {" • "}
                    {option.width}
                    ×
                    {option.height}
                  </option>
                ),
              )}
            </select>

            <button
              type="button"
              disabled={
                exporting ||
                safePageIndex === 0
              }
              onClick={() =>
                setPageIndex(
                  (current) =>
                    Math.max(
                      0,
                      current - 1,
                    ),
                )
              }
              style={{
                padding:
                  "11px 15px",

                border:
                  "1px solid rgba(148,163,184,0.25)",

                borderRadius:
                  "12px",

                color:
                  "#ffffff",

                background:
                  "#111827",

                cursor:
                  "pointer",
              }}
            >
              ← Oldingi
            </button>

            <button
              type="button"
              disabled={
                exporting ||
                safePageIndex >=
                  pages.length - 1
              }
              onClick={() =>
                setPageIndex(
                  (current) =>
                    Math.min(
                      pages.length - 1,
                      current + 1,
                    ),
                )
              }
              style={{
                padding:
                  "11px 15px",

                border:
                  "1px solid rgba(148,163,184,0.25)",

                borderRadius:
                  "12px",

                color:
                  "#ffffff",

                background:
                  "#111827",

                cursor:
                  "pointer",
              }}
            >
              Keyingi →
            </button>

            <button
              type="button"
              disabled={exporting}
              onClick={exportCurrentPage}
              style={{
                padding:
                  "11px 16px",

                border:
                  "none",

                borderRadius:
                  "12px",

                color:
                  "#111111",

                background:
                  "linear-gradient(135deg, #f1cf69, #d99f1d)",

                fontWeight:
                  850,

                cursor:
                  "pointer",
              }}
            >
              Hozirgi sahifani PNG
            </button>

            <button
              type="button"
              disabled={exporting}
              onClick={exportAllPages}
              style={{
                padding:
                  "11px 16px",

                border:
                  "1px solid rgba(96,165,250,0.42)",

                borderRadius:
                  "12px",

                color:
                  "#dbeafe",

                background:
                  "rgba(30,64,175,0.32)",

                fontWeight:
                  800,

                cursor:
                  "pointer",
              }}
            >
              Barcha sahifalar ZIP
            </button>
          </div>

          <div
            style={{
              display:
                "flex",

              justifyContent:
                "space-between",

              gap:
                "12px",

              marginBottom:
                "12px",

              color:
                "#94a3b8",

              fontSize:
                "14px",
            }}
          >
            <span>
              Sahifa:{" "}
              <b
                style={{
                  color:
                    "#ffffff",
                }}
              >
                {safePageIndex + 1}
                /
                {pages.length}
              </b>
            </span>

            <span>
              Har sahifada:{" "}
              <b
                style={{
                  color:
                    "#ffffff",
                }}
              >
                {
                  formatInfo.rowsPerPage
                }{" "}
                jamoa
              </b>
            </span>
          </div>

          {progress ? (
            <div
              style={{
                marginBottom:
                  "12px",

                padding:
                  "11px 13px",

                borderRadius:
                  "11px",

                color:
                  "#fde68a",

                background:
                  "rgba(113,63,18,0.44)",
              }}
            >
              {progress}
            </div>
          ) : null}

          {error ? (
            <div
              style={{
                marginBottom:
                  "12px",

                padding:
                  "11px 13px",

                border:
                  "1px solid rgba(248,113,113,0.35)",

                borderRadius:
                  "11px",

                color:
                  "#fee2e2",

                background:
                  "rgba(127,29,29,0.52)",
              }}
            >
              {error}
            </div>
          ) : null}

          <div
            style={{
              overflow:
                "auto",

              minHeight:
                `${
                  formatInfo.height *
                  previewScale
                }px`,

              padding:
                "14px",

              border:
                "1px solid rgba(148,163,184,0.13)",

              borderRadius:
                "17px",

              background:
                "#03060c",
            }}
          >
            <div
              style={{
                width:
                  `${
                    formatInfo.width *
                    previewScale
                  }px`,

                height:
                  `${
                    formatInfo.height *
                    previewScale
                  }px`,
              }}
            >
              <div
                style={{
                  transform:
                    `scale(${previewScale})`,

                  transformOrigin:
                    "top left",
                }}
              >
                <div ref={previewRef}>
                  <StandingsPoster
                    title={title}
                    subtitle={subtitle}
                    game={game}
                    season={season}
                    leagueTier={
                      leagueTier
                    }
                    format={format}
                    standings={
                      currentPage
                    }
                    pageNumber={
                      safePageIndex +
                      1
                    }
                    pageCount={
                      pages.length
                    }
                    startIndex={
                      safePageIndex *
                      formatInfo.rowsPerPage
                    }
                    totalTeams={
                      standings.length
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        style={{
          position:
            "fixed",

          top:
            0,

          left:
            "-100000px",

          pointerEvents:
            "none",
        }}
      >
        {pages.map(
          (
            page,
            index,
          ) => (
            <div
              key={`${format}-${index}`}
              ref={(node) => {
                pageRefs.current[
                  index
                ] = node;
              }}
            >
              <StandingsPoster
                title={title}
                subtitle={subtitle}
                game={game}
                season={season}
                leagueTier={
                  leagueTier
                }
                format={format}
                standings={page}
                pageNumber={
                  index + 1
                }
                pageCount={
                  pages.length
                }
                startIndex={
                  index *
                  formatInfo.rowsPerPage
                }
                totalTeams={
                  standings.length
                }
              />
            </div>
          ),
        )}
      </div>
    </>
  );
}