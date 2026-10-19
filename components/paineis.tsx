"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, ClipboardList, Copy, FlaskConical, Info, Pencil, Search, ShieldCheck, TriangleAlert, UserRound, X } from "lucide-react";
import { useStore, type Painel } from "@/lib/store";
import { atende, coberturaDaBusca, combina, formatarValor, gruposHorarios, subtipoInfo } from "@/lib/regras";
import { DIAS, type DadosClinica, type Exame, type Profissional } from "@/lib/modelo";
import { Atualizado, Avatar, Botao, Chip, Janela, LogoMarca, ObservacaoInterna, Secao, Vazio } from "./ui";

export function Paineis() {
  const { painel, abrir, dados } = useStore();
  // mantém o conteúdo visível enquanto a janela some
  const [ultimo, setUltimo] = useState<Painel>(null);
  if (painel && painel !== ultimo) setUltimo(painel);
  const atual = painel ?? ultimo;

  return (
    <Janela aberta={!!painel} onFechar={() => abrir(null)}
      titulo={dados.exames.find((e) => e.id === atual?.id)?.nome ?? ""}>
      {atual && <FichaExame key={atual.id} id={atual.id} />}
    </Janela>
  );
}

function Filtro({ valor, onChange, placeholder }: { valor: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-suave" />
      <input value={valor} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}
        className="h-10 w-full rounded-xl border border-borda bg-superficie pl-9 pr-3 text-sm outline-none transition focus:border-verde focus:ring-4 focus:ring-verde/15" />
    </div>
  );
}

