"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  FlaskConical,
  Pencil,
  Plus,
  Search,
  Stethoscope,
  TriangleAlert,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { atende, gruposPlanosDoConvenio, observacoesDoConvenio, semAcento } from "@/lib/regras";
import { salvarConvenio } from "@/lib/repositorio";
import type { GrupoPlano, GrupoPlanoStatus, Profissional, Tipo } from "@/lib/modelo";
import { Avatar, Botao, LogoMarca, Segmentado, Vazio } from "@/components/ui";

export default function PaginaConvenioDetalhes() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { dados, clinica, podeEditarAtual, abrirForm, abrir, executar, avisar } = useStore();

  const conv = dados.convenios.find((c) => c.id === id);

  const [aba, setAba] = useState<"planos" | "observacoes" | "corpo">("planos");
  const [buscaPlano, setBuscaPlano] = useState("");
  const [subEscolhido, setSubId] = useState("");
  const [novaObs, setNovaObs] = useState("");
  const [adicionandoObs, setAdicionandoObs] = useState(false);

  const subId = conv?.subtipos.some((s) => s.id === subEscolhido) ? subEscolhido : conv?.subtipos[0]?.id ?? "";

  const grupos = useMemo(() => (conv ? gruposPlanosDoConvenio(conv) : []), [conv]);
  const observacoes = useMemo(() => (conv ? observacoesDoConvenio(conv) : []), [conv]);

  const quem = (tipo: Tipo) => dados.profissionais.filter((p) => atende(p, subId, tipo));
  const exames = dados.exames.filter((e) => e.subtipos.includes(subId));
  const esp = (p: Profissional) => dados.especialidades.find((e) => e.id === p.especialidadeId)?.nome;

  if (!conv) {
    return (
      <div className="entrar space-y-4">
        <Vazio texto="Convênio não encontrado nesta unidade." />
        <Link href="/convenios" className="pressionavel inline-flex items-center gap-2 font-semibold text-verde">
          <ArrowLeft className="size-4" />Voltar para convênios
        </Link>
      </div>
    );
  }

  const termo = semAcento(buscaPlano.trim());

  const filtrarPlanos = (planos: string[]) => {
    if (!termo) return planos;
    return planos.filter((p) => semAcento(p).includes(termo));
  };

  const gAtende = grupos.find((g) => g.status === "atende") ?? {
    status: "atende" as GrupoPlanoStatus,
    titulo: "Atende consultas e exames",
    planos: [],
  };
  const gSomente = grupos.find((g) => g.status === "somente_exames") ?? {
    status: "somente_exames" as GrupoPlanoStatus,
    titulo: "Somente exames",
    nota: "Não precisa de encaminhamento para a clínica",
    planos: [],
  };
  const gNao = grupos.find((g) => g.status === "nao_atende") ?? {
    status: "nao_atende" as GrupoPlanoStatus,
    titulo: "Não atendemos",
    planos: [],
  };

  const planosAtendeFiltrados = filtrarPlanos(gAtende.planos);
  const planosSomenteFiltrados = filtrarPlanos(gSomente.planos);
  const planosNaoFiltrados = filtrarPlanos(gNao.planos);

  const totalPlanosEncontrados =
    planosAtendeFiltrados.length + planosSomenteFiltrados.length + planosNaoFiltrados.length;

  const salvarNovaObservacao = () => {
    const texto = novaObs.trim();
    if (!texto) return;
    const novasObservacoes = [...observacoes, texto];
    executar(
      (b, u) => salvarConvenio(b, u, { ...conv, observacoesGerais: novasObservacoes }),
      "Observação adicionada com sucesso"
    );
    setNovaObs("");
    setAdicionandoObs(false);
  };

  const removerObservacao = (indice: number) => {
    const novasObservacoes = observacoes.filter((_, i) => i !== indice);
    executar(
      (b, u) => salvarConvenio(b, u, { ...conv, observacoesGerais: novasObservacoes }),
      "Observação removida"
    );
  };

  const listaProfissionais = (tipo: Tipo) => {
    const l = quem(tipo);
    return (
      <div className="rounded-3xl border border-borda bg-superficie p-5 shadow-card">
        <h3 className="mb-4 flex items-center gap-2 font-bold">
          <span
            className={`grid size-8 place-items-center rounded-lg ${
              tipo === "consulta" ? "bg-verde-claro text-verde" : "bg-azul-claro text-azul"
            }`}
          >
            {tipo === "consulta" ? <Stethoscope className="size-4" /> : <FlaskConical className="size-4" />}
          </span>
          {tipo === "consulta" ? "Consultas credenciadas" : "Exames credenciados"}
          <span className="ml-auto text-sm font-medium text-suave">{l.length}</span>
        </h3>
        {l.length ? (
          <div className="space-y-1">
            {l.map((p, i) => (
              <Link
                key={p.id}
                href={`/profissionais/${p.id}`}
                style={{ "--i": i } as React.CSSProperties}
                className="entrar pressionavel group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-fundo"
              >
                <Avatar nome={p.nome} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{p.nome}</span>
                  <span className="text-sm text-suave">{esp(p)}</span>
                </span>
                {p.restricoes.length > 0 && <TriangleAlert className="size-4 text-alerta" aria-label="Tem restrição" />}
                <ChevronRight className="size-4 text-suave/50 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        ) : (
          <Vazio texto="Nenhum profissional nesta rede." />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Migalha de Pão (Breadcrumb) */}
      <nav className="entrar flex items-center gap-2 text-sm text-suave" aria-label="Breadcrumb">
        <Link href="/convenios" className="font-medium transition-colors hover:text-texto">
          Convênios
        </Link>
        <span>/</span>
        <span className="font-semibold text-texto">{conv.nome}</span>
      </nav>

      {/* Cartão de Cabeçalho Principal */}
      <header className="entrar rounded-3xl border border-borda bg-superficie p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <LogoMarca nome={conv.nome} logo={conv.logo} cor={conv.cor} tamanho="lg" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-texto sm:text-3xl">{conv.nome}</h1>
              <p className="mt-0.5 text-sm font-medium text-suave">
                Regras válidas para a unidade {clinica?.nome ?? "COMN"}
              </p>
            </div>
          </div>
          {podeEditarAtual && (
            <Botao variante="secundario" onClick={() => abrirForm({ tipo: "convenio", id: conv.id })}>
              <Pencil className="size-4" />
              Editar convênio
            </Botao>
          )}
        </div>
      </header>

      {/* Abas Superiores Segmentadas */}
      <div className="entrar max-w-md">
        <Segmentado
          valor={aba}
          onChange={setAba}
          opcoes={[
            { valor: "planos", rotulo: "Planos e redes" },
            {
              valor: "observacoes",
              rotulo: `Observações gerais ${observacoes.length ? `(${observacoes.length})` : ""}`,
            },
            { valor: "corpo", rotulo: "Corpo clínico & exames" },
          ]}
        />
      </div>

      {/* Visualização 1: Planos e Redes (com cards laterais e busca da carteirinha) */}
      {aba === "planos" && (
        <div className="space-y-5">
          {/* Campo de Busca Rápida da Carteirinha */}
          <div className="entrar relative max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-suave" />
            <input
              type="text"
              value={buscaPlano}
              onChange={(e) => setBuscaPlano(e.target.value)}
              placeholder="Buscar plano da carteirinha..."
              className="h-12 w-full rounded-2xl border border-borda bg-superficie pl-11 pr-10 text-[15px] outline-none transition focus:border-verde focus:ring-4 focus:ring-verde/15"
            />
            {buscaPlano && (
              <button
                type="button"
                onClick={() => setBuscaPlano("")}
                aria-label="Limpar busca"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-suave hover:text-texto"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {termo && (
            <p className="text-xs font-semibold uppercase tracking-wider text-suave">
              {totalPlanosEncontrados} {totalPlanosEncontrados === 1 ? "plano encontrado" : "planos encontrados"} para &ldquo;{buscaPlano}&rdquo;
            </p>
          )}

          {/* Grid Principal: Planos Categorizados à Esquerda + Observações Rápidas à Direita */}
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* Coluna da Esquerda: Grupos de Status */}
            <div className="space-y-4">
              {/* Card 1: Atende Consultas e Exames (Verde) */}
              <div className="entrar rounded-3xl border border-borda bg-superficie p-5 shadow-card transition-shadow hover:shadow-md">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="size-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                    <h2 className="text-base font-bold text-texto">{gAtende.titulo}</h2>
                  </div>
                  <span className="text-xs font-semibold text-suave">
                    {planosAtendeFiltrados.length} {planosAtendeFiltrados.length === 1 ? "plano" : "planos"}
                  </span>
                </div>

                {planosAtendeFiltrados.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {planosAtendeFiltrados.map((plano) => (
                      <span
                        key={plano}
                        className="inline-flex items-center rounded-xl border border-borda/80 bg-fundo px-3.5 py-1.5 text-sm font-medium text-texto shadow-sm transition hover:border-verde/50 hover:bg-superficie"
                      >
                        {plano}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-suave">
                    {termo ? "Nenhum plano neste grupo corresponde à busca." : "Nenhum plano cadastrado."}
                  </p>
                )}
              </div>

              {/* Card 2: Somente Exames (Âmbar) */}
              <div className="entrar rounded-3xl border border-borda bg-superficie p-5 shadow-card transition-shadow hover:shadow-md">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="size-2.5 rounded-full bg-amber-500 ring-4 ring-amber-500/20" />
                    <h2 className="text-base font-bold text-texto">{gSomente.titulo}</h2>
                  </div>
                  <span className="text-xs font-semibold text-suave">
                    {planosSomenteFiltrados.length} {planosSomenteFiltrados.length === 1 ? "plano" : "planos"}
                  </span>
                </div>

                {gSomente.nota && (
                  <div className="mb-3.5 flex items-center gap-2 rounded-xl bg-amber-50/70 px-3 py-1.5 text-xs font-medium text-amber-800 ring-1 ring-amber-500/20">
                    <TriangleAlert className="size-3.5 shrink-0 text-amber-600" />
                    <span>{gSomente.nota}</span>
                  </div>
                )}

                {planosSomenteFiltrados.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {planosSomenteFiltrados.map((plano) => (
                      <span
                        key={plano}
                        className="inline-flex items-center rounded-xl border border-amber-200/80 bg-amber-50/40 px-3.5 py-1.5 text-sm font-medium text-amber-950 shadow-sm transition hover:border-amber-300"
                      >
                        {plano}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-suave">
                    {termo ? "Nenhum plano neste grupo corresponde à busca." : "Nenhum plano cadastrado."}
                  </p>
                )}
              </div>

              {/* Card 3: Não Atendemos (Vermelho / Riscado) */}
              <div className="entrar rounded-3xl border border-borda bg-superficie p-5 shadow-card transition-shadow hover:shadow-md">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="size-2.5 rounded-full bg-rose-500 ring-4 ring-rose-500/20" />
                    <h2 className="text-base font-bold text-texto">{gNao.titulo}</h2>
                  </div>
                  <span className="text-xs font-semibold text-suave">
                    {planosNaoFiltrados.length} {planosNaoFiltrados.length === 1 ? "plano" : "planos"}
                  </span>
                </div>

                {planosNaoFiltrados.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {planosNaoFiltrados.map((plano) => (
                      <span
                        key={plano}
                        className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50/80 px-3.5 py-1.5 text-sm font-medium text-rose-800 line-through decoration-rose-400 shadow-sm transition hover:border-rose-300"
                      >
                        {plano}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-suave">
                    {termo ? "Nenhum plano neste grupo corresponde à busca." : "Nenhum plano cadastrado."}
                  </p>
                )}
              </div>
            </div>

            {/* Coluna da Direita: Card Fixo de Observações Gerais */}
            <div>
              <div className="entrar sticky top-6 rounded-3xl border border-borda bg-superficie p-5 shadow-card">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-bold text-texto">Observações gerais</h2>
                  {podeEditarAtual && !adicionandoObs && (
                    <button
                      type="button"
                      onClick={() => setAdicionandoObs(true)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-verde hover:underline"
                    >
                      <Plus className="size-3.5" /> Adicionar
                    </button>
                  )}
                </div>

                {adicionandoObs && (
                  <div className="mb-4 space-y-2 rounded-2xl border border-verde/30 bg-verde-claro/30 p-3">
                    <textarea
                      value={novaObs}
                      onChange={(e) => setNovaObs(e.target.value)}
                      placeholder="Ex.: Biópsia: apenas autorização do procedimento..."
                      rows={2}
                      className="w-full rounded-xl border border-borda bg-superficie p-2.5 text-xs outline-none focus:border-verde"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAdicionandoObs(false);
                          setNovaObs("");
                        }}
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-suave hover:bg-superficie"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={salvarNovaObservacao}
                        className="rounded-lg bg-verde px-3 py-1 text-xs font-semibold text-white hover:brightness-105"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                )}

                {observacoes.length > 0 ? (
                  <div className="space-y-3">
                    {observacoes.map((obs, i) => (
                      <div
                        key={i}
                        className="group flex items-start gap-3 rounded-2xl border border-borda/60 bg-fundo/70 p-3.5 transition hover:bg-fundo"
                      >
                        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
                        <span className="flex-1 text-sm font-medium leading-relaxed text-texto">{obs}</span>
                        {podeEditarAtual && (
                          <button
                            type="button"
                            onClick={() => removerObservacao(i)}
                            aria-label="Remover observação"
                            className="text-suave opacity-0 transition group-hover:opacity-100 hover:text-alerta"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-suave">Nenhuma observação cadastrada para este convênio.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visualização 2: Aba Completa de Observações Gerais */}
      {aba === "observacoes" && (
        <div className="entrar max-w-3xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-texto">Instruções e Regras de Atendimento</h2>
              <p className="text-sm text-suave">
                Diretrizes operacionais para recepção e agendamento na unidade {clinica?.nome ?? "COMN"}.
              </p>
            </div>
            {podeEditarAtual && (
              <Botao onClick={() => setAdicionandoObs(true)}>
                <Plus className="size-4" /> Nova observação
              </Botao>
            )}
          </div>

          {adicionandoObs && (
            <div className="rounded-3xl border border-verde/40 bg-superficie p-5 shadow-card">
              <h3 className="mb-2 text-sm font-bold">Cadastrar nova regra operacional</h3>
              <textarea
                value={novaObs}
                onChange={(e) => setNovaObs(e.target.value)}
                placeholder="Ex.: Procedimentos ginecológicos não precisam de pacote..."
                rows={3}
                className="w-full rounded-2xl border border-borda bg-fundo p-3 text-sm outline-none focus:border-verde focus:ring-4 focus:ring-verde/15"
              />
              <div className="mt-3 flex justify-end gap-2">
                <Botao
                  variante="secundario"
                  onClick={() => {
                    setAdicionandoObs(false);
                    setNovaObs("");
                  }}
                >
                  Cancelar
                </Botao>
                <Botao onClick={salvarNovaObservacao}>Salvar observação</Botao>
              </div>
            </div>
          )}

          {observacoes.length > 0 ? (
            <div className="space-y-3">
              {observacoes.map((obs, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 rounded-3xl border border-borda bg-superficie p-5 shadow-card"
                >
                  <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-amber-500/10 text-amber-600">
                    <TriangleAlert className="size-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-texto leading-relaxed">{obs}</p>
                    <p className="mt-1 text-xs text-suave">Regra ativa para atendimento presencial e recepção</p>
                  </div>
                  {podeEditarAtual && (
                    <button
                      type="button"
                      onClick={() => removerObservacao(i)}
                      className="rounded-lg p-1.5 text-suave hover:bg-fundo hover:text-alerta"
                      title="Excluir regra"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Vazio texto="Nenhuma regra operacional cadastrada para este convênio." />
          )}
        </div>
      )}

      {/* Visualização 3: Corpo Clínico & Exames Cobertos por Rede */}
      {aba === "corpo" && (
        <div className="entrar space-y-6">
          <div>
            <p className="mb-2 text-sm font-semibold text-suave">Selecione o tipo de rede técnica:</p>
            {conv.subtipos.length > 0 ? (
              <div className="max-w-xl">
                <Segmentado
                  valor={subId}
                  onChange={setSubId}
                  opcoes={conv.subtipos.map((s) => ({ valor: s.id, rotulo: s.nome }))}
                />
              </div>
            ) : (
              <Vazio texto="Nenhuma rede técnica vinculada." />
            )}
          </div>

          <div key={subId} className="grid gap-6 md:grid-cols-2">
            {listaProfissionais("consulta")}
            {listaProfissionais("exame")}
          </div>

          <div className="rounded-3xl border border-borda bg-superficie p-6 shadow-card">
            <h3 className="mb-3 text-base font-bold text-texto">Exames credenciados nesta rede</h3>
            {exames.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {exames.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => abrir({ tipo: "exame", id: e.id })}
                    className="pressionavel rounded-xl bg-azul-claro px-3.5 py-2 text-sm font-semibold text-azul transition hover:brightness-95"
                  >
                    {e.nome}
                  </button>
                ))}
              </div>
            ) : (
              <Vazio texto="Nenhum exame credenciado nesta rede técnica." />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
