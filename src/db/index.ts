import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

/**
 * Определяем параметры подключения к базе.
 *
 * Главная засада при деплое: облачные базы (Supabase, Neon и т.п.) обычно
 * требуют SSL, а локальная/Docker-база — наоборот, без SSL. Парсим строку и
 * включаем SSL только для удалённых хостов (если только явно не выключено
 * через sslmode=disable).
 */
function buildPoolOptions(connectionString: string): ConstructorParameters<typeof Pool>[0] {
  let hostname = "";
  let sslmode: string | null = null;
  try {
    const url = new URL(connectionString);
    hostname = url.hostname;
    sslmode = url.searchParams.get("sslmode");
  } catch {
    /* строка не распарсилась — пойдём без SSL */
  }

  const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1";

  const sslExplicitlyOff = sslmode === "disable" || sslmode === "allow";
  const ssl =
    !isLocal && !sslExplicitlyOff
      ? { rejectUnauthorized: false }
      : undefined;

  return {
    connectionString,
    ssl,
    connectionTimeoutMillis: 15000,
    // Для пулера Supabase держим небольшой пул, чтобы не упираться в лимиты.
    max: 5,
    idleTimeoutMillis: 30000,
  };
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool(buildPoolOptions(databaseUrl));

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

// Обрабатываем ошибки простаивающих подключений, чтобы они не валили процесс.
pool.on("error", (err) => {
  console.error("[db] idle pool error:", err.message);
});

export const db = drizzle(pool);
