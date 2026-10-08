"use client";

import { useState } from "react";
import { useStore, type Formulario } from "@/lib/store";
import { semAcento, type Dados, type Profissional } from "@/lib/dados";
import { Botao, Gaveta } from "./ui";

const campo = "w-full rounded-xl border border-borda bg-superficie px-3 py-2.5 text-[15px] outline-none transition placeholder:text-suave/60 focus:border-verde focus:ring-4 focus:ring-verde/15";
const slug = (t: string) => semAcento(t).trim().replace(/[^a-z0-9]+/g, "-");
const linhas = (t: FormDataEntryValue | null) => String(t ?? "").split("\n").map((x) => x.trim()).filter(Boolean);

function Campo({ rotulo, children, dica }: { rotulo: string; children: React.ReactNode; dica?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{rotulo}</span>
      {children}
      {dica && <span className="mt-1 block text-xs text-suave">{dica}</span>}
    </label>
  );
}

export function Formularios() {
  const { form, abrirForm } = useStore();
  // guarda o último formulário para a gaveta sair com conteúdo; `n` zera os campos a cada abertura
  const [ultimo, setUltimo] = useState<{ f: Formulario; n: number }>({ f: null, n: 0 });
  if (form && form !== ultimo.f) setUltimo({ f: form, n: ultimo.n + 1 });
  const atual = form ?? ultimo.f;
  const k = ultimo.n;

  return (
    <Gaveta aberta={!!form} onFechar={() => abrirForm(null)} largura="max-w-2xl">
      {atual?.tipo === "profissional" && <FormProfissional key={k} id={atual.id} />}
      {atual?.tipo === "especialidade" && <FormSimples key={k} tipo="especialidade" />}
      {atual?.tipo === "convenio" && <FormSimples key={k} tipo="convenio" />}
      {atual?.tipo === "exame" && <FormExame key={k} id={atual.id} />}
    </Gaveta>
  );
}

function Moldura({ titulo, descricao, onSalvar, children }: { titulo: string; descricao: string; onSalvar: (f: FormData) => void; children: React.ReactNode }) {
  const { abrirForm } = useStore();
  return (
    <form className="flex min-h-full flex-col" onSubmit={(e) => { e.preventDefault(); onSalvar(new FormData(e.currentTarget)); }}>
      <div className="entrar border-b border-borda p-6 pr-14 sm:p-8">
        <h2 className="text-2xl font-bold tracking-tight">{titulo}</h2>
        <p className="mt-1 text-suave">{descricao}</p>
      </div>
      <div className="flex-1 space-y-6 p-6 sm:p-8">{children}</div>
      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-borda bg-superficie/90 p-4 backdrop-blur">
        <Botao variante="secundario" onClick={() => abrirForm(null)}>Cancelar</Botao>
        <Botao type="submit">Salvar</Botao>
      </div>
    </form>
  );
}

function MatrizConvenios({ dados, atende }: { dados: Dados; atende: Record<string, string> }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-borda">
      <div className="grid grid-cols-[1fr_80px_80px] bg-fundo px-4 py-2 text-xs font-semibold text-suave">
        <span>Convênio · rede</span><span className="text-center">Consulta</span><span className="text-center">Exame</span>
      </div>
      {dados.convenios.map((c) => c.subtipos.map((s, k) => (
        <div key={s.id} className={`grid grid-cols-[1fr_80px_80px] items-center px-4 py-2 ${k ? "" : "border-t border-borda"}`}>
          <span className="text-[15px]">{!k && <b className="font-semibold">{c.nome} · </b>}{s.nome}</span>
          {(["c", "e"] as const).map((t) => (
            <span key={t} className="grid place-items-center">
              <input type="checkbox" name={`${t}:${s.id}`} defaultChecked={(atende[s.id] ?? "").includes(t)} className="size-5 accent-verde" />
            </span>
          ))}
        </div>
      )))}
    </div>
  );
}

