import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Provider } from "@/lib/store";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cartilha da Central",
  description: "Consulta rápida de médicos, convênios e exames para a central de agendamento.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
