import {
  ApiError,
  corsHeaders,
} from "../lib/http.js";

const MAX_LOGO_BYTES =
  2 * 1024 * 1024;


const MULTIPART_OVERHEAD_LIMIT =
  256 * 1024;

const logoTypes = {
  PNG: {
    contentType:
      "image/png",

    extension:
      ".png",
  },

  JPEG: {
    contentType:
      "image/jpeg",

    extension:
      ".jpg",
  },

  WEBP: {
    contentType:
      "image/webp",

    extension:
      ".webp",
  },
};

function requireLogoNamespace(
  env,
) {
  const namespace =
    env?.TEAM_LOGOS;

  if (
    !namespace ||
    typeof namespace.put !==
      "function" ||
    typeof namespace.getWithMetadata !==
      "function"
  ) {
    throw new ApiError(
      "TEAM_LOGOS KV binding topilmadi.",
      503,
      "LOGO_STORAGE_NOT_CONFIGURED",
    );
  }

  return namespace;
}

function sanitizeOriginalName(
  value,
) {
  return String(
    value || "logo",
  )
    .replace(
      /[^\p{L}\p{N}._ -]/gu,
      "",
    )
    .trim()
    .slice(
      0,
      120,
    ) || "logo";
}

function detectLogoType(
  arrayBuffer,
) {
  const bytes =
    new Uint8Array(
      arrayBuffer,
    );

  const isPng =
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;

  if (isPng) {
    return logoTypes.PNG;
  }

  const isJpeg =
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff;

  if (isJpeg) {
    return logoTypes.JPEG;
  }

  const isWebp =
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;

  if (isWebp) {
    return logoTypes.WEBP;
  }

  return null;
}

function normalizeLogoFilename(
  value,
) {
  const filename =
    String(
      value || "",
    )
      .trim()
      .toLowerCase();

  const valid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg|webp)$/.test(
      filename,
    );

  if (!valid) {
    throw new ApiError(
      "Logo topilmadi.",
      404,
      "LOGO_NOT_FOUND",
    );
  }

  return filename;
}

function contentTypeFromFilename(
  filename,
) {
  if (
    filename.endsWith(
      ".png",
    )
  ) {
    return "image/png";
  }

  if (
    filename.endsWith(
      ".jpg",
    )
  ) {
    return "image/jpeg";
  }

  return "image/webp";
}

export async function uploadTeamLogo(
  request,
  env,
) {
  const namespace =
    requireLogoNamespace(
      env,
    );

  const requestContentType =
    String(
      request.headers.get(
        "content-type",
      ) || "",
    ).toLowerCase();

  if (
    !requestContentType.includes(
      "multipart/form-data",
    )
  ) {
    throw new ApiError(
      "Logo multipart/form-data formatida yuborilishi kerak.",
      400,
      "INVALID_MULTIPART_REQUEST",
    );
  }

  const contentLength =
    Number(
      request.headers.get(
        "content-length",
      ) || 0,
    );

  if (
    Number.isFinite(
      contentLength,
    ) &&
    contentLength >
      MAX_LOGO_BYTES +
        MULTIPART_OVERHEAD_LIMIT
  ) {
    throw new ApiError(
      "Logo hajmi 2 MB dan oshmasligi kerak.",
      413,
      "LOGO_TOO_LARGE",
    );
  }

  let formData;

  try {
    formData =
      await request.formData();
  } catch {
    throw new ApiError(
      "Logo faylini o‘qib bo‘lmadi.",
      400,
      "INVALID_MULTIPART_REQUEST",
    );
  }

  const file =
    formData.get(
      "logo",
    );

  if (
    !(file instanceof File)
  ) {
    throw new ApiError(
      "Jamoa logotipini tanlang.",
      400,
      "LOGO_REQUIRED",
    );
  }

  if (
    file.size <= 0
  ) {
    throw new ApiError(
      "Logo fayli bo‘sh.",
      400,
      "EMPTY_LOGO",
    );
  }

  if (
    file.size >
    MAX_LOGO_BYTES
  ) {
    throw new ApiError(
      "Logo hajmi 2 MB dan oshmasligi kerak.",
      413,
      "LOGO_TOO_LARGE",
    );
  }

  const arrayBuffer =
    await file.arrayBuffer();

  if (
    arrayBuffer.byteLength >
    MAX_LOGO_BYTES
  ) {
    throw new ApiError(
      "Logo hajmi 2 MB dan oshmasligi kerak.",
      413,
      "LOGO_TOO_LARGE",
    );
  }

  const detectedType =
    detectLogoType(
      arrayBuffer,
    );

  if (!detectedType) {
    throw new ApiError(
      "Logo PNG, JPG yoki WEBP formatida bo‘lishi kerak.",
      400,
      "INVALID_LOGO_TYPE",
    );
  }

  const filename =
    `${crypto.randomUUID()}${detectedType.extension}`;

  const key =
    `team-logos/${filename}`;

  const uploadedAt =
    new Date()
      .toISOString();

  await namespace.put(
    key,
    arrayBuffer,
    {
      metadata: {
        contentType:
          detectedType.contentType,

        originalName:
          sanitizeOriginalName(
            file.name,
          ),

        uploadedAt,

        permanent:
          true,
      },
    },
  );

  return {
    message:
      "Logo yuklandi.",

    logoUrl:
      `/uploads/team-logos/${filename}`,
  };
}

export async function getTeamLogo(
  env,
  rawFilename,
) {
  const namespace =
    requireLogoNamespace(
      env,
    );

  const filename =
    normalizeLogoFilename(
      rawFilename,
    );

  const key =
    `team-logos/${filename}`;

  const result =
    await namespace.getWithMetadata(
      key,
      "arrayBuffer",
    );

  if (!result?.value) {
    throw new ApiError(
      "Logo topilmadi.",
      404,
      "LOGO_NOT_FOUND",
    );
  }

  const contentType =
    String(
      result.metadata
        ?.contentType ||
      contentTypeFromFilename(
        filename,
      ),
    );

  return new Response(
    result.value,
    {
      status: 200,

      headers: {
        ...corsHeaders,

        "Content-Type":
          contentType,

        "Content-Length":
          String(
            result.value
              .byteLength,
          ),

        "Content-Disposition":
          `inline; filename="${filename}"`,

        /*
         * Har bir logo noyob UUID bilan saqlanadi.
         * Shu sabab uzoq muddat cache qilish xavfsiz.
         */
        "Cache-Control":
          "public, max-age=31536000, immutable",

        "X-Content-Type-Options":
          "nosniff",

        "Cross-Origin-Resource-Policy":
          "cross-origin",
      },
    },
  );
}