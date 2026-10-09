"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, ClipboardList, Copy, FileText, FlaskConical, Pencil, ShieldCheck, UserRound } from "lucide-react";
import { useStore, type Painel } from "@/lib/store";
import { resumoHorarios } from "@/lib/regras";
import { Avatar, Botao, Chip, Janela, LogoMarca, Secao, Vazio } from "./ui";

export function Paineis() {
  const { painel, abrir, dados } = useStore();
  // mantém o conteúdo visível enquanto a janela some
  const [ultimo, setUltimo] = useState<Painel>(null);
  if (painel && painel !== ultimo) setUltimo(painel);
  const atual = painel ?? ultimo;

  return (
    <Janela aberta={!!painel} onFechar={() => abrir(null)}
      titulo={`Preparo · ${dados.exames.find((e) => e.id === atual?.id)?.nome ?? "Exame"}`}>
      {atual && <FichaExame key={atual.id} id={atual.id} />}
    </Janela>
  );
}

function FichaExame({ id }: { id: string }) {
  const { dados, podeEditarAtual, abrir, abrirForm, avisar } = useStore();
  const ex = dados.exames.find((e) => e.id === id);
  if (!ex) return null;
  const quemFaz = dados.profissionais.filter((p) => p.exames.includes(ex.id));
  const porConvenio = dados.convenios
    .map((c) => ({ c, subs: c.subtipos.filter((s) => ex.subtipos.includes(s.id)) }))
    .filter((x) => x.subs.length);

  const copiar = async () => {
    const texto = `${ex.nome}\n\nPreparo:\n${ex.preparo.map((x, i) => `${i + 1}. ${x}`).join("\n")}\n\nTrazer: ${ex.documentos}`;
    try { await navigator.clipboard.writeText(texto); avisar("Orientações copiadas"); } catch { avisar("Não foi possível copiar", true); }
  };

  return (
    <div className="space-y-7 p-5 sm:p-6">
      <header className="entrar flex items-start gap-4">
        <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white"><FlaskConical className="size-7" /></div>
        <div>
          <p className="text-sm font-medium text-azul">Exame</p>
          <h2 className="text-2xl font-bold tracking-tight">{ex.nome}</h2>
        </div>
      </header>

      <div className="entrar -mt-4 flex flex-wrap gap-2" style={{ "--i": 1 } as React.CSSProperties}>
        <Botao onClick={copiar}><Copy className="size-4" />Copiar orientações</Botao>
        {podeEditarAtual && <Botao variante="secundario" onClick={() => abrirForm({ tipo: "exame", id: ex.id })}><Pencil className="size-4" />Editar</Botao>}
      </div>

      <Secao titulo="Preparo do paciente" icone={<ClipboardList className="size-4" />} i={2}>
        <ol className="space-y-2">
          {ex.preparo.map((passo, k) => (
            <li key={k} className="entrar flex gap-3 rounded-2xl border border-borda px-4 py-3 text-[15px]" style={{ "--i": k + 3 } as React.CSSProperties}>
              <span className="grid size-6 shrink-0 place-items-center rounded-full gradiente-marca text-xs font-bold text-white">{k + 1}</span>
              {passo}
            </li>
          ))}
        </ol>
      </Secao>

      <Secao titulo="O paciente deve trazer" icone={<FileText className="size-4" />} i={4}>
        <p className="rounded-2xl bg-fundo px-4 py-3 text-[15px]">{ex.documentos}</p>
      </Secao>

      <Secao titulo="Convênios que cobrem" icone={<ShieldCheck className="size-4" />} i={5}>
        {porConvenio.length ? (
          <div className="space-y-3">
            {porConvenio.map(({ c, subs }) => (
              <div key={c.id} className="flex flex-wrap items-center gap-2">
                <span className="flex w-36 items-center gap-2 text-[15px] font-semibold"><LogoMarca nome={c.nome} logo={c.logo} cor={c.cor} tamanho="sm" />{c.nome}</span>
                {subs.map((s) => <Chip key={s.id} tom="azul">{s.nome}</Chip>)}
              </div>
            ))}
          </div>
        ) : <Vazio texto="Nenhum convênio." />}
      </Secao>

      <Secao titulo="Quem realiza" icone={<UserRound className="size-4" />} i={6}>
        {quemFaz.length ? (
          <div className="space-y-2">
            {quemFaz.map((p) => (
              <Link key={p.id} href={`/profissionais/${p.id}`}
                className="pressionavel group flex w-full items-center gap-3 rounded-2xl border border-borda px-3 py-2.5 text-left hover:border-verde/30 hover:bg-verde-claro/50">
                <Avatar nome={p.nome} />
                <span className="flex-1">
                  <span className="block font-semibold">{p.nome}</span>
                  <span className="text-sm text-suave">{resumoHorarios(p.horarios)}</span>
                </span>
                <ChevronRight className="size-4 text-suave transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        ) : <Vazio texto="Nenhum profissional vinculado." />}
      </Secao>
    </div>
  );
}

