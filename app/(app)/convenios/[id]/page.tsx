"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Copy,
  FlaskConical,
  Pencil,
  Plus,
  Search,
  Stethoscope,
  TriangleAlert,
  X,
} from "lucide-react";
import { useItemDeOutraUnidade, useStore, type Painel } from "@/lib/store";
import { atende, combina, conflitosPlanos, gruposPlanosDoConvenio, observacoesDoConvenio, resumoRedes } from "@/lib/regras";
import { salvarConvenio } from "@/lib/repositorio";
import type { Exame, GrupoPlano, GrupoPlanoStatus, Profissional, Tipo } from "@/lib/modelo";
import { Atualizado, Avatar, Botao, Chip, Filtro, LogoMarca, Segmentado, SeletorBusca, Vazio, useHoje } from "@/components/ui";

export default function PaginaConvenioDetalhes() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { dados, clinica, podeEditarAtual, abrirForm, abrir, executar, avisar } = useStore();

  const conv = dados.convenios.find((c) => c.id === id);
  const { semAcesso, trocando } = useItemDeOutraUnidade("convenios", id);

  const [aba, setAba] = useState<"planos" | "corpo">("planos");
  const [buscaPlano, setBuscaPlano] = useState("");
  const [subEscolhido, setSubId] = useState("");
  const [novaObs, setNovaObs] = useState("");
  const [adicionandoObs, setAdicionandoObs] = useState(false);

  const subId = conv?.subtipos.some((s) => s.id === subEscolhido) ? subEscolhido : conv?.subtipos[0]?.id ?? "";

  const conflitos = conv ? conflitosPlanos(conv, dados) : [];
  const grupos = useMemo(() => (conv ? gruposPlanosDoConvenio(conv) : []), [conv]);
  const observacoes = useMemo(() => (conv ? observacoesDoConvenio(conv) : []), [conv]);
  const redes = useMemo(() => (conv ? resumoRedes(conv, dados) : []), [conv, dados]);

  const quem = (tipo: Tipo) => dados.profissionais.filter((p) => atende(p, subId, tipo));
  const exames = dados.exames.filter((e) => e.subtipos.includes(subId));
  const esp = (p: Profissional) => dados.especialidades.find((e) => e.id === p.especialidadeId)?.nome;

  // texto para colar no atendimento: nome, observações gerais e grupos de planos
  const copiarRegras = async () => {
    if (!conv) return;
    const texto = [
      conv.nome,
      observacoes.length ? `Observações:\n${observacoes.map((o) => `- ${o}`).join("\n")}` : "",
      ...grupos.filter((g) => g.planos.length).map((g) => `${g.titulo}${g.nota ? ` (${g.nota})` : ""}:\n${g.planos.join(", ")}`),
    ].filter(Boolean).join("\n\n");
    try { await navigator.clipboard.writeText(texto); avisar("Regras copiadas"); } catch { avisar("Não foi possível copiar", true); }
  };

  if (!conv && trocando) return null;
  if (!conv) {
    return (
      <div className="entrar space-y-4">
        <Vazio texto={semAcesso ? "Você não tem acesso a esta unidade." : "Convênio não encontrado nesta unidade."} />
        <Link href="/convenios" className="pressionavel inline-flex items-center gap-2 font-semibold text-verde">
          <ArrowLeft className="size-4" />Voltar para convênios
        </Link>
      </div>
    );
  }

  const termo = buscaPlano.trim();
  const filtrarPlanos = (planos: string[]) => planos.filter((p) => combina(p, termo));

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
  const redesFiltradas = redes.filter((r) => combina(r.subtipo.nome, termo));
  const todosGruposVazios = !gAtende.planos.length && !gSomente.planos.length && !gNao.planos.length;

  const salvarNovaObservacao = () => {
    const texto = novaObs.trim();
    if (!texto) return;
    const novasObservacoes = [...observacoes, texto];
    const ok = executar(
      (b, u) => salvarConvenio(b, u, { ...conv, observacoesGerais: novasObservacoes }),
      "Observação adicionada com sucesso"
    );
    if (!ok) return;
    setNovaObs("");
    setAdicionandoObs(false);
  };

  const removerObservacao = (indice: number) => {
    const novasObservacoes = observacoes.filter((_, i) => i !== indice);
    executar(
      (b, u) => salvarConvenio(b, u, { ...conv, observacoesGerais: novasObservacoes }),
      "Observação removida",
      { desfazer: true, desfeito: "Exclusão desfeita" }
    );
  };



  return (
    <div className="space-y-6">
      {conflitos.length > 0 && (
        <div role="alert" className="flex items-start gap-2 rounded-2xl bg-alerta-claro px-4 py-3 text-sm font-medium text-alerta">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{conflitos.join(", ")} {conflitos.length === 1 ? "está" : "estão"} em “Não atendemos” ou “Somente exames”, mas {conflitos.length === 1 ? "aparece" : "aparecem"} com médico ou exame que contradiz o grupo. Confira o cadastro.</span>
        </div>
      )}
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
              {clinica && <p className="mt-0.5 text-sm font-medium text-suave">Regras válidas para a unidade {clinica.nome}</p>}
              <div className="mt-2"><Atualizado em={conv.atualizadoEm} por={conv.atualizadoPor} /></div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Botao variante="secundario" onClick={copiarRegras}><Copy className="size-4" />Copiar regras</Botao>
            {podeEditarAtual && (
              <Botao variante="secundario" onClick={() => abrirForm({ tipo: "convenio", id: conv.id })}>
                <Pencil className="size-4" />
                Editar convênio
              </Botao>
            )}
          </div>
        </div>
      </header>

      {/* Abas Superiores Segmentadas */}
      <div className="entrar max-w-md overflow-x-auto">
        <Segmentado
          valor={aba}
          onChange={setAba}
          opcoes={[
            { valor: "planos", rotulo: "Planos e redes" },
            { valor: "corpo", rotulo: "Corpo clínico e exames" },
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
              placeholder="Buscar rede ou plano da carteirinha..."
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
              {redesFiltradas.length} {redesFiltradas.length === 1 ? "rede" : "redes"} e {totalPlanosEncontrados} {totalPlanosEncontrados === 1 ? "plano" : "planos"} para &ldquo;{buscaPlano}&rdquo;
            </p>
          )}

          {/* Grid Principal: Planos Categorizados à Esquerda + Observações Rápidas à Direita */}
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* Coluna da Esquerda: Grupos de Status */}
            <div className="space-y-4">
              <div className="entrar rounded-3xl border border-borda bg-superficie p-5 shadow-card">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-bold text-texto">Redes cadastradas</h2>
                  <span className="text-[13px] font-semibold text-suave">{redesFiltradas.length} de {redes.length}</span>
                </div>
                {redes.length === 0 ? (
                  <p className="text-sm text-suave">Nenhuma rede cadastrada. Edite o convênio para incluir as redes da carteirinha.</p>
                ) : redesFiltradas.length === 0 ? (
                  <p className="text-sm text-suave">Nenhuma rede com &ldquo;{buscaPlano}&rdquo;.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {redesFiltradas.map((r) => {
                      const vinculo = r.consultas || r.exames
                        ? `${r.consultas} ${r.consultas === 1 ? "médico" : "médicos"} de consulta · ${r.exames} de exame`
                        : "sem médico";
                      return (
                        <button key={r.subtipo.id} type="button" onClick={() => { setSubId(r.subtipo.id); setAba("corpo"); }}
                          title="Ver quem atende nesta rede"
                          className={`pressionavel flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium shadow-sm transition ${r.consultas || r.exames ? "border-verde/30 bg-verde-claro/40 text-texto hover:border-verde" : "border-borda bg-fundo text-suave hover:border-alerta/60"}`}>
                          <span className="truncate">{r.subtipo.nome}</span>
                          <span className="shrink-0 text-xs text-suave">{vinculo}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {todosGruposVazios && !termo ? (
                <p className="px-2 text-sm text-suave">Os grupos da carteirinha (atende, somente exames, não atendemos) ainda não foram preenchidos.</p>
              ) : (
                [
                  { g: gAtende, lista: planosAtendeFiltrados, ponto: "bg-verde ring-verde/20", chip: "border-borda/80 bg-fundo text-texto hover:border-verde/50 hover:bg-superficie" },
                  { g: gSomente, lista: planosSomenteFiltrados, ponto: "bg-alerta ring-alerta/20", chip: "border-alerta/30 bg-alerta-claro text-texto hover:border-alerta/60" },
                  { g: gNao, lista: planosNaoFiltrados, ponto: "bg-perigo ring-perigo/20", chip: "border-perigo/30 bg-perigo-claro text-perigo line-through decoration-perigo/50 hover:border-perigo/60" },
                ].map(({ g, lista, ponto, chip }) => lista.length === 0 ? (
                  <p key={g.status} className="flex items-center gap-2.5 px-2 text-sm text-suave">
                    <span className={`size-2 rounded-full ring-4 ${ponto}`} />Nenhum plano em {g.titulo}
                  </p>
                ) : (
                  <div key={g.status} className="entrar rounded-3xl border border-borda bg-superficie p-5 shadow-card">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className={`size-2.5 rounded-full ring-4 ${ponto}`} />
                        <h2 className="text-base font-bold text-texto">{g.titulo}</h2>
                      </div>
                      <span className="text-[13px] font-semibold text-suave">{lista.length} {lista.length === 1 ? "plano" : "planos"}</span>
                    </div>
                    {g.nota && (
                      <div className="mb-3.5 flex items-center gap-2 rounded-xl bg-alerta-claro px-3 py-1.5 text-[13px] font-medium text-alerta ring-1 ring-alerta/20">
                        <TriangleAlert className="size-3.5 shrink-0 text-alerta" />
                        <span>{g.nota}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {lista.map((plano) => (
                        <span key={plano} className={`inline-flex items-center rounded-xl border px-3.5 py-1.5 text-sm font-medium shadow-sm transition ${chip}`}>{plano}</span>
                      ))}
                    </div>
                  </div>
                ))
              )}
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
                      className="inline-flex items-center gap-1 text-[13px] font-semibold text-verde hover:underline"
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
                      className="w-full rounded-xl border border-borda bg-superficie p-2.5 text-[13px] outline-none focus:border-verde"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAdicionandoObs(false);
                          setNovaObs("");
                        }}
                        className="rounded-lg px-2.5 py-1 text-[13px] font-semibold text-suave hover:bg-superficie"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={salvarNovaObservacao}
                        className="rounded-lg bg-verde px-3 py-1 text-[13px] font-semibold text-white hover:brightness-105"
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
                        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-alerta" />
                        <span className="flex-1 text-sm font-medium leading-relaxed text-texto">{obs}</span>
                        {podeEditarAtual && (
                          <button
                            type="button"
                            onClick={() => removerObservacao(i)}
                            aria-label="Remover observação"
                            className="text-suave opacity-0 transition focus-visible:opacity-100 group-hover:opacity-100 hover:text-alerta"
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

      {/* Visualização 3: Corpo Clínico & Exames Cobertos por Rede */}
      {aba === "corpo" && (
        <div className="entrar space-y-6">
          <div>
            <p className="mb-2 text-sm font-semibold text-suave">Rede ou plano:</p>
            {conv.subtipos.length > 0 ? (
              <div className="max-w-xl">
                {conv.subtipos.length > 6 ? (
                  // o "vazio" da lista é a primeira rede, que é o padrão quando nada foi escolhido
                  <SeletorBusca valor={subId === conv.subtipos[0].id ? "" : subId} onChange={setSubId} vazio={conv.subtipos[0].nome} placeholder="Buscar rede..."
                    atual={<span className="font-medium text-texto">{conv.subtipos.find((x) => x.id === subId)?.nome}</span>}
                    opcoes={conv.subtipos.slice(1).map((x) => ({ id: x.id, texto: x.nome, rotulo: x.nome }))} largo={false} />
                ) : (
                  <Segmentado valor={subId} onChange={setSubId} opcoes={conv.subtipos.map((x) => ({ valor: x.id, rotulo: x.nome }))} />
                )}
              </div>
            ) : (
              <Vazio texto="Nenhuma rede cadastrada." />
            )}
          </div>

          <div key={subId} className="grid gap-6 md:grid-cols-2">
            <BlocoProfissionaisRede tipo="consulta" profissionais={quem("consulta")} esp={esp} />
            <BlocoProfissionaisRede tipo="exame" profissionais={quem("exame")} esp={esp} />
          </div>

          <BlocoExamesRede exames={exames} abrir={abrir} />
        </div>
      )}
    </div>
  );
}

function BlocoProfissionaisRede({
  tipo,
  profissionais,
  esp,
}: {
  tipo: Tipo;
  profissionais: Profissional[];
  esp: (p: Profissional) => string | undefined;
}) {
  const [busca, setBusca] = useState("");
  const q = busca.trim();
  const ehConsulta = tipo === "consulta";

  const filtrados = useMemo(() => {
    if (!q) return profissionais;
    return profissionais.filter((p) => combina(p.nome, q) || combina(esp(p) ?? "", q));
  }, [profissionais, esp, q]);

  const hoje = useHoje();

  return (
    <div className="rounded-3xl border border-borda bg-superficie p-5 shadow-card space-y-3">
      <div className="flex items-center gap-2 font-bold">
        <span
          className={`grid size-8 place-items-center rounded-lg ${
            ehConsulta ? "bg-verde-claro text-verde" : "bg-azul-claro text-azul"
          }`}
        >
          {ehConsulta ? <Stethoscope className="size-4" /> : <FlaskConical className="size-4" />}
        </span>
        <h3 className="text-base font-bold text-texto">
          {ehConsulta ? "Profissionais para consulta" : "Profissionais para exames"}
        </h3>
        <span className="ml-auto text-sm font-medium text-suave">{profissionais.length}</span>
      </div>

      {profissionais.length > 3 && <Filtro valor={busca} onChange={setBusca} placeholder="Pesquisar por nome ou especialidade" />}

      {profissionais.length ? (
        filtrados.length ? (
          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
            {filtrados.map((p, i) => {
              const atendeHoje = !!hoje && p.horarios.some((h) => h.dia === hoje);
              return (
                <Link
                  key={p.id}
                  href={`/profissionais/${p.id}`}
                  style={{ "--i": Math.min(i, 10) } as React.CSSProperties}
                  className="entrar pressionavel group flex w-full items-center gap-3 rounded-2xl border border-borda/60 bg-superficie px-3 py-2.5 text-left transition hover:border-verde/40 hover:bg-verde-claro/20"
                >
                  <Avatar nome={p.nome} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-sm text-texto">{p.nome}</span>
                    <span className="block text-xs text-suave">{esp(p)}</span>
                  </span>
                  {atendeHoje && (
                    <Chip tom="verde">
                      <span className="pulso size-1.5 rounded-full bg-verde" /> Atende hoje
                    </Chip>
                  )}
                  {p.restricoes.length > 0 && (
                    <TriangleAlert className="size-4 text-alerta shrink-0" aria-label="Tem restrição" />
                  )}
                  <ChevronRight className="size-4 text-suave/50 transition-transform group-hover:translate-x-0.5" />
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="py-2 text-center text-xs text-suave">Nenhum profissional com &ldquo;{busca}&rdquo; nesta rede.</p>
        )
      ) : (
        <Vazio texto={ehConsulta ? "Nenhum profissional para consulta nesta rede." : "Nenhum profissional para exames nesta rede."} />
      )}
    </div>
  );
}

function BlocoExamesRede({ exames, abrir }: { exames: Exame[]; abrir: (p: Painel) => void }) {
  const [busca, setBusca] = useState("");
  const q = busca.trim();
  const filtrados = useMemo(() => {
    if (!q) return exames;
    return exames.filter((e) => combina(e.nome, q));
  }, [exames, q]);

  return (
    <div className="rounded-3xl border border-borda bg-superficie p-6 shadow-card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-texto">Exames cobertos nesta rede</h3>
        <span className="text-sm font-medium text-suave">{exames.length}</span>
      </div>
      {exames.length > 3 && <Filtro valor={busca} onChange={setBusca} placeholder={`Buscar entre os ${exames.length} exames cobertos`} />}
      {exames.length > 0 ? (
        filtrados.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {filtrados.map((e) => (
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
          <p className="py-2 text-center text-xs text-suave">Nenhum exame encontrado com &ldquo;{busca}&rdquo;.</p>
        )
      ) : (
        <Vazio texto="Nenhum exame credenciado nesta rede." />
      )}
    </div>
  );
}
