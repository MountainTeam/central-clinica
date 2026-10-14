"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Building2, Check, CheckCircle2, ChevronsUpDown, FlaskConical, LayoutGrid, Lock, LogOut, PhoneCall, Search, ShieldCheck, TriangleAlert, Users } from "lucide-react";
import type { Usuario } from "@/lib/modelo";
import { PAPEIS, podeCriarUsuario, podeGerenciarUnidades } from "@/lib/permissoes";
import { subtipoInfo } from "@/lib/regras";
import { useStore } from "@/lib/store";
import { Logo, LogoMarca, SeletorConvenio, Vazio } from "@/components/ui";
import { Paineis } from "@/components/paineis";
import { Formularios } from "@/components/formularios";

type ItemMenu = {
  href: string;
  rotulo: string;
  icone: typeof Search;
  requerClinica?: boolean;
  mostrar?: (u: Usuario, unidades: number) => boolean;
};

const menu: ItemMenu[] = [
  { href: "/", rotulo: "Unidades", icone: Building2, mostrar: (u, n) => n !== 1 || podeGerenciarUnidades(u) },
  { href: "/busca", rotulo: "Busca rápida", icone: Search, requerClinica: true },
  { href: "/especialidades", rotulo: "Especialidades", icone: LayoutGrid, requerClinica: true },
  { href: "/convenios", rotulo: "Convênios", icone: ShieldCheck, requerClinica: true },
  { href: "/exames", rotulo: "Exames", icone: FlaskConical, requerClinica: true },
  { href: "/usuarios", rotulo: "Usuários", icone: Users, mostrar: podeCriarUsuario },
];

