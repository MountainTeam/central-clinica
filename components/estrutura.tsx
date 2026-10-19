"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, ViewTransition, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Building2, Check, CheckCircle2, ChevronsUpDown, FileUp, FlaskConical, LayoutGrid, Lock, LogOut, PhoneCall, Search, ShieldCheck, TriangleAlert, Users } from "lucide-react";
import type { Usuario } from "@/lib/modelo";
import { PAPEIS, podeCriarUsuario, podeGerenciarUnidades } from "@/lib/permissoes";
import { semAcento, subtipoInfo } from "@/lib/regras";
import { useStore } from "@/lib/store";
import { Logo, LogoMarca, SeletorConvenio, Vazio } from "@/components/ui";
import { Paineis } from "@/components/paineis";
import { Formularios } from "@/components/formularios";

type ItemMenu = {
  href: string;
  rotulo: string;
  icone: typeof Search;
  requerClinica?: boolean;
  mostrar?: (u: Usuario, unidades: number, edita: boolean) => boolean;
};

const menu: ItemMenu[] = [
  { href: "/", rotulo: "Unidades", icone: Building2, mostrar: (u, n) => n !== 1 || podeGerenciarUnidades(u) },
  { href: "/busca", rotulo: "Busca rápida", icone: Search, requerClinica: true },
  { href: "/especialidades", rotulo: "Especialidades", icone: LayoutGrid, requerClinica: true },
  { href: "/convenios", rotulo: "Convênios", icone: ShieldCheck, requerClinica: true },
  { href: "/exames", rotulo: "Exames", icone: FlaskConical, requerClinica: true },
  { href: "/importar", rotulo: "Importar", icone: FileUp, requerClinica: true, mostrar: (_u, _n, edita) => edita },
  { href: "/usuarios", rotulo: "Usuários", icone: Users, mostrar: podeCriarUsuario },
];

