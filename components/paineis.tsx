"use client";

import { useState } from "react";
import { CalendarDays, Check, ChevronRight, ClipboardList, Copy, FileText, FlaskConical, Info, Minus, Pencil, ShieldCheck, TriangleAlert, UserRound } from "lucide-react";
import { useStore, type Painel } from "@/lib/store";
import { subtipoInfo, type Dados, type Profissional } from "@/lib/dados";
import { Avatar, Botao, Chip, Gaveta, Icone, Secao, Vazio } from "./ui";

export function Paineis() {
  const { painel, abrir } = useStore();
  // mantém o conteúdo visível enquanto a gaveta desliza para fora
  const [ultimo, setUltimo] = useState<Painel>(null);
  if (painel && painel !== ultimo) setUltimo(painel);
  const atual = painel ?? ultimo;

  return (
    <Gaveta aberta={!!painel} onFechar={() => abrir(null)}>
      {atual?.tipo === "profissional" && <FichaProfissional key={atual.id} id={atual.id} />}
      {atual?.tipo === "exame" && <FichaExame key={atual.id} id={atual.id} />}
    </Gaveta>
  );
}

function FichaProfissional({ id }: { id: string }) {
  const { dados, perfil, abrir, abrirForm } = useStore();
  const p = dados.profissionais.find((x) => x.id === id);
  if (!p) return null;
  const esp = dados.especialidades.find((e) => e.id === p.especialidadeId);

  return (
    <div className="space-y-8 p-6 sm:p-8">
      <header className="entrar flex items-start gap-4 pr-10">
        <Avatar nome={p.nome} grande />
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight">{p.nome}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {esp && <Chip tom="verde"><Icone nome={esp.icone} className="size-3.5" />{esp.nome}</Chip>}
            <Chip><CalendarDays className="size-3.5" />{p.dias || "Dias não informados"}</Chip>
            {p.idadeMinima && <Chip>A partir de {p.idadeMinima} anos</Chip>}
          </div>
        </div>
      </header>

      {perfil === "admin" && (
        <div className="entrar -mt-4" style={{ "--i": 1 } as React.CSSProperties}>
          <Botao variante="secundario" onClick={() => abrirForm({ tipo: "profissional", id: p.id })}><Pencil className="size-4" />Editar ficha</Botao>
        </div>
      )}

      {p.restricoes.length > 0 && (
        <Secao titulo="Restrições" icone={<TriangleAlert className="size-4" />} i={1}>
          <ul className="space-y-2">
            {p.restricoes.map((r, k) => {
              const info = r.subtipoId ? subtipoInfo(dados, r.subtipoId) : undefined;
              return (
                <li key={k} className="flex gap-3 rounded-2xl bg-alerta-claro px-4 py-3 text-[15px] text-alerta">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <span>{r.texto}{info && <span className="ml-1 opacity-75">({info.convenio.nome} {info.subtipo.nome})</span>}</span>
                </li>
              );
            })}
          </ul>
        </Secao>
      )}

      <Secao titulo="Convênios atendidos" icone={<ShieldCheck className="size-4" />} i={2}>
        <TabelaConvenios dados={dados} p={p} />
      </Secao>

      <Secao titulo="Procedimentos que realiza" icone={<ClipboardList className="size-4" />} i={3}>
        {p.procedimentos.length ? (
          <div className="flex flex-wrap gap-2">{p.procedimentos.map((x) => <Chip key={x}>{x}</Chip>)}</div>
        ) : <Vazio texto="Nenhum procedimento cadastrado." />}
      </Secao>

      <Secao titulo="Exames que realiza" icone={<FlaskConical className="size-4" />} i={4}>
        {p.exames.length ? (
          <div className="space-y-2">
            {p.exames.map((eid) => {
              const ex = dados.exames.find((e) => e.id === eid);
              return ex && (
                <button key={eid} onClick={() => abrir({ tipo: "exame", id: eid })}
                  className="pressionavel group flex w-full items-center gap-3 rounded-2xl border border-borda px-4 py-3 text-left hover:border-azul/30 hover:bg-azul-claro/50">
                  <span className="grid size-9 place-items-center rounded-xl bg-azul-claro text-azul"><FlaskConical className="size-4" /></span>
                  <span className="flex-1 font-medium">{ex.nome}</span>
                  <span className="text-sm text-suave">Ver preparo</span>
                  <ChevronRight className="size-4 text-suave transition-transform group-hover:translate-x-0.5" />
                </button>
              );
            })}
          </div>
        ) : <Vazio texto="Não realiza exames na clínica." />}
      </Secao>

      {p.observacoes && (
        <Secao titulo="Observações" icone={<Info className="size-4" />} i={5}>
          <p className="rounded-2xl bg-fundo px-4 py-3 text-[15px] leading-relaxed">{p.observacoes}</p>
        </Secao>
      )}
    </div>
  );
}

