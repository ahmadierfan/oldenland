import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const sans = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://oldenland.com"),
  title: "OLDENLAND — Persian Saffron, from the Field to Your Hands",
  description:
    "Oldenland exports hand-harvested Persian saffron from Khorasan, presented in luxury packaging: kraft gift box, violet case and a hand-made glass crocus vessel.",
  openGraph: {
    title: "OLDENLAND — Persian Saffron",
    description: "Hand-harvested saffron from Khorasan, in a hand-made glass crocus vessel.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0908",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
