import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CoinXoom | Track Crypto Momentum",
  description: "CoinXoom helps traders spot momentum, follow live market shifts, and move faster with clean crypto intelligence.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
