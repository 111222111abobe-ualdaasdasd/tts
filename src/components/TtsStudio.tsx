"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type VoiceOption = {
  shortName: string;
  name: string;
  gender: "Female" | "Male";
  locale: string;
  language: string;
  languageName: string;
  region: string;
  regionName: string;
  flag: string;
};

type HistoryItem = {
  id: number;
  text: string;
  voice: string;
  voiceName: string | null;
  rate: string | null;
  pitch: string | null;
  volume: string | null;
  durationMs: number | null;
  createdAt: string;
};

type Status = "idle" | "loading" | "error";

const MAX_CHARS = 5000;

const PRESETS = [
  { label: "RU · Приветствие", text: "Привет! Это демонстрация синтеза речи на базе Microsoft Edge TTS." },
  { label: "EN · Greeting", text: "Hello! This is a text-to-speech demo powered by Microsoft Edge." },
  {
    label: "Ударения",
    text: "Открой за\u0301мок. А теперь возьми молото\u0301к и слома\u0301й замо\u0301к на двери\u0301.",
  },
  {
    label: "Паузы",
    text: "Внимание\u23f8 это важное сообщение\u23f8 пожалуйста\u23f8 дослушайте до конца.",
  },
];

function genderLabel(g: "Female" | "Male") {
  return g === "Female" ? "Женский" : "Мужской";
}

function pctFormat(v: number) {
  return `${v > 0 ? "+" : ""}${v}%`;
}
function hzFormat(v: number) {
  return `${v > 0 ? "+" : ""}${v} Гц`;
}

function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const m = Math.round(diff / 60000);
  if (m < 1) return "только что";
  if (m < 60) return `${m} мин назад`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.round(h / 24);
  return `${d} дн назад`;
}

