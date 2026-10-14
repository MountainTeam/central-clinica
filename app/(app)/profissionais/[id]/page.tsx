"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Copy, ChevronDown, ChevronRight, ClipboardList, Clock, FlaskConical, Minus, NotebookPen, Pencil, Search, ShieldCheck, TriangleAlert, X } from "lucide-react";
import { useItemDeOutraUnidade, useStore } from "@/lib/store";
import { DIAS, type DadosClinica, type Profissional } from "@/lib/modelo";
import { coberturaDaBusca, combina, gruposHorarios, subtipoInfo } from "@/lib/regras";
import { salvarProfissional } from "@/lib/repositorio";
import { Atualizado, Avatar, Botao, Chip, Icone, LogoMarca, ObservacaoInterna, Secao, Vazio } from "@/components/ui";
import { EditorHorarios, lerHorarios } from "@/components/formularios";

const cartao = "rounded-3xl border border-borda bg-superficie p-5 shadow-card sm:p-6";

export default function PaginaProfissional() {
  const { id } = useParams<{ id: string }>();
  const { dados } = useStore();
  const { semAcesso } = useItemDeOutraUnidade("profissionais", id);
  const p = dados.profissionais.find((x) => x.id === id);
  // a ficha só monta com o médico carregado (ela usa hooks depois da leitura)
  if (!p) {
    return (
      <div className="entrar space-y-4">
        <Vazio texto={semAcesso ? "Você não tem acesso a esta unidade." : "Profissional não encontrado."} />
        <Link href="/busca" className="pressionavel inline-flex items-center gap-2 font-semibold text-verde"><ArrowLeft className="size-4" />Voltar para a busca</Link>
      </div>
    );
  }
  return <Ficha p={p} />;
}

function Ficha({ p }: { p: Profissional }) {
  const router = useRouter();
  const { dados, podeEditarAtual, abrir, abrirForm, executar, avisar } = useStore();
  const [editando, setEditando] = useState<"horarios" | "obs" | null>(null);
  // dia da semana só no navegador, para não divergir do HTML do servidor
  const [hoje, setHoje] = useState<string | null>(null);
  useEffect(() => setHoje(DIAS[new Date().getDay() - 1] ?? null), []);

  const esp = dados.especialidades.find((e) => e.id === p.especialidadeId);
  const admin = podeEditarAtual; // pode editar esta clínica
  const salvar = (mudanca: Partial<Profissional>, msg: string) => {
    if (executar((b, u) => salvarProfissional(b, u, { ...p, ...mudanca }), msg)) setEditando(null);
  };
  // nunca inclui observações internas
  const copiar = async () => {
    const texto = [
      p.nome,
      esp?.nome,
      p.horarios.length ? `Horários:\n${gruposHorarios(p.horarios).join("\n")}` : "",
      p.restricoes.length ? `Restrições:\n${p.restricoes.map((r) => `- ${r.texto}`).join("\n")}` : "",
      p.observacoes ? `Observações: ${p.observacoes}` : "",
      p.procedimentos.length ? `Procedimentos: ${p.procedimentos.join(", ")}` : "",
    ].filter(Boolean).join("\n\n");
    try { await navigator.clipboard.writeText(texto); avisar("Ficha copiada"); } catch { avisar("Não foi possível copiar", true); }
  };
  const atendeHoje = hoje && p.horarios.find((h) => h.dia === hoje);

  return (
    <div>
      <button onClick={() => (history.length > 1 ? history.back() : router.push("/busca"))} className="entrar pressionavel mb-6 inline-flex items-center gap-2 text-sm font-semibold text-suave hover:text-texto">
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
          <div className="mt-2"><Atualizado em={p.atualizadoEm} por={p.atualizadoPor} /></div>
        </div>
        <Botao variante="secundario" onClick={copiar}><Copy className="size-4" />Copiar</Botao>
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
                        <span>{r.texto}{info && <span className="ml-1 opacity-75">· {info.convenio.nome} · {info.subtipo.nome}</span>}</span>
                      </li>
                    );
                  })}
                </ul>
              </Secao>
            </div>
          )}

          <div className={cartao}>
            <Secao titulo="Consulta de Convênios" icone={<ShieldCheck className="size-4" />} i={3}>
              <ChecadorConveniosProfissional dados={dados} p={p} />
            </Secao>
          </div>

          <div className={cartao}>
            <Secao titulo="Procedimentos" icone={<ClipboardList className="size-4" />} i={4}>
              {p.procedimentos.length
                ? <div className="flex flex-wrap gap-2">{p.procedimentos.map((x) => <Chip key={x}>{x}</Chip>)}</div>
                : <Vazio texto="Nenhum procedimento cadastrado." />}
            </Secao>
          </div>

          <div className={cartao}>
            <Secao titulo="Exames Realizados" icone={<FlaskConical className="size-4" />} i={5}>
              <SecaoExamesProfissional examesIds={p.exames} dados={dados} abrirExame={(eid) => abrir({ tipo: "exame", id: eid })} />
            </Secao>
          </div>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-8">
          <div className={`entrar ${cartao}`} style={{ "--i": 2 } as React.CSSProperties}>
            <TituloCartao icone={<Clock className="size-4" />} titulo="Horários"
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
                <textarea name="obs" rows={6} autoFocus defaultValue={p.observacoes} placeholder="Encaixes, preferências do médico"
                  className="w-full rounded-xl border border-borda bg-superficie px-3 py-2.5 text-[15px] leading-relaxed outline-none transition focus:border-verde focus:ring-4 focus:ring-verde/15" />
                <Acoes onCancelar={() => setEditando(null)} />
              </form>
            ) : p.observacoes ? (
              <p key="ve" className="entrar whitespace-pre-line text-[15px] leading-relaxed">{p.observacoes}</p>
            ) : (
              <Vazio texto={admin ? "Nenhuma observação." : "Nenhuma observação."} />
            )}
            {editando !== "obs" && <div className="mt-3"><ObservacaoInterna texto={p.observacoesInternas} /></div>}
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

