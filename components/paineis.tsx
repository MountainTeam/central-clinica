"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, CircleDollarSign, ClipboardList, Copy, FlaskConical, Minus, Pencil, Search, ShieldCheck, UserRound, X } from "lucide-react";
import { useStore, type Painel } from "@/lib/store";
import { resumoHorarios, semAcento } from "@/lib/regras";
import type { DadosClinica, Exame, Profissional } from "@/lib/modelo";
import { Avatar, Botao, Chip, Janela, LogoMarca, Secao, Vazio } from "./ui";

export function Paineis() {
  const { painel, abrir, dados } = useStore();
  // mantém o conteúdo visível enquanto a janela some
  const [ultimo, setUltimo] = useState<Painel>(null);
  if (painel && painel !== ultimo) setUltimo(painel);
  const atual = painel ?? ultimo;

  return (
    <Janela aberta={!!painel} onFechar={() => abrir(null)}
      titulo={`Preparo · ${dados.exames.find((e) => e.id === atual?.id)?.nome ?? "Exame"}`}>
      {atual && <FichaExame key={atual.id} id={atual.id} />}
    </Janela>
  );
}

function FichaExame({ id }: { id: string }) {
  const { dados, podeEditarAtual, abrirForm, avisar } = useStore();
  const ex = dados.exames.find((e) => e.id === id);
  if (!ex) return null;
  const quemFaz = dados.profissionais.filter((p) => p.exames.includes(ex.id));

  const copiar = async () => {
    const texto = `${ex.nome}\n\nPreparo:\n${ex.preparo.map((x, i) => `${i + 1}. ${x}`).join("\n")}${ex.valor ? `\n\nValor: ${ex.valor}` : ""}`;
    try { await navigator.clipboard.writeText(texto); avisar("Orientações copiadas"); } catch { avisar("Não foi possível copiar", true); }
  };

  return (
    <div className="space-y-7 p-5 sm:p-6">
      <header className="entrar flex items-start gap-4">
        <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white"><FlaskConical className="size-7" /></div>
        <div>
          <p className="text-sm font-medium text-azul">Exame</p>
          <h2 className="text-2xl font-bold tracking-tight">{ex.nome}</h2>
        </div>
      </header>

      <div className="entrar -mt-4 flex flex-wrap gap-2" style={{ "--i": 1 } as React.CSSProperties}>
        <Botao onClick={copiar}><Copy className="size-4" />Copiar orientações</Botao>
        {podeEditarAtual && <Botao variante="secundario" onClick={() => abrirForm({ tipo: "exame", id: ex.id })}><Pencil className="size-4" />Editar</Botao>}
      </div>

      <Secao titulo="Preparo do paciente" icone={<ClipboardList className="size-4" />} i={2}>
        <ol className="space-y-2">
          {ex.preparo.map((passo, k) => (
            <li key={k} className="entrar flex gap-3 rounded-2xl border border-borda px-4 py-3 text-[15px]" style={{ "--i": k + 3 } as React.CSSProperties}>
              <span className="grid size-6 shrink-0 place-items-center rounded-full gradiente-marca text-xs font-bold text-white">{k + 1}</span>
              {passo}
            </li>
          ))}
        </ol>
      </Secao>

      <Secao titulo="Valor do exame" icone={<CircleDollarSign className="size-4" />} i={4}>
        <div className="flex items-center gap-3 rounded-2xl bg-fundo px-4 py-3">
          <span className="text-lg font-bold text-verde">
            {ex.valor || "Consulte a recepção"}
          </span>
          {ex.valor && <span className="text-xs font-medium text-suave">Particular / sem convênio</span>}
        </div>
      </Secao>

      <Secao titulo="Convênios que cobrem" icone={<ShieldCheck className="size-4" />} i={5}>
        <ChecadorConveniosExame ex={ex} dados={dados} />
      </Secao>

      <Secao titulo="Quem realiza" icone={<UserRound className="size-4" />} i={6}>
        <QuemRealizaExame quemFaz={quemFaz} />
      </Secao>
    </div>
  );
}

