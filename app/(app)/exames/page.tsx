"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { combina, idsDeRedes, pontuacao } from "@/lib/regras";
import { Botao, CabecalhoPagina, Vazio } from "@/components/ui";

export default function Exames() {
  const { dados, plano, podeEditarAtual, abrir, abrirForm } = useStore();
  const [q, setQ] = useState("");
  const validos = idsDeRedes(dados);
  const lista = dados.exames.filter((e) => combina(e.nome, q))
    .sort((a, b) => q.trim() ? pontuacao(b.nome, q) - pontuacao(a.nome, q) : a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <div>
      <CabecalhoPagina titulo="Exames"
        acao={podeEditarAtual && <Botao onClick={() => abrirForm({ tipo: "exame" })}><Plus className="size-4" />Exame</Botao>} />

      <div className="entrar relative mb-6 max-w-md" style={{ "--i": 1 } as React.CSSProperties}>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-suave" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar exames"
          className="h-11 w-full rounded-xl border border-borda bg-superficie pl-10 pr-3 text-[15px] outline-none transition focus:border-verde focus:ring-4 focus:ring-verde/15" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {lista.map((e, i) => {
          const redes = e.subtipos.filter((id) => validos.has(id));
          const convenios = dados.convenios.filter((c) => c.subtipos.some((st) => redes.includes(st.id))).length;
          const medicos = dados.profissionais.filter((p) => p.exames.includes(e.id)).length;
          const cobre = plano ? e.subtipos.includes(plano.subtipoId) : null;
          return (
            <button key={e.id} onClick={() => abrir({ tipo: "exame", id: e.id })} style={{ "--i": Math.min(i, 10) } as React.CSSProperties}
              className="entrar pressionavel levanta flex flex-col rounded-3xl border border-borda bg-superficie p-5 text-left shadow-card">
              <p className="line-clamp-2 font-semibold">{e.nome}</p>
              {e.valor?.trim()
                ? <p className="mt-2 text-lg font-bold text-verde">{e.valor}</p>
                : <p className="mt-2 text-sm text-suave">Valor não cadastrado</p>}
              <p className="mt-1 text-sm text-suave">
                <b className="text-texto">{medicos}</b> {medicos === 1 ? "médico" : "médicos"} · cobre <b className="text-texto">{convenios}</b> {convenios === 1 ? "convênio" : "convênios"}
              </p>
              <div className="mt-auto flex flex-wrap gap-2 pt-3">
                {!convenios && <span className="rounded-lg bg-fundo px-2 py-0.5 text-[13px] font-semibold text-suave">Sem convênio cadastrado</span>}
                {!medicos && <span className="rounded-lg bg-alerta-claro px-2 py-0.5 text-[13px] font-semibold text-alerta">Nenhum médico vinculado</span>}
                {cobre != null && (cobre
                  ? <span className="rounded-lg bg-verde-claro px-2 py-0.5 text-[13px] font-semibold text-verde">✓ cobre</span>
                  : <span className="rounded-lg bg-perigo-claro px-2 py-0.5 text-[13px] font-semibold text-perigo">✗ não cobre</span>)}
              </div>
            </button>
          );
        })}
      </div>
      {!lista.length && <Vazio texto={dados.exames.length ? "Nenhum exame com esse nome." : "Nenhum exame cadastrado."} />}
    </div>
  );
}