export function Estrutura({ children }: { children: React.ReactNode }) {
  const { usuario, carregado, sair, aviso, avisar, clinica, clinicas, form, abrir } = useStore();
  const router = useRouter();
  const rota = usePathname();
  // telas que funcionam sem unidade escolhida
  const livre = rota === "/" || rota === "/clinicas";

  useEffect(() => {
    if (carregado && !usuario) router.replace("/login");
  }, [carregado, usuario, router]);

  // Se o usuário não tiver uma unidade selecionada, só pode navegar na tela de Unidades
  useEffect(() => {
    if (carregado && usuario && !clinica && !livre) {
      router.replace("/");
      avisar("Escolha uma unidade para acessar o sistema.", true);
    }
  }, [carregado, usuario, clinica, livre, router, avisar]);

  // Ctrl+K (ou "/" fora de campo de texto) leva à busca e foca o campo
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      const emCampo = !!alvo && (["INPUT", "TEXTAREA", "SELECT"].includes(alvo.tagName) || alvo.isContentEditable);
      const atalho = ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") || (e.key === "/" && !emCampo && !e.ctrlKey && !e.metaKey);
      if (!atalho || !clinica || form) return;
      e.preventDefault();
      // fora da busca só navega: o painel fecha porque o ?exame= some da URL (um replace de volta à rota velha venceria o push)
      if (rota !== "/busca") router.push("/busca"); else abrir(null);
      window.dispatchEvent(new Event("cartilha:focar-busca"));
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [clinica, form, rota, router, abrir]);

  const itens = menu.filter((m) => !m.mostrar || (usuario && m.mostrar(usuario, clinicas.length)));
  const ativo = itens.findIndex((m) => (m.href === "/" ? rota === "/" : rota.startsWith(m.href)));
  const deslogar = () => { sair(); router.replace("/login"); };

  if (!carregado || !usuario) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-fundo p-6">
        <div className="text-center">
          <div className="mx-auto mb-3 size-8 animate-spin rounded-full border-2 border-verde border-t-transparent" />
          <p className="text-sm font-semibold text-suave">Carregando Guia Comercial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:pl-72">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-borda bg-superficie/80 p-5 backdrop-blur lg:flex">
        <div className="mb-6"><SeletorClinica /></div>
        <nav className="relative space-y-1">
          {ativo >= 0 && (
            <span className="absolute inset-x-0 top-0 h-11 rounded-xl bg-verde-claro transition-transform duration-300 ease-saida"
              style={{ transform: `translateY(calc(${ativo} * (2.75rem + 0.25rem)))` }} />
          )}
          {itens.map((m, i) => {
            const bloqueado = m.requerClinica && !clinica;
            if (bloqueado) {
              return (
                <button
                  key={m.href}
                  type="button"
                  onClick={() => avisar("Escolha uma unidade para acessar esta opção.", true)}
                  className="pressionavel relative flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-semibold text-suave/40 hover:text-suave/70"
                  title="Escolha uma unidade para acessar"
                >
                  <m.icone className="size-5" />
                  <span>{m.rotulo}</span>
                  <Lock className="ml-auto size-3.5 text-suave/50" />
                </button>
              );
            }
            return (
              <Link key={m.href} href={m.href}
                className={`pressionavel relative flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold ${i === ativo ? "text-verde" : "text-suave hover:text-texto"}`}>
                <m.icone className="size-5" />
                <span>{m.rotulo}</span>
              </Link>
            );
          })}
        </nav>
        {usuario && (
          <div className="mt-auto rounded-2xl border border-borda bg-fundo p-4">
            <div className="flex items-center gap-2">
              <span className="pulso size-2 rounded-full bg-verde" />
              <p className="truncate text-sm font-semibold">{usuario.nome}</p>
            </div>
            <p className="mt-1 text-xs text-suave">{PAPEIS[usuario.papel].rotulo}</p>
            <button onClick={deslogar} className="pressionavel mt-3 flex items-center gap-2 text-sm font-semibold text-suave hover:text-texto">
              <LogOut className="size-4" />Sair
            </button>
          </div>
        )}
      </aside>

      {/* Celular e tablet */}
      <header className="sticky top-0 z-30 border-b border-borda bg-superficie/85 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1"><SeletorClinica compacto /></div>
          <button onClick={deslogar} aria-label="Sair" className="pressionavel grid size-10 shrink-0 place-items-center rounded-xl text-suave hover:bg-fundo">
            <LogOut className="size-5" />
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {itens.map((m, i) => {
            const bloqueado = m.requerClinica && !clinica;
            if (bloqueado) {
              return (
                <button
                  key={m.href}
                  type="button"
                  onClick={() => avisar("Escolha uma unidade para acessar esta opção.", true)}
                  className="pressionavel flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-suave/40"
                >
                  <m.icone className="size-4" />
                  <span>{m.rotulo}</span>
                  <Lock className="size-3 text-suave/50" />
                </button>
              );
            }
            return (
              <Link key={m.href} href={m.href}
                className={`pressionavel flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${i === ativo ? "bg-verde-claro text-verde" : "text-suave"}`}>
                <m.icone className="size-4" />{m.rotulo}
              </Link>
            );
          })}
        </nav>
      </header>

      <main key={`${rota}-${clinica?.id}`} tabIndex={-1} className="mx-auto outline-none max-w-6xl px-4 py-8 sm:px-8 lg:py-12">
        {clinica && !livre && <FaixaPlano />}
        {clinica || livre ? children : <Vazio texto="Escolha uma unidade para acessar esta opção." />}
      </main>

      <Paineis />
      <Suspense><ExameNaUrl /></Suspense>
      <Formularios />

      {aviso && (
        <div key={aviso.texto} role="status" className="aviso fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-texto px-4 py-3 text-sm font-medium text-white shadow-elevado">
          {aviso.erro ? <TriangleAlert className="size-4 shrink-0 text-amber-300" /> : <CheckCircle2 className="size-4 shrink-0 text-emerald-300" />}
          <span>{aviso.texto}</span>
          {aviso.acao && <button type="button" onClick={aviso.acao.fazer} className="pressionavel ml-2 rounded-lg px-2 py-1 font-semibold text-emerald-300 hover:bg-white/10">{aviso.acao.rotulo}</button>}
        </div>
      )}
    </div>
  );
}

