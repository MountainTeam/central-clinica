"use client";

import { useRouter } from "next/navigation";
import { Check, Pencil, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { podeCriarClinica, podeEditar, podeVerTelaClinicas } from "@/lib/permissoes";
import { dadosDaClinica } from "@/lib/repositorio";
import { Botao, CabecalhoPagina, LogoMarca, Vazio } from "@/components/ui";

export default function Clinicas() {
  const { banco, usuario, clinicas, clinica, escolherClinica, abrirForm } = useStore();
  const router = useRouter();
  if (!usuario || !podeVerTelaClinicas(usuario)) return <Vazio texto="Seu usuário não gerencia clínicas." />;
  const criar = podeCriarClinica(usuario);

  return (
    <div>
      <CabecalhoPagina titulo="Clínicas"
        acao={criar && (
          <div className="flex gap-2">
            <Botao variante="secundario" onClick={() => abrirForm({ tipo: "organizacao" })}><Plus className="size-4" />Organização</Botao>
            <Botao onClick={() => abrirForm({ tipo: "clinica" })}><Plus className="size-4" />Clínica</Botao>
          </div>
        )} />

      <div className="space-y-10">
        {banco.organizacoes.map((o, oi) => {
          const lista = clinicas.filter((c) => c.organizacaoId === o.id);
          if (!lista.length && !criar) return null;
          return (
            <section key={o.id} className="entrar" style={{ "--i": oi } as React.CSSProperties}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-suave">Organização · {o.nome}</h2>
              {lista.length ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {lista.map((c) => {
                    const d = dadosDaClinica(banco, c.id);
                    const atual = c.id === clinica?.id;
                    return (
                      <div key={c.id} className={`levanta relative rounded-3xl border bg-superficie shadow-card ${atual ? "border-verde/40" : "border-borda"}`}>
                        {atual && <div className="gradiente-marca absolute inset-x-0 top-0 h-1 rounded-t-3xl" />}
                        <button type="button" onClick={() => { escolherClinica(c.id); router.push("/"); }}
                          className="pressionavel flex w-full flex-col gap-4 p-5 text-left">
                          <span className="flex items-center gap-3 pr-10">
                            <LogoMarca nome={c.nome} logo={c.logo} tamanho="lg" />
                            <span className="min-w-0">
                              <span className="block truncate text-lg font-bold">{c.nome}</span>
                              {atual && <span className="mt-0.5 inline-flex items-center gap-1 rounded-lg bg-verde-claro px-2 py-0.5 text-xs font-semibold text-verde"><Check className="size-3.5" strokeWidth={3} />Em uso</span>}
                            </span>
                          </span>
                          <span className="grid grid-cols-3 gap-2 border-t border-borda pt-3 text-sm text-suave">
                            <span><b className="block text-lg tabular-nums text-texto">{d.profissionais.length}</b>médicos</span>
                            <span><b className="block text-lg tabular-nums text-texto">{d.convenios.length}</b>convênios</span>
                            <span><b className="block text-lg tabular-nums text-texto">{d.exames.length}</b>exames</span>
                          </span>
                        </button>
                        {podeEditar(usuario, c.id) && (
                          <button type="button" aria-label={`Editar ${c.nome}`} onClick={() => abrirForm({ tipo: "clinica", id: c.id })}
                            className="pressionavel absolute right-4 top-4 grid size-9 place-items-center rounded-xl text-suave hover:bg-fundo hover:text-verde">
                            <Pencil className="size-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : <Vazio texto="Nenhuma clínica." />}
            </section>
          );
        })}
      </div>
    </div>
  );
}
