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
  LayoutGrid,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  type Recente, combina, gruposPlanosDoConvenio, idsDeRedes, lembrarRecente, observacoesDoConvenio, pontuacao, resultadoPrincipal, sugestaoParaBusca, sugestoesDePlano, atende,
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
  const { dados, abrir, clinica, plano, escolherPlano, carregado } = useStore();
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
  // escolha manual de Consulta/Exame fica na URL: sobrevive à volta da ficha
  const [tipoManual, setTipoManual] = useState(() => params.get("tipo") === "manual");
  // texto em que o atendimento já mudou sozinho: uma troca por texto, sem vaivém
  const tipoAuto = useRef("");
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
    const limpar = () => { setTexto(""); clicouAba.current = false; setTipoManual(false); };
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
    por("tipo", tipoManual ? "manual" : "");
    const s = p.toString();
    if (s !== params.toString()) router.replace(s ? `${rota}?${s}` : rota, { scroll: false });
  }, [texto, secaoAtiva, esp, tipoManual, params, rota, router]);

  const q = texto.trim();
  // especialidade de outra unidade (ou apagada) não filtra nada; sai da URL quando os dados já carregaram
  const espOk = dados.especialidades.some((e) => e.id === esp) ? esp : "";
  useEffect(() => { if (carregado && clinica && esp && !espOk) setEsp(""); }, [carregado, clinica, esp, espOk]);
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
      if (espOk && p.especialidadeId !== espOk) return false;
      if (subtipo && !atende(p, subtipo, tipo)) return false;
      return combina(textoProfissional(p), q);
    }),
    textoProfissional,
  );

  // 2. Filtro de Especialidades
  const textoEspecialidade = (e: (typeof dados.especialidades)[number]) =>
    [e.nome, ...dados.profissionais.filter((p) => p.especialidadeId === e.id).map((p) => p.nome)].join(" ");
  const especialidadesFiltradas = ordenar(
    dados.especialidades.filter((e) => (!espOk || e.id === espOk) && combina(textoEspecialidade(e), q)),
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

  const filtrando = !!(q || subtipo || espOk);
  const contagem: Record<Secao, number> = {
    profissionais: profissionaisFiltrados.length,
    exames: examesFiltrados.length,
    convenios: conveniosFiltrados.length,
    especialidades: especialidadesFiltradas.length,
  };
  const chaveContagem = ABAS.map((a) => contagem[a.id]).join(",");

  useEffect(() => { if (!q) { clicouAba.current = false; setTipoManual(false); tipoAuto.current = ""; } }, [q]);
  // aba atual sem resultado e outra com resultado: vai para a que tem mais
  useEffect(() => {
    if (!q || clicouAba.current || contagem[secaoAtiva] > 0) return;
    const melhor = ABAS.reduce((a, b) => (contagem[b.id] > contagem[a.id] ? b : a));
    if (contagem[melhor.id] > 0) setSecaoAtiva(melhor.id);
  }, [q, chaveContagem, secaoAtiva]);

  // o item cujo nome mais combina, quando ele não está na aba aberta ("mamo" → Mamografia com Profissionais aberto)
  const principal = q ? resultadoPrincipal([
    ...profissionaisFiltrados.map((x) => ({ aba: "profissionais" as const, id: x.id, nome: x.nome })),
    ...examesFiltrados.map((x) => ({ aba: "exames" as const, id: x.id, nome: x.nome })),
    ...conveniosFiltrados.map((x) => ({ aba: "convenios" as const, id: x.id, nome: x.nome })),
    ...especialidadesFiltradas.map((x) => ({ aba: "especialidades" as const, id: x.id, nome: x.nome })),
  ], q) : undefined;
  const mostrarPrincipal = principal && principal.aba !== secaoAtiva ? principal : undefined;
  // sem clique no seletor, o atendimento segue o que foi digitado: exame → Exame, médico/especialidade → Consulta
  const tipoSugerido = principal?.aba === "exames" ? "exame" : principal?.aba === "profissionais" || principal?.aba === "especialidades" ? "consulta" : undefined;
  useEffect(() => {
    if (!plano || tipoManual || !tipoSugerido || plano.tipo === tipoSugerido || tipoAuto.current === q) return;
    tipoAuto.current = q;
    escolherPlano({ ...plano, tipo: tipoSugerido });
  }, [plano, tipoSugerido, q, tipoManual]); // eslint-disable-line react-hooks/exhaustive-deps

  const sugestoes = q.length >= 2 ? sugestoesDePlano(dados.convenios, q).filter((x) => x.subtipo.id !== subtipo) : [];
  const abertos = q ? [] : recentes.flatMap((r) => {
    if (r.tipo === "profissional") {
      const p = dados.profissionais.find((x) => x.id === r.id);
      return p ? [{ r, nome: p.nome }] : [];
    }
    const e = dados.exames.find((x) => x.id === r.id);
    return e ? [{ r, nome: e.nome }] : [];
  });

  // ←/→ movem o foco e ativam a aba vizinha
  const teclaAbas = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = ABAS.findIndex((a) => a.id === secaoAtiva);
    const prox = ABAS[(i + (e.key === "ArrowRight" ? 1 : ABAS.length - 1)) % ABAS.length].id;
    clicouAba.current = true;
    setSecaoAtiva(prox);
    document.getElementById(`aba-${prox}`)?.focus();
  };

  const unidadeVazia = !dados.profissionais.length && !dados.exames.length && !dados.convenios.length && !dados.especialidades.length;
  const sugestaoTexto = q ? sugestaoParaBusca([...dados.exames, ...dados.profissionais, ...dados.convenios, ...dados.especialidades].map((x) => x.nome), q) : undefined;
  // "especialidade" é feminino: Nenhuma especialidade cadastrada/encontrada
  const vazio = (oQue: string, a = oQue === "especialidade" ? "a" : "o") => unidadeVazia
    ? <Vazio texto="Esta unidade ainda não tem cadastro. Quem coordena a unidade cadastra médicos, convênios e exames." />
    : !filtrando
      ? <Vazio texto={`Nenhum${a === "a" ? "a" : ""} ${oQue} cadastrad${a} nesta unidade.`} />
      : (
        <div className="space-y-2 text-center">
          <Vazio texto={`Nenhum${a === "a" ? "a" : ""} ${oQue} encontrad${a} com os filtros atuais.`} />
          {sugestaoTexto && (
            <button type="button" onClick={() => { clicouAba.current = false; setTexto(sugestaoTexto); }} className="pressionavel text-sm font-semibold text-verde hover:underline">
              Você quis dizer “{sugestaoTexto}”?
            </button>
          )}
        </div>
      );

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
                className="h-14 w-full rounded-2xl bg-fundo pl-12 pr-24 text-[17px] outline-none ring-1 ring-transparent transition placeholder:text-suave focus:bg-superficie focus:ring-4 focus:ring-verde/15"
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
                    onClick={() => { escolherPlano({ subtipoId: s.id, tipo: "consulta" }); setTexto(""); setSecaoAtiva("profissionais"); }}
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
                    onChange={(t) => { setTipoManual(true); if (plano) escolherPlano({ ...plano, tipo: t }); }}
                    opcoes={[
                      { valor: "consulta", rotulo: "Consulta" },
                      { valor: "exame", rotulo: "Exame" },
                    ]}
                  />
                  {plano && !tipoManual && tipoSugerido && plano.tipo === tipoSugerido && <span className="mt-1 block text-[12px] text-suave">Definido pela busca</span>}
                </div>
              </div>
              <SeletorEspecialidade dados={dados} valor={espOk} onChange={setEsp} />
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

      {mostrarPrincipal && (() => {
        const { aba, id, nome } = mostrarPrincipal;
        const visual = {
          profissionais: { icone: UserRound, tipo: "Profissional", acao: "Ver ficha" },
          exames: { icone: FlaskConical, tipo: "Exame", acao: "Abrir" },
          convenios: { icone: ShieldCheck, tipo: "Convênio", acao: "Ver regras" },
          especialidades: { icone: LayoutGrid, tipo: "Especialidade", acao: "Ver médicos" },
        }[aba];
        const conteudo = (
          <>
            <span className="text-xs font-semibold uppercase tracking-wider text-suave">Resultado principal</span>
            <visual.icone className="size-4 shrink-0 text-verde" />
            <span className="min-w-0 flex-1 truncate font-semibold text-texto"><Destaque texto={nome} q={q} /> <span className="font-normal text-suave">· {visual.tipo}</span></span>
            <span className="flex items-center gap-1 text-verde">{visual.acao}<ChevronRight className="size-4" /></span>
          </>
        );
        const classe = "entrar pressionavel flex w-full items-center gap-3 rounded-2xl border border-verde/30 bg-superficie px-4 py-2.5 text-left text-sm hover:border-verde/60";
        if (aba === "profissionais") return <Link href={`/profissionais/${id}`} onClick={() => lembrar({ tipo: "profissional", id })} className={classe}>{conteudo}</Link>;
        if (aba === "convenios") return <Link href={`/convenios/${id}`} className={classe}>{conteudo}</Link>;
        return (
          <button type="button" className={classe} onClick={() => {
            if (aba === "exames") { lembrar({ tipo: "exame", id }); abrir({ tipo: "exame", id }); return; }
            clicouAba.current = true;
            setEsp(id);
            setSecaoAtiva("profissionais");
          }}>{conteudo}</button>
        );
      })()}

      <div role="tablist" aria-label="Resultados" onKeyDown={teclaAbas} className="flex gap-1 overflow-x-auto rounded-2xl border border-borda bg-superficie p-1">
        {ABAS.map((a) => {
          const ativo = secaoAtiva === a.id;
          return (
            <button
              key={a.id}
              id={`aba-${a.id}`}
              type="button"
              role="tab"
              aria-selected={ativo}
              tabIndex={ativo ? 0 : -1}
              aria-controls="resultados-busca"
              onClick={() => { clicouAba.current = true; setSecaoAtiva(a.id); }}
              className={`pressionavel flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                ativo ? "bg-verde-claro text-verde" : "text-suave hover:bg-fundo hover:text-texto"
              }`}
            >
              {a.rotulo}
              <span className={`tabular-nums ${ativo ? "text-verde" : "text-suave"}`}>{contagem[a.id]}</span>
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
                {filtrando ? `Especialidades filtradas (${especialidadesFiltradas.length})` : "Todas as especialidades"}
              </h2>
              <Link href="/especialidades" className="text-[13px] font-semibold text-verde hover:underline flex items-center gap-1">
                Ver tela completa de especialidades <ArrowRight className="size-3.5" />
              </Link>
            </div>

            {especialidadesFiltradas.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {especialidadesFiltradas.map((e, i) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => {
                      setEsp(e.id);
                      setSecaoAtiva("profissionais");
                    }}
                    style={{ "--i": Math.min(i, 10) } as React.CSSProperties}
                    className="entrar pressionavel levanta group flex flex-col justify-between rounded-3xl border border-borda bg-superficie p-5 text-left shadow-card transition-all hover:border-verde/40 hover:shadow-elevado cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="grid size-12 place-items-center rounded-2xl bg-verde-claro text-verde transition-colors group-hover:bg-verde group-hover:text-white">
                        <Icone nome={e.icone} className="size-6" />
                      </span>
                      <span className="grid size-8 place-items-center rounded-xl bg-fundo text-suave/60 transition-all group-hover:bg-verde-claro group-hover:text-verde group-hover:translate-x-0.5">
                        <ChevronRight className="size-4" />
                      </span>
                    </div>

                    <h3 className="mt-4 text-lg font-bold text-texto group-hover:text-verde transition-colors">
                      <Destaque texto={e.nome} q={q} />
                    </h3>
                  </button>
                ))}
              </div>
            ) : (
              vazio("especialidade")
            )}
          </div>
        )}

        {/* ==================== 2. SEÇÃO PROFISSIONAIS ==================== */}
        {secaoAtiva === "profissionais" && (
          <div className="entrar space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-texto">
                {filtrando ? `Profissionais encontrados (${profissionaisFiltrados.length})` : "Todos os profissionais"}
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
                            <p className="text-xs font-semibold uppercase tracking-wider text-suave">Atende nesta unidade</p>
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
              vazio("profissional")
            )}
          </div>
        )}

        {/* ==================== 3. SEÇÃO CONVÊNIOS ==================== */}
        {secaoAtiva === "convenios" && (
          <div className="entrar space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-texto">
                {filtrando ? `Convênios encontrados (${conveniosFiltrados.length})` : "Todos os convênios"}
              </h2>
              <Link href="/convenios" className="text-[13px] font-semibold text-verde hover:underline flex items-center gap-1">
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
                          <span className="rounded-xl bg-fundo px-3 py-1 text-[13px] font-semibold text-suave">
                            {c.subtipos.length} {c.subtipos.length === 1 ? "rede" : "redes"}
                          </span>
                        </div>

                        <h3 className="text-xl font-bold tracking-tight text-texto group-hover:text-verde transition-colors">
                          <Destaque texto={c.nome} q={q} />
                        </h3>
                        <p className="mt-1 text-[13px] text-suave">Regras e planos da carteirinha</p>

                        <div className="mt-4 space-y-2 border-t border-borda/60 pt-3 text-[13px]">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-texto">
                              <span className="size-2 rounded-full bg-verde" /> Consultas e exames
                            </span>
                            <span className="font-bold text-verde">{countAtende} planos</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-texto">
                              <span className="size-2 rounded-full bg-alerta" /> Somente exames
                            </span>
                            <span className="font-bold text-alerta">{countSomente} planos</span>
                          </div>
                          {countNao > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5 text-texto">
                                <span className="size-2 rounded-full bg-perigo" /> Não atendidos
                              </span>
                              <span className="font-bold text-perigo">{countNao} planos</span>
                            </div>
                          )}
                          {obs.length > 0 && (
                            <div className="flex items-center justify-between text-suave pt-0.5">
                              <span className="flex items-center gap-1">
                                <ShieldAlert className="size-3.5 text-alerta" /> Regras operacionais
                              </span>
                              <span className="font-semibold text-texto">{obs.length} ativas</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-borda/60 pt-3 text-[13px] font-bold text-verde">
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
              vazio("convênio")
            )}
          </div>
        )}

        {/* ==================== 4. SEÇÃO EXAMES ==================== */}
        {secaoAtiva === "exames" && (
          <div className="entrar space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-texto">
                {filtrando ? `Exames encontrados (${examesFiltrados.length})` : "Todos os exames"}
              </h2>
              <Link href="/exames" className="text-[13px] font-semibold text-verde hover:underline flex items-center gap-1">
                Ver tela completa de exames <ArrowRight className="size-3.5" />
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
                          <span className="rounded-xl bg-fundo px-2.5 py-1 text-[13px] font-semibold text-suave">
                            {redes} {redes === 1 ? "rede" : "redes"}
                          </span>
                        </div>

                        <h3 className="mt-4 text-lg font-bold text-texto group-hover:text-azul transition-colors">
                          <Destaque texto={e.nome} q={q} />
                        </h3>
                        <p className="mt-1 line-clamp-2 text-[13px] text-suave">
                          {e.preparo[0] ?? "Sem preparo específico cadastrado."}
                        </p>

                        <div className="mt-4 flex items-center gap-2 text-[13px] text-suave border-t border-borda/60 pt-3">
                          <span className="font-semibold text-texto">{quemFaz.length}</span>{" "}
                          {quemFaz.length === 1 ? "profissional realiza" : "profissionais realizam"}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between text-[13px] font-semibold text-azul">
                        <span>Ver preparo e cobertura</span>
                        <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              vazio("exame")
            )}
          </div>
        )}
      </div>
    </div>
  );
}
