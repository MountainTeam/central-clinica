"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Check, MapPin, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { visivelPara } from "@/lib/dados";
import { Botao, CabecalhoPagina } from "@/components/ui";

export default function Clinicas() {
  const { clinicas, clinica, escolherClinica, perfil, usuario, abrirForm } = useStore();
  const router = useRouter();

  return (
    <div>
      <CabecalhoPagina titulo="Clínicas" descricao="Cada clínica tem seus próprios médicos, convênios, especialidades e exames. Escolha onde vai consultar."
        acao={perfil === "admin" && <Botao onClick={() => abrirForm({ tipo: "clinica" })}><Plus className="size-4" />Clínica</Botao>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {clinicas.map((c, i) => {
          const atual = c.id === clinica.id;
          const d = visivelPara(c.dados, usuario?.setorId);
          const numeros = [
            ["profissionais", d.profissionais.length],
            ["especialidades", d.especialidades.length],
            ["convênios", d.convenios.length],
            ["exames", d.exames.length],
          ] as const;
          return (
            <button key={c.id} onClick={() => { escolherClinica(c.id); router.push("/"); }} style={{ "--i": i } as React.CSSProperties}
              className={`entrar pressionavel levanta group relative flex flex-col overflow-hidden rounded-3xl border p-6 text-left shadow-card ${atual ? "border-verde/40 bg-superficie" : "border-borda bg-superficie"}`}>
              {atual && <div className="gradiente-marca absolute inset-x-0 top-0 h-1" />}
              <div className="flex items-start justify-between">
                <span className={`grid size-12 place-items-center rounded-2xl transition-colors duration-300 ${atual ? "gradiente-marca text-white" : "bg-verde-claro text-verde group-hover:bg-verde group-hover:text-white"}`}>
                  <Building2 className="size-6" />
                </span>
                {atual
                  ? <span className="flex items-center gap-1 rounded-lg bg-verde-claro px-2 py-1 text-xs font-semibold text-verde"><Check className="size-3.5" strokeWidth={3} />Em uso</span>
                  : <ArrowRight className="size-5 text-suave/40 transition-transform group-hover:translate-x-0.5 group-hover:text-verde" />}
              </div>
              <p className="mt-5 text-lg font-bold">{c.nome}</p>
              {c.cidade && <p className="mt-0.5 flex items-center gap-1.5 text-sm text-suave"><MapPin className="size-3.5" />{c.cidade}</p>}
              <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-borda pt-4">
                {numeros.map(([rotulo, n]) => (
                  <p key={rotulo} className="text-sm text-suave">
                    <b className="mr-1 text-lg font-bold tabular-nums text-texto">{n}</b>{rotulo}
                  </p>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
