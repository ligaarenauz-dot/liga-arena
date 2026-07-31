import {
  ApiError,
} from "./http.js";

export function requireDatabase(
  env,
) {
  if (
    !env?.DB ||
    typeof env.DB.prepare !==
      "function"
  ) {
    throw new ApiError(
      "D1 DB binding topilmadi.",
      503,
      "D1_BINDING_NOT_FOUND",
    );
  }

  return env.DB;
}

function bindStatement(
  database,
  sql,
  parameters,
) {
  const statement =
    database.prepare(sql);

  return parameters.length > 0
    ? statement.bind(
        ...parameters,
      )
    : statement;
}

export async function queryFirst(
  database,
  sql,
  parameters = [],
) {
  return bindStatement(
    database,
    sql,
    parameters,
  ).first();
}

export async function queryAll(
  database,
  sql,
  parameters = [],
) {
  const result =
    await bindStatement(
      database,
      sql,
      parameters,
    ).all();

  return Array.isArray(
    result?.results,
  )
    ? result.results
    : [];
}