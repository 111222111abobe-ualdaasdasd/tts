import { synthesize } from "./src/lib/edge-tts.ts";
const U="\u0301", P="\u23f8";
const tests = [
  {label:"только ударение", text:`открой за${U}мок`},
  {label:"только пауза", text:`привет${P}мир`},
  {label:"простой текст", text:`привет мир`},
  {label:"пауза+текст после", text:`привет${P} это тест`},
];
for (const t of tests) {
  try {
    const r = await synthesize(t.text, { voice:"ru-RU-SvetlanaNeural", rate:"+0%", pitch:"+0Hz", volume:"+0%" });
    console.log(`${t.label}: OK bytes=${r.audio.length} dur=${r.durationMs}`);
  } catch(e){ console.log(`${t.label}: ERR ${e?.message}`); }
}