function fmtDuration(ms: number | null) {
  if (!ms || ms <= 0) return "";
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

/* ----------------------------- Voice picker ----------------------------- */

function VoicePicker({
  voices,
  value,
  onChange,
}: {
  voices: VoiceOption[];
  value: string;
  onChange: (shortName: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [gender, setGender] = useState<"all" | "Female" | "Male">("all");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = voices.find((v) => v.shortName === value);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = voices.filter((v) => {
      if (gender !== "all" && v.gender !== gender) return false;
      if (!q) return true;
      return (
        v.name.toLowerCase().includes(q) ||
        v.shortName.toLowerCase().includes(q) ||
        v.locale.toLowerCase().includes(q) ||
        v.languageName.toLowerCase().includes(q)
      );
    });
    const map = new Map<string, { key: string; flag: string; voices: VoiceOption[] }>();
    for (const v of filtered) {
      const key = v.languageName || v.language || "Другие";
      if (!map.has(key)) map.set(key, { key, flag: v.flag, voices: [] });
      map.get(key)!.voices.push(v);
    }
    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [voices, query, gender]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-left transition hover:border-white/30 hover:bg-white/10"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="text-2xl leading-none">{selected ? selected.flag : "🎙️"}</span>
          <span className="min-w-0">
            <span className="block truncate font-medium text-white">
              {selected ? selected.name : "Выберите голос"}
            </span>
            <span className="block truncate text-xs text-white/50">
              {selected
                ? `${selected.languageName}${selected.regionName ? ", " + selected.regionName : ""} · ${genderLabel(selected.gender)}`
                : "Загрузка списка голосов…"}
            </span>
          </span>
        </span>
        <svg
          className={`h-5 w-5 shrink-0 text-white/40 transition ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-white/15 bg-[#13131f]/95 shadow-2xl backdrop-blur-xl">
          <div className="space-y-2 border-b border-white/10 p-3">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск голоса, языка, региона…"
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-indigo-400"
            />
            <div className="flex gap-1.5">
              {(["all", "Female", "Male"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    gender === g
                      ? "bg-indigo-500 text-white"
                      : "bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {g === "all" ? "Все" : genderLabel(g)}
                </button>
              ))}
              <span className="ml-auto self-center text-xs text-white/40">
                {grouped.reduce((n, gr) => n + gr.voices.length, 0)} голосов
              </span>
            </div>
          </div>
          <div className="tts-scroll max-h-72 overflow-y-auto p-1.5">
            {grouped.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-white/40">Ничего не найдено</p>
            )}
            {grouped.map((gr) => (
              <div key={gr.key} className="mb-1">
                <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  {gr.flag} {gr.key}
                </p>
                {gr.voices.map((v) => (
                  <button
                    key={v.shortName}
                    type="button"
                    onClick={() => {
                      onChange(v.shortName);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition ${
                      v.shortName === value
                        ? "bg-indigo-500/20 text-white"
                        : "text-white/80 hover:bg-white/5"
                    }`}
                  >
                    <span className="text-lg leading-none">{v.flag}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{v.name}</span>
                      <span className="block truncate text-xs text-white/45">
                        {v.regionName || v.locale}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        v.gender === "Female"
                          ? "bg-pink-500/15 text-pink-300"
                          : "bg-sky-500/15 text-sky-300"
                      }`}
                    >
                      {v.gender === "Female" ? "Ж" : "М"}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Sliders ------------------------------ */

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium text-white/70">{label}</span>
        <span className="font-mono text-white/90">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="tts-range w-full"
      />
    </div>
  );
}

/* ------------------------------ Studio ------------------------------ */

export default function TtsStudio() {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [voicesError, setVoicesError] = useState(false);
  const [selected, setSelected] = useState("");
  const [text, setText] = useState(PRESETS[0].text);
  const [rate, setRate] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [volume, setVolume] = useState(0);

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [current, setCurrent] = useState<HistoryItem | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const audioRef = useRef<HTMLAudioElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const STRESS = "\u0301"; // ´ — знак ударения над гласной
  const PAUSE = "\u23F8"; // ⏸ — символ паузы

  // Вставляет спецсимвол в текущую позицию курсора в текстовом поле.
  const insertMark = useCallback(
    (mark: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const candidate = text.slice(0, start) + mark + text.slice(end);
      if (candidate.length > MAX_CHARS) return;
      setText(candidate);
      requestAnimationFrame(() => {
        ta.focus();
        ta.selectionStart = ta.selectionEnd = start + mark.length;
      });
    },
    [text],
  );

  // Load voices + history on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [vRes, hRes] = await Promise.all([
        fetch("/api/voices", { cache: "no-store" }),
        fetch("/api/history", { cache: "no-store" }),
      ]);
      try {
        const vJson = await vRes.json();
        const list: VoiceOption[] = vJson.voices ?? [];
        if (!cancelled) {
          setVoices(list);
          const preferred =
            list.find((v) => v.shortName === "ru-RU-SvetlanaNeural") ??
            list.find((v) => v.language === "ru") ??
            list[0];
          if (preferred) setSelected(preferred.shortName);
          if (!vRes.ok) setVoicesError(true);
        }
      } catch {
        if (!cancelled) setVoicesError(true);
      }
      if (hRes.ok) {
        try {
          const hJson = await hRes.json();
          if (!cancelled) setHistory(hJson.items ?? []);
        } catch {
          /* ignore malformed history response */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const remaining = MAX_CHARS - text.length;

  const handleGenerate = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Введите текст для озвучки.");
      setStatus("error");
      return;
    }
    if (!selected) {
      setError("Выберите голос.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          voice: selected,
          rate,
          pitch,
          volume,
        }),
      });
      // Ответ может прийти не в формате JSON (например, HTML-страница ошибки
      // от Netlify при таймауте 10 сек). Парсим аккуратно, без выброса.
      let json: Record<string, unknown> | null = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }
      if (!res.ok || !json) {
        const errMsg =
          (typeof json?.error === "string" && json.error) ||
          (res.status === 502 || res.status === 504
            ? "Служба синтеза не успела ответить за отведённое время (лимит Netlify — 10 сек). Попробуйте текст короче."
            : `Служба недоступна (статус ${res.status}). Попробуйте ещё раз.`);
        throw new Error(errMsg);
      }
      const item = json as unknown as HistoryItem;
      setCurrent(item);
      setHistory((prev) => [item, ...prev.filter((h) => h.id !== item.id)].slice(0, 50));
      setStatus("idle");
      // Attempt autoplay (allowed right after a user click).
      setTimeout(() => {
        audioRef.current?.play().catch(() => {});
      }, 60);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Произошла ошибка.");
      setStatus("error");
    }
  }, [text, selected, rate, pitch, volume]);

  const handleDelete = useCallback(async (id: number) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
    setCurrent((c) => (c && c.id === id ? null : c));
    try {
      await fetch(`/api/history/${id}`, { method: "DELETE" });
    } catch {
      /* ignore */
    }
  }, []);

  // Полная очистка истории. Номера в БД НЕ сбрасываются, чтобы браузерный
  // кэш аудио по старым номерам не наложился на новые записи.
  const handleClearAll = useCallback(async () => {
    setHistory([]);
    setCurrent(null);
    try {
      await fetch(`/api/history/all`, { method: "DELETE" });
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      {/* Left: editor */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl sm:p-7">
        <label className="mb-2 block text-sm font-medium text-white/80">
          Текст для озвучки
        </label>
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
            rows={8}
            placeholder="Введите или вставьте текст здесь…"
            className="tts-scroll w-full resize-y rounded-2xl border border-white/10 bg-black/20 p-4 text-[15px] leading-relaxed text-white placeholder:text-white/30 outline-none transition focus:border-indigo-400/60"
          />
        </div>

        {/* Панель управления произношением: ударения и паузы */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => insertMark(STRESS)}
            title="Поставьте курсор сразу после нужной гласной и нажмите"
            className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1 text-xs font-medium text-indigo-200 transition hover:bg-indigo-500/25"
          >
            <span className="text-base leading-none">а́</span> Ударение
          </button>
          <button
            type="button"
            onClick={() => insertMark(PAUSE)}
            title="Вставить паузу в позиции курсора"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <span className="text-base leading-none">⏸</span> Пауза
          </button>
          <span className="text-xs text-white/35">
            Курсор после гласной → «Ударение» (за́мок / замо́к)
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setText(p.text)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              {p.label}
            </button>
          ))}
          <span
            className={`ml-auto text-xs ${
              remaining < 200 ? "text-amber-300" : "text-white/35"
            }`}
          >
            {text.length} / {MAX_CHARS}
          </span>
        </div>

        <div className="mt-5">
          <label className="mb-2 block text-sm font-medium text-white/80">Голос</label>
          <VoicePicker voices={voices} value={selected} onChange={setSelected} />
          {voicesError && (
            <p className="mt-1.5 text-xs text-amber-300/80">
              Используется ограниченный список голосов (не удалось загрузить полный каталог).
            </p>
          )}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Slider label="Скорость" value={rate} min={-50} max={200} onChange={setRate} format={pctFormat} />
          <Slider label="Тон" value={pitch} min={-50} max={50} onChange={setPitch} format={hzFormat} />
          <Slider label="Громкость" value={volume} min={-50} max={50} onChange={setVolume} format={pctFormat} />
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={status === "loading"}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-6 py-3 font-semibold text-white shadow-lg shadow-fuchsia-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? (
              <>
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Озвучиваю…
              </>
            ) : (
              <>
                <span className="text-lg leading-none">▶</span>
                Озвучить
              </>
            )}
          </button>
          {(rate !== 0 || pitch !== 0 || volume !== 0) && (
            <button
              type="button"
              onClick={() => {
                setRate(0);
                setPitch(0);
                setVolume(0);
              }}
              className="text-sm text-white/50 transition hover:text-white"
            >
              Сбросить настройки
            </button>
          )}
        </div>

        {status === "error" && (
          <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}
      </div>

      {/* Right: player + history */}
      <div className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl sm:p-7">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/50">
            Результат
          </h2>
          {current ? (
            <div>
              <div className="mb-4 rounded-2xl border border-white/10 bg-black/30 p-3">
                <audio
                  ref={audioRef}
                  key={`${current.id}-${current.createdAt}`}
                  src={`/api/audio/${current.id}?v=${encodeURIComponent(current.createdAt)}`}
                  controls
                  className="w-full"
                />
              </div>
              <div className="mb-3 flex items-center gap-2 text-xs text-white/50">
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/80">
                  {current.voiceName || current.voice}
                </span>
                {current.durationMs ? (
                  <span>⏱ {fmtDuration(current.durationMs)}</span>
                ) : null}
                <span className="ml-auto">{timeAgo(current.createdAt)}</span>
              </div>
              <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-white/70">
                {current.text}
              </p>
              <a
                href={`/api/audio/${current.id}?download=1&v=${encodeURIComponent(current.createdAt)}`}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                ⬇ Скачать MP3
              </a>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
              <span className="mb-3 text-4xl">🎧</span>
              <p className="text-sm text-white/50">
                Здесь появится аудио. Введите текст и нажмите «Озвучить».
              </p>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl sm:p-7">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50">
              История
            </h2>
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      "Удалить ВСЮ историю? Это действие нельзя отменить.",
                    )
                  ) {
                    handleClearAll();
                  }
                }}
                className="rounded-lg px-2.5 py-1 text-xs text-white/40 transition hover:bg-red-500/15 hover:text-red-300"
              >
                Очистить всё
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="py-6 text-center text-sm text-white/40">Пока пусто</p>
          ) : (
            <ul className="tts-scroll -mr-2 max-h-[26rem] space-y-2 overflow-y-auto pr-2">
              {history.map((h) => (
                <li
                  key={h.id}
                  className={`group flex items-start gap-3 rounded-xl border p-3 transition ${
                    current?.id === h.id
                      ? "border-indigo-400/40 bg-indigo-500/10"
                      : "border-white/5 bg-white/[0.02] hover:bg-white/5"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setCurrent(h)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-indigo-500"
                    title="Воспроизвести"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrent(h)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-sm text-white/90">{h.text}</span>
                    <span className="mt-0.5 block truncate text-xs text-white/40">
                      {h.voiceName || h.voice} · {timeAgo(h.createdAt)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(h.id)}
                    className="shrink-0 self-center rounded-lg p-1.5 text-white/30 opacity-0 transition hover:bg-red-500/15 hover:text-red-300 group-hover:opacity-100"
                    title="Удалить"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
