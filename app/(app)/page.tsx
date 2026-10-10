"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Building2, Check, FlaskConical, Pencil, Plus, ShieldCheck, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { podeCriarClinica, podeEditar } from "@/lib/permissoes";
import { dadosDaClinica } from "@/lib/repositorio";
import type { Clinica, Organizacao } from "@/lib/modelo";
import { Botao, CabecalhoPagina, LogoMarca, Segmentado, Vazio } from "@/components/ui";

function Indicador({ icone: Icone, valor, rotulo }: { icone: typeof Users; valor: number; rotulo: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-borda bg-superficie px-4 py-3 shadow-card">
      <span className="gradiente-marca grid size-10 shrink-0 place-items-center rounded-xl text-white"><Icone className="size-5" /></span>
      <span className="leading-tight">
        <b className="block text-2xl tabular-nums">{valor}</b>
        <span className="text-xs text-suave">{rotulo}</span>
      </span>
    </div>
  );
}

function Numero({ icone: Icone, valor, rotulo }: { icone: typeof Users; valor: number; rotulo: string }) {
  return (
    <span className="flex flex-1 items-center gap-2 rounded-xl bg-fundo px-3 py-2">
      <Icone className="size-4 shrink-0 text-verde" />
      <span className="leading-tight">
        <b className="block tabular-nums">{valor}</b>
        <span className="text-[11px] text-suave">{rotulo}</span>
      </span>
    </span>
  );
}

// Uma organização = um cartão. Com várias clínicas (ex.: COMN / ONCY), elas viram abas dentro do cartão.
function CartaoOrganizacao({ org, lista, indice }: { org: Organizacao; lista: Clinica[]; indice: number }) {
  const { banco, usuario, clinica, escolherClinica, abrirForm } = useStore();
  const router = useRouter();
  const [sel, setSel] = useState(clinica && lista.some((x) => x.id === clinica.id) ? clinica.id : lista[0].id);
  const c = lista.find((x) => x.id === sel) ?? lista[0];
  const d = dadosDaClinica(banco, c.id);
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
      <div className="relative grid h-44 place-items-center bg-gradient-to-b from-fundo to-white px-6">
        <div aria-hidden className="absolute inset-0 opacity-60 [background-image:radial-gradient(var(--color-borda)_1px,transparent_1px)] [background-size:16px_16px]" />
        <span className="absolute left-4 top-4 flex max-w-[60%] items-center gap-1.5 rounded-lg bg-superficie/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-suave ring-1 ring-borda backdrop-blur">
          <Building2 className="size-3.5 shrink-0" /><span className="truncate">{org.nome}</span>
        </span>
        <div className="absolute right-3 top-3 flex items-center gap-1.5">
          {atual && <span className="inline-flex items-center gap-1 rounded-lg bg-verde-claro px-2 py-1 text-xs font-semibold text-verde"><Check className="size-3.5" strokeWidth={3} />Em uso</span>}
          {usuario && podeEditar(usuario, c.id) && (
            <button type="button" aria-label={`Editar ${c.nome}`} onClick={() => abrirForm({ tipo: "clinica", id: c.id })}
              className="pressionavel grid size-8 place-items-center rounded-lg bg-superficie/90 text-suave ring-1 ring-borda hover:text-verde">
              <Pencil className="size-4" />
            </button>
          )}
        </div>
        <div key={c.id} className="entrar relative flex h-full w-full items-center justify-center pb-3 pt-10">
          {c.logo
            // eslint-disable-next-line @next/next/no-img-element -- data URL local
            ? <img src={c.logo} alt={`Logo ${c.nome}`} className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105" />
            : <LogoMarca nome={c.nome} tamanho="xl" />}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        {lista.length > 1 && (
          <Segmentado opcoes={lista.map((x) => ({ valor: x.id, rotulo: x.nome }))} valor={c.id} onChange={setSel} />
        )}
        <h3 className="truncate text-lg font-bold">{c.nome}</h3>
        <div className="flex gap-2">
          <Numero icone={Users} valor={d.profissionais.length} rotulo="médicos" />
          <Numero icone={ShieldCheck} valor={d.convenios.length} rotulo="convênios" />
          <Numero icone={FlaskConical} valor={d.exames.length} rotulo="exames" />
        </div>
        <button type="button" onClick={abrir}
          className="pressionavel gradiente-marca mt-auto flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold text-white">
          {atual ? "Continuar na unidade" : "Entrar na unidade"}
          <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </div>
    </section>
  );
}

export default function UnidadesPage() {
  const { banco, usuario, clinicas, clinica, abrirForm } = useStore();
  const criar = usuario ? podeCriarClinica(usuario) : false;
  const vazias = banco.organizacoes.filter((o) => criar && !clinicas.some((c) => c.organizacaoId === o.id));
  const orgs = banco.organizacoes.filter((o) => clinicas.some((c) => c.organizacaoId === o.id));
  const soma = (k: "profissionais" | "convenios" | "exames") => clinicas.reduce((n, c) => n + dadosDaClinica(banco, c.id)[k].length, 0);

  return (
    <div>
      <div className="mb-8">
        <CabecalhoPagina
          titulo="Unidades"
          acao={criar && (
            <div className="flex gap-2">
              <Botao variante="secundario" onClick={() => abrirForm({ tipo: "organizacao" })}><Plus className="size-4" />Organização</Botao>
              <Botao onClick={() => abrirForm({ tipo: "clinica" })}><Plus className="size-4" />Clínica</Botao>
            </div>
          )}
        />
        <p className="-mt-6 text-sm text-suave">
          {clinica
            ? `Você está atualmente na unidade ${clinica.nome}. Escolha outra unidade abaixo para alternar ou continue na ativa.`
            : "Escolha qual unidade você deseja acessar para consultar médicos, especialidades e convênios."}
        </p>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador icone={Building2} valor={orgs.length} rotulo={orgs.length === 1 ? "organização" : "organizações"} />
        <Indicador icone={Users} valor={soma("profissionais")} rotulo="médicos cadastrados" />
        <Indicador icone={ShieldCheck} valor={soma("convenios")} rotulo="convênios" />
        <Indicador icone={FlaskConical} valor={soma("exames")} rotulo="exames" />
      </div>

      {orgs.length === 0 ? (
        <Vazio texto="Nenhuma unidade vinculada ao seu usuário." />
      ) : (
        <div className="grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {orgs.map((o, oi) => (
            <CartaoOrganizacao key={o.id} org={o} indice={oi} lista={clinicas.filter((c) => c.organizacaoId === o.id)} />
          ))}
          {vazias.map((o) => (
            <section key={o.id} className="rounded-3xl border border-dashed border-borda p-5">
              <h2 className="mb-3 truncate text-xs font-semibold uppercase tracking-wider text-suave">Organização · {o.nome}</h2>
              <Vazio texto="Nenhuma clínica." />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
