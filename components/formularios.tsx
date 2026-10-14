"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useMemo, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { useStore, type Formulario } from "@/lib/store";
import { DIAS, type Convenio, type DadosClinica, type Exame, type GrupoPlano, type Horario, type Papel, type Profissional } from "@/lib/modelo";
import { PAPEIS } from "@/lib/permissoes";
import { combina, corDoIndice, gruposPlanosDoConvenio, novoId, observacoesDoConvenio, slug } from "@/lib/regras";
import { salvarClinica, salvarConvenio, salvarEspecialidade, salvarExame, salvarExameComProfissionais, salvarOrganizacao, salvarProfissional, salvarUsuario } from "@/lib/repositorio";
import { Botao, EnvioLogo, Gaveta, LogoMarca, useFecharGaveta } from "./ui";

export const campo = "w-full rounded-xl border border-borda bg-superficie px-3 py-2.5 text-[15px] outline-none transition placeholder:text-suave/60 focus:border-verde focus:ring-4 focus:ring-verde/15";
const linhas = (t: FormDataEntryValue | null) => String(t ?? "").split("\n").map((x) => x.trim()).filter(Boolean);

export function Campo({ rotulo, children, dica }: { rotulo: string; children: React.ReactNode; dica?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{rotulo}</span>
      {children}
      {dica && <span className="mt-1 block text-xs text-suave">{dica}</span>}
    </label>
  );
}

