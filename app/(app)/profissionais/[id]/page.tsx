"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Copy, ChevronRight, ClipboardList, Clock, FlaskConical, NotebookPen, Pencil, Search, ShieldCheck, TriangleAlert, X } from "lucide-react";
import { useItemDeOutraUnidade, useStore } from "@/lib/store";
import { DIAS, type DadosClinica, type Profissional } from "@/lib/modelo";
import { coberturaDaBusca, combina, formatarValor, gruposHorarios, subtipoInfo } from "@/lib/regras";
import { salvarProfissional } from "@/lib/repositorio";
import { Atualizado, Avatar, Botao, Chip, Icone, LogoMarca, ObservacaoInterna, Secao, Vazio } from "@/components/ui";
import { EditorHorarios, lerHorarios } from "@/components/formularios";

const cartao = "rounded-3xl border border-borda bg-superficie p-5 shadow-card sm:p-6";

export default function PaginaProfissional() {
  const { id } = useParams<{ id: string }>();
  const { dados } = useStore();
  const { semAcesso, trocando } = useItemDeOutraUnidade("profissionais", id);
  const p = dados.profissionais.find((x) => x.id === id);
  // a ficha só monta com o médico carregado (ela usa hooks depois da leitura)
  if (!p && trocando) return null;
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
      p.valor ? `Valor particular: ${formatarValor(p.valor)}` : "",
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
        <div className="pointer-events-none bg-verde absolute inset-x-0 top-0 h-1" />
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
          <p className="mt-2 text-sm text-suave">
            Particular: <b className="text-base text-verde">{formatarValor(p.valor) || "consulte a recepção"}</b>
          </p>
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
            <Secao titulo="Consulta de convênios" icone={<ShieldCheck className="size-4" />} i={3}>
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
            <Secao titulo="Exames realizados" icone={<FlaskConical className="size-4" />} i={5}>
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
                      <span className={`font-semibold ${h ? "" : "text-suave"}`}>
                        {dia}{dia === hoje && <span className="ml-2 text-[13px] font-medium text-verde">hoje</span>}
                      </span>
                      {h
                        ? <span className="rounded-lg bg-superficie px-2.5 py-1 text-sm font-semibold tabular-nums text-verde ring-1 ring-verde/20">{h.inicio} – {h.fim}</span>
                        : <span className="text-sm text-suave">Não atende</span>}
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

  const conveniosAtendidos = useMemo(() => {
    return dados.convenios
      .map((c) => ({
        c,
        subs: c.subtipos.filter((s) => p.atende[s.id]),
      }))
      .filter((x) => x.subs.length > 0);
  }, [dados.convenios, p.atende]);

  const totalRedes = conveniosAtendidos.reduce((acc, curr) => acc + curr.subs.length, 0);
  const q = busca.trim();

  // Sem seletor Consulta/Exame nesta tela: a rede cobre quando atende consulta ou exame
  const resultadoBusca = useMemo(
    () => (q ? coberturaDaBusca(dados.convenios, (s) => (p.atende[s.id] ?? "") !== "", q) : null),
    [dados.convenios, p.atende, q],
  );

  if (!dados.convenios.length) {
    return <Vazio texto="Nenhum convênio cadastrado nesta unidade." />;
  }

  if (!conveniosAtendidos.length) {
    return (
      <div className="rounded-2xl border border-dashed border-borda p-5 text-center">
        <p className="text-sm font-semibold text-texto">Atendimento exclusivamente particular</p>
        <p className="mt-1 text-xs text-suave">Este profissional não atende convênios nesta unidade.</p>
        {p.valor && (
          <p className="mt-2 text-sm font-bold text-verde">Valor da consulta: {formatarValor(p.valor)}</p>
        )}
      </div>
    );
  }

  const formatContagem = () => {
    const convStr = `${conveniosAtendidos.length} ${conveniosAtendidos.length === 1 ? "convênio" : "convênios"}`;
    const redeStr = `${totalRedes} ${totalRedes === 1 ? "rede" : "redes"}`;
    return `${convStr} · ${redeStr}`;
  };

  return (
    <div className="space-y-3">
      {/* Campo de Busca Rápida e Direta */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-suave" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={`Buscar convênio ou plano do paciente (${formatContagem()})...`}
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

      {/* RESULTADO DA BUSCA ATIVA */}
      {busca && resultadoBusca ? (
        <div className="space-y-2.5 pt-1">
          {resultadoBusca.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-borda p-4 text-center">
              <p className="text-sm text-suave">Nenhum convênio ou plano encontrado com &ldquo;{busca}&rdquo;.</p>
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
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-verde-claro/40 px-3.5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <LogoMarca nome={c.nome} logo={c.logo} cor={c.cor} tamanho="sm" />
                        <span className="font-bold text-[14px] text-texto">{c.nome}</span>
                        <span className="rounded-full bg-verde px-2 py-0.5 text-xs font-semibold text-white">
                          Atende
                        </span>
                      </div>
                      <span className="text-[12px] font-medium text-verde">
                        {subs.length} {subs.length === 1 ? "rede encontrada" : "redes encontradas"}
                      </span>
                    </div>

                    {restricoesConvenio.length > 0 && (
                      <div className="border-t border-alerta/30 bg-alerta-claro/40 px-3.5 py-2 text-[12px] text-alerta flex items-center gap-2">
                        <TriangleAlert className="size-3.5 shrink-0" />
                        <span>Aviso deste profissional para {c.nome}: {restricoesConvenio.map((r) => r.texto).join(" | ")}</span>
                      </div>
                    )}

                    <div className="border-t border-borda/60 divide-y divide-borda/40">
                      {subs.map((s) => {
                        const podeC = p.atende[s.id]?.includes("c");
                        const podeE = p.atende[s.id]?.includes("e");
                        return (
                          <div key={s.id} className="flex items-center justify-between px-3.5 py-2 text-sm">
                            <span className="font-medium text-texto text-[13px]">{s.nome}</span>
                            <div className="flex items-center gap-2 text-[12px]">
                              {podeC && <span className="font-semibold text-verde">✓ Consulta</span>}
                              {podeE && <span className="font-semibold text-azul">✓ Exame</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {naoCobre.length > 0 && (
                      <div className="flex flex-wrap gap-1 border-t border-borda/60 px-3.5 py-2 bg-fundo/30">
                        {naoCobre.map((s) => (
                          <Chip key={s.id} tom="alerta">
                            {s.nome} · não atende
                          </Chip>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Convênios da clínica que este médico NÃO atende */}
              {resultadoBusca.filter((r) => !r.cobre.length).map(({ convenio: c }) => (
                <div key={c.id} className="flex items-center justify-between rounded-2xl border border-borda bg-fundo/40 p-3 text-sm">
                  <div className="flex items-center gap-2.5 opacity-60">
                    <LogoMarca nome={c.nome} logo={c.logo} cor={c.cor} tamanho="sm" />
                    <div>
                      <span className="font-semibold text-texto">{c.nome}</span>
                      <p className="text-xs text-suave">Este profissional não atende este convênio</p>
                    </div>
                  </div>
                  <span className="rounded-lg bg-borda/50 px-2 py-0.5 text-[12px] font-semibold text-suave">
                    Não atende
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      ) : (
        /* LISTA DIRETA E LIMPA DOS CONVÊNIOS ATENDIDOS */
        <div className="space-y-2.5 pt-1">
          {conveniosAtendidos.map(({ c, subs }) => {
            const restricoesConvenio = p.restricoes.filter((r) =>
              r.subtipoId ? c.subtipos.some((s) => s.id === r.subtipoId) : false
            );
            const todasConsultas = subs.every((s) => p.atende[s.id]?.includes("c"));
            const todosExames = subs.every((s) => p.atende[s.id]?.includes("e"));

            return (
              <div key={c.id} className="overflow-hidden rounded-2xl border border-borda bg-superficie shadow-sm transition-all hover:border-verde/40">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-fundo/40 px-3.5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <LogoMarca nome={c.nome} logo={c.logo} cor={c.cor} tamanho="sm" />
                    <span className="font-bold text-[14px] text-texto">{c.nome}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[12px]">
                    {todasConsultas && todosExames ? (
                      <span className="rounded-lg bg-verde-claro px-2.5 py-0.5 font-semibold text-verde">
                        Consulta e Exame
                      </span>
                    ) : todasConsultas ? (
                      <span className="rounded-lg bg-verde-claro px-2.5 py-0.5 font-semibold text-verde">
                        Consulta
                      </span>
                    ) : todosExames ? (
                      <span className="rounded-lg bg-azul-claro px-2.5 py-0.5 font-semibold text-azul">
                        Exame
                      </span>
                    ) : null}
                    <span className="rounded-lg bg-fundo px-2 py-0.5 font-medium text-suave">
                      {subs.length} {subs.length === 1 ? "rede" : "redes"}
                    </span>
                  </div>
                </div>

                {restricoesConvenio.length > 0 && (
                  <div className="border-t border-alerta/30 bg-alerta-claro/40 px-3.5 py-2 text-[12px] text-alerta flex items-center gap-2">
                    <TriangleAlert className="size-3.5 shrink-0" />
                    <span>Aviso: {restricoesConvenio.map((r) => r.texto).join(" | ")}</span>
                  </div>
                )}

                <div className="border-t border-borda/60 divide-y divide-borda/40">
                  {subs.map((s) => {
                    const podeC = p.atende[s.id]?.includes("c");
                    const podeE = p.atende[s.id]?.includes("e");
                    return (
                      <div key={s.id} className="flex items-center justify-between px-3.5 py-2 text-sm hover:bg-fundo/20">
                        <span className="font-medium text-texto text-[13px]">{s.nome}</span>
                        <div className="flex items-center gap-2 text-[12px]">
                          {podeC && (
                            <span className="font-semibold text-verde">✓ Consulta</span>
                          )}
                          {podeE && (
                            <span className="font-semibold text-azul">✓ Exame</span>
                          )}
                          {!podeC && !podeE && (
                            <span className="text-suave">Não atende</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
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
      {lista.length > 0 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-suave" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={`Buscar entre os ${lista.length} exames...`}
            className="h-9 w-full rounded-xl border border-borda bg-superficie pl-9 pr-8 text-sm outline-none transition focus:border-verde focus:ring-2 focus:ring-verde/15"
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
        <p className="text-[13px] text-suave py-2">Nenhum exame corresponde à busca &quot;{busca}&quot;.</p>
      )}
    </div>
  );
}