function ChecadorConveniosExame({ ex, dados }: { ex: Exame; dados: DadosClinica }) {
  const [busca, setBusca] = useState("");
  const [expandido, setExpandido] = useState(false);

  const porConvenio = useMemo(() => {
    return dados.convenios
      .map((c) => ({ c, subs: c.subtipos.filter((s) => ex.subtipos.includes(s.id)) }))
      .filter((x) => x.subs.length > 0);
  }, [dados.convenios, ex.subtipos]);

  const totalRedes = porConvenio.reduce((acc, curr) => acc + curr.subs.length, 0);
  const q = semAcento(busca.trim());

  const resultadoBusca = useMemo(() => {
    if (!q) return null;

    const matchesClinica = dados.convenios.filter((c) => {
      const nomeC = semAcento(c.nome);
      const redes = c.subtipos.map((s) => semAcento(s.nome));
      return nomeC.includes(q) || redes.some((r) => r.includes(q));
    });

    const cobertosNoMatch = matchesClinica
      .map((c) => {
        const subsCobertos = c.subtipos.filter((s) => {
          const cobre = ex.subtipos.includes(s.id);
          if (!cobre) return false;
          return semAcento(c.nome).includes(q) || semAcento(s.nome).includes(q);
        });
        return { c, subs: subsCobertos };
      })
      .filter((x) => x.subs.length > 0);

    const naoCobertosNoMatch = matchesClinica.filter((c) => {
      const cobreAlgum = c.subtipos.some((s) => ex.subtipos.includes(s.id));
      return !cobreAlgum;
    });

    return { cobertosNoMatch, naoCobertosNoMatch, totalEncontrados: matchesClinica.length };
  }, [dados.convenios, ex.subtipos, q]);

  if (!dados.convenios.length) {
    return <Vazio texto="Nenhum convênio cadastrado nesta clínica." />;
  }

  if (!porConvenio.length) {
    return (
      <div className="rounded-2xl border border-borda/80 bg-fundo/40 p-4 text-center">
        <p className="text-sm font-medium text-suave">Disponível exclusivamente para atendimento Particular.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Resumo simples e direto */}
      <div className="flex items-center justify-between text-xs text-suave">
        <span>
          Coberto por <strong className="font-semibold text-texto">{porConvenio.length} convênios</strong> ({totalRedes} redes)
        </span>
      </div>

      {/* Campo de Consulta Rápida */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-suave" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Consultar se convênio do paciente cobre..."
          className="h-10 w-full rounded-xl border border-borda bg-superficie pl-9 pr-8 text-xs outline-none transition placeholder:text-suave focus:border-azul focus:ring-2 focus:ring-azul/15"
        />
        {busca && (
          <button
            onClick={() => setBusca("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-suave hover:bg-borda/40 hover:text-texto"
            title="Limpar consulta"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* RESULTADO DA BUSCA SOB DEMANDA */}
      {busca && resultadoBusca ? (
        <div className="space-y-2 pt-1">
          {resultadoBusca.totalEncontrados === 0 ? (
            <div className="rounded-xl border border-dashed border-borda p-3.5 text-center">
              <p className="text-xs text-suave">Nenhum convênio encontrado para &quot;{busca}&quot; nesta unidade.</p>
            </div>
          ) : (
            <>
              {resultadoBusca.cobertosNoMatch.map(({ c, subs }) => (
                <div key={c.id} className="rounded-2xl border border-azul/40 bg-superficie p-3.5 space-y-2 shadow-sm ring-1 ring-azul/10">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-bold text-sm text-texto">
                      <LogoMarca nome={c.nome} logo={c.logo} cor={c.cor} tamanho="sm" />
                      {c.nome}
                    </span>
                    <span className="rounded-md bg-azul-claro px-2.5 py-0.5 text-xs font-bold text-azul">
                      ✓ Coberto ({subs.length} rede{subs.length > 1 ? "s" : ""})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1.5 border-t border-borda/40">
                    {subs.map((s) => (
                      <Chip key={s.id} tom="azul">{s.nome}</Chip>
                    ))}
                  </div>
                </div>
              ))}

              {resultadoBusca.naoCobertosNoMatch.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-xl border border-borda bg-fundo/40 p-2.5 text-xs">
                  <div className="flex items-center gap-2 opacity-60">
                    <LogoMarca nome={c.nome} logo={c.logo} cor={c.cor} tamanho="sm" />
                    <span className="font-medium text-texto">{c.nome}</span>
                  </div>
                  <span className="rounded bg-borda/50 px-2 py-0.5 font-medium text-suave">
                    Não cobre este exame
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      ) : (
        /* ESTADO PADRÃO LIMPO: Apenas o botão recolhido */
        <div className="pt-0.5">
          <button
            type="button"
            onClick={() => setExpandido(!expandido)}
            className="pressionavel flex w-full items-center justify-between rounded-xl border border-borda bg-fundo/50 px-3.5 py-2 text-xs font-semibold text-texto hover:bg-fundo hover:border-azul/40 transition-colors"
          >
            <span>{expandido ? "Ocultar lista de convênios" : `Ver todos os ${porConvenio.length} convênios credenciados`}</span>
            <ChevronDown className={`size-3.5 text-suave transition-transform duration-200 ${expandido ? "rotate-180" : ""}`} />
          </button>

          {expandido && (
            <div className="mt-2.5 space-y-2 border-t border-borda/40 pt-2.5">
              {porConvenio.map(({ c, subs }) => {
                const cobreTudo = subs.length === c.subtipos.length && c.subtipos.length > 1;
                return (
                  <div key={c.id} className="rounded-2xl border border-borda/80 bg-fundo/30 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 font-bold text-xs text-texto">
                        <LogoMarca nome={c.nome} logo={c.logo} cor={c.cor} tamanho="sm" />
                        {c.nome}
                      </span>
                      <span className="rounded-md bg-azul-claro px-2 py-0.5 text-[11px] font-semibold text-azul">
                        {cobreTudo ? `Todas (${subs.length})` : `${subs.length} de ${c.subtipos.length} redes`}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1 border-t border-borda/40">
                      {subs.map((s) => (
                        <Chip key={s.id} tom="azul">{s.nome}</Chip>
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

function QuemRealizaExame({ quemFaz }: { quemFaz: Profissional[] }) {
  const [busca, setBusca] = useState("");
  const q = semAcento(busca.trim());

  const filtrados = useMemo(() => {
    if (!q) return quemFaz;
    return quemFaz.filter((p) => semAcento(p.nome).includes(q));
  }, [quemFaz, q]);

  if (!quemFaz.length) return <Vazio texto="Nenhum profissional vinculado." />;

  return (
    <div className="space-y-2.5">
      {quemFaz.length > 3 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-suave" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={`Buscar entre os ${quemFaz.length} médicos...`}
            className="h-8 w-full rounded-xl border border-borda bg-superficie pl-8 pr-7 text-xs outline-none transition focus:border-verde focus:ring-2 focus:ring-verde/15"
          />
          {busca && (
            <button onClick={() => setBusca("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-suave hover:text-texto">
              <X className="size-3" />
            </button>
          )}
        </div>
      )}

      {filtrados.length ? (
        <div className="space-y-1.5">
          {filtrados.map((p) => (
            <Link
              key={p.id}
              href={`/profissionais/${p.id}`}
              className="pressionavel group flex w-full items-center gap-3 rounded-2xl border border-borda px-3 py-2 text-left hover:border-verde/30 hover:bg-verde-claro/50"
            >
              <Avatar nome={p.nome} />
              <span className="flex-1 min-w-0">
                <span className="block truncate font-semibold text-sm">{p.nome}</span>
                <span className="block truncate text-xs text-suave">{resumoHorarios(p.horarios)}</span>
              </span>
              <ChevronRight className="size-4 text-suave transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-xs text-suave py-2">Nenhum profissional corresponde a &quot;{busca}&quot;.</p>
      )}
    </div>
  );
}

