"use client";

import { reduzirImagem } from "@/lib/logo";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import * as Icones from "lucide-react";
import { X } from "lucide-react";
import { useStore } from "@/lib/store";
import { iniciais, resumoHorarios } from "@/lib/regras";
import type { DadosClinica, Profissional, Tipo } from "@/lib/modelo";

export function Logo({ claro = false }: { claro?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`grid size-9 place-items-center rounded-xl ${claro ? "bg-white/15 ring-1 ring-white/30" : "gradiente-marca shadow-card"}`}>
        <Icones.Plus className="size-5 text-white" strokeWidth={3} />
      </div>
      <div className="leading-tight">
        <p className={`text-[15px] font-bold ${claro ? "text-white" : "text-texto"}`}>Cartilha</p>
        <p className={`text-xs ${claro ? "text-white/75" : "text-suave"}`}>Central de agendamento</p>
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

export function CabecalhoPagina({ titulo, descricao, acao }: { titulo: string; descricao: string; acao?: React.ReactNode }) {
  return (
    <div className="entrar mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">{titulo}</h1>
        <p className="mt-1 text-suave">{descricao}</p>
      </div>
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
  return (
    <select value={valor} onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-xl border border-borda bg-superficie px-3 text-[15px] outline-none transition focus:border-verde focus:ring-4 focus:ring-verde/15">
      <option value="">Qualquer convênio</option>
      {dados.convenios.map((c) => (
        <optgroup key={c.id} label={c.nome}>
          {c.subtipos.map((s) => <option key={s.id} value={s.id}>{c.nome} · {s.nome}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

export function Gaveta({ aberta, onFechar, largura = "max-w-xl", children }: {
  aberta: boolean; onFechar: () => void; largura?: string; children: React.ReactNode;
}) {
  useEffect(() => {
    if (!aberta) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberta, onFechar]);
  return (
    <>
      <div data-aberta={aberta} onClick={onFechar} className="veu fixed inset-0 z-40 bg-texto/25 backdrop-blur-[2px]" />
      <aside data-aberta={aberta} aria-hidden={!aberta} inert={!aberta}
        className={`gaveta fixed inset-y-0 right-0 z-50 flex w-full ${largura} flex-col bg-superficie shadow-elevado sm:inset-y-3 sm:right-3 sm:rounded-3xl`}>
        <button onClick={onFechar} aria-label="Fechar"
          className="pressionavel absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-xl text-suave hover:bg-fundo hover:text-texto">
          <X className="size-5" />
        </button>
        <div className="flex-1 overflow-y-auto">{children}</div>
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
  nome: string; logo?: string; cor?: string; tamanho?: "sm" | "md" | "lg";
}) {
  const t = { sm: "size-6 rounded-md text-[10px]", md: "size-9 rounded-xl text-xs", lg: "size-14 rounded-2xl text-base" }[tamanho];
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
        <LogoMarca nome={nome || "?"} logo={valor} cor={cor} tamanho="lg" />
        <span className="absolute inset-0 grid place-items-center rounded-2xl bg-texto/0 text-white opacity-0 transition group-hover:bg-texto/40 group-hover:opacity-100">
          <Icones.ImageUp className="size-5" />
        </span>
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => { escolher(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
      <div className="text-sm">
        <p className="font-semibold">Logo</p>
        <p className="text-suave">Clique no quadro para escolher uma imagem.</p>
        {valor && <button type="button" onClick={() => onChange(undefined)} className="mt-1 font-semibold text-alerta hover:underline">Remover logo</button>}
      </div>
    </div>
  );
}