function FormProfissional({ id }: { id?: string }) {
  const { dados, setDados, abrirForm, abrir, avisar } = useStore();
  const p = dados.profissionais.find((x) => x.id === id);

  const salvar = (f: FormData) => {
    const nome = String(f.get("nome")).trim();
    if (!nome) return avisar("Informe o nome");
    const atende: Record<string, string> = {};
    for (const c of dados.convenios) for (const s of c.subtipos) {
      const v = (f.get(`c:${s.id}`) ? "c" : "") + (f.get(`e:${s.id}`) ? "e" : "");
      if (v) atende[s.id] = v;
    }
    const novo: Profissional = {
      id: p?.id ?? slug(nome),
      nome,
      especialidadeId: String(f.get("especialidade")),
      dias: String(f.get("dias")).trim(),
      idadeMinima: Number(f.get("idade")) || undefined,
      procedimentos: String(f.get("procedimentos")).split(",").map((x) => x.trim()).filter(Boolean),
      exames: dados.exames.filter((e) => f.get(`ex:${e.id}`)).map((e) => e.id),
      atende,
      restricoes: linhas(f.get("restricoes")).map((texto) => ({ texto })),
      observacoes: String(f.get("observacoes")).trim(),
    };
    setDados((d) => ({ ...d, profissionais: p ? d.profissionais.map((x) => (x.id === p.id ? novo : x)) : [...d.profissionais, novo] }));
    abrirForm(null);
    abrir({ tipo: "profissional", id: novo.id });
    avisar(p ? "Ficha atualizada" : "Profissional cadastrado");
  };

  return (
    <Moldura titulo={p ? "Editar profissional" : "Novo profissional"} descricao="Tudo o que a central precisa saber antes de marcar." onSalvar={salvar}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome"><input name="nome" defaultValue={p?.nome} placeholder="Dra. Nome Sobrenome" className={campo} /></Campo>
        <Campo rotulo="Especialidade">
          <select name="especialidade" defaultValue={p?.especialidadeId} className={campo}>
            {dados.especialidades.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Dias de atendimento"><input name="dias" defaultValue={p?.dias} placeholder="Seg e Qua · manhã" className={campo} /></Campo>
        <Campo rotulo="Idade mínima do paciente"><input name="idade" type="number" min={0} defaultValue={p?.idadeMinima} placeholder="Sem limite" className={campo} /></Campo>
      </div>
      <Campo rotulo="Convênios atendidos" dica="Marque separadamente consulta e exame: nem todo convênio que cobre exame cobre consulta.">
        <MatrizConvenios dados={dados} atende={p?.atende ?? {}} />
      </Campo>
      <Campo rotulo="Procedimentos que realiza" dica="Separe por vírgula.">
        <input name="procedimentos" defaultValue={p?.procedimentos.join(", ")} placeholder="Lobuloplastia, Biópsia de pele" className={campo} />
      </Campo>
      <div>
        <span className="mb-1.5 block text-sm font-semibold">Exames que realiza</span>
        <div className="flex flex-wrap gap-2">
          {dados.exames.map((e) => (
            <label key={e.id} className="pressionavel flex cursor-pointer items-center gap-2 rounded-xl border border-borda px-3 py-2 text-sm has-[:checked]:border-azul/40 has-[:checked]:bg-azul-claro has-[:checked]:text-azul">
              <input type="checkbox" name={`ex:${e.id}`} defaultChecked={p?.exames.includes(e.id)} className="accent-azul" />{e.nome}
            </label>
          ))}
        </div>
      </div>
      <Campo rotulo="Restrições" dica="Uma por linha. Ex.: Unimed só 5 pacientes por dia.">
        <textarea name="restricoes" rows={3} defaultValue={p?.restricoes.map((r) => r.texto).join("\n")} className={campo} />
      </Campo>
      <Campo rotulo="Observações">
        <textarea name="observacoes" rows={3} defaultValue={p?.observacoes} className={campo} />
      </Campo>
    </Moldura>
  );
}

function FormExame({ id }: { id?: string }) {
  const { dados, setDados, abrirForm, abrir, avisar } = useStore();
  const ex = dados.exames.find((x) => x.id === id);

  const salvar = (f: FormData) => {
    const nome = String(f.get("nome")).trim();
    if (!nome) return avisar("Informe o nome do exame");
    const novo = {
      id: ex?.id ?? slug(nome),
      nome,
      preparo: linhas(f.get("preparo")),
      documentos: String(f.get("documentos")).trim(),
      subtipos: dados.convenios.flatMap((c) => c.subtipos).filter((s) => f.get(`s:${s.id}`)).map((s) => s.id),
    };
    setDados((d) => ({ ...d, exames: ex ? d.exames.map((x) => (x.id === ex.id ? novo : x)) : [...d.exames, novo] }));
    abrirForm(null);
    abrir({ tipo: "exame", id: novo.id });
    avisar(ex ? "Exame atualizado" : "Exame cadastrado");
  };

  return (
    <Moldura titulo={ex ? "Editar exame" : "Novo exame"} descricao="Orientações que a atendente repassa ao paciente." onSalvar={salvar}>
      <Campo rotulo="Nome do exame"><input name="nome" defaultValue={ex?.nome} className={campo} /></Campo>
      <Campo rotulo="Preparo" dica="Um passo por linha.">
        <textarea name="preparo" rows={5} defaultValue={ex?.preparo.join("\n")} className={campo} />
      </Campo>
      <Campo rotulo="O paciente deve trazer"><input name="documentos" defaultValue={ex?.documentos} placeholder="Pedido médico, carteirinha..." className={campo} /></Campo>
      <div>
        <span className="mb-1.5 block text-sm font-semibold">Convênios que cobrem</span>
        <div className="space-y-3">
          {dados.convenios.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-2">
              <span className="w-32 text-sm font-semibold">{c.nome}</span>
              {c.subtipos.map((s) => (
                <label key={s.id} className="pressionavel flex cursor-pointer items-center gap-2 rounded-xl border border-borda px-3 py-1.5 text-sm has-[:checked]:border-azul/40 has-[:checked]:bg-azul-claro has-[:checked]:text-azul">
                  <input type="checkbox" name={`s:${s.id}`} defaultChecked={ex?.subtipos.includes(s.id)} className="accent-azul" />{s.nome}
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>
    </Moldura>
  );
}

function FormSimples({ tipo }: { tipo: "especialidade" | "convenio" }) {
  const { setDados, abrirForm, avisar } = useStore();
  const salvar = (f: FormData) => {
    const nome = String(f.get("nome")).trim();
    if (!nome) return avisar("Informe o nome");
    const id = slug(nome);
    if (tipo === "especialidade") setDados((d) => ({ ...d, especialidades: [...d.especialidades, { id, nome, icone: "Stethoscope" }] }));
    else {
      const subtipos = String(f.get("subtipos")).split(",").map((x) => x.trim()).filter(Boolean).map((n) => ({ id: `${id}-${slug(n)}`, nome: n }));
      setDados((d) => ({ ...d, convenios: [...d.convenios, { id, nome, cor: "#0d9b86", subtipos }] }));
    }
    abrirForm(null);
    avisar(tipo === "especialidade" ? "Especialidade cadastrada" : "Convênio cadastrado");
  };
  return tipo === "especialidade" ? (
    <Moldura titulo="Nova especialidade" descricao="Depois, vincule os profissionais a ela." onSalvar={salvar}>
      <Campo rotulo="Nome"><input name="nome" placeholder="Ex.: Reumatologia" className={campo} /></Campo>
    </Moldura>
  ) : (
    <Moldura titulo="Novo convênio" descricao="Cadastre o convênio e os tipos de rede dele." onSalvar={salvar}>
      <Campo rotulo="Nome do convênio"><input name="nome" placeholder="Ex.: Cassi" className={campo} /></Campo>
      <Campo rotulo="Tipos de rede" dica="Separe por vírgula. Ex.: Essencial, Flex, Rede fechada">
        <input name="subtipos" className={campo} />
      </Campo>
    </Moldura>
  );
}
