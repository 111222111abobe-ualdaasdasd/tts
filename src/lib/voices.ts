import { listVoices } from "@travisvn/edge-tts";

export type VoiceOption = {
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

const languageDisplay = new Intl.DisplayNames(["en"], { type: "language" });
const regionDisplay = new Intl.DisplayNames(["en"], { type: "region" });

/** Convert an ISO 3166 region code (e.g. "US") into its flag emoji. */
function flagEmoji(region: string): string {
  if (!region || region.length !== 2 || !/^[a-zA-Z]{2}$/.test(region)) return "🌐";
  const codePoints = region
    .toUpperCase()
    .split("")
    .map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

/** "en-US-JennyNeural" -> "Jenny". */
function prettyName(shortName: string): string {
  const parts = shortName.split("-");
  let voice = parts.length >= 3 ? parts.slice(2).join("-") : parts[parts.length - 1];
  voice = voice.replace(/Neural$/i, "").replace(/([a-z])([A-Z])/g, "$1 $2");
  return voice.trim() || shortName;
}

export function normalizeVoice(raw: {
  ShortName: string;
  Gender: "Female" | "Male";
  Locale?: string;
}): VoiceOption {
  const locale = raw.Locale || shortNameToLocale(raw.ShortName) || "en-US";
  const [language, region] = locale.split("-");
  let languageName = language;
  let regionName = region ?? "";
  try {
    languageName = languageDisplay.of(language) ?? language;
  } catch {
    /* keep raw */
  }
  try {
    regionName = regionDisplay.of(region) ?? region ?? "";
  } catch {
    /* keep raw */
  }
  return {
    shortName: raw.ShortName,
    name: prettyName(raw.ShortName),
    gender: raw.Gender,
    locale,
    language,
    languageName,
    region: region ?? "",
    regionName,
    flag: flagEmoji(region ?? ""),
  };
}

function shortNameToLocale(shortName: string): string {
  const parts = shortName.split("-");
  return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : "en-US";
}

// A curated set of voices used if the live Microsoft voice list cannot be
// fetched (e.g. the sandbox blocks outbound traffic). Guarantees the UI always
// has usable voices to pick from.
const FALLBACK_RAW: { ShortName: string; Gender: "Female" | "Male" }[] = [
  { ShortName: "en-US-JennyNeural", Gender: "Female" },
  { ShortName: "en-US-AriaNeural", Gender: "Female" },
  { ShortName: "en-US-MichelleNeural", Gender: "Female" },
  { ShortName: "en-US-GuyNeural", Gender: "Male" },
  { ShortName: "en-US-DavisNeural", Gender: "Male" },
  { ShortName: "en-US-EmmaMultilingualNeural", Gender: "Female" },
  { ShortName: "en-GB-SoniaNeural", Gender: "Female" },
  { ShortName: "en-GB-RyanNeural", Gender: "Male" },
  { ShortName: "en-AU-NatashaNeural", Gender: "Female" },
  { ShortName: "en-IN-NeerjaNeural", Gender: "Female" },
  { ShortName: "ru-RU-SvetlanaNeural", Gender: "Female" },
  { ShortName: "ru-RU-DariyaNeural", Gender: "Female" },
  { ShortName: "ru-RU-DmitryNeural", Gender: "Male" },
  { ShortName: "de-DE-KatjaNeural", Gender: "Female" },
  { ShortName: "de-DE-ConradNeural", Gender: "Male" },
  { ShortName: "fr-FR-DeniseNeural", Gender: "Female" },
  { ShortName: "fr-FR-HenriNeural", Gender: "Male" },
  { ShortName: "es-ES-ElviraNeural", Gender: "Female" },
  { ShortName: "es-ES-AlvaroNeural", Gender: "Male" },
  { ShortName: "es-MX-DaliaNeural", Gender: "Female" },
  { ShortName: "it-IT-ElsaNeural", Gender: "Female" },
  { ShortName: "it-IT-DiegoNeural", Gender: "Male" },
  { ShortName: "pt-BR-FranciscaNeural", Gender: "Female" },
  { ShortName: "ja-JP-NanamiNeural", Gender: "Female" },
  { ShortName: "ja-JP-KeitaNeural", Gender: "Male" },
  { ShortName: "ko-KR-SunHiNeural", Gender: "Female" },
  { ShortName: "zh-CN-XiaoxiaoNeural", Gender: "Female" },
  { ShortName: "zh-CN-YunxiNeural", Gender: "Male" },
  { ShortName: "ar-SA-ZariyahNeural", Gender: "Female" },
  { ShortName: "hi-IN-SwaraNeural", Gender: "Female" },
  { ShortName: "hi-IN-MadhurNeural", Gender: "Male" },
  { ShortName: "tr-TR-EmelNeural", Gender: "Female" },
  { ShortName: "nl-NL-ColetteNeural", Gender: "Female" },
  { ShortName: "pl-PL-ZofiaNeural", Gender: "Female" },
  { ShortName: "uk-UA-PolinaNeural", Gender: "Female" },
  { ShortName: "sv-SE-SofieNeural", Gender: "Female" },
];

export const FALLBACK_VOICES: VoiceOption[] = FALLBACK_RAW.map(normalizeVoice);

let cache: VoiceOption[] | null = null;
let inflight: Promise<VoiceOption[]> | null = null;

/**
 * Returns the list of voices, preferring the live Microsoft catalogue and
 * falling back to a curated list on any error. Cached for the process lifetime.
 */
export async function getVoices(): Promise<VoiceOption[]> {
  if (cache) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const raw = await listVoices();
      if (!raw || raw.length === 0) throw new Error("empty voice list");
      const normalized = raw
        .map((v: { ShortName: string; Gender: "Female" | "Male"; Locale: string }) =>
          normalizeVoice(v),
        )
        .sort((a, b) =>
          a.languageName.localeCompare(b.languageName) ||
          a.region.localeCompare(b.region) ||
          a.name.localeCompare(b.name),
        );
      cache = normalized;
      return normalized;
    } catch (err) {
      console.error("[voices] live fetch failed, using fallback:", err);
      cache = FALLBACK_VOICES;
      return cache;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
