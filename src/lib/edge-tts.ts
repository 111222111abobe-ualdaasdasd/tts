/**
 * Minimal Microsoft Edge "Read Aloud" TTS client.
 *
 * This is a faithful Node.js port of the current upstream protocol
 * (rany2/edge-tts) using the `ws` package. It exists because the published
 * `@travisvn/edge-tts` package ships with an outdated Chromium version
 * identifier and omits the `muid` cookie that Microsoft now requires, which
 * makes every synthesis request fail with HTTP 403.
 */

import { WebSocket } from "ws";
import { createHash, randomBytes, randomUUID } from "crypto";

const BASE_URL = "speech.platform.bing.com/consumer/speech/synthesize/readaloud";
const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const WSS_URL = `wss://${BASE_URL}/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}`;

// Must match a recent Chromium/Edge build; Microsoft rejects older versions.
const CHROMIUM_FULL_VERSION = "143.0.3650.75";
const CHROMIUM_MAJOR = CHROMIUM_FULL_VERSION.split(".")[0];
const SEC_MS_GEC_VERSION = `1-${CHROMIUM_FULL_VERSION}`;

const WIN_EPOCH = 11644473600;
const OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";

const BASE_HEADERS: Record<string, string> = {
  "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_MAJOR}.0.0.0 Safari/537.36 Edg/${CHROMIUM_MAJOR}.0.0.0`,
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Accept-Language": "en-US,en;q=0.9",
};

const WSS_HEADERS: Record<string, string> = {
  ...BASE_HEADERS,
  Pragma: "no-cache",
  "Cache-Control": "no-cache",
  Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
  "Sec-WebSocket-Version": "13",
};

export type SynthOptions = {
  voice: string;
  rate: string; // e.g. "+10%"
  pitch: string; // e.g. "+2Hz"
  volume: string; // e.g. "-5%"
};

export type SynthResult = {
  audio: Buffer;
  durationMs: number | null;
};

let clockSkew = 0;

function generateSecMsGec(): string {
  let ticks = Date.now() / 1000 + clockSkew + WIN_EPOCH;
  ticks -= ticks % 300; // round down to nearest 5 minutes
  ticks *= 1e7; // 100-nanosecond intervals (1e9 / 100)
  const strToHash = `${ticks.toFixed(0)}${TRUSTED_CLIENT_TOKEN}`;
  return createHash("sha256").update(strToHash, "ascii").digest("hex").toUpperCase();
}

function generateMuid(): string {
  return randomBytes(16).toString("hex").toUpperCase();
}

function connectId(): string {
  return randomUUID().replace(/-/g, "");
}

function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/'/g, "&apos;")
    .replace(/"/g, "&quot;");
}

function sanitizeText(input: string): string {
  // Remove control characters the service rejects (except \n and \t).
  let out = "";
  for (const ch of input) {
    const code = ch.codePointAt(0)!;
    if (code < 0x20 && code !== 0x09 && code !== 0x0a) continue;
    out += ch;
  }
  return out;
}