// Dias e horários: um intervalo por dia, com campos nativos de hora
export function EditorHorarios({ valor }: { valor: Horario[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-borda">
      {DIAS.map((dia, k) => {
        const h = valor.find((x) => x.dia === dia);
        return (
          <label key={dia} className={`group flex items-center gap-3 px-4 py-2 has-[:checked]:bg-verde-claro/40 ${k ? "border-t border-borda" : ""}`}>
            <input type="checkbox" name={`h:${dia}`} defaultChecked={!!h} className="peer size-5 accent-verde" />
            <span className="w-10 font-semibold">{dia}</span>
            <span className="flex items-center gap-2 opacity-40 transition-opacity peer-checked:opacity-100">
              <input type="time" name={`h:${dia}:inicio`} defaultValue={h?.inicio ?? "08:00"} className="rounded-lg border border-borda bg-superficie px-2 py-1 text-sm" />
              <span className="text-suave">até</span>
              <input type="time" name={`h:${dia}:fim`} defaultValue={h?.fim ?? "12:00"} className="rounded-lg border border-borda bg-superficie px-2 py-1 text-sm" />
            </span>
          </label>
        );
      })}
    </div>
  );
}

export const lerHorarios = (f: FormData): Horario[] =>
  DIAS.filter((d) => f.get(`h:${d}`)).map((dia) => ({ dia, inicio: String(f.get(`h:${dia}:inicio`)), fim: String(f.get(`h:${dia}:fim`)) }));

// a Moldura avisa aqui no primeiro campo mexido; a Gaveta usa isso para pedir confirmação ao descartar
const MarcarAlterado = createContext<() => void>(() => {});

export function Formularios() {
  const { form, abrirForm } = useStore();
  // guarda o último formulário para a gaveta sair com conteúdo; `n` zera os campos a cada abertura
  const [ultimo, setUltimo] = useState<{ f: Formulario; n: number }>({ f: null, n: 0 });
  const [alterado, setAlterado] = useState(false);
  if (form && form !== ultimo.f) { setUltimo({ f: form, n: ultimo.n + 1 }); setAlterado(false); }
  const atual = form ?? ultimo.f;
  const k = ultimo.n;

  return (
    <Gaveta aberta={!!form} onFechar={() => abrirForm(null)} alterado={alterado} largura="max-w-2xl">
      <MarcarAlterado.Provider value={() => setAlterado(true)}>
      {atual?.tipo === "profissional" && <FormProfissional key={k} id={atual.id} />}
      {atual?.tipo === "especialidade" && <FormEspecialidade key={k} />}
      {atual?.tipo === "convenio" && <FormConvenio key={k} id={atual.id} />}
      {atual?.tipo === "exame" && <FormExame key={k} id={atual.id} />}
      {atual?.tipo === "organizacao" && <FormOrganizacao key={k} />}
      {atual?.tipo === "clinica" && <FormClinica key={k} id={atual.id} />}
      {atual?.tipo === "usuario" && <FormUsuario key={k} />}
      </MarcarAlterado.Provider>
    </Gaveta>
  );
}

export function Moldura({ titulo, onSalvar, children }: { titulo: string; onSalvar: (f: FormData) => void; children: React.ReactNode }) {
  const fechar = useFecharGaveta();
  const marcar = useContext(MarcarAlterado);
  return (
    <form className="flex min-h-full flex-col" onInput={marcar}
      // Enter num campo não salva (ficha longa); no textarea continua quebrando linha
      onKeyDown={(e) => { if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") e.preventDefault(); }}
      onSubmit={(e) => { e.preventDefault(); onSalvar(new FormData(e.currentTarget)); }}>
      <div className="entrar border-b border-borda p-6 pr-14 sm:p-8">
        <h2 className="text-2xl font-bold tracking-tight">{titulo}</h2>
      </div>
      <div className="flex-1 space-y-6 p-6 sm:p-8">{children}</div>
      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-borda bg-superficie/90 p-4 backdrop-blur">
        <Botao variante="secundario" onClick={fechar}>Cancelar</Botao>
        <Botao type="submit">Salvar</Botao>
      </div>
    </form>
  );
}

function MatrizConvenios({ dados, atende }: { dados: DadosClinica; atende: Record<string, string> }) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "atendidos" | "nao_atendidos">("todos");
  const [estado, setEstado] = useState<Record<string, { c: boolean; e: boolean }>>(() => {
    const init: Record<string, { c: boolean; e: boolean }> = {};
    for (const c of dados.convenios) {
      for (const s of c.subtipos) {
        const val = atende[s.id] ?? "";
        init[s.id] = { c: val.includes("c"), e: val.includes("e") };
      }
    }
    return init;
  });

  const [expandidos, setExpandidos] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const c of dados.convenios) {
      init[c.id] = c.subtipos.some((s) => (atende[s.id] ?? "").length > 0);
    }
    return init;
  });

  const toggleCheck = (subId: string, tipo: "c" | "e") => {
    setEstado((ant) => ({
      ...ant,
      [subId]: {
        c: tipo === "c" ? !ant[subId]?.c : !!ant[subId]?.c,
        e: tipo === "e" ? !ant[subId]?.e : !!ant[subId]?.e,
      },
    }));
  };

  const marcarTodos = (c: Convenio, tipo: "c" | "e", valor: boolean) => {
    setEstado((ant) => {
      const prox = { ...ant };
      for (const s of c.subtipos) {
        prox[s.id] = {
          c: tipo === "c" ? valor : !!prox[s.id]?.c,
          e: tipo === "e" ? valor : !!prox[s.id]?.e,
        };
      }
      return prox;
    });
    if (valor) setExpandidos((ant) => ({ ...ant, [c.id]: true }));
  };

  const limparConvenio = (c: Convenio) => {
    setEstado((ant) => {
      const prox = { ...ant };
      for (const s of c.subtipos) {
        prox[s.id] = { c: false, e: false };
      }
      return prox;
    });
  };

  const toggleExpansao = (cId: string) => {
    setExpandidos((ant) => ({ ...ant, [cId]: !ant[cId] }));
  };

  const expandirTodos = () => {
    const prox: Record<string, boolean> = {};
    for (const c of dados.convenios) prox[c.id] = true;
    setExpandidos(prox);
  };

  const recolherTodos = () => {
    setExpandidos({});
  };

  const q = busca.trim();

  // Estatísticas gerais
  const totalSubtipos = dados.convenios.flatMap((c) => c.subtipos);
  const totalAtendidosC = totalSubtipos.filter((s) => estado[s.id]?.c).length;
  const totalAtendidosE = totalSubtipos.filter((s) => estado[s.id]?.e).length;

  const conveniosFiltrados = useMemo(() => {
    return dados.convenios.filter((c) => {
      const temAtendimento = c.subtipos.some((s) => estado[s.id]?.c || estado[s.id]?.e);
      if (filtro === "atendidos" && !temAtendimento) return false;
      if (filtro === "nao_atendidos" && temAtendimento) return false;

      if (!q) return true;
      return combina(`${c.nome} ${c.subtipos.map((s) => s.nome).join(" ")}`, q);
    });
  }, [dados.convenios, estado, filtro, q]);

  if (!dados.convenios.length) {
    return <p className="rounded-xl border border-dashed border-borda px-4 py-4 text-sm text-suave">Nenhum convênio cadastrado.</p>;
  }

  // IDs dos convênios que NÃO estão visíveis na lista filtrada (para renderizar inputs ocultos e não perder seleção)
  const idsFiltrados = new Set(conveniosFiltrados.map((c) => c.id));
  const conveniosOcultos = dados.convenios.filter((c) => !idsFiltrados.has(c.id));

  return (
    <div className="space-y-3">
      {/* Inputs ocultos para convênios temporariamente fora do filtro de busca */}
      <div className="hidden" aria-hidden="true">
        {conveniosOcultos.flatMap((c) => c.subtipos).map((s) => (
          <span key={s.id}>
            {estado[s.id]?.c && <input type="checkbox" name={`c:${s.id}`} defaultChecked readOnly />}
            {estado[s.id]?.e && <input type="checkbox" name={`e:${s.id}`} defaultChecked readOnly />}
          </span>
        ))}
      </div>

      {/* Barra de Busca e Filtros Rápidos */}
      <div className="rounded-2xl border border-borda bg-fundo/40 p-3 space-y-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-suave" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar entre os 50+ convênios ou redes..."
            className="h-10 w-full rounded-xl border border-borda bg-superficie pl-9 pr-8 text-xs sm:text-sm outline-none transition focus:border-verde focus:ring-2 focus:ring-verde/15"
          />
          {busca && (
            <button type="button" onClick={() => setBusca("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-suave hover:text-texto">
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFiltro("todos")}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${filtro === "todos" ? "bg-texto text-superficie" : "bg-superficie text-suave hover:text-texto border border-borda"}`}
            >
              Todos ({dados.convenios.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltro("atendidos")}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${filtro === "atendidos" ? "bg-verde text-white" : "bg-superficie text-suave hover:text-texto border border-borda"}`}
            >
              Atendidos ({totalAtendidosC || totalAtendidosE ? dados.convenios.filter(c => c.subtipos.some(s => estado[s.id]?.c || estado[s.id]?.e)).length : 0})
            </button>
            <button
              type="button"
              onClick={() => setFiltro("nao_atendidos")}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${filtro === "nao_atendidos" ? "bg-alerta text-white" : "bg-superficie text-suave hover:text-texto border border-borda"}`}
            >
              Não atendidos
            </button>
          </div>

          <div className="flex items-center gap-2 font-medium text-suave">
            <button type="button" onClick={expandirTodos} className="hover:text-texto transition-colors">
              Expandir todos
            </button>
            <span>·</span>
            <button type="button" onClick={recolherTodos} className="hover:text-texto transition-colors">
              Recolher
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Convênios */}
      <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
        {conveniosFiltrados.length ? (
          conveniosFiltrados.map((c) => {
            const subIds = c.subtipos.map((s) => s.id);
            const qtdC = subIds.filter((id) => estado[id]?.c).length;
            const qtdE = subIds.filter((id) => estado[id]?.e).length;
            const aberto = !!expandidos[c.id];
            const temMarcado = qtdC > 0 || qtdE > 0;

            return (
              <div key={c.id} className="overflow-hidden rounded-2xl border border-borda bg-superficie transition-all">
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-fundo/60">
                  <button
                    type="button"
                    onClick={() => toggleExpansao(c.id)}
                    className="flex items-center gap-2.5 font-semibold text-sm text-texto hover:text-verde transition-colors text-left"
                  >
                    <LogoMarca nome={c.nome} logo={c.logo} cor={c.cor} tamanho="sm" />
                    <span>{c.nome}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${temMarcado ? "bg-verde-claro text-verde" : "bg-borda/40 text-suave"}`}>
                      {temMarcado ? `${qtdC} consult. · ${qtdE} exam.` : "Não atende"}
                    </span>
                  </button>

                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => marcarTodos(c, "c", qtdC !== c.subtipos.length)}
                      className={`rounded-lg px-2.5 py-1 transition-colors ${qtdC === c.subtipos.length ? "bg-verde text-white shadow-sm" : "text-verde hover:bg-verde-claro"}`}
                      title="Marcar todas as redes em Consulta"
                    >
                      {qtdC === c.subtipos.length ? "✓ Consultas" : "+ Consultas"}
                    </button>
                    <button
                      type="button"
                      onClick={() => marcarTodos(c, "e", qtdE !== c.subtipos.length)}
                      className={`rounded-lg px-2.5 py-1 transition-colors ${qtdE === c.subtipos.length ? "bg-azul text-white shadow-sm" : "text-azul hover:bg-azul-claro"}`}
                      title="Marcar todas as redes em Exame"
                    >
                      {qtdE === c.subtipos.length ? "✓ Exames" : "+ Exames"}
                    </button>
                    {temMarcado && (
                      <button
                        type="button"
                        onClick={() => limparConvenio(c)}
                        className="rounded-lg px-2 py-1 text-suave hover:text-alerta transition-colors"
                      >
                        Limpar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleExpansao(c.id)}
                      aria-label={aberto ? "Recolher redes" : "Expandir redes"}
                      className="rounded-lg p-1 text-suave hover:text-texto hover:bg-borda/40 transition-colors"
                    >
                      <ChevronDown className={`size-4 transition-transform duration-200 ${aberto ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                </div>

                <div className={aberto ? "block border-t border-borda/60 divide-y divide-borda/40 bg-superficie" : "hidden"}>
                  <div className="grid grid-cols-[1fr_80px_80px] bg-fundo/40 px-4 py-2 text-xs font-semibold text-suave">
                    <span>Rede / Plano</span>
                    <span className="text-center">Consulta</span>
                    <span className="text-center">Exame</span>
                  </div>
                  {c.subtipos.map((s) => {
                    const checkC = !!estado[s.id]?.c;
                    const checkE = !!estado[s.id]?.e;
                    return (
                      <div key={s.id} className="grid grid-cols-[1fr_80px_80px] items-center px-4 py-2 hover:bg-fundo/30 transition-colors">
                        <span className="text-sm font-medium text-texto">{s.nome}</span>
                        <span className="grid place-items-center">
                          <input
                            type="checkbox"
                            name={`c:${s.id}`}
                            checked={checkC}
                            onChange={() => toggleCheck(s.id, "c")}
                            className="size-5 accent-verde cursor-pointer"
                          />
                        </span>
                        <span className="grid place-items-center">
                          <input
                            type="checkbox"
                            name={`e:${s.id}`}
                            checked={checkE}
                            onChange={() => toggleCheck(s.id, "e")}
                            className="size-5 accent-azul cursor-pointer"
                          />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <p className="rounded-xl border border-dashed border-borda py-4 text-center text-xs text-suave">
            Nenhum convênio encontrado para &quot;{busca}&quot;.
          </p>
        )}
      </div>
    </div>
  );
}

function FormProfissional({ id }: { id?: string }) {
  const { dados, clinica, executar, abrirForm, avisar } = useStore();
  const router = useRouter();
  const p = dados.profissionais.find((x) => x.id === id);

  const salvar = (f: FormData) => {
    const nome = String(f.get("nome")).trim();
    if (!nome) return avisar("Informe o nome", true);
    if (!dados.especialidades.length) return avisar("Cadastre uma especialidade antes.", true);
    if (!clinica) return;
    const atende: Record<string, string> = {};
    for (const c of dados.convenios) for (const s of c.subtipos) {
      const v = (f.get(`c:${s.id}`) ? "c" : "") + (f.get(`e:${s.id}`) ? "e" : "");
      if (v) atende[s.id] = v;
    }
    const novo: Profissional = {
      id: p?.id ?? novoId("prof"),
      clinicaId: clinica.id,
      nome,
      especialidadeId: String(f.get("especialidade")),
      horarios: lerHorarios(f),
      idadeMinima: Number(f.get("idade")) || undefined,
      procedimentos: String(f.get("procedimentos")).split(",").map((x) => x.trim()).filter(Boolean),
      exames: dados.exames.filter((e) => f.get(`ex:${e.id}`)).map((e) => e.id),
      atende,
      restricoes: linhas(f.get("restricoes")).map((texto) => ({ texto })),
      observacoes: String(f.get("observacoes")).trim(),
    };
    if (!executar((b, u) => salvarProfissional(b, u, novo), p ? "Ficha atualizada" : "Profissional cadastrado")) return;
    abrirForm(null);
    router.push(`/profissionais/${novo.id}`);
  };

  return (
    <Moldura titulo={p ? "Editar profissional" : "Novo profissional"} onSalvar={salvar}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome"><input name="nome" defaultValue={p?.nome} placeholder="Dra. Nome Sobrenome" className={campo} /></Campo>
        <Campo rotulo="Especialidade" dica={dados.especialidades.length ? undefined : "Cadastre uma especialidade antes."}>
          <select name="especialidade" defaultValue={p?.especialidadeId} className={campo}>
            {dados.especialidades.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Idade mínima do paciente"><input name="idade" type="number" min={0} defaultValue={p?.idadeMinima} placeholder="Sem limite" className={campo} /></Campo>
      </div>
      <div>
        <span className="mb-1.5 block text-sm font-semibold">Dias e horários de atendimento</span>
        <EditorHorarios valor={p?.horarios ?? []} />
      </div>
      <Campo rotulo="Convênios atendidos">
        <MatrizConvenios dados={dados} atende={p?.atende ?? {}} />
      </Campo>
      <Campo rotulo="Procedimentos que realiza" dica="Separe por vírgula.">
        <input name="procedimentos" defaultValue={p?.procedimentos.join(", ")} placeholder="Lobuloplastia, Biópsia de pele" className={campo} />
      </Campo>
      <Campo rotulo="Exames que realiza">
        <SeletorExamesProfissional dados={dados} examesIniciais={p?.exames ?? []} />
      </Campo>
      <Campo rotulo="Restrições" dica="Uma por linha.">
        <textarea name="restricoes" rows={3} defaultValue={p?.restricoes.map((r) => r.texto).join("\n")} className={campo} />
      </Campo>
      <Campo rotulo="Observações">
        <textarea name="observacoes" rows={3} defaultValue={p?.observacoes} className={campo} />
      </Campo>
    </Moldura>
  );
}

function SeletorExamesProfissional({
  dados,
  examesIniciais,
}: {
  dados: DadosClinica;
  examesIniciais: string[];
}) {
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState<Set<string>>(() => new Set(examesIniciais));
  const [filtro, setFiltro] = useState<"todos" | "selecionados">("todos");

  const q = busca.trim();

  const toggle = (id: string) => {
    setSelecionados((ant) => {
      const prox = new Set(ant);
      if (prox.has(id)) prox.delete(id);
      else prox.add(id);
      return prox;
    });
  };

  const selecionarTodosFiltrados = (lista: Exame[]) => {
    setSelecionados((ant) => {
      const prox = new Set(ant);
      for (const e of lista) prox.add(e.id);
      return prox;
    });
  };

  const desmarcarTodosFiltrados = (lista: Exame[]) => {
    setSelecionados((ant) => {
      const prox = new Set(ant);
      for (const e of lista) prox.delete(e.id);
      return prox;
    });
  };

  const examesFiltrados = useMemo(() => {
    return dados.exames.filter((e) => {
      if (filtro === "selecionados" && !selecionados.has(e.id)) return false;
      if (!q) return true;
      return combina(e.nome, q);
    });
  }, [dados.exames, selecionados, filtro, q]);

  if (!dados.exames.length) {
    return <p className="text-sm text-suave">Nenhum exame cadastrado na clínica.</p>;
  }

  const idsVisiveis = new Set(examesFiltrados.map((e) => e.id));
  const examesOcultos = dados.exames.filter((e) => !idsVisiveis.has(e.id));

  return (
    <div className="space-y-2.5 rounded-2xl border border-borda bg-fundo/40 p-3">
      {/* Inputs ocultos para itens fora do filtro atual preservarem o valor no FormData */}
      <div className="hidden" aria-hidden="true">
        {examesOcultos.map((e) => (
          selecionados.has(e.id) ? <input key={e.id} type="checkbox" name={`ex:${e.id}`} defaultChecked readOnly /> : null
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-suave" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar exame pelo nome..."
            className="h-9 w-full rounded-xl border border-borda bg-superficie pl-8 pr-7 text-xs outline-none transition focus:border-azul focus:ring-2 focus:ring-azul/15"
          />
          {busca && (
            <button type="button" onClick={() => setBusca("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-suave hover:text-texto">
              <X className="size-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setFiltro("todos")}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${filtro === "todos" ? "bg-texto text-superficie" : "bg-superficie text-suave hover:text-texto border border-borda"}`}
          >
            Todos ({dados.exames.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltro("selecionados")}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${filtro === "selecionados" ? "bg-azul text-white" : "bg-superficie text-suave hover:text-texto border border-borda"}`}
          >
            Selecionados ({selecionados.size})
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-suave">
        <span>{selecionados.size} de {dados.exames.length} exames vinculados</span>
        <div className="flex items-center gap-2 font-medium">
          <button
            type="button"
            onClick={() => selecionarTodosFiltrados(examesFiltrados)}
            className="text-azul hover:underline"
          >
            + Marcar visíveis
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => desmarcarTodosFiltrados(examesFiltrados)}
            className="hover:text-alerta"
          >
            Desmarcar visíveis
          </button>
        </div>
      </div>

      <div className="max-h-48 overflow-y-auto space-y-1 pr-1 bg-superficie rounded-xl border border-borda/60 p-2">
        {examesFiltrados.length ? (
          examesFiltrados.map((e) => {
            const marcado = selecionados.has(e.id);
            return (
              <label
                key={e.id}
                className={`pressionavel flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors select-none ${
                  marcado
                    ? "bg-azul-claro/50 text-azul font-semibold"
                    : "hover:bg-fundo text-texto"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    name={`ex:${e.id}`}
                    checked={marcado}
                    onChange={() => toggle(e.id)}
                    className="accent-azul size-3.5 cursor-pointer"
                  />
                  <span className="truncate">{e.nome}</span>
                </div>
                {e.valor && <span className="text-[11px] font-normal text-suave">{e.valor}</span>}
              </label>
            );
          })
        ) : (
          <p className="py-2 text-center text-xs text-suave">Nenhum exame encontrado para &quot;{busca}&quot;.</p>
        )}
      </div>
    </div>
  );
}

