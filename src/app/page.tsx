import TtsStudio from "@/components/TtsStudio";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Animated background blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute -left-24 -top-32 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl"
          style={{ animation: "tts-float 14s ease-in-out infinite" }}
        />
        <div
          className="absolute -right-24 top-1/3 h-[28rem] w-[28rem] rounded-full bg-fuchsia-600/20 blur-3xl"
          style={{ animation: "tts-float 18s ease-in-out infinite" }}
        />
        <div
          className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-sky-500/20 blur-3xl"
          style={{ animation: "tts-float 22s ease-in-out infinite" }}
        />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-xl shadow-lg shadow-fuchsia-500/20">
              🔊
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">TTS Студия</h1>
              <p className="text-xs text-white/50">Синтез речи на базе Microsoft Edge</p>
            </div>
          </div>
          <span className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/50 sm:block">
            edge-tts · без API-ключей
          </span>
        </header>

        <section className="mb-8">
          <h2 className="max-w-2xl text-3xl font-bold leading-tight text-white sm:text-4xl">
            Превратите любой текст в естественную речь
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-white/60 sm:text-base">
            Сотни нейронных голосов на десятках языков, настройка скорости, тона и
            громкости. Бесплатно и без регистрации.
          </p>
        </section>

        <TtsStudio />

        <footer className="mt-12 text-center text-xs text-white/30">
          Работает на Microsoft Edge Read Aloud · Создано с Next.js + edge-tts
        </footer>
      </div>
    </main>
  );
}
