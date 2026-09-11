import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nultravis — o site está pronto para ser citado?",
  description:
    "Cola o domínio. Lemos a home, robots e llms.txt. Não inventamos censo de ChatGPT.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
