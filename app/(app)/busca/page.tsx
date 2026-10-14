"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronRight,
  FlaskConical,
  LayoutGrid,
  Search,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  TriangleAlert,
  UserRound,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { atende, combina, gruposPlanosDoConvenio, idsDeRedes, observacoesDoConvenio, pontuacao, resumoHorarios, subtipoInfo } from "@/lib/regras";
import type { DadosClinica, Tipo } from "@/lib/modelo";
import { Avatar, CartaoProfissional, Chip, Icone, LogoMarca, Segmentado, SeletorConvenio, TipoBadge, Vazio } from "@/components/ui";

function Contador({ valor }: { valor: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return setN(valor);
    const inicio = performance.now();
    let raf = 0;
    const passo = (t: number) => {
      const k = Math.min((t - inicio) / 900, 1);
      setN(Math.round(valor * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [valor]);
  return <>{n}</>;
}

type Secao = "especialidades" | "profissionais" | "convenios" | "exames";

export default function BuscaRapida() {
  const { dados, abrir } = useStore();
  const [texto, setTexto] = useState("");
  const [subtipo, setSubtipo] = useState("");
  const [tipo, setTipo] = useState<Tipo>("consulta");
  const [esp, setEsp] = useState("");
  const [secaoAtiva, setSecaoAtiva] = useState<Secao | null>("profissionais");
  const campo = useRef<HTMLInputElement>(null);

  // Tecla "/" foca a busca automaticamente
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        campo.current?.focus();
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, []);

  const q = texto.trim();
  const validos = idsDeRedes(dados);
  const ordenar = <T,>(lista: T[], textoDe: (x: T) => string) =>
    q ? [...lista].sort((a, b) => pontuacao(textoDe(b), q) - pontuacao(textoDe(a), q)) : lista;
  const nomeEsp = (id: string) => dados.especialidades.find((e) => e.id === id)?.nome ?? "";

  // 1. Filtro de Profissionais
  const textoProfissional = (p: (typeof dados.profissionais)[number]) => {
    const exames = p.exames.map((id) => dados.exames.find((e) => e.id === id)?.nome ?? "");
    return [p.nome, nomeEsp(p.especialidadeId), ...p.procedimentos, ...exames].join(" ");
  };
  const profissionaisFiltrados = ordenar(
    dados.profissionais.filter((p) => {
      if (esp && p.especialidadeId !== esp) return false;
      if (subtipo && !atende(p, subtipo, tipo)) return false;
      return combina(textoProfissional(p), q);
    }),
    textoProfissional,
  );

  // 2. Filtro de Especialidades
  const textoEspecialidade = (e: (typeof dados.especialidades)[number]) =>
    [e.nome, ...dados.profissionais.filter((p) => p.especialidadeId === e.id).map((p) => p.nome)].join(" ");
  const especialidadesFiltradas = ordenar(
    dados.especialidades.filter((e) => (!esp || e.id === esp) && combina(textoEspecialidade(e), q)),
    textoEspecialidade,
  );

  // 3. Filtro de Convênios
  const textoConvenio = (c: (typeof dados.convenios)[number]) => {
    const planos = gruposPlanosDoConvenio(c).flatMap((g) => g.planos);
    return [c.nome, ...c.subtipos.map((s) => s.nome), ...planos, ...observacoesDoConvenio(c)].join(" ");
  };
  const conveniosFiltrados = ordenar(dados.convenios.filter((c) => combina(textoConvenio(c), q)), (c) => `${c.nome} ${c.subtipos.map((s) => s.nome).join(" ")}`);

  // 4. Filtro de Exames
  const textoExame = (e: (typeof dados.exames)[number]) =>
    [e.nome, ...e.preparo, e.documentos, ...dados.profissionais.filter((p) => p.exames.includes(e.id)).map((p) => p.nome)].join(" ");
  const examesFiltrados = ordenar(
    dados.exames.filter((e) => (!subtipo || e.subtipos.includes(subtipo)) && combina(textoExame(e), q)),
    (e) => e.nome,
  );

  const info = subtipo ? subtipoInfo(dados, subtipo) : undefined;
  const filtrando = !!(q || subtipo || esp);

  const cartoesNavegacao: { id: Secao; rotulo: string; valor: number; icone: typeof LayoutGrid }[] = [
    { id: "especialidades", rotulo: "Especialidades", valor: especialidadesFiltradas.length, icone: LayoutGrid },
    { id: "profissionais", rotulo: "Profissionais", valor: profissionaisFiltrados.length, icone: UserRound },
    { id: "convenios", rotulo: "Convênios", valor: conveniosFiltrados.length, icone: ShieldCheck },
    { id: "exames", rotulo: "Exames", valor: examesFiltrados.length, icone: FlaskConical },
  ];

  return (
    <div className="space-y-6">
      {/* Barra de Busca e Filtros Principais */}
      <div className="entrar rounded-3xl border border-borda bg-superficie p-4 shadow-card sm:p-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-suave" />
              <input
                ref={campo}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                autoFocus
                placeholder="Buscar por médico, especialidade, plano de convênio ou exame..."
                className="h-14 w-full rounded-2xl bg-fundo pl-12 pr-24 text-[17px] outline-none ring-1 ring-transparent transition placeholder:text-suave/70 focus:bg-superficie focus:ring-verde/40 focus:shadow-[0_0_0_4px_rgb(13_155_134/0.12)]"
              />
              {texto ? (
                <button
                  onClick={() => setTexto("")}
                  aria-label="Limpar texto"
                  className="pressionavel absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-suave hover:bg-borda/60"
                >
                  <X className="size-4" />
                </button>
              ) : (
                <kbd className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-md border border-borda bg-superficie px-2 py-0.5 text-xs text-suave sm:block">
                  /
                </kbd>
              )}
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-[1.3fr_1fr_1fr]">
              <SeletorConvenio dados={dados} valor={subtipo} onChange={setSubtipo} />
          <Segmentado
            valor={tipo}
            onChange={setTipo}
            opcoes={[
              { valor: "consulta", rotulo: "Consulta" },
              { valor: "exame", rotulo: "Exame" },
            ]}
          />
          <select
            value={esp}
            onChange={(e) => setEsp(e.target.value)}
            className="h-11 w-full rounded-xl border border-borda bg-superficie px-3 text-[15px] outline-none transition focus:border-verde focus:ring-4 focus:ring-verde/15"
          >
            <option value="">Todas as especialidades</option>
            {dados.especialidades.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
        </div>

        {(esp || subtipo) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-borda/60 pt-3 text-xs">
            <span className="font-semibold text-suave">Filtros ativos:</span>
            {esp && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-verde-claro px-2.5 py-1 font-semibold text-verde">
                {nomeEsp(esp)}
                <button type="button" onClick={() => setEsp("")} title="Remover filtro de especialidade">
                  <X className="size-3.5" />
                </button>
              </span>
            )}
            {subtipo && info && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-superficie px-2.5 py-1 font-semibold text-texto border border-borda">
                {info.convenio.nome} ({info.subtipo.nome})
                <button type="button" onClick={() => setSubtipo("")} title="Remover filtro de convênio">
                  <X className="size-3.5" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Cartões Selecionáveis de Navegação (Sempre visíveis e interativos) */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cartoesNavegacao.map((card, i) => {
          const ativo = secaoAtiva === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => setSecaoAtiva((atual) => (atual === card.id ? null : card.id))}
              title={ativo ? "Clique para desmarcar e recolher" : `Clique para exibir ${card.rotulo.toLowerCase()}`}
              style={{ "--i": i + 2 } as React.CSSProperties}
              className={`entrar pressionavel levanta group relative flex flex-col rounded-2xl border p-4 text-left transition-all duration-200 ${
                ativo
                  ? "border-verde/80 bg-verde-claro/40 shadow-card ring-2 ring-verde/30"
                  : "border-borda bg-superficie hover:border-verde/40 hover:bg-fundo/70"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`grid size-9 place-items-center rounded-xl transition-colors ${
                    ativo ? "bg-verde text-white shadow-sm" : "bg-fundo text-verde group-hover:bg-verde group-hover:text-white"
                  }`}
                >
                  <card.icone className="size-5" />
                </span>
                {ativo && (
                  <span className="rounded-full bg-verde px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    Ativo
                  </span>
                )}
              </div>
              <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight text-texto">
                <Contador valor={card.valor} />
              </p>
              <p className={`text-sm font-semibold transition-colors ${ativo ? "text-verde" : "text-suave"}`}>
                {card.rotulo}
              </p>
            </button>
          );
        })}
      </div>

      {/* Banner de Convênio Ativo (se selecionado no Seletor) */}
      {info && (
        <div className="entrar rounded-2xl border border-borda bg-superficie p-4 shadow-card">
          <div className="flex items-center gap-3">
            <LogoMarca nome={info.convenio.nome} logo={info.convenio.logo} cor={info.convenio.cor} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-texto">{info.convenio.nome}</p>
              <p className="truncate text-xs text-suave">Rede ativa: {info.subtipo.nome}</p>
            </div>
            <TipoBadge tipo={tipo} />
          </div>
        </div>
      )}

      {/* ÁREA DE RESULTADOS DINÂMICA: Exibe APENAS a seção ativa selecionada */}
      <div>
        {!secaoAtiva && (
          <div className="entrar rounded-3xl border border-dashed border-borda/80 bg-superficie/50 p-8 text-center">
            <p className="text-sm font-semibold text-suave">
              Nenhuma categoria selecionada. Clique em um dos cartões acima para visualizar os dados.
            </p>
          </div>
        )}
        {/* ==================== 1. SEÇÃO ESPECIALIDADES ==================== */}
        {secaoAtiva === "especialidades" && (
          <div className="entrar space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-texto">
                {filtrando ? `Especialidades filtradas (${especialidadesFiltradas.length})` : "Todas as Especialidades"}
              </h2>
              <Link href="/especialidades" className="text-xs font-semibold text-verde hover:underline flex items-center gap-1">
                Ver tela completa de Especialidades <ArrowRight className="size-3.5" />
              </Link>
            </div>

            {especialidadesFiltradas.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {especialidadesFiltradas.map((e, i) => {
                  const medicosDesta = dados.profissionais.filter((p) => p.especialidadeId === e.id);
                  return (
                    <div
                      key={e.id}
                      style={{ "--i": Math.min(i, 10) } as React.CSSProperties}
                      className="entrar pressionavel levanta group flex flex-col justify-between rounded-3xl border border-borda bg-superficie p-5 text-left shadow-card transition-all hover:border-verde/40"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="grid size-12 place-items-center rounded-2xl bg-verde-claro text-verde transition-colors group-hover:bg-verde group-hover:text-white">
                            <Icone nome={e.icone} className="size-6" />
                          </span>
                          <span className="rounded-xl bg-fundo px-2.5 py-1 text-xs font-semibold text-suave">
                            {medicosDesta.length} {medicosDesta.length === 1 ? "médico" : "médicos"}
                          </span>
                        </div>
                        <h3 className="mt-4 text-lg font-bold text-texto group-hover:text-verde transition-colors">
                          {e.nome}
                        </h3>

                        {medicosDesta.length > 0 ? (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {medicosDesta.slice(0, 3).map((m) => (
                              <span key={m.id} className="rounded-md bg-fundo px-2 py-0.5 text-xs font-medium text-suave">
                                {m.nome}
                              </span>
                            ))}
                            {medicosDesta.length > 3 && (
                              <span className="rounded-md bg-fundo px-2 py-0.5 text-xs font-medium text-suave">
                                +{medicosDesta.length - 3} mais
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="mt-2.5 text-xs text-suave">Nenhum profissional vinculado.</p>
                        )}
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-borda/60 pt-3 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => {
                            setEsp(e.id);
                            setSecaoAtiva("profissionais");
                          }}
                          className="inline-flex items-center gap-1 text-verde hover:underline"
                        >
                          Ver médicos da área <ChevronRight className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Vazio texto="Nenhuma especialidade encontrada para a busca." />
            )}
          </div>
        )}

        {/* ==================== 2. SEÇÃO PROFISSIONAIS ==================== */}
        {secaoAtiva === "profissionais" && (
          <div className="entrar space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-texto">
                {filtrando ? `Profissionais encontrados (${profissionaisFiltrados.length})` : "Todos os Profissionais"}
              </h2>
            </div>

            {profissionaisFiltrados.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {profissionaisFiltrados.map((p, i) => {
                  const medEsp = nomeEsp(p.especialidadeId);
                  const medExames = p.exames.map((id) => dados.exames.find((e) => e.id === id)?.nome ?? "").filter(Boolean);
                  const bateuProc = q ? p.procedimentos.filter((x) => combina(x, q)) : [];
                  const bateuExames = q ? medExames.filter((x) => combina(x, q)) : [];
                  return (
                    <CartaoProfissional
                      key={p.id}
                      p={p}
                      i={i}
                      especialidade={medEsp}
                      destaque={
                        (bateuProc.length > 0 || bateuExames.length > 0) && (
                          <div className="border-t border-borda pt-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-suave">Atende nesta unidade</p>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {bateuProc.map((x) => (
                                <Chip key={x}>{x}</Chip>
                              ))}
                              {bateuExames.map((x) => (
                                <Chip key={x} tom="azul">
                                  {x}
                                </Chip>
                              ))}
                            </div>
                          </div>
                        )
                      }
                    />
                  );
                })}
              </div>
            ) : (
              <Vazio texto="Nenhum profissional encontrado com os filtros atuais." />
            )}
          </div>
        )}

        {/* ==================== 3. SEÇÃO CONVÊNIOS ==================== */}
        {secaoAtiva === "convenios" && (
          <div className="entrar space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-texto">
                {filtrando ? `Convênios encontrados (${conveniosFiltrados.length})` : "Todos os Convênios"}
              </h2>
              <Link href="/convenios" className="text-xs font-semibold text-verde hover:underline flex items-center gap-1">
                Ver diretório de convênios <ArrowRight className="size-3.5" />
              </Link>
            </div>

            {conveniosFiltrados.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {conveniosFiltrados.map((c, i) => {
                  const grupos = gruposPlanosDoConvenio(c);
                  const obs = observacoesDoConvenio(c);
                  const gAtende = grupos.find((g) => g.status === "atende");
                  const gSomente = grupos.find((g) => g.status === "somente_exames");
                  const gNao = grupos.find((g) => g.status === "nao_atende");

                  const countAtende = gAtende?.planos.length ?? 0;
                  const countSomente = gSomente?.planos.length ?? 0;
                  const countNao = gNao?.planos.length ?? 0;

                  return (
                    <div
                      key={c.id}
                      style={{ "--i": Math.min(i, 10) } as React.CSSProperties}
                      className="entrar pressionavel levanta group flex flex-col justify-between rounded-3xl border border-borda bg-superficie p-6 shadow-card transition-all hover:border-verde/40"
                    >
                      <div>
                        <div className="mb-4 flex items-center justify-between">
                          <LogoMarca nome={c.nome} logo={c.logo} cor={c.cor} tamanho="lg" />
                          <span className="rounded-xl bg-fundo px-3 py-1 text-xs font-semibold text-suave">
                            {c.subtipos.length} {c.subtipos.length === 1 ? "rede" : "redes"}
                          </span>
                        </div>

                        <h3 className="text-xl font-bold tracking-tight text-texto group-hover:text-verde transition-colors">
                          {c.nome}
                        </h3>
                        <p className="mt-1 text-xs text-suave">Regras e planos da carteirinha</p>

                        <div className="mt-4 space-y-2 border-t border-borda/60 pt-3 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-texto">
                              <span className="size-2 rounded-full bg-emerald-500" /> Consultas e exames
                            </span>
                            <span className="font-bold text-emerald-700">{countAtende} planos</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-texto">
                              <span className="size-2 rounded-full bg-amber-500" /> Somente exames
                            </span>
                            <span className="font-bold text-amber-700">{countSomente} planos</span>
                          </div>
                          {countNao > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5 text-texto">
                                <span className="size-2 rounded-full bg-rose-500" /> Não atendidos
                              </span>
                              <span className="font-bold text-rose-700">{countNao} planos</span>
                            </div>
                          )}
                          {obs.length > 0 && (
                            <div className="flex items-center justify-between text-suave pt-0.5">
                              <span className="flex items-center gap-1">
                                <ShieldAlert className="size-3.5 text-amber-600" /> Regras operacionais
                              </span>
                              <span className="font-semibold text-texto">{obs.length} ativas</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-borda/60 pt-3 text-xs font-bold text-verde">
                        <Link href={`/convenios/${c.id}`} className="hover:underline flex items-center gap-1.5">
                          <BookOpen className="size-3.5" />
                          Manual de regras
                        </Link>
                        {c.subtipos.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSubtipo(c.subtipos[0].id);
                              setSecaoAtiva("profissionais");
                            }}
                            className="text-suave hover:text-texto font-semibold"
                          >
                            Filtrar médicos
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Vazio texto="Nenhum convênio encontrado com os filtros atuais." />
            )}
          </div>
        )}

        {/* ==================== 4. SEÇÃO EXAMES ==================== */}
        {secaoAtiva === "exames" && (
          <div className="entrar space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-texto">
                {filtrando ? `Exames encontrados (${examesFiltrados.length})` : "Todos os Exames"}
              </h2>
              <Link href="/exames" className="text-xs font-semibold text-verde hover:underline flex items-center gap-1">
                Ver tela completa de Exames <ArrowRight className="size-3.5" />
              </Link>
            </div>

            {examesFiltrados.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {examesFiltrados.map((e, i) => {
                  const quemFaz = dados.profissionais.filter((p) => p.exames.includes(e.id));
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => abrir({ tipo: "exame", id: e.id })}
                      style={{ "--i": Math.min(i, 10) } as React.CSSProperties}
                      className="entrar pressionavel levanta group flex flex-col justify-between rounded-3xl border border-borda bg-superficie p-5 text-left shadow-card transition-all hover:border-azul/50 hover:shadow-elevado"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="grid size-12 place-items-center rounded-2xl bg-azul-claro text-azul transition-colors group-hover:bg-azul group-hover:text-white">
                            <FlaskConical className="size-6" />
                          </span>
                          <span className="rounded-xl bg-fundo px-2.5 py-1 text-xs font-semibold text-suave">
                            {e.subtipos.filter((id) => validos.has(id)).length} {e.subtipos.filter((id) => validos.has(id)).length === 1 ? "rede" : "redes"}
                          </span>
                        </div>

                        <h3 className="mt-4 text-lg font-bold text-texto group-hover:text-azul transition-colors">
                          {e.nome}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-xs text-suave">
                          {e.preparo[0] ?? "Sem preparo específico cadastrado."}
                        </p>

                        <div className="mt-4 flex items-center gap-2 text-xs text-suave border-t border-borda/60 pt-3">
                          <span className="font-semibold text-texto">{quemFaz.length}</span>{" "}
                          {quemFaz.length === 1 ? "profissional realiza" : "profissionais realizam"}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between text-xs font-semibold text-azul">
                        <span>Ver preparo e cobertura</span>
                        <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <Vazio texto="Nenhum exame encontrado com os filtros atuais." />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
