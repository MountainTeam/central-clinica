"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, ChevronRight, ClipboardList, Clock, FlaskConical, Minus, NotebookPen, Pencil, ShieldCheck, TriangleAlert } from "lucide-react";
import { useStore } from "@/lib/store";
import { DIAS, type DadosClinica, type Profissional } from "@/lib/modelo";
import { subtipoInfo } from "@/lib/regras";
import { salvarProfissional } from "@/lib/repositorio";
import { Avatar, Botao, Chip, Icone, Secao, Vazio } from "@/components/ui";
import { EditorHorarios, lerHorarios } from "@/components/formularios";

const cartao = "rounded-3xl border border-borda bg-superficie p-5 shadow-card sm:p-6";

export default function PaginaProfissional() {
  const { id } = useParams<{ id: string }>();
  const { dados, podeEditarAtual, clinica, abrir, abrirForm, executar } = useStore();
  const [editando, setEditando] = useState<"horarios" | "obs" | null>(null);
  // dia da semana só no navegador, para não divergir do HTML do servidor
  const [hoje, setHoje] = useState<string | null>(null);
  useEffect(() => setHoje(DIAS[new Date().getDay() - 1] ?? null), []);

  const p = dados.profissionais.find((x) => x.id === id);
  if (!p) {
    return (
      <div className="entrar space-y-4">
        <Vazio texto={`Profissional não encontrado na ${clinica?.nome ?? "clínica atual"}.`} />
        <Link href="/" className="pressionavel inline-flex items-center gap-2 font-semibold text-verde"><ArrowLeft className="size-4" />Voltar para a busca</Link>
      </div>
    );
  }
  const esp = dados.especialidades.find((e) => e.id === p.especialidadeId);
  const admin = podeEditarAtual; // pode editar esta clínica
  const salvar = (mudanca: Partial<Profissional>, msg: string) => {
    if (executar((b, u) => salvarProfissional(b, u, { ...p, ...mudanca }), msg)) setEditando(null);
  };
  const atendeHoje = hoje && p.horarios.find((h) => h.dia === hoje);

  return (
    <div>
      <button onClick={() => history.back()} className="entrar pressionavel mb-6 inline-flex items-center gap-2 text-sm font-semibold text-suave hover:text-texto">
        <ArrowLeft className="size-4" />Voltar
      </button>

      <header className={`entrar ${cartao} relative mb-6 flex flex-wrap items-center gap-5 overflow-hidden`} style={{ "--i": 1 } as React.CSSProperties}>
        <div className="gradiente-marca pointer-events-none absolute inset-x-0 top-0 h-1" />
        <Avatar nome={p.nome} grande />
        <div className="min-w-0 flex-1">
          <h1 className="text-[28px] font-bold leading-tight tracking-tight">{p.nome}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {esp && <Chip tom="verde"><Icone nome={esp.icone} className="size-3.5" />{esp.nome}</Chip>}
            {p.idadeMinima && <Chip>A partir de {p.idadeMinima} anos</Chip>}
            {hoje && (atendeHoje
              ? <Chip tom="verde"><span className="pulso size-1.5 rounded-full bg-verde" />Atende hoje · {atendeHoje.inicio}–{atendeHoje.fim}</Chip>
              : <Chip>Não atende hoje</Chip>)}
          </div>
        </div>
        {admin && <Botao variante="secundario" onClick={() => abrirForm({ tipo: "profissional", id: p.id })}><Pencil className="size-4" />Editar ficha</Botao>}
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {p.restricoes.length > 0 && (
            <div className={cartao}>
              <Secao titulo="Restrições" icone={<TriangleAlert className="size-4" />} i={2}>
                <ul className="space-y-2">
                  {p.restricoes.map((r, k) => {
                    const info = r.subtipoId ? subtipoInfo(dados, r.subtipoId) : undefined;
                    return (
                      <li key={k} className="flex gap-3 rounded-2xl bg-alerta-claro px-4 py-3 text-[15px] text-alerta">
                        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                        <span>{r.texto}{info && <span className="ml-1 opacity-75">({info.convenio.nome} {info.subtipo.nome})</span>}</span>
                      </li>
                    );
                  })}
                </ul>
              </Secao>
            </div>
          )}

          <div className={cartao}>
            <Secao titulo="Convênios atendidos" icone={<ShieldCheck className="size-4" />} i={3}>
              <TabelaConvenios dados={dados} p={p} />
            </Secao>
          </div>

          <div className={cartao}>
            <Secao titulo="Procedimentos que realiza" icone={<ClipboardList className="size-4" />} i={4}>
              {p.procedimentos.length
                ? <div className="flex flex-wrap gap-2">{p.procedimentos.map((x) => <Chip key={x}>{x}</Chip>)}</div>
                : <Vazio texto="Nenhum procedimento cadastrado." />}
            </Secao>
          </div>

          <div className={cartao}>
            <Secao titulo="Exames que realiza" icone={<FlaskConical className="size-4" />} i={5}>
              {p.exames.length ? (
                <div className="space-y-2">
                  {p.exames.map((eid) => {
                    const ex = dados.exames.find((e) => e.id === eid);
                    return ex && (
                      <button key={eid} onClick={() => abrir({ tipo: "exame", id: eid })}
                        className="pressionavel group flex w-full items-center gap-3 rounded-2xl border border-borda px-4 py-3 text-left hover:border-azul/30 hover:bg-azul-claro/50">
                        <span className="grid size-9 place-items-center rounded-xl bg-azul-claro text-azul"><FlaskConical className="size-4" /></span>
                        <span className="flex-1 font-medium">{ex.nome}</span>
                        <span className="text-sm text-suave">Ver preparo</span>
                        <ChevronRight className="size-4 text-suave transition-transform group-hover:translate-x-0.5" />
                      </button>
                    );
                  })}
                </div>
              ) : <Vazio texto="Não realiza exames nesta clínica." />}
            </Secao>
          </div>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-8">
          <div className={`entrar ${cartao}`} style={{ "--i": 2 } as React.CSSProperties}>
            <TituloCartao icone={<Clock className="size-4" />} titulo="Dias e horários"
              acao={admin && editando !== "horarios" && <BotaoEditar onClick={() => setEditando("horarios")} />} />
            {editando === "horarios" ? (
              <form key="edita" className="entrar space-y-3" onSubmit={(e) => { e.preventDefault(); salvar({ horarios: lerHorarios(new FormData(e.currentTarget)) }, "Horários atualizados"); }}>
                <EditorHorarios valor={p.horarios} />
                <Acoes onCancelar={() => setEditando(null)} />
              </form>
            ) : (
              <ul key="ve" className="space-y-1.5">
                {DIAS.map((dia, k) => {
                  const h = p.horarios.find((x) => x.dia === dia);
                  return (
                    <li key={dia} style={{ "--i": k + 3 } as React.CSSProperties}
                      className={`entrar flex items-center justify-between rounded-xl px-3 py-2 ${dia === hoje ? "bg-verde-claro ring-1 ring-verde/25" : ""}`}>
                      <span className={`font-semibold ${h ? "" : "text-suave/70"}`}>
                        {dia}{dia === hoje && <span className="ml-2 text-xs font-medium text-verde">hoje</span>}
                      </span>
                      {h
                        ? <span className="rounded-lg bg-superficie px-2.5 py-1 text-sm font-semibold tabular-nums text-verde ring-1 ring-verde/20">{h.inicio} – {h.fim}</span>
                        : <span className="text-sm text-suave/70">Não atende</span>}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className={`entrar ${cartao}`} style={{ "--i": 3 } as React.CSSProperties}>
            <TituloCartao icone={<NotebookPen className="size-4" />} titulo="Observações"
              acao={admin && editando !== "obs" && <BotaoEditar onClick={() => setEditando("obs")} />} />
            {editando === "obs" ? (
              <form key="edita" className="entrar space-y-3" onSubmit={(e) => { e.preventDefault(); salvar({ observacoes: String(new FormData(e.currentTarget).get("obs")).trim() }, "Observações salvas"); }}>
                <textarea name="obs" rows={6} autoFocus defaultValue={p.observacoes} placeholder="Particularidades do atendimento, encaixes, preferências do médico..."
                  className="w-full rounded-xl border border-borda bg-superficie px-3 py-2.5 text-[15px] leading-relaxed outline-none transition focus:border-verde focus:ring-4 focus:ring-verde/15" />
                <Acoes onCancelar={() => setEditando(null)} />
              </form>
            ) : p.observacoes ? (
              <p key="ve" className="entrar whitespace-pre-line text-[15px] leading-relaxed">{p.observacoes}</p>
            ) : (
              <Vazio texto={admin ? "Nenhuma observação. Clique em Editar para escrever." : "Nenhuma observação."} />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function TituloCartao({ icone, titulo, acao }: { icone: React.ReactNode; titulo: string; acao?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-suave">{icone}{titulo}</h3>
      {acao}
    </div>
  );
}

function BotaoEditar({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="pressionavel flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-verde hover:bg-verde-claro">
      <Pencil className="size-3.5" />Editar
    </button>
  );
}

function Acoes({ onCancelar }: { onCancelar: () => void }) {
  return (
    <div className="flex justify-end gap-2">
      <Botao variante="secundario" onClick={onCancelar}>Cancelar</Botao>
      <Botao type="submit">Salvar</Botao>
    </div>
  );
}

function TabelaConvenios({ dados, p }: { dados: DadosClinica; p: Profissional }) {
  const convenios = dados.convenios.filter((c) => c.subtipos.some((s) => p.atende[s.id]));
  if (!convenios.length) return <Vazio texto="Nenhum convênio cadastrado. Atende só particular?" />;
  const marca = (ok: boolean) => ok
    ? <span className="grid size-6 place-items-center rounded-full bg-verde-claro text-verde"><Check className="size-3.5" strokeWidth={3} /></span>
    : <span className="grid size-6 place-items-center text-borda"><Minus className="size-4" /></span>;

  return (
    <div className="overflow-hidden rounded-2xl border border-borda">
      <div className="grid grid-cols-[1fr_76px_76px] bg-fundo px-4 py-2 text-xs font-semibold text-suave">
        <span>Convênio · rede</span><span className="text-center">Consulta</span><span className="text-center">Exame</span>
      </div>
      {convenios.map((c) => (
        <div key={c.id} className="border-t border-borda">
          {c.subtipos.filter((s) => p.atende[s.id]).map((s, k) => (
            <div key={s.id} className="grid grid-cols-[1fr_76px_76px] items-center px-4 py-2.5">
              <span className="flex items-center gap-2 text-[15px]">
                <span className="size-2 rounded-full" style={{ background: c.cor, opacity: k ? 0 : 1 }} />
                {!k && <span className="font-semibold">{c.nome} ·</span>}
                <span>{s.nome}</span>
              </span>
              <span className="grid place-items-center">{marca(p.atende[s.id].includes("c"))}</span>
              <span className="grid place-items-center">{marca(p.atende[s.id].includes("e"))}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
