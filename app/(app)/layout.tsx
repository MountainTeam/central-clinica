"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { CheckCircle2, FileSpreadsheet, FlaskConical, LayoutGrid, LogOut, Search, ShieldCheck } from "lucide-react";
import { useStore } from "@/lib/store";
import { Logo } from "@/components/ui";
import { Paineis } from "@/components/paineis";
import { Formularios } from "@/components/formularios";

const menu = [
  { href: "/", rotulo: "Busca rápida", icone: Search },
  { href: "/especialidades", rotulo: "Especialidades", icone: LayoutGrid },
  { href: "/convenios", rotulo: "Convênios", icone: ShieldCheck },
  { href: "/exames", rotulo: "Exames", icone: FlaskConical },
  { href: "/importar", rotulo: "Importar planilha", icone: FileSpreadsheet, admin: true },
];

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  const { perfil, carregado, sair, aviso } = useStore();
  const router = useRouter();
  const rota = usePathname();

  useEffect(() => {
    if (carregado && !perfil) router.replace("/login");
  }, [carregado, perfil, router]);

  const itens = menu.filter((m) => !m.admin || perfil === "admin");
  const ativo = itens.findIndex((m) => (m.href === "/" ? rota === "/" : rota.startsWith(m.href)));

  return (
    // renderiza sempre (o Next 16 valida a página no servidor) e só mostra depois de ler o perfil
    <div className={`min-h-screen lg:pl-72 ${perfil ? "" : "invisible"}`}>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-borda bg-superficie/80 p-5 backdrop-blur lg:flex">
        <Logo />
        <nav className="relative mt-10 space-y-1">
          {ativo >= 0 && (
            <span className="absolute inset-x-0 top-0 h-11 rounded-xl bg-verde-claro transition-transform duration-300 ease-saida"
              style={{ transform: `translateY(calc(${ativo} * (2.75rem + 0.25rem)))` }} />
          )}
          {itens.map((m, i) => (
            <Link key={m.href} href={m.href}
              className={`pressionavel relative flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold ${i === ativo ? "text-verde" : "text-suave hover:text-texto"}`}>
              <m.icone className="size-5" />{m.rotulo}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl border border-borda bg-fundo p-4">
          <div className="flex items-center gap-2">
            <span className="pulso size-2 rounded-full bg-verde" />
            <p className="text-sm font-semibold">{perfil === "admin" ? "Administrador" : "Atendente"}</p>
          </div>
          <p className="mt-1 text-xs text-suave">{perfil === "admin" ? "Pode cadastrar e editar." : "Acesso só para consulta."}</p>
          <button onClick={() => { sair(); router.replace("/login"); }}
            className="pressionavel mt-3 flex items-center gap-2 text-sm font-semibold text-suave hover:text-texto">
            <LogOut className="size-4" />Sair
          </button>
        </div>
      </aside>

      {/* Celular e tablet */}
      <header className="sticky top-0 z-30 border-b border-borda bg-superficie/85 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Logo />
          <button onClick={() => { sair(); router.replace("/login"); }} aria-label="Sair" className="pressionavel grid size-10 place-items-center rounded-xl text-suave hover:bg-fundo">
            <LogOut className="size-5" />
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {itens.map((m, i) => (
            <Link key={m.href} href={m.href}
              className={`pressionavel flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${i === ativo ? "bg-verde-claro text-verde" : "text-suave"}`}>
              <m.icone className="size-4" />{m.rotulo}
            </Link>
          ))}
        </nav>
      </header>

      <main key={rota} className="mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:py-12">{children}</main>

      <Paineis />
      <Formularios />

      {aviso && (
        <div key={aviso} role="status" className="aviso fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-texto px-4 py-3 text-sm font-medium text-white shadow-elevado">
          <CheckCircle2 className="size-4 text-emerald-300" />{aviso}
        </div>
      )}
    </div>
  );
}