function SeletorConveniosExame({
  dados,
  selecionadosIniciais,
}: {
  dados: DadosClinica;
  selecionadosIniciais: string[];
}) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "selecionados">("todos");
  const [selecionados, setSelecionados] = useState<Set<string>>(() => new Set(selecionadosIniciais));
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const c of dados.convenios) {
      init[c.id] = c.subtipos.some((s) => selecionadosIniciais.includes(s.id));
    }
    return init;
  });

  const q = busca.trim();

  const toggleSub = (subId: string) => {
    setSelecionados((ant) => {
      const prox = new Set(ant);
      if (prox.has(subId)) prox.delete(subId);
      else prox.add(subId);
      return prox;
    });
  };

  const selecionarTodosDoConvenio = (c: Convenio) => {
    setSelecionados((ant) => {
      const prox = new Set(ant);
      for (const s of c.subtipos) prox.add(s.id);
      return prox;
    });
    setExpandidos((ant) => ({ ...ant, [c.id]: true }));
  };

  const desmarcarTodosDoConvenio = (c: Convenio) => {
    setSelecionados((ant) => {
      const prox = new Set(ant);
      for (const s of c.subtipos) prox.delete(s.id);
      return prox;
    });
  };

  const toggleExpansao = (cId: string) => {
    setExpandidos((ant) => ({ ...ant, [cId]: !ant[cId] }));
  };

  const conveniosFiltrados = useMemo(() => {
    return dados.convenios.filter((c) => {
      const marcados = c.subtipos.filter((s) => selecionados.has(s.id)).length;
      if (filtro === "selecionados" && marcados === 0) return false;
      if (!q) return true;
      return combina(`${c.nome} ${c.subtipos.map((s) => s.nome).join(" ")}`, q);
    });
  }, [dados.convenios, selecionados, filtro, q]);

  if (!dados.convenios.length) {
    return <p className="text-sm text-suave">Nenhum convênio cadastrado nesta clínica.</p>;
  }

  // IDs dos convênios fora da busca atual para manter os inputs no FormData
  const idsVisiveis = new Set(conveniosFiltrados.map((c) => c.id));
  const conveniosOcultos = dados.convenios.filter((c) => !idsVisiveis.has(c.id));

  return (
    <div className="space-y-3">
      {/* Inputs ocultos para preservar seleção fora do filtro */}
      <div className="hidden" aria-hidden="true">
        {conveniosOcultos.flatMap((c) => c.subtipos).map((s) => (
          selecionados.has(s.id) ? <input key={s.id} type="checkbox" name={`s:${s.id}`} defaultChecked readOnly /> : null
        ))}
      </div>

      {/* Barra de busca e filtros */}
      <div className="rounded-2xl border border-borda bg-fundo/40 p-3 space-y-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-suave" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar entre os 50+ convênios ou redes..."
            className="h-9 w-full rounded-xl border border-borda bg-superficie pl-9 pr-8 text-xs outline-none transition focus:border-azul focus:ring-2 focus:ring-azul/15"
          />
          {busca && (
            <button type="button" onClick={() => setBusca("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-suave hover:text-texto">
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFiltro("todos")}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${filtro === "todos" ? "bg-texto text-superficie" : "bg-superficie text-suave hover:text-texto border border-borda"}`}
            >
              Todos ({dados.convenios.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltro("selecionados")}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${filtro === "selecionados" ? "bg-azul text-white" : "bg-superficie text-suave hover:text-texto border border-borda"}`}
            >
              Com cobertura ({dados.convenios.filter((c) => c.subtipos.some((s) => selecionados.has(s.id))).length})
            </button>
          </div>
          <span className="text-suave">
            {selecionados.size} redes selecionadas
          </span>
        </div>
      </div>

      <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
        {conveniosFiltrados.length ? (
          conveniosFiltrados.map((c) => {
            const marcados = c.subtipos.filter((s) => selecionados.has(s.id)).length;
            const todosMarcados = marcados === c.subtipos.length && c.subtipos.length > 0;
            const aberto = !!expandidos[c.id] || (!!q && marcados > 0);

            return (
              <div key={c.id} className="overflow-hidden rounded-2xl border border-borda bg-superficie transition-all">
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-fundo/60">
                  <button
                    type="button"
                    onClick={() => toggleExpansao(c.id)}
                    className="flex items-center gap-2.5 font-semibold text-sm text-texto hover:text-azul transition-colors text-left"
                  >
                    <LogoMarca nome={c.nome} logo={c.logo} cor={c.cor} tamanho="sm" />
                    <span>{c.nome}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${marcados > 0 ? "bg-azul-claro text-azul" : "bg-borda/40 text-suave"}`}>
                      {todosMarcados ? `Todas (${c.subtipos.length})` : `${marcados} de ${c.subtipos.length} redes`}
                    </span>
                  </button>

                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => selecionarTodosDoConvenio(c)}
                      className={`rounded-lg px-2.5 py-1 transition-colors ${todosMarcados ? "bg-azul text-white shadow-sm" : "text-azul hover:bg-azul-claro"}`}
                    >
                      {todosMarcados ? "✓ Todas" : "+ Todas"}
                    </button>
                    {marcados > 0 && (
                      <button
                        type="button"
                        onClick={() => desmarcarTodosDoConvenio(c)}
                        className="rounded-lg px-2 py-1 text-suave hover:text-alerta transition-colors"
                      >
                        Nenhuma
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleExpansao(c.id)}
                      aria-label={aberto ? "Recolher redes" : "Expandir redes"}
                      className="rounded-lg p-1 text-suave hover:text-texto hover:bg-borda/40 transition-colors"
                    >
                      <ChevronDown className={`size-4 transition-transform duration-200 ${aberto ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                </div>

                <div className={aberto ? "block border-t border-borda/60 p-3 bg-superficie" : "hidden"}>
                  {c.subtipos.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {c.subtipos.map((s) => {
                        const ativo = selecionados.has(s.id);
                        return (
                          <label
                            key={s.id}
                            className={`pressionavel flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-1.5 text-sm transition-all select-none ${
                              ativo
                                ? "border-azul/50 bg-azul-claro text-azul font-medium shadow-sm"
                                : "border-borda/80 bg-fundo text-texto hover:border-borda"
                            }`}
                          >
                            <input
                              type="checkbox"
                              name={`s:${s.id}`}
                              checked={ativo}
                              onChange={() => toggleSub(s.id)}
                              className="accent-azul size-4 rounded cursor-pointer"
                            />
                            <span>{s.nome}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-suave">Nenhuma rede cadastrada para este convênio.</p>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <p className="rounded-xl border border-dashed border-borda py-4 text-center text-xs text-suave">
            Nenhum convênio encontrado para &quot;{busca}&quot;.
          </p>
        )}
      </div>
    </div>
  );
}

function SeletorProfissionaisExame({ dados, exameId }: { dados: DadosClinica; exameId?: string }) {
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState<Set<string>>(() => {
    if (!exameId) return new Set();
    return new Set(dados.profissionais.filter((p) => p.exames.includes(exameId)).map((p) => p.id));
  });

  const q = busca.trim();

  const filtrados = useMemo(() => {
    return dados.profissionais.filter((p) => {
      if (!q) return true;
      const espNome = dados.especialidades.find((e) => e.id === p.especialidadeId)?.nome ?? "";
      return combina(`${p.nome} ${espNome}`, q);
    });
  }, [dados.profissionais, dados.especialidades, q]);

  const toggle = (id: string) => {
    setSelecionados((ant) => {
      const prox = new Set(ant);
      if (prox.has(id)) prox.delete(id);
      else prox.add(id);
      return prox;
    });
  };

  const selecionarTodos = () => {
    setSelecionados((ant) => {
      const prox = new Set(ant);
      for (const p of filtrados) prox.add(p.id);
      return prox;
    });
  };

  const desmarcarTodos = () => {
    setSelecionados((ant) => {
      const prox = new Set(ant);
      for (const p of filtrados) prox.delete(p.id);
      return prox;
    });
  };

  if (!dados.profissionais.length) {
    return <p className="text-sm text-suave">Nenhum profissional cadastrado na clínica.</p>;
  }

  // Preserva os profissionais marcados fora do filtro no FormData
  const idsVisiveis = new Set(filtrados.map((p) => p.id));
  const profsOcultos = dados.profissionais.filter((p) => !idsVisiveis.has(p.id));

  return (
    <div className="space-y-3 rounded-2xl border border-borda bg-superficie p-3.5">
      <div className="hidden" aria-hidden="true">
        {profsOcultos.map((p) => (
          selecionados.has(p.id) ? <input key={p.id} type="checkbox" name={`prof:${p.id}`} defaultChecked readOnly /> : null
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-suave" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por médico ou especialidade..."
            className="h-9 w-full rounded-xl border border-borda bg-fundo pl-8 pr-7 text-xs outline-none transition focus:border-verde focus:ring-2 focus:ring-verde/15"
          />
          {busca && (
            <button type="button" onClick={() => setBusca("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-suave hover:text-texto">
              <X className="size-3" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <button
            type="button"
            onClick={selecionarTodos}
            className="rounded-lg px-2 py-1 text-verde hover:bg-verde-claro transition-colors"
          >
            + Marcar todos
          </button>
          <button
            type="button"
            onClick={desmarcarTodos}
            className="rounded-lg px-2 py-1 text-suave hover:text-alerta transition-colors"
          >
            Limpar
          </button>
          <span className="rounded-md bg-verde-claro px-2 py-0.5 text-verde">
            {selecionados.size} de {dados.profissionais.length} vinculados
          </span>
        </div>
      </div>

      <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
        {filtrados.length ? (
          filtrados.map((p) => {
            const espNome = dados.especialidades.find((e) => e.id === p.especialidadeId)?.nome;
            const marcado = selecionados.has(p.id);
            return (
              <label
                key={p.id}
                className={`pressionavel flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-2.5 transition-colors select-none ${
                  marcado
                    ? "border-verde/40 bg-verde-claro/30 ring-1 ring-verde/15"
                    : "border-borda/60 bg-fundo/40 hover:bg-fundo"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <input
                    type="checkbox"
                    name={`prof:${p.id}`}
                    checked={marcado}
                    onChange={() => toggle(p.id)}
                    className="size-4 accent-verde cursor-pointer"
                  />
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-texto">{p.nome}</span>
                    {espNome && <span className="block text-xs text-suave">{espNome}</span>}
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${marcado ? "bg-verde-claro text-verde" : "text-suave"}`}>
                  {marcado ? "Realiza" : "Não realiza"}
                </span>
              </label>
            );
          })
        ) : (
          <p className="py-3 text-center text-xs text-suave">Nenhum médico encontrado para &quot;{busca}&quot;.</p>
        )}
      </div>
    </div>
  );
}

function FormExame({ id }: { id?: string }) {
  const { dados, clinica, executar, abrirForm, abrir, avisar } = useStore();
  const ex = dados.exames.find((x) => x.id === id);

  const salvar = (f: FormData) => {
    const nome = String(f.get("nome")).trim();
    if (!nome) return avisar("Informe o nome do exame", true);
    if (!clinica) return;
    const novo: Exame = {
      id: ex?.id ?? novoId("exame"),
      clinicaId: clinica.id,
      nome,
      preparo: linhas(f.get("preparo")),
      valor: String(f.get("valor") ?? "").trim(),
      observacoes: String(f.get("observacoes") ?? "").trim(),
      subtipos: dados.convenios.flatMap((c) => c.subtipos).filter((s) => f.get(`s:${s.id}`)).map((s) => s.id),
    };
    const profsIds = dados.profissionais.filter((p) => f.get(`prof:${p.id}`)).map((p) => p.id);
    if (!executar((b, u) => salvarExameComProfissionais(b, u, novo, profsIds), ex ? "Exame atualizado" : "Exame cadastrado")) return;
    abrirForm(null);
    abrir({ tipo: "exame", id: novo.id });
  };

  return (
    <Moldura titulo={ex ? "Editar exame" : "Novo exame"} onSalvar={salvar}>
      <Campo rotulo="Nome do exame"><input name="nome" defaultValue={ex?.nome} className={campo} /></Campo>
      <Campo rotulo="Preparo" dica="Um passo por linha. Inclua o que o paciente deve trazer no dia.">
        <textarea name="preparo" rows={5} defaultValue={ex?.preparo.join("\n")} placeholder={"Jejum de 4 horas\nTrazer exames anteriores e pedido médico"} className={campo} />
      </Campo>
      <Campo rotulo="Valor particular" dica="Só o valor sem convênio. O que o convênio paga fica com o faturamento.">
        <input name="valor" defaultValue={ex?.valor} placeholder="Ex.: R$ 150,00" className={campo} />
      </Campo>
      <Campo rotulo="Observações" dica="Avisos para a central, ex.: só às terças, agendar com 7 dias de antecedência.">
        <textarea name="observacoes" rows={3} defaultValue={ex?.observacoes} className={campo} />
      </Campo>
      <div>
        <span className="mb-2 block text-sm font-semibold">Profissionais que realizam este exame</span>
        <SeletorProfissionaisExame dados={dados} exameId={ex?.id} />
      </div>
      <div>
        <span className="mb-2 block text-sm font-semibold">Convênios e Redes que cobrem</span>
        <SeletorConveniosExame dados={dados} selecionadosIniciais={ex?.subtipos ?? []} />
      </div>
    </Moldura>
  );
}

function FormEspecialidade() {
  const { clinica, executar, abrirForm, avisar } = useStore();
  const salvar = (f: FormData) => {
    const nome = String(f.get("nome")).trim();
    if (!nome) return avisar("Informe o nome", true);
    if (!clinica) return;
    const nova = { id: novoId("esp"), clinicaId: clinica.id, nome, icone: "Stethoscope" };
    if (executar((b, u) => salvarEspecialidade(b, u, nova), "Especialidade cadastrada")) abrirForm(null);
  };
  return (
    <Moldura titulo="Nova especialidade" onSalvar={salvar}>
      <Campo rotulo="Nome"><input name="nome" placeholder="Ex.: Mastologia" className={campo} /></Campo>
    </Moldura>
  );
}

function FormConvenio({ id }: { id?: string }) {
  const { dados, clinica, executar, abrirForm, avisar } = useStore();
  const c = dados.convenios.find((x) => x.id === id);
  const [logo, setLogo] = useState(c?.logo);
  const [nomeAtual, setNomeAtual] = useState(c?.nome ?? "");

  const grupos = c ? gruposPlanosDoConvenio(c) : [];
  const gAtende = grupos.find((g) => g.status === "atende");
  const gSomente = grupos.find((g) => g.status === "somente_exames");
  const gNao = grupos.find((g) => g.status === "nao_atende");
  const obsIniciais = c ? observacoesDoConvenio(c) : [];

  const salvar = (f: FormData) => {
    const nome = String(f.get("nome")).trim();
    if (!nome) return avisar("Informe o nome do convênio", true);
    if (!clinica) return;
    const convId = c?.id ?? novoId("conv");

    const planosAtende = String(f.get("planosAtende") ?? "")
      .split(/[\n,]/)
      .map((x) => x.trim())
      .filter(Boolean);

    const planosSomente = String(f.get("planosSomente") ?? "")
      .split(/[\n,]/)
      .map((x) => x.trim())
      .filter(Boolean);
    const notaSomente = String(f.get("notaSomente") ?? "").trim();

    const planosNao = String(f.get("planosNao") ?? "")
      .split(/[\n,]/)
      .map((x) => x.trim())
      .filter(Boolean);

    const observacoes = String(f.get("observacoes") ?? "")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

    // Tipos de rede para vinculação de profissionais e exames
    const redesManuais = String(f.get("subtipos") ?? "").split(/[\n,]/).map((x) => x.trim()).filter(Boolean);
    const nomesRedes = redesManuais.length > 0
      ? redesManuais
      : Array.from(new Set([...planosAtende, ...planosSomente]));

    const novosGrupos: GrupoPlano[] = [
      { status: "atende", titulo: "Atende consultas e exames", planos: planosAtende },
      { status: "somente_exames", titulo: "Somente exames", nota: notaSomente || undefined, planos: planosSomente },
      { status: "nao_atende", titulo: "Não atendemos", planos: planosNao },
    ];

    const novo: Convenio = {
      id: convId,
      clinicaId: clinica.id,
      nome,
      cor: c?.cor ?? corDoIndice(dados.convenios.length),
      logo,
      // rede com o mesmo nome mantém o id, para não perder o que já foi marcado nos médicos e exames
      subtipos: nomesRedes.map((n) => c?.subtipos.find((s) => s.nome === n) ?? { id: `${convId}-${slug(n)}`, nome: n }),
      gruposPlanos: novosGrupos,
      observacoesGerais: observacoes,
    };
    if (executar((b, u) => salvarConvenio(b, u, novo), c ? "Convênio atualizado" : "Convênio cadastrado")) abrirForm(null);
  };
  return (
    <Moldura titulo={c ? "Editar convênio" : "Novo convênio"} onSalvar={salvar}>
      <EnvioLogo nome={nomeAtual} cor={c?.cor ?? corDoIndice(dados.convenios.length)} valor={logo} onChange={setLogo} />
      <Campo rotulo="Nome do convênio">
        <input name="nome" defaultValue={c?.nome} onChange={(e) => setNomeAtual(e.target.value)} placeholder="Ex.: Unimed" className={campo} />
      </Campo>

      <div className="border-t border-borda pt-4 space-y-4">
        <h4 className="text-sm font-bold text-texto">Regras de Atendimento e Planos da Carteirinha</h4>

        <Campo rotulo="● Atende consultas e exames" dica="Separe por vírgula ou cole a coluna da planilha (um por linha).">
          <textarea
            name="planosAtende"
            rows={2}
            defaultValue={gAtende?.planos.join(", ") ?? ""}
            placeholder="Ex.: Essencial, Prime, Select, Quality"
            className={campo}
          />
        </Campo>

        <div className="space-y-2">
          <Campo rotulo="● Somente exames" dica="Separe por vírgula ou cole a coluna da planilha (um por linha).">
            <textarea
              name="planosSomente"
              rows={2}
              defaultValue={gSomente?.planos.join(", ") ?? ""}
              placeholder="Ex.: Preferencial, Fácil, Prático, Pleno"
              className={campo}
            />
          </Campo>
          <Campo rotulo="Aviso / Restrição para somente exames" dica="Exibido em destaque âmbar para a recepção.">
            <input
              name="notaSomente"
              defaultValue={gSomente?.nota ?? "Não precisa de encaminhamento para a clínica"}
              placeholder="Ex.: Não precisa de encaminhamento para a clínica"
              className={campo}
            />
          </Campo>
        </div>

        <Campo rotulo="● Não atendemos" dica="Planos que a clínica recusa. Vírgula ou um por linha.">
          <textarea
            name="planosNao"
            rows={2}
            defaultValue={gNao?.planos.join(", ") ?? ""}
            placeholder="Ex.: Life, Ser, Dental"
            className={campo}
          />
        </Campo>

        <Campo rotulo="Observações gerais operacionais" dica="Uma por linha. Exibidas com ícone de alerta.">
          <textarea
            name="observacoes"
            rows={3}
            defaultValue={obsIniciais.join("\n")}
            placeholder={"Procedimentos ginecológicos não precisam de pacote\nBiópsia: apenas autorização do procedimento\nDocumentação por e-mail de autorização"}
            className={campo}
          />
        </Campo>

        <details className="text-xs text-suave">
          <summary className="cursor-pointer font-semibold hover:text-texto">Avançado: Redes técnicas para médicos</summary>
          <div className="mt-2">
            <Campo rotulo="Redes manuais" dica="Opcional. Se vazio, sincroniza com os planos de consulta e exames.">
              <textarea name="subtipos" rows={2} defaultValue={c?.subtipos.map((s) => s.nome).join(", ")} className={campo} />
            </Campo>
          </div>
        </details>
      </div>
    </Moldura>
  );
}

function FormOrganizacao() {
  const { executar, abrirForm, avisar } = useStore();
  const salvar = (f: FormData) => {
    const nome = String(f.get("nome")).trim();
    if (!nome) return avisar("Informe o nome da organização", true);
    if (executar((b, u) => salvarOrganizacao(b, u, { id: novoId("org"), nome }), "Organização cadastrada")) abrirForm(null);
  };
  return (
    <Moldura titulo="Nova organização" onSalvar={salvar}>
      <Campo rotulo="Nome da organização"><input name="nome" placeholder="Ex.: Clínica de Oncologia e Mastologia" className={campo} /></Campo>
    </Moldura>
  );
}

function FormClinica({ id }: { id?: string }) {
  const { banco, executar, abrirForm, avisar } = useStore();
  const c = banco.clinicas.find((x) => x.id === id);
  const [logo, setLogo] = useState(c?.logo);
  const [nomeAtual, setNomeAtual] = useState(c?.nome ?? "");
  const salvar = (f: FormData) => {
    const nome = String(f.get("nome")).trim();
    if (!nome) return avisar("Informe o nome da clínica", true);
    const organizacaoId = c?.organizacaoId ?? String(f.get("organizacao"));
    const nova = { id: c?.id ?? novoId("clinica"), organizacaoId, nome, logo };
    if (executar((b, u) => salvarClinica(b, u, nova), c ? "Clínica atualizada" : "Clínica cadastrada")) abrirForm(null);
  };
  return (
    <Moldura titulo={c ? "Editar clínica" : "Nova clínica"} onSalvar={salvar}>
      <EnvioLogo nome={nomeAtual} valor={logo} onChange={setLogo} />
      {!c && (
        <Campo rotulo="Organização">
          <select name="organizacao" className={campo}>
            {banco.organizacoes.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
        </Campo>
      )}
      <Campo rotulo="Nome da clínica">
        <input name="nome" defaultValue={c?.nome} onChange={(e) => setNomeAtual(e.target.value)} placeholder="Ex.: COMN" className={campo} />
      </Campo>
    </Moldura>
  );
}

function FormUsuario() {
  const { banco, executar, abrirForm, avisar } = useStore();
  const [papel, setPapel] = useState<Papel>("recepcao");
  const todas = papel === "administrador" || papel === "comercial";

  const salvar = (f: FormData) => {
    const nome = String(f.get("nome")).trim();
    const email = String(f.get("email")).trim();
    if (!nome || !email) return avisar("Informe nome e e-mail", true);
    const clinicas = todas ? [] : banco.clinicas.filter((c) => f.get(`cl:${c.id}`)).map((c) => c.id);
    // a regra "pelo menos uma clínica" é conferida no repositório
    if (executar((b, u) => salvarUsuario(b, u, { id: novoId("usuario"), nome, email, papel, clinicas }), "Usuário cadastrado")) abrirForm(null);
  };

  return (
    <Moldura titulo="Novo usuário" onSalvar={salvar}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome"><input name="nome" placeholder="Ex.: Recepção COMN tarde" className={campo} /></Campo>
        <Campo rotulo="E-mail"><input name="email" type="email" placeholder="nome@clinica.com.br" className={campo} /></Campo>
      </div>
      <fieldset>
        <legend className="mb-1.5 block text-sm font-semibold">Papel</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(PAPEIS) as Papel[]).map((p) => (
            <label key={p} className="pressionavel flex cursor-pointer gap-3 rounded-xl border border-borda px-3 py-2.5 has-[:checked]:border-verde/50 has-[:checked]:bg-verde-claro">
              <input type="radio" name="papel" checked={papel === p} onChange={() => setPapel(p)} className="mt-1 size-4 accent-verde" />
              <span>
                <span className="block text-sm font-semibold">{PAPEIS[p].rotulo}</span>
                <span className="block text-xs text-suave">{PAPEIS[p].descricao}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {todas ? (
        <p className="rounded-xl bg-fundo px-4 py-3 text-sm text-suave">{PAPEIS[papel].rotulo} acessa todas as clínicas.</p>
      ) : (
        <fieldset>
          <legend className="mb-1.5 block text-sm font-semibold">Clínicas vinculadas</legend>
          <div className="space-y-3">
            {banco.organizacoes.map((o) => {
              const daOrg = banco.clinicas.filter((c) => c.organizacaoId === o.id);
              return daOrg.length > 0 && (
                <div key={o.id}>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-suave">{o.nome}</p>
                  <div className="flex flex-wrap gap-2">
                    {daOrg.map((c) => (
                      <label key={c.id} className="pressionavel flex cursor-pointer items-center gap-2 rounded-xl border border-borda px-3 py-1.5 text-sm has-[:checked]:border-azul/40 has-[:checked]:bg-azul-claro has-[:checked]:text-azul">
                        <input type="checkbox" name={`cl:${c.id}`} className="accent-azul" />{c.nome}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </fieldset>
      )}
    </Moldura>
  );
}
