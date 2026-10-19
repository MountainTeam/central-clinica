"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ViewTransition, useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronDown, ChevronRight, ClipboardList, Clock, Copy, FlaskConical, NotebookPen, Pencil, ShieldCheck, TriangleAlert, X } from "lucide-react";
import { useItemDeOutraUnidade, useStore } from "@/lib/store";
import { DIAS, type DadosClinica, type Profissional } from "@/lib/modelo";
import { atende, coberturaDaBusca, combina, gruposHorarios, subtipoInfo } from "@/lib/regras";
import { salvarProfissional } from "@/lib/repositorio";
import { Atualizado, Avatar, Botao, Chip, Filtro, Icone, LogoMarca, ObservacaoInterna, Secao, Vazio, iconeDaEspecialidade, useHoje } from "@/components/ui";
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
  const { dados, podeEditarAtual, abrir, abrirForm, executar, avisar, plano } = useStore();
  const [editando, setEditando] = useState<"horarios" | "obs" | null>(null);
  const hoje = useHoje();
  // a pergunta da ligação: este médico atende o plano do paciente?
  const infoPlano = plano ? subtipoInfo(dados, plano.subtipoId) : undefined;
  const atendePlano = !!plano && atende(p, plano.subtipoId, plano.tipo);
  const restricoesDoPlano = plano ? p.restricoes.filter((r) => r.subtipoId === plano.subtipoId) : [];

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
      p.valor ? `Valor particular: ${p.valor}` : "",
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
        <ViewTransition name={`avatar-${p.id}`}><Avatar nome={p.nome} grande /></ViewTransition>
        <div className="min-w-0 flex-1">
          <ViewTransition name={`nome-${p.id}`}><h1 className="text-[28px] font-bold leading-tight tracking-tight">{p.nome}</h1></ViewTransition>
          <div className="mt-2 flex flex-wrap gap-2">
            {esp && <Chip tom="verde"><Icone nome={iconeDaEspecialidade(esp)} className="size-3.5" />{esp.nome}</Chip>}
            {p.idadeMinima && <Chip>A partir de {p.idadeMinima} anos</Chip>}
            {hoje && (atendeHoje
              ? <Chip tom="verde"><span className="pulso size-1.5 rounded-full bg-verde" />Atende hoje · {atendeHoje.inicio}–{atendeHoje.fim}</Chip>
              : <Chip>Não atende hoje</Chip>)}
          </div>
          {plano && infoPlano && (
            <div className="mt-2 flex flex-wrap gap-2">
              {atendePlano
                ? <Chip tom="verde"><Check className="size-3.5" />Atende {infoPlano.subtipo.nome} para {plano.tipo === "consulta" ? "consulta" : "exame"}</Chip>
                : <Chip tom="perigo"><X className="size-3.5" />Não atende {infoPlano.subtipo.nome} para {plano.tipo === "consulta" ? "consulta" : "exame"}</Chip>}
              {restricoesDoPlano.map((r, k) => <Chip key={k} tom="alerta"><TriangleAlert className="size-3.5 shrink-0" />{r.texto}</Chip>)}
            </div>
          )}
          {/* só quando cadastrado: a maioria dos médicos fica sem valor por um bom tempo */}
          {p.valor && <p className="mt-2 text-sm text-suave">Particular: <b className="text-base text-verde">{p.valor}</b></p>}
          <div className="mt-2"><Atualizado em={p.atualizadoEm} por={p.atualizadoPor} /></div>
        </div>
        <Botao variante="secundario" onClick={copiar}><Copy className="size-4" />Copiar</Botao>
        {admin && <Botao variante="secundario" onClick={() => abrirForm({ tipo: "profissional", id: p.id })}><Pencil className="size-4" />Editar ficha</Botao>}
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {p.restricoes.length > 0 && (
            <div className={`${cartao} border-alerta/30 bg-alerta-claro/60`}>
              <Secao titulo="Restrições" icone={<TriangleAlert className="size-4" />} i={2}>
                <ul className="space-y-2">
                  {p.restricoes.map((r, k) => {
                    const info = r.subtipoId ? subtipoInfo(dados, r.subtipoId) : undefined;
                    return (
                      <li key={k} className="flex gap-3 rounded-2xl bg-superficie/80 px-4 py-3 text-[15px] font-medium text-alerta">
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

          {/* sem observação e sem permissão para escrever, o cartão não tem o que mostrar */}
          {(admin || p.observacoes || p.observacoesInternas) && <div className={`entrar ${cartao}`} style={{ "--i": 3 } as React.CSSProperties}>
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
              <Vazio texto="Nenhuma observação." />
            )}
            {editando !== "obs" && <div className="mt-3"><ObservacaoInterna texto={p.observacoesInternas} /></div>}
          </div>}
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
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});

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
          <p className="mt-2 text-sm font-bold text-verde">Valor da consulta: {p.valor}</p>
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
      <Filtro valor={busca} onChange={setBusca} placeholder={`Buscar convênio ou plano do paciente (${formatContagem()})`} />

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
        /* Lista dos convênios atendidos. Convênio uniforme (todas as redes iguais) começa recolhido:
           abrir rede por rede só vale quando há exceção. */
        <div className="space-y-2.5 pt-1">
          {conveniosAtendidos.map(({ c, subs }) => {
            const restricoesConvenio = p.restricoes.filter((r) =>
              r.subtipoId ? c.subtipos.some((s) => s.id === r.subtipoId) : false
            );
            const todasConsultas = subs.every((s) => p.atende[s.id]?.includes("c"));
            const todosExames = subs.every((s) => p.atende[s.id]?.includes("e"));
            const todasRedes = subs.length === c.subtipos.length;
            const uniforme = new Set(subs.map((s) => p.atende[s.id])).size === 1;
            const listaAberta = !uniforme || abertos[c.id];
            const rotulo = todasConsultas && todosExames ? "Consulta e Exame" : todasConsultas ? "Consulta" : todosExames ? "Exame" : null;

            return (
              <div key={c.id} className="overflow-hidden rounded-2xl border border-borda bg-superficie shadow-sm transition-all hover:border-verde/40">
                <button type="button" aria-expanded={listaAberta} disabled={!uniforme}
                  onClick={() => setAbertos((a) => ({ ...a, [c.id]: !a[c.id] }))}
                  className="flex w-full flex-wrap items-center justify-between gap-2 bg-fundo/40 px-3.5 py-2.5 text-left enabled:hover:bg-fundo/70">
                  <span className="flex items-center gap-2.5">
                    <LogoMarca nome={c.nome} logo={c.logo} cor={c.cor} tamanho="sm" />
                    <span className="font-bold text-[14px] text-texto">{c.nome}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-[12px]">
                    {rotulo && (
                      <span className={`rounded-lg px-2.5 py-0.5 font-semibold ${rotulo === "Exame" ? "bg-azul-claro text-azul" : "bg-verde-claro text-verde"}`}>{rotulo}</span>
                    )}
                    <span className="rounded-lg bg-fundo px-2 py-0.5 font-medium text-suave">
                      {todasRedes ? `todas as ${subs.length} redes` : `${subs.length} de ${c.subtipos.length} redes`}
                    </span>
                    {uniforme && <ChevronDown className={`size-4 text-suave transition-transform duration-200 ${listaAberta ? "rotate-180" : ""}`} />}
                  </span>
                </button>

                {restricoesConvenio.length > 0 && (
                  <div className="border-t border-alerta/30 bg-alerta-claro/40 px-3.5 py-2 text-[12px] text-alerta flex items-center gap-2">
                    <TriangleAlert className="size-3.5 shrink-0" />
                    <span>Aviso: {restricoesConvenio.map((r) => r.texto).join(" | ")}</span>
                  </div>
                )}

                <div className="desdobra" data-aberta={listaAberta} inert={!listaAberta}><div>
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
                </div></div>
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
      {lista.length > 3 && <Filtro valor={busca} onChange={setBusca} placeholder={`Buscar entre os ${lista.length} exames`} />}

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
