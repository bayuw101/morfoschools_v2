import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { ThemeProvider } from "@/lib/theme-provider";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Morfoschools - LMS Indonesia",
  description: "LMS Handal untuk Sekolah di Indonesia",
};

const themeInitScript = `
(function () {
  try {
    var storageKey = "morfoschools-theme-v1";
    var fallback = { mode: "dark", palette: "morfosis" };
    var allowedPalettes = {
      morfosis: true,
      "tokyo-night": true,
      monokai: true,
      blue: true,
      dracula: true,
      nord: true,
      catppuccin: true,
      "rose-pine": true,
      gruvbox: true,
      solarized: true,
      "github-dark": true,
      "one-dark": true
    };
    var stored = window.localStorage.getItem(storageKey);
    var parsed = stored ? JSON.parse(stored) : fallback;
    var mode = parsed && parsed.mode === "light" ? "light" : "dark";
    var palette = parsed && allowedPalettes[parsed.palette]
      ? parsed.palette
      : fallback.palette;
    var root = document.documentElement;
    root.dataset.theme = mode;
    root.dataset.palette = palette;
    root.style.colorScheme = mode;
  } catch (error) {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.dataset.palette = "morfosis";
    document.documentElement.style.colorScheme = "dark";
  }
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${manrope.variable} ${spaceGrotesk.variable} antialiased`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