// Quem realiza: exibe o médico de forma compacta (nome, especialidade, atende hoje) com detalhes expansíveis
function QuemRealiza({ p, cobre, dados }: { p: Profissional; cobre: boolean; dados: DadosClinica }) {
  const { plano } = useStore();
  const rede = plano ? subtipoInfo(dados, plano.subtipoId)?.subtipo : undefined;
  const [aberto, setAberto] = useState(false);
  const espNome = dados.especialidades.find((e) => e.id === p.especialidadeId)?.nome;
  const hoje = DIAS[new Date().getDay() - 1];
  const atendeHoje = hoje ? p.horarios.some((h) => h.dia === hoje) : false;
  const semNotas = !p.observacoes && !p.observacoesInternas && !p.restricoes.length && !p.idadeMinima;

  return (
    <div className={`overflow-hidden rounded-2xl border transition ${aberto ? "border-verde/40 shadow-sm" : "border-borda"}`}>
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        aria-expanded={aberto}
        className="pressionavel flex w-full items-center gap-3 px-3.5 py-3 text-left transition hover:bg-verde-claro/30"
      >
        <Avatar nome={p.nome} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 font-semibold">
            <span className="line-clamp-1 text-sm text-texto">{p.nome}</span>
            {p.restricoes.length > 0 && (
              <TriangleAlert className="size-3.5 shrink-0 text-alerta" aria-label="Tem restrições" />
            )}
          </span>
          {espNome && <span className="block text-xs text-suave">{espNome}</span>}
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            {atendeHoje && (
              <Chip tom="verde">
                <span className="pulso size-1.5 rounded-full bg-verde" />
                Atende hoje
              </Chip>
            )}
            {p.restricoes.length > 0 && (
              <Chip tom="alerta">
                {p.restricoes.length === 1 ? "1 restrição" : `${p.restricoes.length} restrições`}
              </Chip>
            )}
            {plano && rede && cobre && (
              atende(p, plano.subtipoId, "exame")
                ? <Chip tom="verde">Faz pelo {rede.nome}</Chip>
                : <Chip tom="perigo">Não faz pelo {rede.nome}</Chip>
            )}
          </span>
        </span>
        <ChevronDown className={`size-4 shrink-0 text-suave transition-transform duration-200 ${aberto ? "rotate-180" : ""}`} />
      </button>

      {aberto && (
        <div className="entrar space-y-2.5 border-t border-borda/60 bg-fundo/40 p-3.5 text-sm">
          {p.idadeMinima && <Chip>A partir de {p.idadeMinima} anos</Chip>}
          {p.restricoes.map((r, k) => {
            const info = r.subtipoId ? subtipoInfo(dados, r.subtipoId) : undefined;
            return (
              <p key={k} className="flex gap-2 rounded-xl bg-alerta-claro px-3 py-2 text-xs font-medium text-alerta">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                <span>{r.texto}{info && <span className="ml-1 opacity-75">· {info.convenio.nome} · {info.subtipo.nome}</span>}</span>
              </p>
            );
          })}
          {p.observacoes && <p className="whitespace-pre-line rounded-xl bg-superficie p-3 text-xs leading-relaxed text-texto ring-1 ring-borda">{p.observacoes}</p>}
          <ObservacaoInterna texto={p.observacoesInternas} />
          {semNotas && <p className="text-xs text-suave">Sem observações cadastradas.</p>}
          <div className="pt-1">
            <Link href={`/profissionais/${p.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-verde hover:underline">
              Abrir ficha do médico <ChevronRight className="size-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function FichaExame({ id }: { id: string }) {
  const { dados, podeEditarAtual, abrirForm, avisar, plano } = useStore();
  const ex = dados.exames.find((e) => e.id === id);
  if (!ex) return null;
  const info = plano ? subtipoInfo(dados, plano.subtipoId) : undefined;
  const cobre = !!plano && ex.subtipos.includes(plano.subtipoId);
  const quemFaz = dados.profissionais.filter((p) => p.exames.includes(ex.id));

  const copiar = async () => {
    const texto = [
      ex.nome,
      ex.preparo.length ? `Preparo:\n${ex.preparo.map((x, i) => `${i + 1}. ${x}`).join("\n")}` : "",
      ex.documentos ? `Trazer: ${ex.documentos}` : "",
      ex.valor ? `Valor particular: ${formatarValor(ex.valor)}` : "",
      ex.observacoes ? `Observações: ${ex.observacoes}` : "",
    ].filter(Boolean).join("\n\n");
    try { await navigator.clipboard.writeText(texto); avisar("Orientações copiadas"); } catch { avisar("Não foi possível copiar", true); }
  };

  return (
    <div className="space-y-7 p-5 sm:p-6">
      {plano && info && (
        <div className={`entrar flex items-center gap-3 rounded-2xl px-4 py-3 ${cobre ? "bg-verde-claro text-verde" : "bg-alerta-claro text-alerta"}`}>
          <LogoMarca nome={info.convenio.nome} logo={info.convenio.logo} cor={info.convenio.cor} tamanho="md" />
          <div className="min-w-0 flex-1">
            <p className="flex items-start gap-1.5 text-lg font-bold leading-snug">
              {cobre ? <Check className="mt-1 size-5 shrink-0" /> : <X className="mt-1 size-5 shrink-0" />}
              <span>{info.convenio.nome} · {info.subtipo.nome} {cobre ? "cobre" : "não cobre"} este exame</span>
            </p>
          </div>
        </div>
      )}
      <header className="entrar flex items-start gap-4">
        <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-azul-claro text-azul"><FlaskConical className="size-7" /></div>
        <div className="min-w-0 flex-1">
          {/* a resposta mais pedida na ligação: quanto custa sem convênio */}
          <p className="text-sm text-suave">
            Particular: <b className="text-lg text-verde">{formatarValor(ex.valor) || "consulte a recepção"}</b>
          </p>
          <div className="mt-2"><Atualizado em={ex.atualizadoEm} por={ex.atualizadoPor} /></div>
        </div>
      </header>

      <div className="entrar -mt-4 flex flex-wrap gap-2" style={{ "--i": 1 } as React.CSSProperties}>
        <Botao onClick={copiar}><Copy className="size-4" />Copiar orientações</Botao>
        {podeEditarAtual && <Botao variante="secundario" onClick={() => abrirForm({ tipo: "exame", id: ex.id })}><Pencil className="size-4" />Editar</Botao>}
      </div>

      {ex.observacoes && (
        <p className="entrar flex gap-3 whitespace-pre-line rounded-2xl bg-alerta-claro px-4 py-3 text-[15px] text-alerta" style={{ "--i": 2 } as React.CSSProperties}>
          <Info className="mt-0.5 size-4 shrink-0" />{ex.observacoes}
        </p>
      )}
      <ObservacaoInterna texto={ex.observacoesInternas} />

      <Secao titulo="Convênios que cobrem" icone={<ShieldCheck className="size-4" />} i={3}>
        <ChecadorConveniosExame ex={ex} dados={dados} />
      </Secao>

      <Secao titulo="Preparo do paciente" icone={<ClipboardList className="size-4" />} i={4}>
        {ex.preparo.length ? (
          <ol className="space-y-2">
            {ex.preparo.map((passo, k) => (
              <li key={k} className="flex gap-3 rounded-2xl border border-borda px-4 py-3 text-[15px]">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-verde text-xs font-bold text-white">{k + 1}</span>
                {passo}
              </li>
            ))}
          </ol>
        ) : !ex.documentos && <Vazio texto="Sem preparo cadastrado." />}
        {ex.documentos && <p className={`${ex.preparo.length ? "mt-3 " : ""}rounded-2xl bg-verde-claro px-4 py-3 text-[15px] font-semibold text-verde`}>Trazer: {ex.documentos}</p>}
      </Secao>

      <Secao titulo={`Quem realiza (${quemFaz.length})`} icone={<UserRound className="size-4" />} i={5}>
        <ChecadorMedicosExame ex={ex} dados={dados} cobre={cobre} />
      </Secao>
    </div>
  );
}

// Checador de convênios para o exame: permite pesquisar qualquer convênio da clínica
function ChecadorConveniosExame({ ex, dados }: { ex: Exame; dados: DadosClinica }) {
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);

  const porConvenio = useMemo(() => {
    return dados.convenios
      .map((c) => ({ c, subs: c.subtipos.filter((s) => ex.subtipos.includes(s.id)) }))
      .filter((x) => x.subs.length > 0);
  }, [dados.convenios, ex.subtipos]);

  const q = busca.trim();
  const resultadoBusca = useMemo(
    () => (q ? coberturaDaBusca(dados.convenios, (s) => ex.subtipos.includes(s.id), q) : null),
    [dados.convenios, ex.subtipos, q],
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-suave" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={`Pesquisar se um convênio cobre este exame (${porConvenio.length} credenciados)...`}
          aria-label="Pesquisar se um convênio cobre este exame"
          className="h-10 w-full rounded-xl border border-borda bg-superficie pl-9 pr-9 text-sm outline-none transition focus:border-verde focus:ring-4 focus:ring-verde/15"
        />
        {busca && (
          <button
            type="button"
            onClick={() => setBusca("")}
            aria-label="Limpar consulta"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-suave hover:bg-borda/40 hover:text-texto"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {resultadoBusca ? (
        resultadoBusca.length === 0 ? (
          <Vazio texto={`Nenhum convênio ou rede com “${q}” nesta unidade.`} />
        ) : (
          <div className="space-y-2">
            {resultadoBusca.map(({ convenio: c, cobre, naoCobre }) => (
              <div key={c.id} className={`space-y-2 rounded-2xl border p-3.5 transition ${cobre.length ? "border-verde/40 bg-superficie shadow-sm" : "border-borda bg-fundo/40"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-bold">
                    <LogoMarca nome={c.nome} logo={c.logo} cor={c.cor} tamanho="sm" />{c.nome}
                  </span>
                  {cobre.length > 0 ? (
                    <Chip tom="verde"><Check className="size-3.5" />Cobre ({cobre.length})</Chip>
                  ) : (
                    <Chip tom="neutro">Não cobre este exame</Chip>
                  )}
                </div>
                {cobre.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {cobre.map((s) => <Chip key={s.id} tom="verde">{s.nome}</Chip>)}
                  </div>
                )}
                {naoCobre.length > 0 && cobre.length > 0 && (
                  <div className="flex flex-wrap gap-1 text-xs text-suave pt-1">
                    <span className="text-[11px] font-medium text-suave self-center mr-1">Demais redes sem cobertura:</span>
                    {naoCobre.map((s) => <span key={s.id} className="rounded-md bg-fundo px-1.5 py-0.5 text-[11px] text-suave">{s.nome}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : porConvenio.length > 0 ? (
        <ul className="space-y-2">
          {porConvenio.map(({ c, subs }) => {
            const sel = aberto === c.id;
            return (
              <li key={c.id} className={`overflow-hidden rounded-2xl border transition ${sel ? "border-verde/40 shadow-sm" : "border-borda"}`}>
                <button
                  type="button"
                  aria-expanded={sel}
                  onClick={() => setAberto(sel ? null : c.id)}
                  className="pressionavel flex w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-verde-claro/30"
                >
                  <LogoMarca nome={c.nome} logo={c.logo} cor={c.cor} tamanho="sm" />
                  <span className="min-w-0 flex-1 truncate font-semibold text-sm">{c.nome}</span>
                  <Chip tom="verde">{subs.length} {subs.length === 1 ? "rede" : "redes"}</Chip>
                  <ChevronDown className={`size-4 shrink-0 text-suave transition-transform duration-200 ${sel ? "rotate-180" : ""}`} />
                </button>
                {sel && (
                  <div className="entrar space-y-2 border-t border-borda/60 bg-fundo/40 p-3">
                    <div className="flex flex-wrap gap-1">
                      {subs.map((s) => <Chip key={s.id} tom="verde">{s.nome}</Chip>)}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <Vazio texto="Nenhum convênio vinculado a este exame (apenas particular). Use a busca acima para verificar qualquer convênio da clínica." />
      )}
    </div>
  );
}

// Checador de médicos para o exame: pesquisa qualquer médico da clínica para saber se realiza este exame
function ChecadorMedicosExame({
  ex,
  dados,
  cobre,
}: {
  ex: Exame;
  dados: DadosClinica;
  cobre: boolean;
}) {
  const [busca, setBusca] = useState("");
  const q = busca.trim();

  const quemFaz = useMemo(
    () => dados.profissionais.filter((p) => p.exames.includes(ex.id)),
    [dados.profissionais, ex.id],
  );

  const hoje = DIAS[new Date().getDay() - 1];

  const resultadoBusca = useMemo(() => {
    if (!q) return null;
    return dados.profissionais
      .filter((p) => combina(p.nome, q))
      .map((p) => {
        const faz = p.exames.includes(ex.id);
        const espNome = dados.especialidades.find((e) => e.id === p.especialidadeId)?.nome;
        const atendeHoje = hoje ? p.horarios.some((h) => h.dia === hoje) : false;
        return { p, faz, espNome, atendeHoje };
      });
  }, [dados.profissionais, dados.especialidades, ex.id, hoje, q]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-suave" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={`Pesquisar se um médico realiza este exame (${quemFaz.length} vinculados)...`}
          aria-label="Pesquisar se um médico realiza este exame"
          className="h-10 w-full rounded-xl border border-borda bg-superficie pl-9 pr-9 text-sm outline-none transition focus:border-verde focus:ring-4 focus:ring-verde/15"
        />
        {busca && (
          <button
            type="button"
            onClick={() => setBusca("")}
            aria-label="Limpar consulta"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-suave hover:bg-borda/40 hover:text-texto"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {resultadoBusca ? (
        resultadoBusca.length === 0 ? (
          <Vazio texto={`Nenhum profissional com “${q}” nesta clínica.`} />
        ) : (
          <div className="space-y-2">
            {resultadoBusca.map(({ p, faz, espNome, atendeHoje }) => (
              <div
                key={p.id}
                className={`rounded-2xl border p-3.5 transition ${
                  faz ? "border-verde/40 bg-superficie shadow-sm" : "border-borda bg-fundo/40"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar nome={p.nome} />
                    <div className="min-w-0">
                      <p className="line-clamp-1 font-semibold text-sm text-texto">{p.nome}</p>
                      {espNome && <p className="text-xs text-suave truncate">{espNome}</p>}
                    </div>
                  </div>
                  {faz ? (
                    <Chip tom="verde">
                      <Check className="size-3.5" /> Realiza este exame
                    </Chip>
                  ) : (
                    <Chip tom="neutro">Não vinculado</Chip>
                  )}
                </div>

                {faz && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-borda/40 pt-2 text-xs">
                    {atendeHoje && (
                      <Chip tom="verde">
                        <span className="pulso size-1.5 rounded-full bg-verde" /> Atende hoje
                      </Chip>
                    )}
                    {p.restricoes.length > 0 && (
                      <Chip tom="alerta">
                        {p.restricoes.length === 1 ? "1 restrição" : `${p.restricoes.length} restrições`}
                      </Chip>
                    )}
                    <Link
                      href={`/profissionais/${p.id}`}
                      className="ml-auto font-semibold text-verde hover:underline"
                    >
                      Ver ficha &rarr;
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : quemFaz.length > 0 ? (
        <div className="space-y-2">
          {quemFaz.map((p) => (
            <QuemRealiza key={p.id} p={p} cobre={cobre} dados={dados} />
          ))}
        </div>
      ) : (
        <Vazio texto="Nenhum profissional vinculado a este exame. Use a busca acima para verificar qualquer médico." />
      )}
    </div>
  );
}
