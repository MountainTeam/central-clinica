"use client";

import { useEffect, useRef, useState } from "react";
import { FlaskConical, LayoutGrid, Search, ShieldCheck, UserRound, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { atende, semAcento, subtipoInfo } from "@/lib/regras";
import type { Tipo } from "@/lib/modelo";
import { CartaoProfissional, Chip, LogoMarca, Segmentado, SeletorConvenio, TipoBadge, Vazio } from "@/components/ui";

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
  const { dados, clinica, abrir } = useStore();
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
      <div className="entrar rounded-3xl border border-borda bg-superficie p-4 shadow-card sm:p-5" style={{ "--i": 1 } as React.CSSProperties}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-suave" />
          <input ref={campo} value={texto} onChange={(e) => setTexto(e.target.value)} autoFocus
            placeholder="Médico, procedimento ou exame"
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

      {info && (
        <div className="entrar mt-6 rounded-2xl border border-borda bg-superficie p-4" style={{ "--i": 3 } as React.CSSProperties}>
          <div className="flex items-center gap-3">
            <LogoMarca nome={info.convenio.nome} logo={info.convenio.logo} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{info.convenio.nome}</p>
              <p className="truncate text-xs text-suave">{info.subtipo.nome}</p>
            </div>
            <TipoBadge tipo={tipo} />
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-bold">
          {filtrando ? `Resultados (${resultados.length + (tipo === "exame" ? examesAchados.length : 0)})` : "Todos os profissionais"}
        </h2>

        {resultados.length === 0 && (!filtrando || examesAchados.length === 0) && (
          <Vazio texto="Nenhum resultado encontrado." />
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {resultados.map((p, i) => {
            const medEsp = nomeEsp(p.especialidadeId);
            const medExames = p.exames.map((id) => dados.exames.find((e) => e.id === id)?.nome ?? "").filter(Boolean);
            const bateuProc = q ? p.procedimentos.filter((x) => semAcento(x).includes(q)) : [];
            const bateuExames = q ? medExames.filter((x) => semAcento(x).includes(q)) : [];
            return (
              <CartaoProfissional key={p.id} p={p} i={i} especialidade={medEsp}
                destaque={
                  (bateuProc.length > 0 || bateuExames.length > 0) && (
                    <div className="border-t border-borda pt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-suave">Atende nesta unidade</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {bateuProc.map((x) => <Chip key={x}>{x}</Chip>)}
                        {bateuExames.map((x) => <Chip key={x} tom="azul">{x}</Chip>)}
                      </div>
                    </div>
                  )
                }
              />
            );
          })}
        </div>

        {tipo === "exame" && examesAchados.length > 0 && (
          <div className="mt-10">
            <h3 className="mb-4 text-base font-bold text-suave">Exames correspondentes</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {examesAchados.map((e) => (
                <button key={e.id} onClick={() => abrir({ tipo: "exame", id: e.id })}
                  className="pressionavel flex items-center justify-between rounded-2xl border border-borda bg-superficie p-4 text-left hover:border-verde/40">
                  <div>
                    <p className="font-semibold">{e.nome}</p>
                    <p className="text-xs text-suave">{e.preparo.length ? "Com preparo" : "Sem preparo"}</p>
                  </div>
                  <FlaskConical className="size-5 text-verde" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
