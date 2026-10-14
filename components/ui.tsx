"use client";

import { reduzirImagem } from "@/lib/logo";
import Link from "next/link";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as Icones from "lucide-react";
import { X } from "lucide-react";
import { useStore } from "@/lib/store";
import { DIAS_PARA_REVISAR, combina, iniciais, resumoHorarios, tempoDesde } from "@/lib/regras";
import type { DadosClinica, Profissional, Tipo } from "@/lib/modelo";

export function Logo({ claro = false }: { claro?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`grid size-9 place-items-center rounded-xl ${claro ? "bg-white/15 ring-1 ring-white/30" : "gradiente-marca shadow-card"}`}>
        <Icones.Plus className="size-5 text-white" strokeWidth={3} />
      </div>
      <div className="leading-tight">
        <p className={`text-[15px] font-bold ${claro ? "text-white" : "text-texto"}`}>Guia Comercial</p>
      </div>
    </div>
  );
}

export function Icone({ nome, className }: { nome: string; className?: string }) {
  const C = (Icones as unknown as Record<string, Icones.LucideIcon>)[nome] ?? Icones.Stethoscope;
  return <C className={className} />;
}

const tons = ["from-teal-400 to-emerald-500", "from-sky-400 to-blue-600", "from-emerald-400 to-teal-600", "from-blue-400 to-indigo-500", "from-cyan-400 to-sky-600"];
export function Avatar({ nome, grande = false }: { nome: string; grande?: boolean }) {
  const tom = tons[[...nome].reduce((s, c) => s + c.charCodeAt(0), 0) % tons.length];
  return (
    <div className={`grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br font-semibold text-white ${tom} ${grande ? "size-16 text-xl" : "size-11 text-sm"}`}>
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
    ? "gradiente-marca text-white shadow-card hover:brightness-105"
    : "bg-superficie text-texto border border-borda hover:bg-fundo";
  return (
    <button type={type} onClick={onClick} className={`pressionavel inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold ${estilo}`}>
      {children}
    </button>
  );
}

export function Chip({ children, tom = "neutro" }: { children: React.ReactNode; tom?: "neutro" | "verde" | "azul" | "alerta" }) {
  const t = {
    neutro: "bg-fundo text-texto border-borda",
    verde: "bg-verde-claro text-verde border-transparent",
    azul: "bg-azul-claro text-azul border-transparent",
    alerta: "bg-alerta-claro text-alerta border-transparent",
  }[tom];
  return <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[13px] font-medium ${t}`}>{children}</span>;
}

export function Atualizado({ em, por }: { em?: string; por?: string }) {
  if (!em) return null;
  const velho = (Date.now() - Date.parse(em)) / 86400000 > DIAS_PARA_REVISAR;
  return (
    <Chip tom={velho ? "alerta" : "neutro"}>
      Atualizado {tempoDesde(em)}{por && ` por ${por}`}{velho && " · pode estar desatualizado"}
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
export function Segmentado<T extends string>({ opcoes, valor, onChange }: {
  opcoes: { valor: T; rotulo: string }[]; valor: T; onChange: (v: T) => void;
}) {
  const i = opcoes.findIndex((o) => o.valor === valor);
  return (
    <div className="relative grid rounded-xl bg-fundo p-1 ring-1 ring-borda" style={{ gridTemplateColumns: `repeat(${opcoes.length}, 1fr)` }}>
      <span
        className="absolute inset-y-1 left-1 rounded-lg bg-superficie shadow-card transition-transform duration-300 ease-saida"
        style={{ width: `calc((100% - 0.5rem) / ${opcoes.length})`, transform: `translateX(${i * 100}%)` }}
      />
      {opcoes.map((o) => (
        <button key={o.valor} type="button" onClick={() => onChange(o.valor)}
          className={`relative h-9 rounded-lg px-3 text-sm font-semibold transition-colors ${o.valor === valor ? "text-texto" : "text-suave hover:text-texto"}`}>
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

export function SeletorConvenio({ dados, valor, onChange }: { dados: DadosClinica; valor: string; onChange: (v: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cliqueFora = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    document.addEventListener("mousedown", cliqueFora);
    return () => document.removeEventListener("mousedown", cliqueFora);
  }, []);

  const infoAtual = useMemo(() => {
    if (!valor) return null;
    for (const c of dados.convenios) {
      const s = c.subtipos.find((sub) => sub.id === valor);
      if (s) return { c, s };
    }
    return null;
  }, [dados.convenios, valor]);

  const q = busca.trim();

  const filtrados = useMemo(() => {
    if (!q) return dados.convenios;
    return dados.convenios
      .map((c) => {
        const subs = c.subtipos.filter((s) => combina(`${c.nome} ${s.nome}`, q));
        return { ...c, subtipos: subs };
      })
      .filter((c) => c.subtipos.length > 0);
  }, [dados.convenios, q]);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-borda bg-superficie px-3 text-[14px] text-left outline-none transition focus:border-verde focus:ring-4 focus:ring-verde/15"
      >
        <span className="truncate">
          {infoAtual ? (
            <span className="font-medium text-texto">
              <strong className="font-semibold text-verde">{infoAtual.c.nome}</strong> · {infoAtual.s.nome}
            </span>
          ) : (
            <span className="text-suave">Qualquer convênio</span>
          )}
        </span>
        <div className="flex items-center gap-1.5 shrink-0 text-suave">
          {valor && (
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setBusca("");
              }}
              className="rounded-md p-1 hover:bg-borda/40 hover:text-texto"
            >
              <X className="size-3.5" />
            </span>
          )}
          <Icones.ChevronDown className={`size-4 transition-transform duration-200 ${aberto ? "rotate-180" : ""}`} />
        </div>
      </button>

      {aberto && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[280px] rounded-2xl border border-borda bg-superficie p-2 shadow-elevado">
          <div className="relative mb-2">
            <Icones.Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-suave" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar convênio ou plano..."
              autoFocus
              className="h-8 w-full rounded-xl border border-borda bg-fundo pl-8 pr-7 text-xs outline-none transition focus:border-verde focus:ring-2 focus:ring-verde/15"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-suave hover:text-texto"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1 pr-1 text-xs">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setAberto(false);
                setBusca("");
              }}
              className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 font-medium transition-colors ${
                !valor ? "bg-verde-claro text-verde font-semibold" : "hover:bg-fundo text-suave"
              }`}
            >
              <span>Qualquer convênio</span>
              {!valor && <Icones.Check className="size-3.5" />}
            </button>

            {filtrados.length ? (
              filtrados.map((c) => (
                <div key={c.id} className="pt-1">
                  <div className="flex items-center gap-2 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-suave/80 bg-fundo/40 rounded-lg">
                    <LogoMarca nome={c.nome} logo={c.logo} cor={c.cor} tamanho="sm" />
                    <span>{c.nome}</span>
                  </div>
                  <div className="pl-2 pt-0.5 space-y-0.5">
                    {c.subtipos.map((s) => {
                      const ativo = valor === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            onChange(s.id);
                            setAberto(false);
                            setBusca("");
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition-colors ${
                            ativo ? "bg-verde-claro text-verde font-semibold" : "hover:bg-fundo text-texto"
                          }`}
                        >
                          <span>{s.nome}</span>
                          {ativo && <Icones.Check className="size-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <p className="py-3 text-center text-xs text-suave">Nenhum convênio encontrado para &quot;{busca}&quot;.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
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
          <div className="flex-1 overflow-y-auto">{children}</div>
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

const CHAVE_JANELA = "cartilha:janela";

// Janela flutuante no estilo Mac: arrasta pela barra de título e não bloqueia a página atrás.
// Fica no lugar em que a pessoa largou (só neste navegador). No celular vira folha de baixo, sem arrastar.
export function Janela({ aberta, titulo, onFechar, children }: {
  aberta: boolean; titulo: string; onFechar: () => void; children: React.ReactNode;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const arrasto = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [recolhida, setRecolhida] = useState(false);

  // posição atual da janela, presa à tela: largura inteira visível e a barra de título sempre alcançável
  const mover = (x: number, y: number) => {
    const el = caixa.current;
    if (!el) return;
    if (innerWidth < 640) x = y = 0;
    else {
      // offset* ignora a animação de abrir e o deslocamento: é o lugar padrão da janela
      const bx = el.offsetLeft, by = el.offsetTop;
      x = Math.min(Math.max(x, 8 - bx), innerWidth - 8 - el.offsetWidth - bx);
      y = Math.min(Math.max(y, 8 - by), innerHeight - 48 - by);
      // a altura encolhe quando a janela desce, para o fim do conteúdo não sair da tela
      el.style.setProperty("--alto", `${innerHeight - (by + y) - 8}px`);
    }
    pos.current = { x, y };
    el.style.translate = `${x}px ${y}px`;
  };
  const guardar = () => { try { localStorage.setItem(CHAVE_JANELA, JSON.stringify(pos.current)); } catch {} };
  const voltar = () => { mover(0, 0); guardar(); };

  useEffect(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_JANELA) ?? "null");
      if (salvo) mover(salvo.x, salvo.y);
    } catch {}
  }, []);

  // ao abrir (ou trocar de exame): expande, cabe na tela atual e recebe o foco
  useEffect(() => {
    if (!aberta) return;
    setRecolhida(false);
    mover(pos.current.x, pos.current.y);
    caixa.current?.focus({ preventScroll: true });
  }, [aberta, titulo]);

  const fechar = useRef(onFechar);
  useEffect(() => { fechar.current = onFechar; });
  useEffect(() => {
    if (!aberta) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && fechar.current();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberta]);

  const soltar = () => {
    if (!arrasto.current) return;
    arrasto.current = null;
    setArrastando(false);
    guardar();
  };

  return (
    <div ref={caixa} role="dialog" aria-label={titulo} tabIndex={-1} data-aberta={aberta} data-arrastando={arrastando}
      aria-hidden={!aberta} inert={!aberta}
      className="janela fixed inset-x-2 bottom-2 z-[35] flex flex-col overflow-hidden rounded-2xl border border-borda bg-superficie shadow-elevado outline-none sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-6 sm:w-[460px]">
      <div onDoubleClick={voltar} onPointerUp={soltar} onPointerCancel={soltar}
        onPointerDown={(e) => {
          if (arrasto.current || e.button !== 0 || innerWidth < 640 || (e.target as HTMLElement).closest("button")) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          arrasto.current = { px: e.clientX, py: e.clientY, ...pos.current };
          setArrastando(true);
        }}
        onPointerMove={(e) => { const a = arrasto.current; if (a) mover(a.x + e.clientX - a.px, a.y + e.clientY - a.py); }}
        className={`relative flex h-10 shrink-0 select-none items-center border-b border-borda bg-fundo/70 px-3 sm:cursor-grab ${arrastando ? "sm:cursor-grabbing" : ""}`}>
        <div className="group/luzes relative z-10 flex">
          <Luz cor="bg-[#ff5f57]" rotulo="Fechar" onClick={onFechar}><X /></Luz>
          <Luz cor="bg-[#febc2e]" rotulo={recolhida ? "Expandir" : "Recolher"} onClick={() => setRecolhida(!recolhida)}><Icones.Minus /></Luz>
          <Luz cor="bg-[#28c840]" rotulo="Voltar para o canto" onClick={voltar}><Icones.CornerRightUp /></Luz>
        </div>
        <p className="absolute inset-x-24 truncate text-center text-[13px] font-semibold text-suave">{titulo}</p>
      </div>
      <div className="grid transition-[grid-template-rows] duration-200 ease-saida" style={{ gridTemplateRows: recolhida ? "0fr" : "1fr" }}>
        <div className="max-h-[calc(85dvh-2.5rem)] min-h-0 overflow-y-auto sm:max-h-[calc(var(--alto,100dvh)-2.5rem)]">{children}</div>
      </div>
    </div>
  );
}

function Luz({ cor, rotulo, onClick, children }: { cor: string; rotulo: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={rotulo} title={rotulo} className="grid size-5 place-items-center">
      <span className={`grid size-3 place-items-center rounded-full ${cor} text-black/60 ring-1 ring-black/10 [&_svg]:size-2 [&_svg]:stroke-[3] [&_svg]:opacity-0 group-hover/luzes:[&_svg]:opacity-100 group-focus-within/luzes:[&_svg]:opacity-100`}>
        {children}
      </span>
    </button>
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

export function CartaoProfissional({ p, especialidade, destaque, i }: {
  p: Profissional; especialidade?: string; destaque?: React.ReactNode; i: number;
}) {
  return (
    <Link href={`/profissionais/${p.id}`} style={{ "--i": Math.min(i, 10) } as React.CSSProperties}
      className="entrar pressionavel levanta group flex w-full flex-col gap-4 rounded-3xl border border-borda bg-superficie p-5 text-left shadow-card">
      <div className="flex items-center gap-3">
        <Avatar nome={p.nome} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{p.nome}</p>
          {especialidade && <p className="text-sm text-suave">{especialidade}</p>}
        </div>
        <Icones.ChevronRight className="size-5 text-suave/50 transition-transform group-hover:translate-x-0.5 group-hover:text-verde" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-sm text-suave"><Icones.CalendarDays className="size-4 shrink-0" />{resumoHorarios(p.horarios)}</span>
        {p.restricoes.length > 0 && <Chip tom="alerta"><Icones.TriangleAlert className="size-3.5" />{p.restricoes.length === 1 ? "1 restrição" : `${p.restricoes.length} restrições`}</Chip>}
      </div>
      {destaque}
    </Link>
  );
}

// Logo da clínica ou do convênio; sem imagem, mostra as iniciais sobre a cor
export function LogoMarca({ nome, logo, cor = "#0d9b86", tamanho = "md" }: {
  nome: string; logo?: string; cor?: string; tamanho?: "sm" | "md" | "lg" | "xl";
}) {
  const t = { sm: "size-6 rounded-md text-[10px]", md: "size-9 rounded-xl text-xs", lg: "size-14 rounded-2xl text-base", xl: "h-20 w-44 rounded-2xl text-xl" }[tamanho];
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
