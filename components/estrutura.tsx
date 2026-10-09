"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, CheckCircle2, ChevronsUpDown, FlaskConical, LayoutGrid, Lock, LogOut, Search, ShieldCheck } from "lucide-react";
import type { Usuario } from "@/lib/modelo";
import { PAPEIS } from "@/lib/permissoes";
import { useStore } from "@/lib/store";
import { Logo, LogoMarca, Vazio } from "@/components/ui";
import { Paineis } from "@/components/paineis";
import { Formularios } from "@/components/formularios";

type ItemMenu = { href: string; rotulo: string; icone: typeof Search; mostrar?: (u: Usuario) => boolean };
const menu: ItemMenu[] = [
  { href: "/", rotulo: "Busca rápida", icone: Search },
  { href: "/especialidades", rotulo: "Especialidades", icone: LayoutGrid },
  { href: "/convenios", rotulo: "Convênios", icone: ShieldCheck },
  { href: "/exames", rotulo: "Exames", icone: FlaskConical },
];

export function Estrutura({ children }: { children: React.ReactNode }) {
  const { usuario, carregado, sair, aviso, clinica } = useStore();
  const router = useRouter();
  const rota = usePathname();

  useEffect(() => {
    if (carregado && !usuario) router.replace("/login");
  }, [carregado, usuario, router]);

  const itens = menu.filter((m) => !m.mostrar || (usuario && m.mostrar(usuario)));
  const ativo = itens.findIndex((m) => (m.href === "/" ? rota === "/" : rota.startsWith(m.href)));
  const deslogar = () => { sair(); router.replace("/login"); };

  return (
    // renderiza sempre (o Next 16 valida a página no servidor) e só mostra depois de ler a sessão
    <div className={`min-h-screen lg:pl-72 ${usuario ? "" : "invisible"}`}>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-borda bg-superficie/80 p-5 backdrop-blur lg:flex">
        <Logo />
        <div className="mt-8"><SeletorClinica /></div>
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
        {usuario && (
          <div className="mt-auto rounded-2xl border border-borda bg-fundo p-4">
            <div className="flex items-center gap-2">
              <span className="pulso size-2 rounded-full bg-verde" />
              <p className="truncate text-sm font-semibold">{usuario.nome}</p>
            </div>
            <p className="mt-1 text-xs text-suave">{PAPEIS[usuario.papel].rotulo}: {PAPEIS[usuario.papel].descricao}</p>
            <button onClick={deslogar} className="pressionavel mt-3 flex items-center gap-2 text-sm font-semibold text-suave hover:text-texto">
              <LogOut className="size-4" />Sair
            </button>
          </div>
        )}
      </aside>

      {/* Celular e tablet */}
      <header className="sticky top-0 z-30 border-b border-borda bg-superficie/85 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2 px-4 py-3">
          <Logo />
          <div className="ml-auto min-w-0 max-w-[55%]"><SeletorClinica compacto /></div>
          <button onClick={deslogar} aria-label="Sair" className="pressionavel grid size-10 shrink-0 place-items-center rounded-xl text-suave hover:bg-fundo">
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

      <main key={`${rota}-${clinica?.id}`} className="mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:py-12">
        {clinica || !carregado ? children : <Vazio texto="Seu usuário não tem nenhuma clínica vinculada. Fale com o Administrador." />}
      </main>

      <Paineis />
      <Formularios />

      {aviso && (
        <div key={aviso} role="status" className="aviso fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-texto px-4 py-3 text-sm font-medium text-white shadow-elevado">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-300" />{aviso}
        </div>
      )}
    </div>
  );
}

function SeletorClinica({ compacto = false }: { compacto?: boolean }) {
  const { banco, clinicas, clinica, escolherClinica } = useStore();
  const router = useRouter();
  const rota = usePathname();
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  // fecha ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => { if (!caixa.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", fora); document.removeEventListener("keydown", esc); };
  }, [aberto]);

  if (!clinica) return null;
  const varias = clinicas.length > 1;
  const org = banco.organizacoes.find((o) => o.id === clinica.organizacaoId);
  const escolher = (id: string) => {
    setAberto(false);
    escolherClinica(id);
    // a página de um médico não existe na outra clínica
    if (rota.startsWith("/profissionais/")) router.push("/");
  };

  return (
    <div ref={caixa} className="relative">
      <button type="button" disabled={!varias} onClick={() => setAberto(!aberto)} aria-expanded={aberto}
        className={`flex w-full items-center gap-3 rounded-2xl border border-borda bg-fundo text-left ${compacto ? "px-2.5 py-2" : "p-3"} ${varias ? "pressionavel hover:border-verde/40" : ""}`}>
        <LogoMarca nome={clinica.nome} logo={clinica.logo} />
        <span className="min-w-0 flex-1">
          {!compacto && <span className="block truncate text-[11px] font-semibold uppercase tracking-wider text-suave">{org?.nome ?? "Clínica"}</span>}
          <span key={clinica.id} className="entrar block truncate text-sm font-semibold">{clinica.nome}</span>
        </span>
        {varias
          ? <ChevronsUpDown className="size-4 shrink-0 text-suave" />
          : <Lock className="size-4 shrink-0 text-suave/60" aria-label="Única clínica do seu usuário" />}
      </button>
      {aberto && (
        <div className={`entrar absolute top-full z-40 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-borda bg-superficie p-2 shadow-elevado ${compacto ? "right-0 w-72" : "inset-x-0"}`}>
          {banco.organizacoes.map((o) => {
            const daOrg = clinicas.filter((c) => c.organizacaoId === o.id);
            return daOrg.length > 0 && (
              <div key={o.id} className="py-1">
                <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-suave">{o.nome}</p>
                {daOrg.map((c) => (
                  <button key={c.id} type="button" onClick={() => escolher(c.id)}
                    className="flex w-full items-center justify-between gap-2 rounded-xl px-2 py-2 text-left text-sm font-semibold hover:bg-fundo">
                    <span className="truncate">{c.nome}</span>
                    {c.id === clinica.id && <Check className="size-4 shrink-0 text-verde" />}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
