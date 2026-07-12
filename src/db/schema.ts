import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  customType,
} from "drizzle-orm/pg-core";

// Drizzle (this version) does not export a `bytea` helper, so we define one
// via customType. node-postgres returns/accepts a Buffer for bytea columns.
export const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

// History of generated speech clips. Audio is stored as binary so clips can be
// replayed and downloaded without regenerating them.
export const ttsItems = pgTable("tts_items", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  voice: text("voice_short_name").notNull(),
  voiceName: text("voice_display_name"),
  rate: text("rate"),
  pitch: text("pitch"),
  volume: text("volume"),
  durationMs: integer("duration_ms"),
  audio: bytea("audio").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type TtsItem = typeof ttsItems.$inferSelect;
export type NewTtsItem = typeof ttsItems.$inferInsert;