// Mantém "?exame=<id>" igual ao painel aberto, sem mexer nos outros parâmetros da URL
function ExameNaUrl() {
  const { painel, abrir, dados, carregado, clinica } = useStore();
  const router = useRouter();
  const rota = usePathname();
  const params = useSearchParams();
  const naUrl = params.get("exame");
  const id = painel?.id ?? null;
  const visto = useRef(id);
  const urlAntes = useRef(naUrl);

  // URL -> painel: link/recarregar abre; id que não existe é descartado; o parâmetro sumir (Voltar, outra tela) fecha
  useEffect(() => {
    const antes = urlAntes.current;
    urlAntes.current = naUrl;
    if (!naUrl) { if (antes) abrir(null); return; }
    if (!carregado || !clinica || naUrl === id) return;
    if (dados.exames.some((e) => e.id === naUrl)) abrir({ tipo: "exame", id: naUrl });
    else {
      const p = new URLSearchParams(params.toString());
      p.delete("exame");
      router.replace(p.size ? `${rota}?${p}` : rota, { scroll: false });
    }
    // só reage à mudança do ?exame=
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [naUrl, carregado, clinica]);

  // painel -> URL: abrir empilha (o Voltar fecha), fechar pelo X/Esc só troca a URL; a tela mudar não conta
  useEffect(() => {
    if (visto.current === id) return;
    visto.current = id;
    if (id === naUrl) return;
    const p = new URLSearchParams(params.toString());
    if (id) p.set("exame", id); else p.delete("exame");
    const url = p.size ? `${rota}?${p}` : rota;
    if (id) router.push(url, { scroll: false }); else router.replace(url, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return null;
}

// O plano do paciente da ligação atual, visível em todas as telas da unidade
function FaixaPlano() {
  const { dados, plano, escolherPlano, novaLigacao } = useStore();
  const [trocando, setTrocando] = useState(false);
  const info = plano && subtipoInfo(dados, plano.subtipoId);
  if (!plano || !info) return null;
  return (
    <div className="entrar mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-verde/30 bg-verde-claro/40 px-3 py-2">
      <LogoMarca nome={info.convenio.nome} logo={info.convenio.logo} cor={info.convenio.cor} tamanho="sm" />
      <p className="min-w-0 flex-1 truncate text-sm">
        <span className="text-suave">Paciente: </span>
        <strong className="font-semibold text-texto">{info.convenio.nome}</strong> · {info.subtipo.nome} · {plano.tipo === "consulta" ? "Consulta" : "Exame"}
      </p>
      {trocando ? (
        <div className="w-full sm:w-72">
          <SeletorConvenio dados={dados} valor={plano.subtipoId} abertoInicial onFechar={() => setTrocando(false)}
            onChange={(v) => escolherPlano(v ? { subtipoId: v, tipo: plano.tipo } : null)} />
        </div>
      ) : (
        <button type="button" onClick={() => setTrocando(true)}
          className="pressionavel rounded-lg px-2.5 py-1.5 text-sm font-semibold text-verde hover:bg-verde-claro">Trocar</button>
      )}
      <button type="button" onClick={novaLigacao}
        className="pressionavel flex items-center gap-1.5 rounded-lg bg-superficie px-2.5 py-1.5 text-sm font-semibold text-texto ring-1 ring-borda hover:ring-verde/40">
        <PhoneCall className="size-4" />Nova ligação
      </button>
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

  // sem unidade, a própria tela Unidades já é o seletor
  if (!clinica) return null;

  const varias = clinicas.length > 1;
  const org = banco.organizacoes.find((o) => o.id === clinica.organizacaoId);
  const escolher = (id: string) => {
    setAberto(false);
    escolherClinica(id);
    // a página de um médico não existe na outra clínica
    if (rota.startsWith("/profissionais/")) router.push("/busca");
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
