import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "TTS Студия — синтез речи на базе Edge TTS",
  description:
    "Бесплатный онлайн-синтез речи. Сотни нейронных голосов Microsoft Edge, настройка скорости, тона и громкости. Без API-ключей.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="bg-[#0a0a14] text-white antialiased">{children}</body>
    </html>
  );
}
