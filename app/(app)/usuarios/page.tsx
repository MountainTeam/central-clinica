"use client";

import { useState } from "react";
import { Building2, Plus, RotateCcw, ShieldCheck, UserRound } from "lucide-react";
import { useStore } from "@/lib/store";
import { PAPEIS, podeCriarUsuario } from "@/lib/permissoes";
import { restaurarDemonstracao } from "@/lib/repositorio";
import { Botao, CabecalhoPagina, Chip, Vazio } from "@/components/ui";

export default function Usuarios() {
  const { banco, usuario, abrirForm, executar } = useStore();
  const [confirmando, setConfirmando] = useState(false);
  if (!usuario || !podeCriarUsuario(usuario)) return <Vazio texto="Só o Administrador gerencia usuários." />;

  const nomeClinica = (id: string) => banco.clinicas.find((c) => c.id === id)?.nome ?? id;
  const restaurar = () => {
    if (executar((b, u) => restaurarDemonstracao(b, u), "Demonstração restaurada")) setConfirmando(false);
  };

  return (
    <div>
      <CabecalhoPagina titulo="Usuários"
        acao={<Botao onClick={() => abrirForm({ tipo: "usuario" })}><Plus className="size-4" />Usuário</Botao>} />

      <div className="overflow-hidden rounded-3xl border border-borda bg-superficie shadow-card">
        {banco.usuarios.map((u, i) => (
          <div key={u.id} style={{ "--i": Math.min(i, 10) } as React.CSSProperties}
            className={`entrar flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 ${i ? "border-t border-borda" : ""}`}>
            <span className={`grid size-10 place-items-center rounded-xl ${u.clinicas.length ? "bg-verde-claro text-verde" : "gradiente-marca text-white"}`}>
              {u.clinicas.length ? <UserRound className="size-5" /> : <ShieldCheck className="size-5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{u.nome}</span>
              <span className="block truncate text-sm text-suave">{u.email}</span>
            </span>
            <span className="flex flex-wrap gap-2">
              <Chip tom={u.papel === "recepcao" ? "neutro" : "verde"}>{PAPEIS[u.papel].rotulo}</Chip>
              {u.clinicas.length
                ? u.clinicas.map((id) => <Chip key={id} tom="azul"><Building2 className="size-3.5" />{nomeClinica(id)}</Chip>)
                : <Chip tom="azul">Todas as clínicas</Chip>}
            </span>
          </div>
        ))}
      </div>

      <section className="entrar mt-10 rounded-3xl border border-borda bg-superficie p-5 sm:p-6" style={{ "--i": 3 } as React.CSSProperties}>
        <h2 className="font-bold">Restaurar demonstração</h2>
        <p className="mt-1 text-sm text-suave">Apaga tudo que foi cadastrado.</p>
        {confirmando ? (
          <div key="confirma" className="entrar mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-alerta-claro p-4">
            <p className="flex-1 text-sm font-semibold text-alerta">Apagar tudo?</p>
            <Botao variante="secundario" onClick={() => setConfirmando(false)}>Cancelar</Botao>
            <button type="button" onClick={restaurar}
              className="pressionavel inline-flex h-10 items-center gap-2 rounded-xl bg-alerta px-4 text-sm font-semibold text-white hover:brightness-110">
              <RotateCcw className="size-4" />Apagar e restaurar
            </button>
          </div>
        ) : (
          <div key="botao" className="mt-4">
            <Botao variante="secundario" onClick={() => setConfirmando(true)}><RotateCcw className="size-4" />Restaurar demonstração</Botao>
          </div>
        )}
      </section>
    </div>
  );
}
