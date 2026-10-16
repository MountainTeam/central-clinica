"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, ClipboardList, Copy, FlaskConical, Info, Pencil, Search, ShieldCheck, TriangleAlert, UserRound, X } from "lucide-react";
import { useStore, type Painel } from "@/lib/store";
import { atende, coberturaDaBusca, combina, gruposHorarios, subtipoInfo } from "@/lib/regras";
import type { DadosClinica, Exame, Profissional } from "@/lib/modelo";
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

// Quem realiza: abre as observações e restrições do médico sem sair do exame
function QuemRealiza({ p, cobre }: { p: Profissional; cobre: boolean }) {
  const { dados, plano } = useStore();
  // com o plano cobrindo o exame, a pergunta seguinte é "este médico faz este exame por esse plano?"
  const rede = plano ? subtipoInfo(dados, plano.subtipoId)?.subtipo : undefined;
  const [aberto, setAberto] = useState(false);
  const semNotas = !p.observacoes && !p.observacoesInternas && !p.restricoes.length && !p.idadeMinima;
  return (
    <div className={`overflow-hidden rounded-2xl border ${aberto ? "border-verde/30" : "border-borda"}`}>
      <button type="button" onClick={() => setAberto(!aberto)} aria-expanded={aberto}
        className="pressionavel flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-verde-claro/40">
        <Avatar nome={p.nome} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 font-semibold">
            <span className="line-clamp-2">{p.nome}</span>
            {p.restricoes.length > 0 && <TriangleAlert className="size-3.5 shrink-0 text-alerta" aria-label="Tem restrições" />}
          </span>
          {plano && rede && cobre && <span className="mt-1 block">{atende(p, plano.subtipoId, "exame") ? <Chip tom="verde">Faz pelo {rede.nome}</Chip> : <Chip tom="perigo">Não faz pelo {rede.nome}</Chip>}</span>}
          <span className="block text-sm text-suave">{p.horarios.length ? gruposHorarios(p.horarios).map((g) => <span key={g} className="block">{g}</span>) : "Horários não informados"}</span>
        </span>
        <ChevronDown className={`size-4 shrink-0 text-suave transition-transform duration-200 ${aberto ? "rotate-180" : ""}`} />
      </button>
      {aberto && (
        <div className="entrar space-y-2 border-t border-borda/60 p-3 text-sm">
          {p.idadeMinima && <Chip>A partir de {p.idadeMinima} anos</Chip>}
          {p.restricoes.map((r, k) => {
            const info = r.subtipoId ? subtipoInfo(dados, r.subtipoId) : undefined;
            return (
              <p key={k} className="flex gap-2 rounded-xl bg-alerta-claro px-3 py-2 text-alerta"><TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span>{r.texto}{info && <span className="ml-1 opacity-75">· {info.convenio.nome} · {info.subtipo.nome}</span>}</span>
              </p>
            );
          })}
          {p.observacoes && <p className="whitespace-pre-line rounded-xl bg-fundo px-3 py-2">{p.observacoes}</p>}
          <ObservacaoInterna texto={p.observacoesInternas} />
          {semNotas && <p className="text-suave">Sem observações cadastradas.</p>}
          <Link href={`/profissionais/${p.id}`} className="inline-flex items-center gap-1 font-semibold text-verde hover:underline">
            Abrir ficha completa <ChevronRight className="size-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

function FichaExame({ id }: { id: string }) {
  const { dados, podeEditarAtual, abrirForm, avisar, plano } = useStore();
  const [qMedico, setQMedico] = useState("");
  const ex = dados.exames.find((e) => e.id === id);
  if (!ex) return null;
  const info = plano ? subtipoInfo(dados, plano.subtipoId) : undefined;
  const cobre = !!plano && ex.subtipos.includes(plano.subtipoId);
  const quemFaz = dados.profissionais.filter((p) => p.exames.includes(ex.id));
  const medicos = quemFaz.filter((p) => combina(p.nome, qMedico));

  const copiar = async () => {
    const texto = [
      ex.nome,
      ex.preparo.length ? `Preparo:\n${ex.preparo.map((x, i) => `${i + 1}. ${x}`).join("\n")}` : "",
      ex.documentos ? `Trazer: ${ex.documentos}` : "",
      ex.valor ? `Valor particular: ${ex.valor}` : "",
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
            Particular: <b className="text-lg text-verde">{ex.valor || "consulte a recepção"}</b>
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
        {quemFaz.length ? (
          <div className="space-y-2">
            {quemFaz.length > 5 && <Filtro valor={qMedico} onChange={setQMedico} placeholder="Procurar médico" />}
            {medicos.map((p) => <QuemRealiza key={p.id} p={p} cobre={cobre} />)}
            {!medicos.length && <p className="text-sm text-suave">Nenhum médico com esse nome faz este exame.</p>}
          </div>
        ) : <Vazio texto="Nenhum profissional vinculado." />}
      </Secao>
    </div>
  );
}

function ChecadorConveniosExame({ ex, dados }: { ex: Exame; dados: DadosClinica }) {
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const [qRede, setQRede] = useState("");

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

  if (!dados.convenios.length) return <Vazio texto="Nenhum convênio cadastrado nesta clínica." />;
  if (!porConvenio.length) return <Vazio texto="Nenhum convênio marcado para este exame. Se for só particular, o valor está acima; se não, edite o exame e marque as redes." />;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-suave" />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="O plano do paciente cobre?" aria-label="O plano do paciente cobre?"
          className="h-10 w-full rounded-xl border border-borda bg-superficie pl-9 pr-9 text-sm outline-none transition focus:border-verde focus:ring-4 focus:ring-verde/15" />
        {busca && (
          <button type="button" onClick={() => setBusca("")} aria-label="Limpar consulta"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-suave hover:bg-borda/40 hover:text-texto">
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
              <div key={c.id} className={`space-y-2 rounded-2xl border bg-superficie p-3.5 ${cobre.length ? "border-verde/40" : "border-borda"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-bold">
                    <LogoMarca nome={c.nome} logo={c.logo} cor={c.cor} tamanho="sm" />{c.nome}
                  </span>
                  {cobre.length > 0 && <Chip tom="verde"><Check className="size-3.5" />Cobre</Chip>}
                </div>
                {cobre.length > 0 && <div className="flex flex-wrap gap-1">{cobre.map((s) => <Chip key={s.id} tom="verde">{s.nome}</Chip>)}</div>}
                {naoCobre.length > 0 && <div className="flex flex-wrap gap-1">{naoCobre.map((s) => <Chip key={s.id} tom="alerta">{s.nome} · não cobre</Chip>)}</div>}
                {!cobre.length && !naoCobre.length && <p className="text-[13px] text-suave">Sem redes cadastradas</p>}
              </div>
            ))}
          </div>
        )
      ) : (
        <ul className="space-y-2">
          {porConvenio.map(({ c, subs }) => {
            const todas = subs.length === c.subtipos.length;
            const sel = aberto === c.id;
            const lista = subs.filter((s) => combina(s.nome, qRede));
            return (
              <li key={c.id} className={`overflow-hidden rounded-2xl border ${sel ? "border-verde/30" : "border-borda"}`}>
                <button type="button" aria-expanded={sel} onClick={() => { setAberto(sel ? null : c.id); setQRede(""); }}
                  className="pressionavel flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-verde-claro/40">
                  <LogoMarca nome={c.nome} logo={c.logo} cor={c.cor} tamanho="sm" />
                  <span className="min-w-0 flex-1 truncate font-semibold">{c.nome}</span>
                  <Chip tom="verde">{todas ? `Todas as redes (${subs.length})` : `${subs.length} de ${c.subtipos.length} redes`}</Chip>
                  <ChevronDown className={`size-4 shrink-0 text-suave transition-transform duration-200 ${sel ? "rotate-180" : ""}`} />
                </button>
                {sel && (
                  <div className="entrar space-y-2 border-t border-borda/60 p-3">
                    {subs.length > 6 && <Filtro valor={qRede} onChange={setQRede} placeholder="Procurar rede" />}
                    <div className="flex flex-wrap gap-1">{lista.map((s) => <Chip key={s.id} tom="verde">{s.nome}</Chip>)}</div>
                    {!lista.length && <p className="text-sm text-suave">Nenhuma rede com esse nome.</p>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