function mkSsml(opts: SynthOptions, text: string): string {
  const safe = escapeXml(sanitizeText(text));
  return (
    "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>" +
    `<voice name='${opts.voice}'>` +
    `<prosody pitch='${opts.pitch}' rate='${opts.rate}' volume='${opts.volume}'>` +
    safe +
    "</prosody></voice></speak>"
  );
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function dateToString(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${DAYS[d.getUTCDay()]} ${MONTHS[d.getUTCMonth()]} ${pad(d.getUTCDate())} ` +
    `${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:` +
    `${pad(d.getUTCSeconds())} GMT+0000 (Coordinated Universal Time)`
  );
}

function getHeadersAndBody(raw: string): { path: string; body: string } {
  const sep = raw.indexOf("\r\n\r\n");
  const headerText = sep >= 0 ? raw.slice(0, sep) : raw;
  const body = sep >= 0 ? raw.slice(sep + 4) : "";
  const pathMatch = headerText.match(/Path:([^\r\n]+)/);
  return { path: pathMatch ? pathMatch[1].trim() : "", body };
}

type AttemptResult = { audio: Buffer; lastOffset: number; lastDuration: number };
type FailInfo = Error & { status?: number; date?: string };

function attemptOnce(opts: SynthOptions, text: string): Promise<AttemptResult> {
  return new Promise((resolve, reject) => {
    const url = `${WSS_URL}&ConnectionId=${connectId()}&Sec-MS-GEC=${generateSecMsGec()}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`;
    const ws = new WebSocket(url, {
      headers: { ...WSS_HEADERS, Cookie: `muid=${generateMuid()};` },
      timeout: 20000,
    });

    const chunks: Buffer[] = [];
    let lastOffset = 0;
    let lastDuration = 0;
    let settled = false;
    let opened = false;

    const cleanup = () => {
      try {
        ws.removeAllListeners();
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      } catch {
        /* ignore */
      }
    };
    const fail = (err: FailInfo) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };
    const done = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ audio: Buffer.concat(chunks), lastOffset, lastDuration });
    };

    ws.on("unexpected-response", (_req, res) => {
      fail(
        Object.assign(new Error(`HTTP ${res.statusCode}`), {
          status: res.statusCode ?? 0,
          date: (res.headers["date"] as string) ?? undefined,
        }),
      );
    });
    ws.on("error", (err) => fail(err as FailInfo));

    ws.on("open", () => {
      opened = true;
      ws.send(
        `X-Timestamp:${dateToString()}\r\n` +
          "Content-Type:application/json; charset=utf-8\r\n" +
          "Path:speech.config\r\n\r\n" +
          `{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"true"},"outputFormat":"${OUTPUT_FORMAT}"}}}}\r\n`,
      );
      ws.send(
        `X-RequestId:${connectId()}\r\n` +
          "Content-Type:application/ssml+xml\r\n" +
          `X-Timestamp:${dateToString()}Z\r\n` +
          "Path:ssml\r\n\r\n" +
          mkSsml(opts, text),
      );
    });

    ws.on("message", (data, isBinary) => {
      if (isBinary) {
        if (data instanceof Buffer && data.length >= 2) {
          const headerLen = data.readUInt16BE(0);
          const audio = data.subarray(2 + headerLen);
          if (audio.length > 0) chunks.push(audio);
        }
        return;
      }
      const raw = data.toString("utf8");
      const { path, body } = getHeadersAndBody(raw);
      if (path === "turn.end") {
        done();
      } else if (path === "audio.metadata" && body) {
        try {
          const obj = JSON.parse(body);
          const meta = (obj?.Metadata ?? []).find(
            (m: { Type: string }) =>
              m.Type === "WordBoundary" || m.Type === "SentenceBoundary",
          );
          if (meta) {
            lastOffset = meta.Data.Offset;
            lastDuration = meta.Data.Duration;
          }
        } catch {
          /* ignore malformed metadata */
        }
      }
    });

    // Hard safety timeout.
    setTimeout(() => {
      if (!settled) {
        fail(Object.assign(new Error("Timeout waiting for synthesis response"), { status: 0 }));
      }
    }, 45000);
  });
}

/**
 * Synthesize speech, automatically retrying once on a 403 by correcting the
 * client/server clock skew (matching upstream behaviour).
 */
export async function synthesize(text: string, opts: SynthOptions): Promise<SynthResult> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { audio, lastOffset, lastDuration } = await attemptOnce(opts, text);
      if (audio.length === 0) {
        throw Object.assign(new Error("No audio received from the service."), { status: 0 });
      }
      const durationMs =
        lastDuration > 0 ? Math.round((lastOffset + lastDuration) / 10000) : null;
      return { audio, durationMs };
    } catch (err) {
      const info = err as FailInfo;
      if (info.status === 403 && attempt === 0 && info.date) {
        const server = Date.parse(info.date) / 1000;
        if (Number.isFinite(server)) {
          clockSkew += server - Date.now() / 1000;
          continue;
        }
      }
      lastError = err;
      break;
    }
  }
  throw lastError ?? new Error("Synthesis failed");
}