function TabelaConvenios({ dados, p }: { dados: Dados; p: Profissional }) {
  const convenios = dados.convenios.filter((c) => c.subtipos.some((s) => p.atende[s.id]));
  if (!convenios.length) return <Vazio texto="Nenhum convênio cadastrado. Atende só particular?" />;
  const marca = (ok: boolean) => ok
    ? <span className="grid size-6 place-items-center rounded-full bg-verde-claro text-verde"><Check className="size-3.5" strokeWidth={3} /></span>
    : <span className="grid size-6 place-items-center text-borda"><Minus className="size-4" /></span>;

  return (
    <div className="overflow-hidden rounded-2xl border border-borda">
      <div className="grid grid-cols-[1fr_76px_76px] bg-fundo px-4 py-2 text-xs font-semibold text-suave">
        <span>Convênio · rede</span><span className="text-center">Consulta</span><span className="text-center">Exame</span>
      </div>
      {convenios.map((c) => (
        <div key={c.id} className="border-t border-borda">
          {c.subtipos.filter((s) => p.atende[s.id]).map((s, k) => (
            <div key={s.id} className="grid grid-cols-[1fr_76px_76px] items-center px-4 py-2.5">
              <span className="flex items-center gap-2 text-[15px]">
                <span className="size-2 rounded-full" style={{ background: c.cor, opacity: k ? 0 : 1 }} />
                {!k && <span className="font-semibold">{c.nome} ·</span>}
                <span>{s.nome}</span>
              </span>
              <span className="grid place-items-center">{marca(p.atende[s.id].includes("c"))}</span>
              <span className="grid place-items-center">{marca(p.atende[s.id].includes("e"))}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function FichaExame({ id }: { id: string }) {
  const { dados, perfil, abrir, abrirForm, avisar } = useStore();
  const ex = dados.exames.find((e) => e.id === id);
  if (!ex) return null;
  const quemFaz = dados.profissionais.filter((p) => p.exames.includes(ex.id));
  const porConvenio = dados.convenios
    .map((c) => ({ c, subs: c.subtipos.filter((s) => ex.subtipos.includes(s.id)) }))
    .filter((x) => x.subs.length);

  const copiar = async () => {
    const texto = `${ex.nome}\n\nPreparo:\n${ex.preparo.map((x, i) => `${i + 1}. ${x}`).join("\n")}\n\nTrazer: ${ex.documentos}`;
    try { await navigator.clipboard.writeText(texto); avisar("Orientações copiadas"); } catch { avisar("Não foi possível copiar"); }
  };

  return (
    <div className="space-y-8 p-6 sm:p-8">
      <header className="entrar flex items-start gap-4 pr-10">
        <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white"><FlaskConical className="size-7" /></div>
        <div>
          <p className="text-sm font-medium text-azul">Exame</p>
          <h2 className="text-2xl font-bold tracking-tight">{ex.nome}</h2>
        </div>
      </header>

      <div className="entrar -mt-4 flex flex-wrap gap-2" style={{ "--i": 1 } as React.CSSProperties}>
        <Botao onClick={copiar}><Copy className="size-4" />Copiar orientações</Botao>
        {perfil === "admin" && <Botao variante="secundario" onClick={() => abrirForm({ tipo: "exame", id: ex.id })}><Pencil className="size-4" />Editar</Botao>}
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

      <Secao titulo="O paciente deve trazer" icone={<FileText className="size-4" />} i={4}>
        <p className="rounded-2xl bg-fundo px-4 py-3 text-[15px]">{ex.documentos}</p>
      </Secao>

      <Secao titulo="Convênios que cobrem" icone={<ShieldCheck className="size-4" />} i={5}>
        {porConvenio.length ? (
          <div className="space-y-3">
            {porConvenio.map(({ c, subs }) => (
              <div key={c.id} className="flex flex-wrap items-center gap-2">
                <span className="flex w-36 items-center gap-2 text-[15px] font-semibold"><span className="size-2 rounded-full" style={{ background: c.cor }} />{c.nome}</span>
                {subs.map((s) => <Chip key={s.id} tom="azul">{s.nome}</Chip>)}
              </div>
            ))}
          </div>
        ) : <Vazio texto="Nenhum convênio cadastrado para este exame." />}
      </Secao>

      <Secao titulo="Quem realiza" icone={<UserRound className="size-4" />} i={6}>
        {quemFaz.length ? (
          <div className="space-y-2">
            {quemFaz.map((p) => (
              <button key={p.id} onClick={() => abrir({ tipo: "profissional", id: p.id })}
                className="pressionavel group flex w-full items-center gap-3 rounded-2xl border border-borda px-3 py-2.5 text-left hover:border-verde/30 hover:bg-verde-claro/50">
                <Avatar nome={p.nome} />
                <span className="flex-1">
                  <span className="block font-semibold">{p.nome}</span>
                  <span className="text-sm text-suave">{p.dias}</span>
                </span>
                <ChevronRight className="size-4 text-suave transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        ) : <Vazio texto="Nenhum profissional vinculado." />}
      </Secao>
    </div>
  );
}

