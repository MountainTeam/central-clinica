"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  FlaskConical,
  Search,
  ShieldAlert,
  UserRound,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  type Recente, combina, gruposPlanosDoConvenio, idsDeRedes, lembrarRecente, observacoesDoConvenio, pontuacao, sugestoesDePlano, atende,
} from "@/lib/regras";
import { CartaoProfissional, Chip, Destaque, Icone, LogoMarca, Segmentado, SeletorConvenio, SeletorEspecialidade, Vazio } from "@/components/ui";

const ABAS = [
  { id: "profissionais", rotulo: "Profissionais" },
  { id: "exames", rotulo: "Exames" },
  { id: "convenios", rotulo: "Convênios" },
  { id: "especialidades", rotulo: "Especialidades" },
] as const;
type Secao = (typeof ABAS)[number]["id"];

// useSearchParams pede Suspense no Next 16
export default function PaginaBusca() {
  return <Suspense><BuscaRapida /></Suspense>;
}

function BuscaRapida() {
  const { dados, abrir, clinica, plano, escolherPlano } = useStore();
  const router = useRouter();
  const rota = usePathname();
  const params = useSearchParams();
  const [texto, setTexto] = useState(() => params.get("q") ?? "");
  const [esp, setEsp] = useState(() => params.get("esp") ?? "");
  const [secaoAtiva, setSecaoAtiva] = useState<Secao>(() => ABAS.find((a) => a.id === params.get("aba"))?.id ?? "profissionais");
  // "Filtrar médicos" abre o seletor de convênio já buscando pelo nome do convênio
  const [filtroConvenio, setFiltroConvenio] = useState<string | null>(null);
  const [recentes, setRecentes] = useState<Recente[]>([]);
  // depois que a pessoa escolhe uma aba nesta busca, a busca não troca de aba sozinha
  const clicouAba = useRef(false);
  const campo = useRef<HTMLInputElement>(null);
  const chaveRecentes = `cartilha:recentes:${clinica?.id}`;

  useEffect(() => {
    try { setRecentes(JSON.parse(localStorage.getItem(chaveRecentes) ?? "[]")); } catch { setRecentes([]); }
  }, [chaveRecentes]);
  const lembrar = (r: Recente) => {
    const nova = lembrarRecente(recentes, r);
    setRecentes(nova);
    try { localStorage.setItem(chaveRecentes, JSON.stringify(nova)); } catch {}
  };

  useEffect(() => {
    const focar = () => { campo.current?.focus(); campo.current?.select(); };
    const limpar = () => { setTexto(""); clicouAba.current = false; };
    window.addEventListener("cartilha:focar-busca", focar);
    window.addEventListener("cartilha:nova-ligacao", limpar);
    return () => { window.removeEventListener("cartilha:focar-busca", focar); window.removeEventListener("cartilha:nova-ligacao", limpar); };
  }, []);

  // a busca fica na URL: voltar da ficha do médico devolve a mesma busca
  useEffect(() => {
    const p = new URLSearchParams(params.toString());
    const por = (k: string, v: string) => (v ? p.set(k, v) : p.delete(k));
    por("q", texto.trim());
    por("aba", secaoAtiva === "profissionais" ? "" : secaoAtiva);
    por("esp", esp);
    const s = p.toString();
    if (s !== params.toString()) router.replace(s ? `${rota}?${s}` : rota, { scroll: false });
  }, [texto, secaoAtiva, esp, params, rota, router]);

  const q = texto.trim();
  const subtipo = plano?.subtipoId ?? "";
  const tipo = plano?.tipo ?? "consulta";
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

  const filtrando = !!(q || subtipo || esp);
  const contagem: Record<Secao, number> = {
    profissionais: profissionaisFiltrados.length,
    exames: examesFiltrados.length,
    convenios: conveniosFiltrados.length,
    especialidades: especialidadesFiltradas.length,
  };
  const chaveContagem = ABAS.map((a) => contagem[a.id]).join(",");

  useEffect(() => { if (!q) clicouAba.current = false; }, [q]);
  // aba atual sem resultado e outra com resultado: vai para a que tem mais
  useEffect(() => {
    if (!q || clicouAba.current || contagem[secaoAtiva] > 0) return;
    const melhor = ABAS.reduce((a, b) => (contagem[b.id] > contagem[a.id] ? b : a));
    if (contagem[melhor.id] > 0) setSecaoAtiva(melhor.id);
  }, [q, chaveContagem, secaoAtiva]);

  const sugestoes = q.length >= 2 ? sugestoesDePlano(dados.convenios, q).filter((x) => x.subtipo.id !== subtipo) : [];
  const abertos = q ? [] : recentes.flatMap((r) => {
    if (r.tipo === "profissional") {
      const p = dados.profissionais.find((x) => x.id === r.id);
      return p ? [{ r, nome: p.nome }] : [];
    }
    const e = dados.exames.find((x) => x.id === r.id);
    return e ? [{ r, nome: e.nome }] : [];
  });

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
                  Ctrl K
                </kbd>
              )}
            </div>

            {sugestoes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {sugestoes.map(({ convenio, subtipo: s }) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { escolherPlano({ subtipoId: s.id, tipo: "consulta" }); setTexto(""); }}
                    className="pressionavel flex items-center gap-2 rounded-xl border border-verde/30 bg-verde-claro/40 px-3 py-1.5 text-sm font-semibold text-verde hover:bg-verde-claro"
                  >
                    <LogoMarca nome={convenio.nome} logo={convenio.logo} cor={convenio.cor} tamanho="sm" />
                    Usar {convenio.nome} · {s.nome} como plano do paciente
                  </button>
                ))}
              </div>
            )}

            <div className="mt-3 grid gap-3 md:grid-cols-[1.3fr_1fr_1fr]">
              <SeletorConvenio
                key={filtroConvenio ?? ""}
                dados={dados}
                valor={subtipo}
                abertoInicial={filtroConvenio !== null}
                buscaInicial={filtroConvenio ?? ""}
                onFechar={() => setFiltroConvenio(null)}
                onChange={(v) => {
                  escolherPlano(v ? { subtipoId: v, tipo } : null);
                  if (filtroConvenio !== null) setSecaoAtiva("profissionais");
                }}
              />
              <div className="flex items-center gap-2" title={plano ? undefined : "Escolha o convênio do paciente para filtrar por atendimento"}>
                <span className="text-sm font-semibold text-suave">Atendimento</span>
                <div className="flex-1">
                  <Segmentado
                    valor={tipo}
                    desativado={!plano}
                    onChange={(t) => plano && escolherPlano({ ...plano, tipo: t })}
                    opcoes={[
                      { valor: "consulta", rotulo: "Consulta" },
                      { valor: "exame", rotulo: "Exame" },
                    ]}
                  />
                </div>
              </div>
              <SeletorEspecialidade dados={dados} valor={esp} onChange={setEsp} />
            </div>
      </div>

      {abertos.length > 0 && (
        <div className="entrar flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-suave">Abertos recentemente</span>
          {abertos.map(({ r, nome }) => {
            const classe = "pressionavel flex items-center gap-1.5 rounded-xl border border-borda bg-superficie px-3 py-1.5 text-sm font-semibold text-texto hover:border-verde/40";
            return r.tipo === "profissional" ? (
              <Link key={`p-${r.id}`} href={`/profissionais/${r.id}`} onClick={() => lembrar(r)} className={classe}>
                <UserRound className="size-4 text-verde" />{nome}
              </Link>
            ) : (
              <button key={`e-${r.id}`} type="button" onClick={() => { lembrar(r); abrir({ tipo: "exame", id: r.id }); }} className={classe}>
                <FlaskConical className="size-4 text-azul" />{nome}
              </button>
            );
          })}
        </div>
      )}

      <div role="tablist" aria-label="Resultados" className="flex gap-1 overflow-x-auto rounded-2xl border border-borda bg-superficie p-1">
        {ABAS.map((a) => {
          const ativo = secaoAtiva === a.id;
          return (
            <button
              key={a.id}
              id={`aba-${a.id}`}
              type="button"
              role="tab"
              aria-selected={ativo}
              aria-controls="resultados-busca"
              onClick={() => { clicouAba.current = true; setSecaoAtiva(a.id); }}
              className={`pressionavel flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                ativo ? "bg-verde-claro text-verde" : "text-suave hover:bg-fundo hover:text-texto"
              }`}
            >
              {a.rotulo}
              <span className={`tabular-nums ${ativo ? "text-verde" : "text-suave/80"}`}>{contagem[a.id]}</span>
            </button>
          );
        })}
      </div>

      {/* ÁREA DE RESULTADOS: só a aba ativa */}
      <div id="resultados-busca" role="tabpanel" aria-labelledby={`aba-${secaoAtiva}`}>
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
                          <Destaque texto={e.nome} q={q} />
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
                      q={q}
                      onAbrir={() => lembrar({ tipo: "profissional", id: p.id })}
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
                          <Destaque texto={c.nome} q={q} />
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
                            onClick={() => setFiltroConvenio(c.nome)}
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
                  const redes = e.subtipos.filter((id) => validos.has(id)).length;
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => { lembrar({ tipo: "exame", id: e.id }); abrir({ tipo: "exame", id: e.id }); }}
                      style={{ "--i": Math.min(i, 10) } as React.CSSProperties}
                      className="entrar pressionavel levanta group flex flex-col justify-between rounded-3xl border border-borda bg-superficie p-5 text-left shadow-card transition-all hover:border-azul/50 hover:shadow-elevado"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="grid size-12 place-items-center rounded-2xl bg-azul-claro text-azul transition-colors group-hover:bg-azul group-hover:text-white">
                            <FlaskConical className="size-6" />
                          </span>
                          <span className="rounded-xl bg-fundo px-2.5 py-1 text-xs font-semibold text-suave">
                            {redes} {redes === 1 ? "rede" : "redes"}
                          </span>
                        </div>

                        <h3 className="mt-4 text-lg font-bold text-texto group-hover:text-azul transition-colors">
                          <Destaque texto={e.nome} q={q} />
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
