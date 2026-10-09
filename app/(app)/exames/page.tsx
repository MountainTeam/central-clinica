"use client";

import { useState } from "react";
import { ArrowUpRight, FlaskConical, Plus, Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { semAcento } from "@/lib/regras";
import { Botao, CabecalhoPagina, Vazio } from "@/components/ui";

export default function Exames() {
  const { dados, podeEditarAtual, abrir, abrirForm } = useStore();
  const [q, setQ] = useState("");
  const lista = dados.exames.filter((e) => semAcento(e.nome).includes(semAcento(q.trim())));

  return (
    <div>
      <CabecalhoPagina titulo="Exames" descricao="Clique no exame para ver o preparo, o que trazer e quais convênios cobrem."
        acao={podeEditarAtual && <Botao onClick={() => abrirForm({ tipo: "exame" })}><Plus className="size-4" />Exame</Botao>} />

      <div className="entrar relative mb-6 max-w-md" style={{ "--i": 1 } as React.CSSProperties}>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-suave" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar exames"
          className="h-11 w-full rounded-xl border border-borda bg-superficie pl-10 pr-3 text-[15px] outline-none transition focus:border-verde focus:ring-4 focus:ring-verde/15" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {lista.map((e, i) => {
          const redes = e.subtipos.length;
          const quem = dados.profissionais.filter((p) => p.exames.includes(e.id)).length;
          return (
            <button key={e.id} onClick={() => abrir({ tipo: "exame", id: e.id })} style={{ "--i": Math.min(i, 10) } as React.CSSProperties}
              className="entrar pressionavel levanta group flex flex-col rounded-3xl border border-borda bg-superficie p-5 text-left shadow-card">
              <div className="flex items-start justify-between">
                <span className="grid size-11 place-items-center rounded-xl bg-azul-claro text-azul transition-colors duration-300 group-hover:bg-azul group-hover:text-white">
                  <FlaskConical className="size-5" />
                </span>
                <ArrowUpRight className="size-5 text-suave/40 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-azul" />
              </div>
              <p className="mt-4 font-semibold">{e.nome}</p>
              <p className="mt-1 line-clamp-2 text-sm text-suave">{e.preparo[0] ?? "Sem preparo cadastrado."}</p>
              <div className="mt-4 flex gap-4 border-t border-borda pt-3 text-sm text-suave">
                <span><b className="text-texto">{redes}</b> {redes === 1 ? "rede" : "redes"}</span>
                <span><b className="text-texto">{quem}</b> {quem === 1 ? "profissional" : "profissionais"}</span>
              </div>
            </button>
          );
        })}
      </div>
      {!lista.length && <Vazio texto={dados.exames.length ? "Nenhum exame com esse nome." : "Nenhum exame cadastrado nesta clínica."} />}
    </div>
  );
}
