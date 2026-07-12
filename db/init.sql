-- Таблица автоматически создаётся при первом старте PostgreSQL-контейнера.
CREATE TABLE IF NOT EXISTS tts_items (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  voice_short_name TEXT NOT NULL,
  voice_display_name TEXT,
  rate TEXT,
  pitch TEXT,
  volume TEXT,
  duration_ms INTEGER,
  audio BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
