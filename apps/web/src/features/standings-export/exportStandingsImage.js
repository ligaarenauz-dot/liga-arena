import {
  toPng,
} from "html-to-image";

export function sanitizeFileNamePart(
  value,
) {
  return String(value || "")
    .trim()
    .replace(
      /[^\p{L}\p{N}\-_ ]/gu,
      "",
    )
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

export function buildStandingsFileName({
  game,
  season,
  leagueTier,
  format,
  pageNumber,
}) {
  const parts = [
    "liga-arena",
    sanitizeFileNamePart(
      game || "game",
    ),
    sanitizeFileNamePart(
      season || "season",
    ),
    sanitizeFileNamePart(
      leagueTier || "league",
    ),
    sanitizeFileNamePart(
      format || "poster",
    ),
  ];

  if (pageNumber) {
    parts.push(
      `page-${String(
        pageNumber,
      ).padStart(2, "0")}`,
    );
  }

  return `${parts.join("-")}.png`;
}

export async function renderStandingsImage({
  element,
}) {
  if (!element) {
    throw new Error(
      "Poster elementi topilmadi.",
    );
  }

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const width =
    element.offsetWidth ||
    element.scrollWidth;

  const height =
    element.offsetHeight ||
    element.scrollHeight;

  return toPng(
    element,
    {
      cacheBust: true,
      pixelRatio: 1,
      backgroundColor: "#070b14",
      width,
      height,
    },
  );
}

export function downloadDataUrl(
  dataUrl,
  fileName,
) {
  const link =
    document.createElement("a");

  link.download =
    fileName;

  link.href =
    dataUrl;

  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function downloadBlob(
  blob,
  fileName,
) {
  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.download =
    fileName;

  link.href =
    url;

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(
    () => {
      URL.revokeObjectURL(url);
    },
    1000,
  );
}