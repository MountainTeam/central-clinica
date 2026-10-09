"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Building2, CheckCircle2, ChevronsUpDown, FlaskConical, LayoutGrid, Lock, LogOut, Search, ShieldCheck, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { Logo } from "@/components/ui";
import { Paineis } from "@/components/paineis";
import { Formularios } from "@/components/formularios";

const menu = [
  { href: "/", rotulo: "Busca rápida", icone: Search },
  { href: "/especialidades", rotulo: "Especialidades", icone: LayoutGrid },
  { href: "/convenios", rotulo: "Convênios", icone: ShieldCheck },
  { href: "/exames", rotulo: "Exames", icone: FlaskConical },
  { href: "/usuarios", rotulo: "Usuários e setores", icone: Users, admin: true },
];

export function Estrutura({ children }: { children: React.ReactNode }) {
  const { perfil, carregado, sair, aviso, clinica, usuario, setor } = useStore();
  const router = useRouter();
  const rota = usePathname();

  useEffect(() => {
    if (carregado && !perfil) router.replace("/login");
  }, [carregado, perfil, router]);

  const itens = menu.filter((m) => !m.admin || perfil === "admin");
  // usuário ligado a uma clínica não troca de clínica
  const travada = !!usuario?.clinicaId;
  const conteudoClinica = (
    <>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-superficie text-verde shadow-card"><Building2 className="size-4" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-suave">Clínica</span>
        <span key={clinica.id} className="entrar block truncate font-semibold">{clinica.nome}</span>
        {setor && <span className="mt-1 inline-flex rounded-md bg-azul-claro px-1.5 py-0.5 text-[11px] font-semibold text-azul">Setor {setor.nome}</span>}
      </span>
      {travada ? <Lock className="size-4 text-suave/60" aria-label="Clínica fixa do seu usuário" /> : <ChevronsUpDown className="size-4 text-suave" />}
    </>
  );
  const ativo = itens.findIndex((m) => (m.href === "/" ? rota === "/" : rota.startsWith(m.href)));

  return (
    // renderiza sempre (o Next 16 valida a página no servidor) e só mostra depois de ler o perfil
    <div className={`min-h-screen lg:pl-72 ${perfil ? "" : "invisible"}`}>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-borda bg-superficie/80 p-5 backdrop-blur lg:flex">
        <Logo />
        {travada ? (
          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-borda bg-fundo p-3">{conteudoClinica}</div>
        ) : (
          <Link href="/clinicas"
            className={`pressionavel mt-8 flex items-center gap-3 rounded-2xl border p-3 hover:border-verde/40 ${rota === "/clinicas" ? "border-verde/40 bg-verde-claro" : "border-borda bg-fundo"}`}>
            {conteudoClinica}
          </Link>
        )}
        <nav className="relative mt-6 space-y-1">
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
            <p className="truncate text-sm font-semibold">{usuario?.nome}</p>
          </div>
          <p className="mt-1 text-xs text-suave">
            {perfil === "admin" ? "Administrador: cadastra e edita." : setor ? `Vê só os médicos do setor ${setor.nome}.` : "Acesso só para consulta."}
          </p>
          <button onClick={() => { sair(); router.replace("/login"); }}
            className="pressionavel mt-3 flex items-center gap-2 text-sm font-semibold text-suave hover:text-texto">
            <LogOut className="size-4" />Sair
          </button>
        </div>
      </aside>

      {/* Celular e tablet */}
      <header className="sticky top-0 z-30 border-b border-borda bg-superficie/85 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <Logo />
          <Link href={travada ? "/" : "/clinicas"} className="pressionavel ml-auto flex min-w-0 items-center gap-1.5 rounded-xl border border-borda bg-fundo px-3 py-2 text-sm font-semibold">
            <Building2 className="size-4 shrink-0 text-verde" /><span className="truncate">{clinica.nome}{setor && ` · ${setor.nome}`}</span>
            {!travada && <ChevronsUpDown className="size-3.5 shrink-0 text-suave" />}
          </Link>
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

      <main key={`${rota}-${clinica.id}`} className="mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:py-12">{children}</main>

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
