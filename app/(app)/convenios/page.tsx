"use client";

import { useState } from "react";
import { ChevronRight, FlaskConical, Plus, Stethoscope, TriangleAlert } from "lucide-react";
import { useStore } from "@/lib/store";
import { atende, type Profissional, type Tipo } from "@/lib/dados";
import { Avatar, Botao, CabecalhoPagina, Segmentado, Vazio } from "@/components/ui";

export default function Convenios() {
  const { dados, perfil, abrirForm, abrir } = useStore();
  const [convId, setConvId] = useState(dados.convenios[0]?.id ?? "");
  const conv = dados.convenios.find((c) => c.id === convId);
  const [subId, setSubId] = useState(conv?.subtipos[0]?.id ?? "");

  const escolher = (id: string) => {
    setConvId(id);
    setSubId(dados.convenios.find((c) => c.id === id)?.subtipos[0]?.id ?? "");
  };
  const quem = (tipo: Tipo) => dados.profissionais.filter((p) => atende(p, subId, tipo));
  const exames = dados.exames.filter((e) => e.subtipos.includes(subId));
  const esp = (p: Profissional) => dados.especialidades.find((e) => e.id === p.especialidadeId)?.nome;

  const lista = (tipo: Tipo) => {
    const l = quem(tipo);
    return (
      <div className="rounded-3xl border border-borda bg-superficie p-5 shadow-card">
        <h3 className="mb-4 flex items-center gap-2 font-bold">
          <span className={`grid size-8 place-items-center rounded-lg ${tipo === "consulta" ? "bg-verde-claro text-verde" : "bg-azul-claro text-azul"}`}>
            {tipo === "consulta" ? <Stethoscope className="size-4" /> : <FlaskConical className="size-4" />}
          </span>
          {tipo === "consulta" ? "Consulta" : "Exame"}
          <span className="ml-auto text-sm font-medium text-suave">{l.length}</span>
        </h3>
        {l.length ? (
          <div className="space-y-1">
            {l.map((p, i) => (
              <button key={p.id} onClick={() => abrir({ tipo: "profissional", id: p.id })} style={{ "--i": i } as React.CSSProperties}
                className="entrar pressionavel group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-fundo">
                <Avatar nome={p.nome} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{p.nome}</span>
                  <span className="text-sm text-suave">{esp(p)}</span>
                </span>
                {p.restricoes.length > 0 && <TriangleAlert className="size-4 text-alerta" aria-label="Tem restrição" />}
                <ChevronRight className="size-4 text-suave/50 transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        ) : <Vazio texto={`Ninguém atende ${tipo} por esta rede.`} />}
      </div>
    );
  };

  return (
    <div>
      <CabecalhoPagina titulo="Convênios" descricao="Escolha o convênio e a rede para ver quem atende consulta e quem atende exame."
        acao={perfil === "admin" && <Botao onClick={() => abrirForm({ tipo: "convenio" })}><Plus className="size-4" />Convênio</Botao>} />

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="flex gap-2 overflow-x-auto lg:flex-col">
          {dados.convenios.map((c, i) => (
            <button key={c.id} onClick={() => escolher(c.id)} style={{ "--i": i } as React.CSSProperties}
              className={`entrar pressionavel flex shrink-0 items-center gap-3 rounded-2xl border px-4 py-3 text-left ${c.id === convId ? "border-verde/40 bg-superficie shadow-card" : "border-transparent hover:bg-superficie"}`}>
              <span className="size-3 rounded-full ring-4 ring-white" style={{ background: c.cor }} />
              <span>
                <span className="block font-semibold">{c.nome}</span>
                <span className="text-sm text-suave">{c.subtipos.length} {c.subtipos.length === 1 ? "rede" : "redes"}</span>
              </span>
            </button>
          ))}
        </div>

        {conv && (
          <div key={convId} className="space-y-5">
            <div className="entrar">
              <p className="mb-2 text-sm font-semibold text-suave">Tipo de rede</p>
              {conv.subtipos.length
                ? <div className="max-w-xl"><Segmentado valor={subId} onChange={setSubId} opcoes={conv.subtipos.map((s) => ({ valor: s.id, rotulo: s.nome }))} /></div>
                : <Vazio texto="Nenhuma rede cadastrada para este convênio." />}
            </div>
            <div key={subId} className="grid gap-5 md:grid-cols-2">
              {lista("consulta")}
              {lista("exame")}
            </div>
            <div className="entrar rounded-3xl border border-borda bg-superficie p-5 shadow-card" style={{ "--i": 3 } as React.CSSProperties}>
              <h3 className="mb-3 font-bold">Exames cobertos nesta rede</h3>
              {exames.length ? (
                <div className="flex flex-wrap gap-2">
                  {exames.map((e) => (
                    <button key={e.id} onClick={() => abrir({ tipo: "exame", id: e.id })}
                      className="pressionavel rounded-xl bg-azul-claro px-3 py-1.5 text-sm font-semibold text-azul hover:brightness-95">{e.nome}</button>
                  ))}
                </div>
              ) : <Vazio texto="Nenhum exame cadastrado para esta rede." />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
