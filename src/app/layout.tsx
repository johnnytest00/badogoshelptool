import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TetőPro — projektalap",
  description: "A TetőPro magyar tetőfedő és bádogos kalkulációs platform műszaki alapja.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hu">
      <body>{children}</body>
    </html>
  );
}
