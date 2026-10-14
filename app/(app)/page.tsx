"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Settings2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { podeGerenciarUnidades } from "@/lib/permissoes";
import type { Clinica, Organizacao } from "@/lib/modelo";
import { LogoMarca, Segmentado, Vazio } from "@/components/ui";

// Uma organização = um cartão. Com várias clínicas (ex.: COMN / ONCY), elas viram abas dentro do cartão.
function CartaoOrganizacao({ org, lista, indice }: { org: Organizacao; lista: Clinica[]; indice: number }) {
  const { clinica, escolherClinica } = useStore();
  const router = useRouter();
  const [sel, setSel] = useState(clinica && lista.some((x) => x.id === clinica.id) ? clinica.id : lista[0].id);
  const c = lista.find((x) => x.id === sel) ?? lista[0];
  const atual = c.id === clinica?.id;
  const daOrg = lista.some((x) => x.id === clinica?.id);
  const abrir = () => {
    escolherClinica(c.id);
    router.push("/busca");
  };

  return (
    <section className={`entrar levanta group relative flex flex-col overflow-hidden rounded-3xl border bg-superficie shadow-card ${daOrg ? "border-verde/40" : "border-borda"}`}
      style={{ "--i": indice } as React.CSSProperties}>
      {/* palco da logo: espaço grande, fundo suave e malha de pontos */}
      <div className="relative grid h-28 place-items-center bg-gradient-to-b from-fundo to-white px-6">
        <div aria-hidden className="absolute inset-0 opacity-60 [background-image:radial-gradient(var(--color-borda)_1px,transparent_1px)] [background-size:16px_16px]" />
        <div key={c.id} className="entrar relative flex h-full w-full items-center justify-center p-4">
          {c.logo
            // eslint-disable-next-line @next/next/no-img-element -- data URL ou arquivo local
            ? <img src={c.logo} alt={`Logo ${c.nome}`} className="max-h-14 max-w-[80%] object-contain transition-transform duration-500 group-hover:scale-105" />
            : <LogoMarca nome={c.nome} tamanho="lg" />}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* abas e título ocupam a mesma altura, para os cartões vizinhos ficarem alinhados */}
        <div className="flex h-11 items-center">
          {lista.length > 1
            ? <div className="w-full"><Segmentado opcoes={lista.map((x) => ({ valor: x.id, rotulo: x.nome }))} valor={c.id} onChange={setSel} /></div>
            : <h3 className="truncate text-base font-bold">{c.nome}</h3>}
        </div>
        <button type="button" onClick={abrir}
          className={`pressionavel mt-auto flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold ${atual ? "gradiente-marca text-white" : "bg-fundo text-texto ring-1 ring-borda hover:text-verde"}`}>
          {atual ? "Continuar na unidade" : "Entrar na unidade"}
          <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </div>
    </section>
  );
}

export default function UnidadesPage() {
  const { banco, usuario, clinicas } = useStore();
  const orgs = banco.organizacoes.filter((o) => clinicas.some((c) => c.organizacaoId === o.id));

  return (
    <div>
      <div className="entrar mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-borda pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-texto sm:text-4xl">Guia Comercial</h1>
          <p className="mt-2 text-base text-suave">Escolha a unidade para consultar médicos, exames e convênios.</p>
        </div>
        {usuario && podeGerenciarUnidades(usuario) && (
          <Link href="/clinicas" className="pressionavel inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-suave ring-1 ring-borda hover:text-verde">
            <Settings2 className="size-4" />Gerenciar unidades
          </Link>
        )}
      </div>

      {orgs.length === 0 ? (
        <Vazio texto="Nenhuma unidade vinculada ao seu usuário." />
      ) : (
        <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {orgs.map((o, oi) => (
            <CartaoOrganizacao key={o.id} org={o} indice={oi} lista={clinicas.filter((c) => c.organizacaoId === o.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
