export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods":
    "GET, POST, PUT, DELETE, OPTIONS",

  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Admin-Secret",

  "Access-Control-Max-Age":
    "86400",
};

export class ApiError extends Error {
  constructor(
    message,
    status = 400,
    code = "API_ERROR",
  ) {
    super(message);

    this.name =
      "ApiError";

    this.status =
      status;

    this.code =
      code;
  }
}

export function jsonResponse(
  payload,
  status = 200,
  extraHeaders = {},
) {
  return new Response(
    JSON.stringify(
      payload,
      null,
      2,
    ),
    {
      status,

      headers: {
        "Content-Type":
          "application/json; charset=UTF-8",

        "Cache-Control":
          "no-store",

        ...corsHeaders,
        ...extraHeaders,
      },
    },
  );
}

export function notFoundResponse(
  path,
) {
  return jsonResponse(
    {
      error:
        "NOT_FOUND",

      message:
        "So‘ralgan Liga Arena endpoint topilmadi.",

      path,
    },
    404,
  );
}

export function errorResponse(
  error,
) {
  if (
    error instanceof
    ApiError
  ) {
    return jsonResponse(
      {
        error:
          error.code,

        message:
          error.message,
      },
      error.status,
    );
  }

  console.error(
    "Liga Arena Worker xatosi:",
    error,
  );

  return jsonResponse(
    {
      error:
        "SERVER_ERROR",

      message:
        "Serverda kutilmagan xatolik yuz berdi.",
    },
    500,
  );
}