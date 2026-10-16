"use client";

import { reduzirImagem } from "@/lib/logo";
import Link from "next/link";
import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import * as Icones from "lucide-react";
import { Activity, Baby, Bone, Brain, Ear, Eye, Heart, HeartPulse, Microscope, Pill, ScanLine, Smile, Stethoscope, Syringe, X, type LucideIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import { DIAS_PARA_REVISAR, combina, gruposHorarios, iniciais, subtipoInfo, tempoDesde, trechosDestaque } from "@/lib/regras";
import type { DadosClinica, Profissional, Tipo } from "@/lib/modelo";

export function Logo({ claro = false }: { claro?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`grid size-10 place-items-center rounded-xl p-1.5 ${claro ? "bg-white/15 ring-1 ring-white/30" : "gradiente-marca shadow-card"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Fundo%20Login.png" alt="OncologyGroup" className="h-full w-full object-contain" />
      </div>
      <div className="leading-tight">
        <p className={`text-[15px] font-bold tracking-tight ${claro ? "text-white" : "text-texto"}`}>OncologyGroup</p>
        <p className={`text-[11px] font-medium ${claro ? "text-white/75" : "text-suave"}`}>Guia Comercial</p>
      </div>
    </div>
  );
}

// Ícones de especialidade: mapa explícito (importar tudo do lucide pesa); nome desconhecido cai no estetoscópio
const ICONES_ESPECIALIDADE: Record<string, LucideIcon> = {
  Stethoscope, Activity, Baby, Bone, Brain, Ear, Eye, Heart, HeartPulse, Microscope, Pill, ScanLine, Smile, Syringe,
};
export function Icone({ nome, className }: { nome: string; className?: string }) {
  const C = Object.hasOwn(ICONES_ESPECIALIDADE, nome) ? ICONES_ESPECIALIDADE[nome] : Stethoscope;
  return <C className={className} />;
}

export function Avatar({ nome, grande = false }: { nome: string; grande?: boolean }) {
  return (
    <div className={`grid shrink-0 place-items-center rounded-xl bg-verde-claro font-semibold text-verde ${grande ? "size-16 text-xl" : "size-11 text-sm"}`}>
      {iniciais(nome)}
    </div>
  );
}

export function CabecalhoPagina({ titulo, acao }: { titulo: string; acao?: React.ReactNode }) {
  return (
    <div className="entrar mb-8 flex flex-wrap items-end justify-between gap-4">
      <h1 className="text-[28px] font-bold tracking-tight">{titulo}</h1>
      {acao}
    </div>
  );
}

export function Botao({ children, onClick, variante = "primario", type = "button" }: {
  children: React.ReactNode; onClick?: () => void; variante?: "primario" | "secundario"; type?: "button" | "submit";
}) {
  const estilo = variante === "primario"
    ? "bg-verde text-white shadow-card hover:bg-verde-escuro"
    : "bg-superficie text-texto border border-borda hover:bg-fundo";
  return (
    <button type={type} onClick={onClick} className={`pressionavel inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold ${estilo}`}>
      {children}
    </button>
  );
}

export function Chip({ children, tom = "neutro" }: { children: React.ReactNode; tom?: "neutro" | "verde" | "azul" | "alerta" | "perigo" }) {
  const t = {
    neutro: "bg-fundo text-texto border-borda",
    verde: "bg-verde-claro text-verde border-transparent",
    azul: "bg-azul-claro text-azul border-transparent",
    alerta: "bg-alerta-claro text-alerta border-transparent",
    perigo: "bg-perigo-claro text-perigo border-transparent",
  }[tom];
  return <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[13px] font-medium ${t}`}>{children}</span>;
}

export function Atualizado({ em, por }: { em?: string; por?: string }) {
  const tempo = em ? tempoDesde(em) : "";
  if (!em || !tempo) return null;
  const velho = (Date.now() - Date.parse(em)) / 86400000 > DIAS_PARA_REVISAR;
  return (
    <Chip tom={velho ? "alerta" : "neutro"}>
      Atualizado {tempo}{por && ` por ${por}`}{velho && " · pode estar desatualizado"}
    </Chip>
  );
}

// Só chega aqui quando o usuário pode ver (a recepção recebe os dados sem este campo)
export function ObservacaoInterna({ texto }: { texto?: string }) {
  if (!texto) return null;
  return (
    <div className="space-y-1.5 rounded-xl border border-dashed border-borda px-3 py-2">
      <Chip><Icones.Lock className="size-3" />Interno</Chip>
      <p className="whitespace-pre-line text-[15px] leading-relaxed">{texto}</p>
    </div>
  );
}

export function TipoBadge({ tipo }: { tipo: Tipo }) {
  return tipo === "consulta"
    ? <Chip tom="verde"><Icones.Stethoscope className="size-3.5" />Consulta</Chip>
    : <Chip tom="azul"><Icones.FlaskConical className="size-3.5" />Exame</Chip>;
}

// Controle segmentado com pílula deslizante
export function Segmentado<T extends string>({ opcoes, valor, onChange, desativado = false }: {
  opcoes: { valor: T; rotulo: string }[]; valor: T; onChange: (v: T) => void; desativado?: boolean;
}) {
  const i = opcoes.findIndex((o) => o.valor === valor);
  return (
    <div className="relative grid rounded-xl bg-fundo p-1 ring-1 ring-borda" style={{ gridTemplateColumns: `repeat(${opcoes.length}, 1fr)` }}>
      <span
        className="absolute inset-y-1 left-1 rounded-lg bg-superficie shadow-card transition-transform duration-300 ease-saida"
        style={{ width: `calc((100% - 0.5rem) / ${opcoes.length})`, transform: `translateX(${i * 100}%)` }}
      />
      {opcoes.map((o) => (
        <button key={o.valor} type="button" onClick={() => onChange(o.valor)} disabled={desativado}
          className={`relative h-9 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${o.valor === valor ? "text-texto" : "text-suave enabled:hover:text-texto"}`}>
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

type OpcaoLista = { id: string; texto: string; rotulo: React.ReactNode; grupo?: string };

// Botão + lista com busca: Esc fecha, ↑/↓ movem a opção ativa, Enter escolhe
export function SeletorBusca({ valor, onChange, vazio, placeholder, atual, opcoes, grupos = {}, abertoInicial = false, buscaInicial = "", onFechar, largo = true }: {
  valor: string; onChange: (v: string) => void; vazio: string; placeholder: string; atual: React.ReactNode;
  opcoes: OpcaoLista[]; grupos?: Record<string, React.ReactNode>;
  abertoInicial?: boolean; buscaInicial?: string; onFechar?: () => void; largo?: boolean;
}) {
  const [aberto, setAberto] = useState(abertoInicial);
  const [busca, setBusca] = useState(buscaInicial);
  const [ativa, setAtiva] = useState(0);
  const caixa = useRef<HTMLDivElement>(null);
  const gatilho = useRef<HTMLButtonElement>(null);
  const base = useId();

  const q = busca.trim();
  // com texto, a opção "qualquer" sai para o Enter cair no primeiro resultado
  const lista = [...(q ? [] : [{ id: "", texto: vazio, rotulo: vazio }]), ...opcoes.filter((o) => combina(o.texto, q))];

  const fechar = (focar = false) => {
    setAberto(false);
    setBusca("");
    onFechar?.();
    if (focar) gatilho.current?.focus();
  };
  const escolher = (id: string) => { onChange(id); fechar(true); };

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (!caixa.current?.contains(e.target as Node)) fechar(); };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  });

  useEffect(() => {
    if (aberto) document.getElementById(`${base}-${ativa}`)?.scrollIntoView({ block: "nearest" });
  }, [aberto, ativa, base]);

  const alternar = () => {
    if (aberto) return fechar();
    setAtiva(Math.max(0, lista.findIndex((o) => o.id === valor)));
    setAberto(true);
  };

  const tecla = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setAtiva((a) => Math.min(a + 1, lista.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setAtiva((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && lista[ativa]) { e.preventDefault(); escolher(lista[ativa].id); }
  };

  let grupoAnterior: string | undefined;
  return (
    <div ref={caixa} className="relative w-full"
      onKeyDown={(e) => { if (e.key === "Escape" && aberto) { e.preventDefault(); e.stopPropagation(); fechar(true); } }}>
      <button
        ref={gatilho}
        type="button"
        onClick={alternar}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        className={`flex h-11 w-full items-center rounded-xl border border-borda bg-superficie px-3 text-left text-sm outline-none transition focus:border-verde focus:ring-4 focus:ring-verde/15 ${valor ? "pr-16" : "pr-9"}`}
      >
        <span className="truncate">{valor ? atual : <span className="text-suave">{vazio}</span>}</span>
      </button>
      <div className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 text-suave">
        {valor && (
          <button type="button" aria-label="Limpar" onClick={() => onChange("")}
            className="pointer-events-auto rounded-md p-1 hover:bg-borda/40 hover:text-texto">
            <X className="size-3.5" />
          </button>
        )}
        <Icones.ChevronDown className={`size-4 transition-transform duration-200 ${aberto ? "rotate-180" : ""}`} />
      </div>

      {aberto && (
        <div className={`absolute left-0 top-full z-50 mt-1.5 w-full ${largo ? "min-w-[280px]" : ""} rounded-2xl border border-borda bg-superficie p-2 shadow-elevado`}>
          <div className="relative mb-2">
            <Icones.Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-suave" />
            <input
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setAtiva(0); }}
              onKeyDown={tecla}
              placeholder={placeholder}
              autoFocus
              role="combobox"
              aria-expanded
              aria-controls={`${base}-lista`}
              aria-activedescendant={lista[ativa] ? `${base}-${ativa}` : undefined}
              className="h-9 w-full rounded-xl border border-borda bg-fundo pl-8 pr-3 text-sm outline-none transition focus:border-verde focus:ring-2 focus:ring-verde/15"
            />
          </div>

          <div id={`${base}-lista`} role="listbox" className="max-h-64 space-y-0.5 overflow-y-auto pr-1 text-sm">
            {lista.length ? lista.map((o, n) => {
              const titulo = o.grupo && o.grupo !== grupoAnterior ? grupos[o.grupo] : null;
              grupoAnterior = o.grupo;
              const marcado = o.id === valor;
              return (
                <div key={o.id || "vazio"}>
                  {titulo && <div className="mt-1 flex items-center gap-2 rounded-lg bg-fundo/40 px-2 py-1 text-xs font-bold uppercase tracking-wider text-suave">{titulo}</div>}
                  <div
                    id={`${base}-${n}`}
                    role="option"
                    aria-selected={marcado}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => escolher(o.id)}
                    onMouseMove={() => setAtiva(n)}
                    className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 transition-colors ${o.grupo ? "ml-2" : ""} ${
                      marcado ? "bg-verde-claro font-semibold text-verde" : n === ativa ? "bg-fundo text-texto" : "text-texto"
                    } ${n === ativa ? "ring-1 ring-verde/30" : ""}`}
                  >
                    <span>{o.rotulo}</span>
                    {marcado && <Icones.Check className="size-3.5" />}
                  </div>
                </div>
              );
            }) : (
              <p className="py-3 text-center text-sm text-suave">Nada encontrado para &quot;{busca}&quot;.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function SeletorConvenio({ dados, valor, onChange, abertoInicial, buscaInicial, onFechar }: {
  dados: DadosClinica; valor: string; onChange: (v: string) => void;
  abertoInicial?: boolean; buscaInicial?: string; onFechar?: () => void;
}) {
  const info = valor ? subtipoInfo(dados, valor) : undefined;
  const grupos = Object.fromEntries(dados.convenios.map((c) => [c.id, <><LogoMarca nome={c.nome} logo={c.logo} cor={c.cor} tamanho="sm" /><span>{c.nome}</span></>]));
  const opcoes = dados.convenios.flatMap((c) => c.subtipos.map((s) => ({ id: s.id, texto: `${c.nome} ${s.nome}`, rotulo: s.nome, grupo: c.id })));
  return (
    <SeletorBusca valor={valor} onChange={onChange} vazio="Qualquer convênio" placeholder="Buscar convênio ou plano..."
      atual={info && <span className="font-medium text-texto"><strong className="font-semibold text-verde">{info.convenio.nome}</strong> · {info.subtipo.nome}</span>}
      opcoes={opcoes} grupos={grupos} abertoInicial={abertoInicial} buscaInicial={buscaInicial} onFechar={onFechar} />
  );
}

export function SeletorEspecialidade({ dados, valor, onChange }: { dados: DadosClinica; valor: string; onChange: (v: string) => void }) {
  return (
    <SeletorBusca valor={valor} onChange={onChange} vazio="Todas as especialidades" placeholder="Buscar especialidade..."
      atual={<span className="font-medium text-texto">{dados.especialidades.find((e) => e.id === valor)?.nome}</span>}
      opcoes={dados.especialidades.map((e) => ({ id: e.id, texto: e.nome, rotulo: e.nome }))} largo={false} />
  );
}

// Destaca as palavras do texto que começam com alguma palavra da busca
export function Destaque({ texto, q }: { texto: string; q: string }) {
  return <>{trechosDestaque(texto, q).map((x, n) => x.marca ? <mark key={n} className="rounded bg-verde-claro px-0.5 text-texto">{x.t}</mark> : x.t)}</>;
}

// Quem está dentro da gaveta (o botão Cancelar) fecha por aqui, para passar pelo aviso de descartar
export const FecharGaveta = createContext<() => void>(() => {});
export const useFecharGaveta = () => useContext(FecharGaveta);

export function Gaveta({ aberta, onFechar, alterado = false, largura = "max-w-xl", children }: {
  aberta: boolean; onFechar: () => void; alterado?: boolean; largura?: string; children: React.ReactNode;
}) {
  const [descartando, setDescartando] = useState(false);
  const tentar = () => (alterado ? setDescartando(true) : onFechar());
  // Esc com a barra aberta volta a editar; sem ela, tenta fechar
  const tentarRef = useRef(tentar);
  tentarRef.current = () => (descartando ? setDescartando(false) : tentar());
  const barra = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!aberta) setDescartando(false); }, [aberta]);
  const corpo = useRef<HTMLDivElement>(null);
  // ao abrir, o foco vai ao primeiro campo editável
  useEffect(() => {
    if (!aberta) return;
    const t = setTimeout(() => corpo.current?.querySelector<HTMLElement>("input:not([type=hidden]):not([disabled]),textarea:not([disabled]),select:not([disabled])")?.focus({ preventScroll: true }), 60);
    return () => clearTimeout(t);
  }, [aberta]);
  useEffect(() => { if (descartando) barra.current?.querySelector("button")?.focus(); }, [descartando]);
  useEffect(() => {
    if (!aberta) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && tentarRef.current();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberta]);
  return (
    <>
      <div data-aberta={aberta} onClick={tentar} className="veu fixed inset-0 z-40 bg-texto/25 backdrop-blur-[2px]" />
      <aside data-aberta={aberta} aria-hidden={!aberta} inert={!aberta}
        className={`gaveta fixed inset-y-0 right-0 z-50 flex w-full ${largura} flex-col bg-superficie shadow-elevado sm:inset-y-3 sm:right-3 sm:rounded-3xl`}>
        <button onClick={tentar} aria-label="Fechar"
          className="pressionavel absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-xl text-suave hover:bg-fundo hover:text-texto">
          <X className="size-5" />
        </button>
        <FecharGaveta.Provider value={tentar}>
          <div ref={corpo} className="flex-1 overflow-y-auto">{children}</div>
        </FecharGaveta.Provider>
        {descartando && (
          <div ref={barra} role="alertdialog" aria-label="Descartar as alterações?"
            className="entrar flex flex-wrap items-center gap-3 border-t border-borda bg-alerta-claro p-4 sm:rounded-b-3xl">
            <p className="flex-1 text-sm font-semibold text-alerta">Descartar as alterações?</p>
            <Botao variante="secundario" onClick={() => setDescartando(false)}>Continuar editando</Botao>
            <Botao onClick={onFechar}>Descartar</Botao>
          </div>
        )}
      </aside>
    </>
  );
}

// Painel lateral à direita: fundo escurecido (clique fecha), Esc fecha, foco vai ao botão Fechar e volta a quem abriu
export function Janela({ aberta, titulo, onFechar, children }: {
  aberta: boolean; titulo: string; onFechar: () => void; children: React.ReactNode;
}) {
  const { form } = useStore();
  const idTitulo = useId();
  const fechar = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLElement>(null);
  const onFecharRef = useRef(onFechar);
  onFecharRef.current = onFechar;
  const formAberto = useRef(false);
  formAberto.current = !!form;

  useEffect(() => {
    if (!aberta) return;
    const origem = document.activeElement as HTMLElement | null;
    fechar.current?.focus({ preventScroll: true });
    // com um formulário por cima, o Esc é dele
    const tecla = (e: KeyboardEvent) => {
      if (formAberto.current) return;
      if (e.key === "Escape") return onFecharRef.current();
      if (e.key !== "Tab") return;
      // prende o Tab dentro do painel
      const itens = [...painel.current!.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])')];
      const primeiro = itens[0], ultimo = itens[itens.length - 1];
      const dentro = painel.current!.contains(document.activeElement);
      if (!dentro || (e.shiftKey && document.activeElement === primeiro)) { e.preventDefault(); (e.shiftKey ? ultimo : primeiro).focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
    };
    window.addEventListener("keydown", tecla);
    return () => {
      window.removeEventListener("keydown", tecla);
      // o foco só volta se não foi para outro lugar (ex.: o formulário de edição)
      const destino = origem?.isConnected ? origem : document.querySelector<HTMLElement>("main");
      if (destino && (!document.activeElement || document.activeElement === document.body || painel.current?.contains(document.activeElement))) destino.focus({ preventScroll: true });
    };
  }, [aberta]);

  return (
    <>
      <div data-aberta={aberta} onClick={onFechar} className="veu fixed inset-0 z-40 bg-texto/30" />
      <aside ref={painel} role="dialog" aria-modal="true" aria-labelledby={idTitulo} data-aberta={aberta} aria-hidden={!aberta} inert={!aberta}
        className="gaveta fixed inset-y-0 right-0 z-50 flex w-[min(560px,100vw)] flex-col bg-superficie shadow-elevado">
        <header className="flex shrink-0 items-center gap-3 border-b border-borda px-5 py-3">
          <h2 id={idTitulo} className="min-w-0 flex-1 truncate text-xl font-bold tracking-tight">{titulo}</h2>
          <button ref={fechar} type="button" onClick={onFechar} aria-label="Fechar"
            className="pressionavel grid size-10 shrink-0 place-items-center rounded-xl text-suave hover:bg-fundo hover:text-texto">
            <X className="size-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </>
  );
}

export function Secao({ titulo, icone, children, i = 0 }: { titulo: string; icone: React.ReactNode; children: React.ReactNode; i?: number }) {
  return (
    <section className="entrar" style={{ "--i": i } as React.CSSProperties}>
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-suave">{icone}{titulo}</h3>
      {children}
    </section>
  );
}

export function Vazio({ texto }: { texto: string }) {
  return <p className="rounded-xl border border-dashed border-borda px-4 py-6 text-center text-sm text-suave">{texto}</p>;
}

export function CartaoProfissional({ p, especialidade, destaque, i, q = "", onAbrir }: {
  p: Profissional; especialidade?: string; destaque?: React.ReactNode; i: number; q?: string; onAbrir?: () => void;
}) {
  return (
    <Link href={`/profissionais/${p.id}`} onClick={onAbrir} style={{ "--i": Math.min(i, 10) } as React.CSSProperties}
      className="entrar pressionavel levanta group flex h-full w-full flex-col gap-4 rounded-3xl border border-borda bg-superficie p-5 text-left shadow-card">
      <div className="flex items-center gap-3">
        <Avatar nome={p.nome} />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-semibold"><Destaque texto={p.nome} q={q} /></p>
          {especialidade && <p className="text-sm text-suave">{especialidade}</p>}
        </div>
        <Icones.ChevronRight className="size-5 text-suave/50 transition-transform group-hover:translate-x-0.5 group-hover:text-verde" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-start gap-1.5 text-sm text-suave">
          <Icones.CalendarDays className="mt-0.5 size-4 shrink-0" />
          <div>{p.horarios.length ? gruposHorarios(p.horarios).map((g) => <p key={g}>{g}</p>) : "Horários não informados"}</div>
        </div>
        {p.restricoes.length > 0 && <Chip tom="alerta"><Icones.TriangleAlert className="size-3.5" />{p.restricoes.length === 1 ? "1 restrição" : `${p.restricoes.length} restrições`}</Chip>}
      </div>
      {destaque}
    </Link>
  );
}

// Logo da clínica ou do convênio; sem imagem, mostra as iniciais sobre a cor
export function LogoMarca({ nome, logo, cor = "#0b7a69", tamanho = "md" }: {
  nome: string; logo?: string; cor?: string; tamanho?: "sm" | "md" | "lg" | "xl";
}) {
  const t = { sm: "size-6 rounded-md text-xs", md: "size-9 rounded-xl text-xs", lg: "size-14 rounded-2xl text-base", xl: "h-20 w-44 rounded-2xl text-xl" }[tamanho];
  return logo
    // eslint-disable-next-line @next/next/no-img-element -- data URL local, sem otimização do Next
    ? <img src={logo} alt={`Logo ${nome}`} className={`${t} shrink-0 bg-white object-contain p-0.5 ring-1 ring-borda`} />
    : <span aria-hidden className={`${t} grid shrink-0 place-items-center font-bold text-white`} style={{ background: cor }}>{iniciais(nome)}</span>;
}

// Quadro clicável para escolher a logo; a imagem é reduzida antes de voltar em `onChange`
export function EnvioLogo({ nome, cor, valor, onChange }: {
  nome: string; cor?: string; valor?: string; onChange: (logo: string | undefined) => void;
}) {
  const { avisar } = useStore();
  const escolher = async (arquivo?: File) => {
    if (!arquivo) return;
    try { onChange(await reduzirImagem(arquivo)); } catch (e) { avisar((e as Error).message, true); }
  };
  return (
    <div className="flex items-center gap-4">
      <label className="pressionavel group relative cursor-pointer rounded-2xl" title="Escolher logo">
        <LogoMarca nome={nome || "?"} logo={valor} cor={cor} tamanho="xl" />
        <span className="absolute inset-0 grid place-items-center rounded-2xl bg-texto/0 text-white opacity-0 transition group-hover:bg-texto/40 group-hover:opacity-100">
          <Icones.ImageUp className="size-5" />
        </span>
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => { escolher(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
      <div className="text-sm">
        <p className="font-semibold">Logo</p>
        {valor && <button type="button" onClick={() => onChange(undefined)} className="mt-1 font-semibold text-alerta hover:underline">Remover logo</button>}
      </div>
    </div>
  );
}
