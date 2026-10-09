"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { Botao, CabecalhoPagina, CartaoProfissional, Icone, Vazio } from "@/components/ui";

export default function Especialidades() {
  const { dados, podeEditarAtual, abrirForm } = useStore();
  const [escolhida, setSel] = useState("");
  // sem escolha (ou escolha que sumiu) cai na primeira, inclusive a recém-cadastrada
  const sel = dados.especialidades.some((e) => e.id === escolhida) ? escolhida : dados.especialidades[0]?.id ?? "";
  const atual = dados.especialidades.find((e) => e.id === sel);
  const lista = dados.profissionais.filter((p) => p.especialidadeId === sel);

  return (
    <div>
      <CabecalhoPagina titulo="Especialidades" descricao="Escolha a especialidade para ver quem atende e o que cada profissional faz."
        acao={podeEditarAtual && (
          <div className="flex gap-2">
            <Botao variante="secundario" onClick={() => abrirForm({ tipo: "especialidade" })}><Plus className="size-4" />Especialidade</Botao>
            <Botao onClick={() => abrirForm({ tipo: "profissional" })}><Plus className="size-4" />Profissional</Botao>
          </div>
        )} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {dados.especialidades.map((e, i) => {
          const n = dados.profissionais.filter((p) => p.especialidadeId === e.id).length;
          const ativa = e.id === sel;
          return (
            <button key={e.id} onClick={() => setSel(e.id)} style={{ "--i": i } as React.CSSProperties}
              className={`entrar pressionavel levanta flex items-center gap-3 rounded-2xl border p-4 text-left ${ativa ? "border-verde/40 bg-verde-claro shadow-card" : "border-borda bg-superficie"}`}>
              <span className={`grid size-11 shrink-0 place-items-center rounded-xl transition-colors duration-300 ${ativa ? "gradiente-marca text-white" : "bg-fundo text-verde"}`}>
                <Icone nome={e.icone} className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{e.nome}</span>
                <span className="text-sm text-suave">{n} {n === 1 ? "profissional" : "profissionais"}</span>
              </span>
            </button>
          );
        })}
      </div>

      {!dados.especialidades.length && (
        <Vazio texto="Nenhuma especialidade cadastrada nesta clínica. Cadastre a primeira para depois vincular os médicos." />
      )}

      {atual && (
        <section key={sel} className="mt-10">
          <h2 className="entrar mb-4 text-lg font-bold">{atual.nome}</h2>
          {lista.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {lista.map((p, i) => (
                <CartaoProfissional key={p.id} p={p} i={i}
                  destaque={
                    <div className="flex flex-wrap gap-1.5 border-t border-borda pt-3">
                      {p.procedimentos.length
                        ? p.procedimentos.map((x) => <span key={x} className="rounded-md bg-fundo px-2 py-0.5 text-xs text-suave">{x}</span>)
                        : <span className="text-xs text-suave">Só consulta</span>}
                    </div>
                  } />
              ))}
            </div>
          ) : <Vazio texto="Nenhum profissional cadastrado nesta especialidade ainda." />}
        </section>
      )}
    </div>
  );
}
