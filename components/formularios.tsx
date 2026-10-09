"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore, type Formulario } from "@/lib/store";
import { DIAS, type Convenio, type DadosClinica, type Exame, type Horario, type Profissional } from "@/lib/modelo";
import { corDoIndice, novoId, slug } from "@/lib/regras";
import { salvarClinica, salvarConvenio, salvarEspecialidade, salvarExame, salvarOrganizacao, salvarProfissional } from "@/lib/repositorio";
import { Botao, EnvioLogo, Gaveta } from "./ui";

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
      {atual?.tipo === "especialidade" && <FormEspecialidade key={k} />}
      {atual?.tipo === "convenio" && <FormConvenio key={k} id={atual.id} />}
      {atual?.tipo === "exame" && <FormExame key={k} id={atual.id} />}
      {atual?.tipo === "organizacao" && <FormOrganizacao key={k} />}
      {atual?.tipo === "clinica" && <FormClinica key={k} id={atual.id} />}
    </Gaveta>
  );
}

export function Moldura({ titulo, descricao, onSalvar, children }: { titulo: string; descricao: string; onSalvar: (f: FormData) => void; children: React.ReactNode }) {
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

function MatrizConvenios({ dados, atende }: { dados: DadosClinica; atende: Record<string, string> }) {
  if (!dados.convenios.length) return <p className="rounded-xl border border-dashed border-borda px-4 py-4 text-sm text-suave">Nenhum convênio cadastrado nesta clínica ainda.</p>;
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
  const { dados, clinica, executar, abrirForm, avisar } = useStore();
  const router = useRouter();
  const p = dados.profissionais.find((x) => x.id === id);

  const salvar = (f: FormData) => {
    const nome = String(f.get("nome")).trim();
    if (!nome) return avisar("Informe o nome");
    if (!dados.especialidades.length) return avisar("Cadastre uma especialidade antes do primeiro médico.");
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
    <Moldura titulo={p ? "Editar profissional" : "Novo profissional"} descricao="Tudo o que a central precisa saber antes de marcar." onSalvar={salvar}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome"><input name="nome" defaultValue={p?.nome} placeholder="Dra. Nome Sobrenome" className={campo} /></Campo>
        <Campo rotulo="Especialidade" dica={dados.especialidades.length ? undefined : "Cadastre uma especialidade nesta clínica primeiro."}>
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
      <Campo rotulo="Convênios atendidos" dica="Marque separadamente consulta e exame: nem todo convênio que cobre exame cobre consulta.">
        <MatrizConvenios dados={dados} atende={p?.atende ?? {}} />
      </Campo>
      <Campo rotulo="Procedimentos que realiza" dica="Separe por vírgula.">
        <input name="procedimentos" defaultValue={p?.procedimentos.join(", ")} placeholder="Lobuloplastia, Biópsia de pele" className={campo} />
      </Campo>
      <div>
        <span className="mb-1.5 block text-sm font-semibold">Exames que realiza</span>
        {dados.exames.length ? (
          <div className="flex flex-wrap gap-2">
            {dados.exames.map((e) => (
              <label key={e.id} className="pressionavel flex cursor-pointer items-center gap-2 rounded-xl border border-borda px-3 py-2 text-sm has-[:checked]:border-azul/40 has-[:checked]:bg-azul-claro has-[:checked]:text-azul">
                <input type="checkbox" name={`ex:${e.id}`} defaultChecked={p?.exames.includes(e.id)} className="accent-azul" />{e.nome}
              </label>
            ))}
          </div>
        ) : <p className="text-sm text-suave">Nenhum exame cadastrado nesta clínica ainda.</p>}
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
  const { dados, clinica, executar, abrirForm, abrir, avisar } = useStore();
  const ex = dados.exames.find((x) => x.id === id);

  const salvar = (f: FormData) => {
    const nome = String(f.get("nome")).trim();
    if (!nome) return avisar("Informe o nome do exame");
    if (!clinica) return;
    const novo: Exame = {
      id: ex?.id ?? novoId("exame"),
      clinicaId: clinica.id,
      nome,
      preparo: linhas(f.get("preparo")),
      documentos: String(f.get("documentos")).trim(),
      subtipos: dados.convenios.flatMap((c) => c.subtipos).filter((s) => f.get(`s:${s.id}`)).map((s) => s.id),
    };
    if (!executar((b, u) => salvarExame(b, u, novo), ex ? "Exame atualizado" : "Exame cadastrado")) return;
    abrirForm(null);
    abrir({ tipo: "exame", id: novo.id });
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
        {dados.convenios.length ? (
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
        ) : <p className="text-sm text-suave">Nenhum convênio cadastrado nesta clínica ainda.</p>}
      </div>
    </Moldura>
  );
}

function FormEspecialidade() {
  const { clinica, executar, abrirForm, avisar } = useStore();
  const salvar = (f: FormData) => {
    const nome = String(f.get("nome")).trim();
    if (!nome) return avisar("Informe o nome");
    if (!clinica) return;
    const nova = { id: novoId("esp"), clinicaId: clinica.id, nome, icone: "Stethoscope" };
    if (executar((b, u) => salvarEspecialidade(b, u, nova), "Especialidade cadastrada")) abrirForm(null);
  };
  return (
    <Moldura titulo="Nova especialidade" descricao="Depois, vincule os profissionais a ela." onSalvar={salvar}>
      <Campo rotulo="Nome"><input name="nome" placeholder="Ex.: Mastologia" className={campo} /></Campo>
    </Moldura>
  );
}

function FormConvenio({ id }: { id?: string }) {
  const { dados, clinica, executar, abrirForm, avisar } = useStore();
  const c = dados.convenios.find((x) => x.id === id);
  const [logo, setLogo] = useState(c?.logo);
  const [nomeAtual, setNomeAtual] = useState(c?.nome ?? "");
  const salvar = (f: FormData) => {
    const nome = String(f.get("nome")).trim();
    if (!nome) return avisar("Informe o nome do convênio");
    if (!clinica) return;
    const convId = c?.id ?? novoId("conv");
    const nomes = String(f.get("subtipos")).split(",").map((x) => x.trim()).filter(Boolean);
    const novo: Convenio = {
      id: convId,
      clinicaId: clinica.id,
      nome,
      cor: c?.cor ?? corDoIndice(dados.convenios.length),
      logo,
      // rede com o mesmo nome mantém o id, para não perder o que já foi marcado nos médicos e exames
      subtipos: nomes.map((n) => c?.subtipos.find((s) => s.nome === n) ?? { id: `${convId}-${slug(n)}`, nome: n }),
    };
    if (executar((b, u) => salvarConvenio(b, u, novo), c ? "Convênio atualizado" : "Convênio cadastrado")) abrirForm(null);
  };
  return (
    <Moldura titulo={c ? "Editar convênio" : "Novo convênio"} descricao="Cadastre o convênio e os tipos de rede dele." onSalvar={salvar}>
      <EnvioLogo nome={nomeAtual} cor={c?.cor ?? corDoIndice(dados.convenios.length)} valor={logo} onChange={setLogo} />
      <Campo rotulo="Nome do convênio"><input name="nome" defaultValue={c?.nome} onChange={(e) => setNomeAtual(e.target.value)} placeholder="Ex.: Unimed" className={campo} /></Campo>
      <Campo rotulo="Tipos de rede" dica="Separe por vírgula. Ex.: Essencial, Flex, Rede fechada">
        <input name="subtipos" defaultValue={c?.subtipos.map((s) => s.nome).join(", ")} className={campo} />
      </Campo>
    </Moldura>
  );
}

function FormOrganizacao() {
  const { executar, abrirForm, avisar } = useStore();
  const salvar = (f: FormData) => {
    const nome = String(f.get("nome")).trim();
    if (!nome) return avisar("Informe o nome da organização");
    if (executar((b, u) => salvarOrganizacao(b, u, { id: novoId("org"), nome }), "Organização cadastrada")) abrirForm(null);
  };
  return (
    <Moldura titulo="Nova organização" descricao="Um cliente do sistema. Depois, cadastre as clínicas dele." onSalvar={salvar}>
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
    if (!nome) return avisar("Informe o nome da clínica");
    const organizacaoId = c?.organizacaoId ?? String(f.get("organizacao"));
    const nova = { id: c?.id ?? novoId("clinica"), organizacaoId, nome, logo };
    if (executar((b, u) => salvarClinica(b, u, nova), c ? "Clínica atualizada" : "Clínica cadastrada")) abrirForm(null);
  };
  return (
    <Moldura titulo={c ? "Editar clínica" : "Nova clínica"} descricao="Cada clínica tem os próprios médicos, convênios, especialidades e exames." onSalvar={salvar}>
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
