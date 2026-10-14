"use client";

import Link from "next/link";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { podeCriarClinica, podeEditar, podeGerenciarUnidades } from "@/lib/permissoes";
import { Botao, CabecalhoPagina, LogoMarca, Vazio } from "@/components/ui";

// Edição das unidades, separada da tela inicial para ela ficar só de consulta
export default function Clinicas() {
  const { banco, usuario, clinicas, abrirForm } = useStore();
  if (!usuario || !podeGerenciarUnidades(usuario)) return <Vazio texto="Seu usuário só consulta as unidades." />;
  const criar = podeCriarClinica(usuario);
  // Administrador e Comercial também veem organizações ainda sem clínica
  const orgs = banco.organizacoes.filter((o) => criar || clinicas.some((c) => c.organizacaoId === o.id));

  return (
    <div>
      <Link href="/" className="entrar pressionavel mb-6 inline-flex items-center gap-2 text-sm font-semibold text-suave hover:text-texto">
        <ArrowLeft className="size-4" />Unidades
      </Link>
      <CabecalhoPagina titulo="Gerenciar unidades"
        acao={criar && (
          <div className="flex gap-2">
            <Botao variante="secundario" onClick={() => abrirForm({ tipo: "organizacao" })}><Plus className="size-4" />Organização</Botao>
            <Botao onClick={() => abrirForm({ tipo: "clinica" })}><Plus className="size-4" />Clínica</Botao>
          </div>
        )} />

      <div className="space-y-5">
        {orgs.map((o, i) => {
          const daOrg = clinicas.filter((c) => c.organizacaoId === o.id);
          return (
            <section key={o.id} className="entrar overflow-hidden rounded-3xl border border-borda bg-superficie shadow-card" style={{ "--i": Math.min(i, 10) } as React.CSSProperties}>
              <h2 className="border-b border-borda bg-fundo px-5 py-3 text-xs font-semibold uppercase tracking-wider text-suave">{o.nome}</h2>
              {daOrg.length ? daOrg.map((c, k) => (
                <div key={c.id} className={`flex items-center gap-4 px-5 py-3 ${k ? "border-t border-borda" : ""}`}>
                  <span className="grid h-12 w-24 shrink-0 place-items-center">
                    {c.logo
                      // eslint-disable-next-line @next/next/no-img-element -- data URL ou arquivo local
                      ? <img src={c.logo} alt={`Logo ${c.nome}`} className="max-h-10 max-w-full object-contain" />
                      : <LogoMarca nome={c.nome} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{c.nome}</span>
                  {podeEditar(usuario, c.id) && (
                    <Botao variante="secundario" onClick={() => abrirForm({ tipo: "clinica", id: c.id })}><Pencil className="size-4" />Editar</Botao>
                  )}
                </div>
              )) : <p className="px-5 py-4 text-sm text-suave">Nenhuma clínica nesta organização.</p>}
            </section>
          );
        })}
      </div>
    </div>
  );
}
