"use client";

import { useEffect, useRef, useState } from "react";
import { FlaskConical, LayoutGrid, Search, ShieldCheck, UserRound, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { atende, semAcento, subtipoInfo, type Tipo } from "@/lib/dados";
import { CartaoProfissional, Chip, Segmentado, SeletorConvenio, TipoBadge, Vazio } from "@/components/ui";

function Contador({ valor }: { valor: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return setN(valor);
    const inicio = performance.now();
    let raf = 0;
    const passo = (t: number) => {
      const k = Math.min((t - inicio) / 900, 1);
      setN(Math.round(valor * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [valor]);
  return <>{n}</>;
}

export default function BuscaRapida() {
  const { dados, abrir } = useStore();
  const [texto, setTexto] = useState("");
  const [subtipo, setSubtipo] = useState("");
  const [tipo, setTipo] = useState<Tipo>("consulta");
  const [esp, setEsp] = useState("");
  const campo = useRef<HTMLInputElement>(null);

  // "/" foca a busca, como em ferramentas de consulta rápida
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        campo.current?.focus();
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, []);

  const q = semAcento(texto.trim());
  const nomeEsp = (id: string) => dados.especialidades.find((e) => e.id === id)?.nome ?? "";
  const resultados = dados.profissionais.filter((p) => {
    if (esp && p.especialidadeId !== esp) return false;
    if (subtipo && !atende(p, subtipo, tipo)) return false;
    if (!q) return true;
    const exames = p.exames.map((id) => dados.exames.find((e) => e.id === id)?.nome ?? "");
    return semAcento([p.nome, nomeEsp(p.especialidadeId), ...p.procedimentos, ...exames].join(" ")).includes(q);
  });
  const examesAchados = q ? dados.exames.filter((e) => semAcento(e.nome).includes(q)) : [];
  const info = subtipo ? subtipoInfo(dados, subtipo) : undefined;
  const filtrando = !!(q || subtipo || esp);

  const numeros = [
    { rotulo: "Especialidades", valor: dados.especialidades.length, icone: LayoutGrid },
    { rotulo: "Profissionais", valor: dados.profissionais.length, icone: UserRound },
    { rotulo: "Convênios", valor: dados.convenios.length, icone: ShieldCheck },
    { rotulo: "Exames", valor: dados.exames.length, icone: FlaskConical },
  ];

  return (
    <div>
      <div className="entrar mb-8">
        <p className="text-sm font-semibold text-verde">Busca rápida</p>
        <h1 className="mt-1 text-[32px] font-bold leading-tight tracking-tight">Quem atende <span className="texto-marca">este paciente</span>?</h1>
      </div>

      <div className="entrar rounded-3xl border border-borda bg-superficie p-4 shadow-card sm:p-5" style={{ "--i": 1 } as React.CSSProperties}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-suave" />
          <input ref={campo} value={texto} onChange={(e) => setTexto(e.target.value)} autoFocus
            placeholder="Médico, especialidade, procedimento ou exame"
            className="h-14 w-full rounded-2xl bg-fundo pl-12 pr-24 text-[17px] outline-none ring-1 ring-transparent transition placeholder:text-suave/70 focus:bg-superficie focus:ring-verde/40 focus:shadow-[0_0_0_4px_rgb(13_155_134/0.12)]" />
          {texto ? (
            <button onClick={() => setTexto("")} aria-label="Limpar" className="pressionavel absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-suave hover:bg-borda/60"><X className="size-4" /></button>
          ) : (
            <kbd className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-md border border-borda bg-superficie px-2 py-0.5 text-xs text-suave sm:block">/</kbd>
          )}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-[1.3fr_1fr_1fr]">
          <SeletorConvenio dados={dados} valor={subtipo} onChange={setSubtipo} />
          <Segmentado valor={tipo} onChange={setTipo} opcoes={[{ valor: "consulta", rotulo: "Consulta" }, { valor: "exame", rotulo: "Exame" }]} />
          <select value={esp} onChange={(e) => setEsp(e.target.value)}
            className="h-11 w-full rounded-xl border border-borda bg-superficie px-3 text-[15px] outline-none transition focus:border-verde focus:ring-4 focus:ring-verde/15">
            <option value="">Todas as especialidades</option>
            {dados.especialidades.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </div>
      </div>

      {!filtrando && (
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {numeros.map((n, i) => (
            <div key={n.rotulo} className="entrar rounded-2xl border border-borda bg-superficie p-4" style={{ "--i": i + 2 } as React.CSSProperties}>
              <n.icone className="size-5 text-verde" />
              <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight"><Contador valor={n.valor} /></p>
              <p className="text-sm text-suave">{n.rotulo}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">
          {filtrando ? `${resultados.length} ${resultados.length === 1 ? "profissional" : "profissionais"}` : "Todos os profissionais"}
        </h2>
        {info && (
          <div className="flex items-center gap-2 text-sm text-suave">
            Atendem <Chip><span className="size-2 rounded-full" style={{ background: info.convenio.cor }} />{info.convenio.nome} · {info.subtipo.nome}</Chip> para <TipoBadge tipo={tipo} />
          </div>
        )}
      </div>

      {examesAchados.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {examesAchados.map((e) => (
            <button key={e.id} onClick={() => abrir({ tipo: "exame", id: e.id })}
              className="entrar pressionavel flex items-center gap-2 rounded-xl bg-azul-claro px-3 py-2 text-sm font-semibold text-azul hover:brightness-95">
              <FlaskConical className="size-4" />Preparo: {e.nome}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {resultados.map((p, i) => (
          <CartaoProfissional key={p.id} p={p} i={i} especialidade={nomeEsp(p.especialidadeId)} onClick={() => abrir({ tipo: "profissional", id: p.id })}
            destaque={p.procedimentos.length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-t border-borda pt-3">
                {p.procedimentos.slice(0, 3).map((x) => <span key={x} className="rounded-md bg-fundo px-2 py-0.5 text-xs text-suave">{x}</span>)}
                {p.procedimentos.length > 3 && <span className="px-1 text-xs text-suave">+{p.procedimentos.length - 3}</span>}
              </div>
            )} />
        ))}
      </div>
      {!resultados.length && <div className="mt-4"><Vazio texto="Ninguém atende com esses filtros. Tente outra rede do convênio ou tire um filtro." /></div>}
    </div>
  );
}