function ChecadorConveniosProfissional({ dados, p }: { dados: DadosClinica; p: Profissional }) {
  const [busca, setBusca] = useState("");
  const [expandido, setExpandido] = useState(false);

  const conveniosAtendidos = useMemo(() => {
    return dados.convenios
      .map((c) => ({
        c,
        subs: c.subtipos.filter((s) => p.atende[s.id]),
      }))
      .filter((x) => x.subs.length > 0);
  }, [dados.convenios, p.atende]);

  const totalRedes = conveniosAtendidos.reduce((acc, curr) => acc + curr.subs.length, 0);
  const totalConsultas = conveniosAtendidos.reduce((acc, curr) => acc + curr.subs.filter((s) => p.atende[s.id]?.includes("c")).length, 0);
  const totalExames = conveniosAtendidos.reduce((acc, curr) => acc + curr.subs.filter((s) => p.atende[s.id]?.includes("e")).length, 0);

  const q = busca.trim();

  const principaisConvenios = useMemo(() => {
    return [...conveniosAtendidos].sort((a, b) => b.subs.length - a.subs.length).slice(0, 4);
  }, [conveniosAtendidos]);

  // Sem seletor Consulta/Exame nesta tela: a rede cobre quando atende consulta ou exame
  const resultadoBusca = useMemo(
    () => (q ? coberturaDaBusca(dados.convenios, (s) => (p.atende[s.id] ?? "") !== "", q) : null),
    [dados.convenios, p.atende, q],
  );

  if (!dados.convenios.length) {
    return <Vazio texto="Nenhum convênio cadastrado nesta clínica." />;
  }

  if (!conveniosAtendidos.length) {
    return <Vazio texto="Nenhum convênio credenciado para este profissional." />;
  }

  const marca = (ok: boolean) => ok
    ? <span className="inline-flex items-center gap-1 rounded-full bg-verde-claro px-2.5 py-0.5 text-xs font-semibold text-verde"><Check className="size-3" strokeWidth={3} /> Atende</span>
    : <span className="inline-flex items-center gap-1 rounded-full bg-fundo px-2 py-0.5 text-xs font-medium text-suave/70"><Minus className="size-3" /> Não</span>;

  return (
    <div className="space-y-4">
      {/* Resumo compacto no topo */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-fundo/70 p-3.5 border border-borda/60">
        <div>
          <span className="text-sm font-semibold text-texto">
            Credenciado em <strong className="text-verde">{conveniosAtendidos.length} convênios</strong> ({totalRedes} redes)
          </span>
          <p className="text-xs text-suave">
            {totalConsultas} redes com Consulta · {totalExames} redes com Exames
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="rounded-lg bg-verde-claro px-2.5 py-1 font-semibold text-verde">
            {totalConsultas} Consultas
          </span>
          <span className="rounded-lg bg-azul-claro px-2.5 py-1 font-semibold text-azul">
            {totalExames} Exames
          </span>
        </div>
      </div>

      {/* Campo de Consulta Rápida */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-suave" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Consultar convênio ou plano (ex: Bradesco, Cassi, Unimed...)"
          className="h-11 w-full rounded-2xl border border-borda bg-superficie pl-10 pr-9 text-sm outline-none transition placeholder:text-suave focus:border-verde focus:ring-4 focus:ring-verde/15"
        />
        {busca && (
          <button
            onClick={() => setBusca("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-suave hover:bg-borda/40 hover:text-texto"
            title="Limpar consulta"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Pílulas de Acesso Rápido */}
      {!busca && principaisConvenios.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-xs font-semibold text-suave mr-1">Consultar rápido:</span>
          {principaisConvenios.map(({ c }) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setBusca(c.nome)}
              className="pressionavel inline-flex items-center gap-1.5 rounded-xl border border-borda/80 bg-fundo px-2.5 py-1 text-xs font-semibold text-texto hover:border-verde/40 hover:bg-verde-claro/30 transition-colors"
            >
              <LogoMarca nome={c.nome} logo={c.logo} cor={c.cor} tamanho="sm" />
              <span>{c.nome}</span>
            </button>
          ))}
        </div>
      )}

      {/* RESULTADO DA BUSCA ATIVA */}
      {busca && resultadoBusca && (
        <div className="space-y-3 pt-1">
          {resultadoBusca.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-borda p-4 text-center">
              <p className="text-sm text-suave">Nenhum convênio ou rede com &ldquo;{busca}&rdquo; nesta unidade.</p>
            </div>
          ) : (
            <>
              {/* Convênios que o médico atende */}
              {resultadoBusca.filter((r) => r.cobre.length).map(({ convenio: c, cobre: subs, naoCobre }) => {
                const restricoesConvenio = p.restricoes.filter((r) =>
                  r.subtipoId ? c.subtipos.some((s) => s.id === r.subtipoId) : false
                );

                return (
                  <div key={c.id} className="overflow-hidden rounded-2xl border border-verde/40 bg-superficie shadow-sm ring-1 ring-verde/10">
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-verde-claro/40 p-3.5">
                      <div className="flex items-center gap-2.5">
                        <LogoMarca nome={c.nome} logo={c.logo} cor={c.cor} tamanho="sm" />
                        <div>
                          <span className="font-bold text-[15px] text-texto">{c.nome}</span>
                          <span className="ml-2 rounded-full bg-verde px-2 py-0.5 text-[11px] font-semibold text-white">
                            Credenciado
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-verde">
                        {subs.length} rede(s) encontrada(s)
                      </span>
                    </div>

                    {restricoesConvenio.length > 0 && (
                      <div className="border-t border-alerta/30 bg-alerta-claro/40 px-4 py-2 text-xs text-alerta flex items-center gap-2">
                        <TriangleAlert className="size-3.5 shrink-0" />
                        <span>Aviso deste profissional para {c.nome}: {restricoesConvenio.map((r) => r.texto).join(" | ")}</span>
                      </div>
                    )}

                    <div className="border-t border-borda/60 divide-y divide-borda/40">
                      <div className="grid grid-cols-[1fr_90px_90px] bg-fundo/40 px-4 py-2 text-xs font-semibold text-suave">
                        <span>Rede / Plano</span>
                        <span className="text-center">Consulta</span>
                        <span className="text-center">Exame</span>
                      </div>
                      {subs.map((s) => {
                        const podeC = p.atende[s.id]?.includes("c");
                        const podeE = p.atende[s.id]?.includes("e");
                        return (
                          <div key={s.id} className="grid grid-cols-[1fr_90px_90px] items-center px-4 py-2.5 text-sm">
                            <span className="font-medium text-texto">{s.nome}</span>
                            <span className="grid place-items-center">{marca(podeC)}</span>
                            <span className="grid place-items-center">{marca(podeE)}</span>
                          </div>
                        );
                      })}
                    </div>
                    {naoCobre.length > 0 && (
                      <div className="flex flex-wrap gap-1 border-t border-borda/60 px-4 py-2.5">
                        {naoCobre.map((s) => <Chip key={s.id} tom="alerta">{s.nome} · não cobre</Chip>)}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Convênios da clínica que este médico NÃO atende */}
              {resultadoBusca.filter((r) => !r.cobre.length).map(({ convenio: c, naoCobre }) => (
                <div key={c.id} className="flex items-center justify-between rounded-2xl border border-borda bg-fundo/40 p-3.5 text-sm">
                  <div className="flex items-center gap-2.5 opacity-70">
                    <LogoMarca nome={c.nome} logo={c.logo} cor={c.cor} tamanho="sm" />
                    <div>
                      <span className="font-semibold text-texto">{c.nome}</span>
                      {naoCobre.length > 0 && <p className="text-xs text-suave">Convênio atendido, mas não nesta rede</p>}
                      {naoCobre.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {naoCobre.map((s) => <Chip key={s.id} tom="alerta">{s.nome} · não cobre</Chip>)}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="rounded-lg bg-borda/50 px-2.5 py-1 text-xs font-semibold text-suave">
                    Não atende
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* VISÃO PADRÃO (SEM BUSCA ATIVA): Botão de expansão discreto */}
      {!busca && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setExpandido(!expandido)}
            className="pressionavel flex w-full items-center justify-between rounded-2xl border border-borda bg-fundo/50 px-4 py-2.5 text-xs font-semibold text-texto hover:bg-fundo hover:border-verde/40 transition-colors"
          >
            <span>{expandido ? "Ocultar lista de convênios" : `Ver todas as ${totalRedes} redes credenciadas (${conveniosAtendidos.length} convênios)`}</span>
            <ChevronDown className={`size-4 text-suave transition-transform duration-200 ${expandido ? "rotate-180" : ""}`} />
          </button>

          {expandido && (
            <div className="mt-3 space-y-2.5 border-t border-borda/40 pt-3">
              {conveniosAtendidos.map(({ c, subs }) => {
                const todasConsultas = subs.every((s) => p.atende[s.id]?.includes("c"));
                const todosExames = subs.every((s) => p.atende[s.id]?.includes("e"));

                return (
                  <div key={c.id} className="overflow-hidden rounded-2xl border border-borda bg-superficie shadow-sm transition-all">
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-fundo/40 p-3">
                      <div className="flex items-center gap-2.5">
                        <LogoMarca nome={c.nome} logo={c.logo} cor={c.cor} tamanho="sm" />
                        <span className="font-bold text-[14px] text-texto">{c.nome}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {todasConsultas && todosExames ? (
                          <span className="rounded-lg bg-verde-claro px-2.5 py-0.5 font-semibold text-verde">
                            Consulta e Exame ({subs.length} redes)
                          </span>
                        ) : (
                          <span className="rounded-lg bg-borda/40 px-2 py-0.5 font-medium text-suave">
                            {subs.length} redes credenciadas
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-borda/60 divide-y divide-borda/40">
                      {subs.map((s) => (
                        <div key={s.id} className="flex items-center justify-between px-4 py-2 text-sm hover:bg-fundo/20">
                          <span className="font-medium text-texto text-xs sm:text-sm">{s.nome}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs">
                              {p.atende[s.id]?.includes("c") ? (
                                <span className="font-semibold text-verde">✓ Consulta</span>
                              ) : (
                                <span className="text-suave/60">- Consulta</span>
                              )}
                            </span>
                            <span className="text-xs">
                              {p.atende[s.id]?.includes("e") ? (
                                <span className="font-semibold text-azul">✓ Exame</span>
                              ) : (
                                <span className="text-suave/60">- Exame</span>
                              )}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SecaoExamesProfissional({
  examesIds,
  dados,
  abrirExame,
}: {
  examesIds: string[];
  dados: DadosClinica;
  abrirExame: (id: string) => void;
}) {
  const [busca, setBusca] = useState("");
  const q = busca.trim();

  const lista = useMemo(() => {
    return examesIds
      .map((eid) => dados.exames.find((e) => e.id === eid))
      .filter((e): e is NonNullable<typeof e> => !!e);
  }, [examesIds, dados.exames]);

  const filtrados = useMemo(() => {
    if (!q) return lista;
    return lista.filter((e) => combina(e.nome, q));
  }, [lista, q]);

  if (!lista.length) return <Vazio texto="Nenhum exame realizado por este profissional." />;

  return (
    <div className="space-y-3">
      {lista.length > 3 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-suave" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={`Buscar entre os ${lista.length} exames...`}
            className="h-9 w-full rounded-xl border border-borda bg-superficie pl-9 pr-8 text-xs outline-none transition focus:border-verde focus:ring-2 focus:ring-verde/15"
          />
          {busca && (
            <button onClick={() => setBusca("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-suave hover:text-texto">
              <X className="size-3.5" />
            </button>
          )}
        </div>
      )}

      {filtrados.length ? (
        <div className="space-y-2">
          {filtrados.map((ex) => (
            <button
              key={ex.id}
              onClick={() => abrirExame(ex.id)}
              className="pressionavel group flex w-full items-center gap-3 rounded-2xl border border-borda px-4 py-3 text-left hover:border-azul/30 hover:bg-azul-claro/50"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-azul-claro text-azul">
                <FlaskConical className="size-4" />
              </span>
              <span className="flex-1 font-medium">{ex.nome}</span>
              <span className="text-sm text-suave">Ver preparo</span>
              <ChevronRight className="size-4 text-suave transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-suave py-2">Nenhum exame corresponde à busca &quot;{busca}&quot;.</p>
      )}
    </div>
  );
}
