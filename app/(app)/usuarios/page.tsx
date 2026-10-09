"use client";

import { Building2, Layers, Plus, ShieldCheck, UserRound } from "lucide-react";
import { useStore } from "@/lib/store";
import { Botao, CabecalhoPagina, Chip, Vazio } from "@/components/ui";

export default function Usuarios() {
  const { perfil, usuarios, clinicas, clinica, dados, abrirForm } = useStore();
  if (perfil !== "admin") return <Vazio texto="Só o administrador gerencia usuários e setores." />;

  const nomeClinica = (id?: string) => clinicas.find((c) => c.id === id)?.nome;
  const nomeSetor = (clinicaId?: string, setorId?: string) =>
    clinicas.find((c) => c.id === clinicaId)?.dados.setores.find((s) => s.id === setorId)?.nome;
  const compartilhados = dados.profissionais.filter((p) => !p.setorId).length;

  return (
    <div>
      <CabecalhoPagina titulo="Usuários e setores" descricao="Cada usuário vê só a própria clínica e, se tiver setor, só os médicos daquele setor." />

      <section className="entrar mb-10 rounded-3xl border border-borda bg-superficie p-5 shadow-card sm:p-6" style={{ "--i": 1 } as React.CSSProperties}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-bold"><Layers className="size-4 text-verde" />Setores da {clinica.nome}</h2>
            <p className="mt-0.5 text-sm text-suave">Use quando duas empresas dividem a mesma clínica.</p>
          </div>
          <Botao variante="secundario" onClick={() => abrirForm({ tipo: "setor" })}><Plus className="size-4" />Setor</Botao>
        </div>
        {dados.setores.length ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {dados.setores.map((s, i) => {
              const n = dados.profissionais.filter((p) => p.setorId === s.id).length;
              return (
                <div key={s.id} className="entrar rounded-2xl bg-azul-claro/60 p-4" style={{ "--i": i + 2 } as React.CSSProperties}>
                  <p className="font-bold text-azul">{s.nome}</p>
                  <p className="text-sm text-suave">{n} {n === 1 ? "médico" : "médicos"} só deste setor</p>
                </div>
              );
            })}
            <div className="entrar rounded-2xl bg-fundo p-4" style={{ "--i": dados.setores.length + 2 } as React.CSSProperties}>
              <p className="font-bold">Compartilhados</p>
              <p className="text-sm text-suave">{compartilhados} {compartilhados === 1 ? "médico aparece" : "médicos aparecem"} para todos</p>
            </div>
          </div>
        ) : <Vazio texto="Esta clínica não tem setores: todos os usuários dela veem todos os médicos." />}
      </section>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Usuários</h2>
        <Botao onClick={() => abrirForm({ tipo: "usuario" })}><Plus className="size-4" />Usuário</Botao>
      </div>
      <div className="overflow-hidden rounded-3xl border border-borda bg-superficie shadow-card">
        {usuarios.map((u, i) => {
          const setor = nomeSetor(u.clinicaId, u.setorId);
          return (
            <div key={u.id} style={{ "--i": i } as React.CSSProperties}
              className={`entrar flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 ${i ? "border-t border-borda" : ""}`}>
              <span className={`grid size-10 place-items-center rounded-xl ${u.perfil === "admin" ? "gradiente-marca text-white" : "bg-verde-claro text-verde"}`}>
                {u.perfil === "admin" ? <ShieldCheck className="size-5" /> : <UserRound className="size-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{u.nome}</span>
                <span className="block truncate text-sm text-suave">{u.email}</span>
              </span>
              <span className="flex flex-wrap gap-2">
                {u.perfil === "admin"
                  ? <Chip tom="verde">Administrador · todas as clínicas</Chip>
                  : <>
                      <Chip><Building2 className="size-3.5" />{nomeClinica(u.clinicaId) ?? "Todas"}</Chip>
                      {setor ? <Chip tom="azul">Só setor {setor}</Chip> : <Chip>Todos os setores</Chip>}
                    </>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