export function Estrutura({ children }: { children: React.ReactNode }) {
  const { usuario, carregado, sair, aviso, avisar, clinica, clinicas, form, abrir, podeEditarAtual } = useStore();
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

  const itens = menu.filter((m) => !m.mostrar || (usuario && m.mostrar(usuario, clinicas.length, podeEditarAtual)));
  const ativo = itens.findIndex((m) => (m.href === "/" ? rota === "/" : rota.startsWith(m.href)));
  const deslogar = () => { sair(); router.replace("/login"); };
  // no celular o menu rola de lado sem barra: o item ativo precisa entrar na vista
  const menuCelular = useRef<HTMLElement>(null);
  useEffect(() => {
    menuCelular.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [ativo, carregado, usuario]);

  if (!carregado || !usuario) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-fundo p-6">
        <div className="w-full max-w-md space-y-4" aria-busy="true" aria-label="Carregando Guia Comercial">
          <div className="mx-auto w-fit"><Logo /></div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="entrar h-24 animate-pulse rounded-3xl border border-borda bg-superficie/70" style={{ "--i": i } as React.CSSProperties} />
          ))}
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
              <p className="line-clamp-2 break-words text-sm font-semibold">{usuario.nome}</p>
            </div>
            <p className="mt-1 text-[13px] text-suave">{PAPEIS[usuario.papel].rotulo}</p>
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
        <nav ref={menuCelular} className="flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
              <Link key={m.href} href={m.href} aria-current={i === ativo ? "page" : undefined}
                className={`pressionavel flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${i === ativo ? "bg-verde-claro text-verde" : "text-suave"}`}>
                <m.icone className="size-4" />{m.rotulo}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* a troca de tela cruza em fade; avatar e nome com view-transition-name viajam do cartão até a ficha */}
      <ViewTransition>
        <main key={`${rota}-${clinica?.id}`} tabIndex={-1} className="mx-auto outline-none max-w-6xl px-4 py-8 sm:px-8 lg:py-12">
          {clinica && !livre && <FaixaPlano />}
          {clinica || livre ? children : <Vazio texto="Escolha uma unidade para acessar esta opção." />}
        </main>
      </ViewTransition>

      <Paineis />
      <Suspense><ExameNaUrl /></Suspense>
      <Formularios />

      {aviso && (
        <div key={aviso.texto} role="status" className="aviso fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-texto px-4 py-3 text-sm font-medium text-white shadow-elevado">
          {aviso.erro ? <TriangleAlert className="size-4 shrink-0 text-alerta-claro" /> : <CheckCircle2 className="size-4 shrink-0 text-verde-claro" />}
          <span>{aviso.texto}</span>
          {aviso.acao && <button type="button" onClick={aviso.acao.fazer} className="pressionavel ml-2 rounded-lg px-2 py-1 font-semibold text-verde-claro hover:bg-white/10">{aviso.acao.rotulo}</button>}
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
  const rota = usePathname();
  const [trocando, setTrocando] = useState(false);
  const info = plano && subtipoInfo(dados, plano.subtipoId);
  // telas de gestão não são de atendimento: a ligação não aparece lá
  if (!plano || !info || /^\/(importar|usuarios|clinicas)/.test(rota)) return null;
  // "Unimed · Unimed Intercâmbio" vira só "Unimed Intercâmbio"
  const redeRepeteConvenio = info.subtipo.nome.toLowerCase().startsWith(info.convenio.nome.toLowerCase());
  return (
    <div className="entrar mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-verde/30 bg-verde-claro/40 px-3 py-2">
      {/* no celular o plano ocupa a linha inteira e quebra; "Trocar" e "Nova ligação" descem */}
      <div className="flex w-full min-w-0 items-center gap-3 sm:w-auto sm:flex-1">
        <LogoMarca nome={info.convenio.nome} logo={info.convenio.logo} cor={info.convenio.cor} tamanho="sm" />
        <p className="min-w-0 flex-1 text-sm sm:truncate">
          <span className="text-suave">Paciente: </span>
          {redeRepeteConvenio
            ? <strong className="font-semibold text-texto">{info.subtipo.nome}</strong>
            : <><strong className="font-semibold text-texto">{info.convenio.nome}</strong> · {info.subtipo.nome}</>} · {plano.tipo === "consulta" ? "Consulta" : "Exame"}
        </p>
      </div>
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
  const [termo, setTermo] = useState("");
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

  // Separação em grupos: redes multi-unidades vs unidades individuais
  const grupos = useMemo(() => {
    const q = semAcento(termo.trim());
    const clinicasFiltradas = clinicas.filter((c) => {
      if (!q) return true;
      const o = banco.organizacoes.find((orgItem) => orgItem.id === c.organizacaoId);
      return semAcento(c.nome).includes(q) || (o && semAcento(o.nome).includes(q));
    });

    const mapa = new Map<string, { org: typeof banco.organizacoes[0]; itens: typeof clinicas }>();
    for (const c of clinicasFiltradas) {
      const o = banco.organizacoes.find((orgItem) => orgItem.id === c.organizacaoId) ?? { id: c.organizacaoId, nome: c.nome };
      if (!mapa.has(o.id)) mapa.set(o.id, { org: o, itens: [] });
      mapa.get(o.id)!.itens.push(c);
    }

    const redesMulti: { org: typeof banco.organizacoes[0]; itens: typeof clinicas }[] = [];
    const unidadesSoltas: typeof clinicas = [];

    mapa.forEach((grupo) => {
      const totalOrgNoBanco = clinicas.filter((c) => c.organizacaoId === grupo.org.id).length;
      if (totalOrgNoBanco > 1 && grupo.org.nome.trim().toLowerCase() !== grupo.itens[0]?.nome.trim().toLowerCase()) {
        redesMulti.push(grupo);
      } else {
        unidadesSoltas.push(...grupo.itens);
      }
    });

    return { redesMulti, unidadesSoltas, total: clinicasFiltradas.length };
  }, [banco.organizacoes, clinicas, termo]);

  if (!clinica) return null;

  const varias = clinicas.length > 1;
  const org = banco.organizacoes.find((o) => o.id === clinica.organizacaoId);
  const clinicasDaMesmaOrg = clinicas.filter((c) => c.organizacaoId === clinica.organizacaoId);

  // Nome do grupo só agrega valor se for uma rede com mais de uma clínica e nome diferente da unidade
  const temNomeGrupoDiferente = org && clinicasDaMesmaOrg.length > 1 && org.nome.trim().toLowerCase() !== clinica.nome.trim().toLowerCase();

  const escolher = (id: string) => {
    setAberto(false);
    setTermo("");
    escolherClinica(id);
    if (rota.startsWith("/profissionais/")) router.push("/busca");
  };

  return (
    <div ref={caixa} className="relative">
      <button
        type="button"
        disabled={!varias}
        onClick={() => setAberto(!aberto)}
        aria-expanded={aberto}
        className={`group flex w-full items-center gap-3 rounded-2xl border text-left transition-all ${
          aberto
            ? "border-verde/50 bg-superficie shadow-md ring-2 ring-verde/15"
            : "border-borda bg-fundo/70 hover:border-verde/40 hover:bg-superficie hover:shadow-sm"
        } ${compacto ? "px-2.5 py-2" : "p-3"} ${varias ? "pressionavel cursor-pointer" : "cursor-default"}`}
      >
        <div className="relative shrink-0">
          <LogoMarca nome={clinica.nome} logo={clinica.logo} tamanho="md" />
        </div>

        <span className="min-w-0 flex-1">
          {!compacto && (
            <span className="block truncate text-xs font-semibold text-suave">
              {temNomeGrupoDiferente ? org?.nome : "Unidade ativa"}
            </span>
          )}
          <span className="block truncate text-sm font-bold text-texto">
            {clinica.nome}
          </span>
        </span>

        {varias ? (
          <ChevronsUpDown
            className={`size-4 shrink-0 text-suave transition-transform duration-200 ${
              aberto ? "rotate-180 text-verde" : "group-hover:text-texto"
            }`}
          />
        ) : (
          <Lock className="size-3.5 shrink-0 text-suave/50" aria-label="Única clínica vinculada" />
        )}
      </button>

      {aberto && (
        <div
          className={`entrar absolute top-full z-50 mt-2 flex flex-col rounded-2xl border border-borda/80 bg-superficie shadow-elevado backdrop-blur-md transition-all ${
            compacto ? "right-0 w-80" : "inset-x-0 w-[calc(100%+1.5rem)] -left-3"
          }`}
          style={{ maxHeight: "26rem" }}
        >
          {/* Cabeçalho do menu */}
          <div className="flex items-center justify-between border-b border-borda/60 px-3.5 py-2.5">
            <span className="text-xs font-bold text-texto tracking-tight">Trocar de Unidade</span>
            <span className="rounded-full bg-fundo px-2 py-0.5 text-xs font-semibold text-suave">
              {clinicas.length} disponíveis
            </span>
          </div>

          {/* Campo de busca rápida se houver mais de 4 clínicas */}
          {clinicas.length > 4 && (
            <div className="p-2 border-b border-borda/40">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-suave" />
                <input
                  value={termo}
                  onChange={(e) => setTermo(e.target.value)}
                  placeholder="Buscar unidade..."
                  className="h-8 w-full rounded-xl border border-borda/80 bg-fundo pl-8 pr-3 text-xs outline-none transition placeholder:text-suave/70 focus:border-verde focus:bg-superficie focus:ring-2 focus:ring-verde/15"
                />
              </div>
            </div>
          )}

          {/* Lista de Clínicas com Scroll suave */}
          <div className="flex-1 overflow-y-auto p-2 space-y-3 [scrollbar-width:thin]">
            {grupos.total === 0 ? (
              <p className="py-4 text-center text-xs text-suave">Nenhuma unidade encontrada.</p>
            ) : (
              <>
                {/* 1. Redes com múltiplas unidades (ex.: Clínica de Oncologia e Mastologia -> COMN, ONCY) */}
                {grupos.redesMulti.map(({ org: o, itens }) => (
                  <div key={o.id} className="rounded-xl bg-fundo/40 p-1.5 space-y-1 border border-borda/40">
                    <div className="flex items-center justify-between px-2 pt-1 pb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-suave truncate">
                        {o.nome}
                      </span>
                      <span className="text-xs font-medium text-suave/70">
                        {itens.length} {itens.length === 1 ? "unidade" : "unidades"}
                      </span>
                    </div>

                    {itens.map((c) => {
                      const ativa = c.id === clinica.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => escolher(c.id)}
                          className={`group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-all ${
                            ativa
                              ? "bg-verde-claro/50 border border-verde/30 text-verde-escuro shadow-xs"
                              : "hover:bg-superficie hover:border-borda text-texto border border-transparent"
                          }`}
                        >
                          <LogoMarca nome={c.nome} logo={c.logo} tamanho="sm" />
                          <div className="min-w-0 flex-1">
                            <span className={`block truncate text-xs font-bold ${ativa ? "text-verde-escuro" : "text-texto"}`}>
                              {c.nome}
                            </span>
                          </div>
                          {ativa ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-verde px-1.5 py-0.5 text-xs font-bold text-white">
                              <Check className="size-3" strokeWidth={3} /> Ativa
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-suave opacity-0 group-hover:opacity-100 transition-opacity">
                              Acessar
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}

                {/* 2. Unidades Individuais / Sem subdivisão */}
                {grupos.unidadesSoltas.length > 0 && (
                  <div className="space-y-1">
                    {grupos.redesMulti.length > 0 && (
                      <p className="px-2 pt-1 text-xs font-bold uppercase tracking-wider text-suave">
                        Outras Unidades
                      </p>
                    )}
                    {grupos.unidadesSoltas.map((c) => {
                      const ativa = c.id === clinica.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => escolher(c.id)}
                          className={`group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-all ${
                            ativa
                              ? "bg-verde-claro/50 border border-verde/30 text-verde-escuro shadow-xs"
                              : "hover:bg-fundo hover:border-borda text-texto border border-transparent"
                          }`}
                        >
                          <LogoMarca nome={c.nome} logo={c.logo} tamanho="sm" />
                          <div className="min-w-0 flex-1">
                            <span className={`block truncate text-xs font-bold ${ativa ? "text-verde-escuro" : "text-texto"}`}>
                              {c.nome}
                            </span>
                          </div>
                          {ativa ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-verde px-1.5 py-0.5 text-xs font-bold text-white">
                              <Check className="size-3" strokeWidth={3} /> Ativa
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-suave opacity-0 group-hover:opacity-100 transition-opacity">
                              Acessar
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Rodapé: Link para tela completa de Unidades */}
          <div className="border-t border-borda/60 p-1.5 bg-fundo/30 rounded-b-2xl">
            <Link
              href="/"
              onClick={() => setAberto(false)}
              className="pressionavel flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-semibold text-verde hover:bg-verde-claro/50 transition-colors"
            >
              <span>Ver painel de unidades</span>
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
