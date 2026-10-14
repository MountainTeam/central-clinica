// Roda com: node lib/dados.check.mjs   (imprime "ok" quando tudo passa)
import assert from "node:assert";
import { atende, combina, coberturaDaBusca, conflitosPlanos, corDoIndice, gruposHorarios, idsDeRedes, iniciais, juntarRedes, montarRedes, novaRedeId, novoId, pontuacao, resumoHorarios, slug, subtipoInfo } from "./regras.ts";
import { pontoZero } from "./semente.ts";
import { VERSAO } from "./modelo.ts";
import { podeCriarClinica, podeCriarUsuario, podeEditar, podeVer, podeVerInterno } from "./permissoes.ts";
import {
  ErroRepositorio, clinicasDo, dadosDaClinica, carregarProtegido, CHAVE, exportarBackup, importarBackup, migrar, restaurarDemonstracao, salvarClinica, salvarConvenio,
  salvarEspecialidade, salvarExame, salvarOrganizacao, salvarProfissional, salvarUsuario,
} from "./repositorio.ts";

// --- regras ---
const medico = (atendeMapa) => ({
  id: "m", clinicaId: "comn", especialidadeId: "e", nome: "Dra. Teste", horarios: [],
  procedimentos: [], exames: [], atende: atendeMapa, restricoes: [], observacoes: "",
});
// regra da skill modelo-dados-clinica: quem só atende exame não aparece na busca por consulta
assert(!atende(medico({ s1: "e" }), "s1", "consulta"));
assert(atende(medico({ s1: "e" }), "s1", "exame"));
assert(atende(medico({ s1: "ce" }), "s1", "consulta"));
assert(!atende(medico({}), "s1", "exame"));

const dados = {
  especialidades: [], exames: [], profissionais: [],
  convenios: [{ id: "c1", clinicaId: "comn", nome: "Unimed", cor: "#000", subtipos: [{ id: "c1-flex", nome: "Flex" }] }],
};
assert.equal(subtipoInfo(dados, "c1-flex").convenio.nome, "Unimed");
assert.equal(subtipoInfo(dados, "nao-existe"), undefined);

assert.equal(resumoHorarios([]), "Horários não informados");
assert.equal(
  resumoHorarios([{ dia: "Sex", inicio: "08:00", fim: "12:00" }, { dia: "Seg", inicio: "08:00", fim: "12:00" }, { dia: "Ter", inicio: "14:00", fim: "18:00" }]),
  "Seg e Sex · 08:00–12:00  |  Ter · 14:00–18:00",
);
assert.equal(resumoHorarios(["Seg", "Ter", "Qua", "Qui", "Sex"].map((dia) => ({ dia, inicio: "07:00", fim: "13:00" }))), "Seg a Sex · 07:00–13:00");

// --- busca ---
assert(combina("Humana Saúde Gold", "humana gold"), "convênio + rede");
assert(combina("Humana Saúde Gold", "gold humana"), "qualquer ordem");
assert(combina("Dra. Helena Duarte Mastologia", "helena mastologia"));
assert(combina("Mamografia bilateral", "mamogarfia"), "letras invertidas");
assert(combina("Mamografia bilateral", "mamografa"), "uma letra a menos");
assert(combina("Mamografia bilateral", "mamo"), "começo da palavra");
assert(!combina("Humana Saúde Gold", "humana platinum"));
assert(!combina("Humana Saúde", "ana"), "pedaço curto no meio não conta");
assert(combina("qualquer coisa", "   "), "busca vazia combina");
assert(pontuacao("Mamografia bilateral", "mamo") > pontuacao("Ultrassom e mamografia", "mamo"));
assert.equal(pontuacao("Ultrassom", "mamo"), 0);

const humana = { id: "h", clinicaId: "comn", nome: "Humana Saúde", cor: "#000", subtipos: [
  { id: "h-gold", nome: "Gold" }, { id: "h-flex", nome: "Flex" }, { id: "h-gold-plus", nome: "Gold Plus" }] };
const cob = coberturaDaBusca([humana], (s) => s.id === "h-flex", "humana gold");
assert.equal(cob.length, 1);
assert.deepEqual(cob[0].cobre.map((s) => s.id), []);
assert.deepEqual(cob[0].naoCobre.map((s) => s.id), ["h-gold", "h-gold-plus"], "rede existe mas não cobre aparece");
assert.deepEqual(coberturaDaBusca([humana], () => true, "humana")[0].cobre.length, 3);
assert.deepEqual(coberturaDaBusca([{ ...humana, subtipos: [] }], () => true, "humana")[0], { convenio: { ...humana, subtipos: [] }, cobre: [], naoCobre: [] });
assert.deepEqual(coberturaDaBusca([humana], () => true, "unimed"), []);

// --- redes ---
assert.equal(novaRedeId("h", "Gold", new Set()), "h-gold");
assert.equal(novaRedeId("h", "Gold", new Set(["h-gold"])), "h-gold-2");
assert.equal(novaRedeId("h", "Gold", new Set(["h-gold", "h-gold-2"])), "h-gold-3");
const juntas = juntarRedes("h", humana.subtipos, ["gold", "Prático", "Pratico", " Novo  ", ""]);
assert.deepEqual(juntas.map((s) => s.nome), ["Gold", "Flex", "Gold Plus", "Prático", "Novo"], "não repete por acento/maiúscula");
assert.equal(juntas[0].id, "h-gold", "rede existente mantém o id");
assert.deepEqual([...idsDeRedes({ convenios: [humana] })], ["h-gold", "h-flex", "h-gold-plus"]);
assert.deepEqual(
  gruposHorarios([{ dia: "Sex", inicio: "08:00", fim: "12:00" }, { dia: "Seg", inicio: "08:00", fim: "12:00" }, { dia: "Ter", inicio: "14:00", fim: "18:00" }]),
  ["Seg e Sex · 08:00–12:00", "Ter · 14:00–18:00"],
);

assert.equal(slug("Clínica São Marcos"), "clinica-sao-marcos");
assert.equal(slug("  Rede fechada! "), "rede-fechada");
assert.equal(iniciais("Dra. Helena Duarte"), "HD");
assert.equal(iniciais("COMN"), "CO");
assert.equal(iniciais("Clínica de Oncologia e Mastologia"), "CO");
assert.equal(iniciais("Promater"), "PR");
assert.notEqual(novoId("conv"), novoId("conv"));
assert(novoId("conv").startsWith("conv-"));
assert.equal(corDoIndice(0), corDoIndice(8));

// --- ponto zero ---
const b = pontoZero();
assert.equal(b.versao, VERSAO);
assert.equal(b.organizacoes.length, 5);
assert.equal(b.clinicas.length, 6);
assert.equal(b.usuarios.length, 7);
assert.deepEqual(
  b.clinicas.filter((c) => c.organizacaoId === "oncologia-mastologia").map((c) => c.nome),
  ["COMN", "ONCY"],
);
for (const c of b.clinicas) assert(b.organizacoes.some((o) => o.id === c.organizacaoId), `${c.id} sem organização`);
for (const u of b.usuarios) for (const id of u.clinicas) assert(b.clinicas.some((c) => c.id === id), `${u.id}: clínica ${id}`);
assert.deepEqual([b.especialidades, b.convenios, b.exames, b.profissionais].map((l) => l.length), [0, 0, 0, 0]);
assert(!JSON.stringify(b).toLowerCase().includes("mountain"));
assert.notEqual(pontoZero(), pontoZero(), "cada chamada devolve um objeto novo");

// --- permissões ---
const b0 = pontoZero();
const quem = (id) => b0.usuarios.find((u) => u.id === id);
const adm = quem("administrador"), com = quem("comercial"), coord = quem("coordenador-comn");
const recComn = quem("recepcao-comn"), recOncy = quem("recepcao-oncy");

assert(podeVer(recOncy, "oncy") && !podeVer(recOncy, "comn"), "Recepção ONCY não vê a COMN");
assert(podeVer(recComn, "comn") && !podeVer(recComn, "oncy"), "Recepção COMN não vê a ONCY");
assert.deepEqual(clinicasDo(b0, recOncy).map((c) => c.id), ["oncy"]);
assert.equal(clinicasDo(b0, com).length, 6);
assert(podeEditar(coord, "comn") && !podeEditar(coord, "oncy"), "Coordenador COMN edita só a COMN");
assert(podeEditar(com, "oncy") && podeCriarClinica(com) && !podeCriarUsuario(com), "Comercial edita tudo e não cria usuário");
assert(!podeEditar(recComn, "comn"), "Recepção não edita");
assert(podeCriarUsuario(adm) && !podeCriarClinica(coord));

// --- repositório ---
const ficha = (clinicaId, extra = {}) => ({ ...medico({}), id: "m1", clinicaId, ...extra });
const b1 = salvarProfissional(b0, coord, ficha("comn"));
assert.equal(dadosDaClinica(b1, "comn").profissionais.length, 1);
assert.equal(dadosDaClinica(b1, "oncy").profissionais.length, 0);
assert.equal(b0.profissionais.length, 0, "gravar não altera o banco anterior");
assert.throws(() => salvarProfissional(b0, coord, ficha("oncy")), ErroRepositorio);
assert.throws(() => salvarProfissional(b0, recComn, ficha("comn")), ErroRepositorio, "Recepção não grava nada");
// não dá para puxar um médico de clínica proibida trocando o clinicaId
const b2 = salvarProfissional(b0, com, ficha("oncy"));
assert.throws(() => salvarProfissional(b2, coord, ficha("comn")), ErroRepositorio);
// editar substitui, não duplica
const b3 = salvarProfissional(b1, coord, ficha("comn", { nome: "Dra. Outra" }));
assert.deepEqual(dadosDaClinica(b3, "comn").profissionais.map((p) => p.nome), ["Dra. Outra"]);

const conv = (id, clinicaId) => ({ id, clinicaId, nome: "Unimed", cor: "#000", subtipos: [] });
const b4 = salvarConvenio(salvarConvenio(b0, com, conv("c1", "comn")), com, conv("c2", "oncy"));
assert.equal(dadosDaClinica(b4, "comn").convenios.length, 1, "mesmo nome em clínicas diferentes não se mistura");
assert.throws(() => salvarConvenio(b0, recOncy, conv("c3", "oncy")), ErroRepositorio);
assert.equal(salvarExame(b0, coord, { id: "x1", clinicaId: "comn", nome: "ECG", preparo: [], documentos: "", subtipos: [] }).exames.length, 1);
assert.throws(() => salvarEspecialidade(b0, coord, { id: "e1", clinicaId: "oncy", nome: "Cardio", icone: "Stethoscope" }), ErroRepositorio);

// clínicas e organizações
const nova = { id: "nova", organizacaoId: "promater", nome: "Nova" };
assert.throws(() => salvarClinica(b0, coord, nova), ErroRepositorio, "Coordenador não cria clínica");
assert.equal(salvarClinica(b0, com, nova).clinicas.length, 7);
assert.throws(() => salvarClinica(b0, com, { ...nova, organizacaoId: "nao-existe" }), ErroRepositorio);
const comn = b0.clinicas.find((c) => c.id === "comn");
assert.equal(salvarClinica(b0, coord, { ...comn, logo: "data:image/png;base64,AA" }).clinicas.find((c) => c.id === "comn").logo, "data:image/png;base64,AA");
assert.throws(() => salvarClinica(b0, coord, { ...b0.clinicas.find((c) => c.id === "oncy"), nome: "X" }), ErroRepositorio);
assert.throws(() => salvarOrganizacao(b0, coord, { id: "o", nome: "O" }), ErroRepositorio);
assert.equal(salvarOrganizacao(b0, com, { id: "o", nome: "O" }).organizacoes.length, 6);

// usuários
const novoUsuario = { id: "n1", nome: "Recepção nova", email: "n@exemplo.com.br", papel: "recepcao", clinicas: ["comn", "oncy"] };
assert.equal(salvarUsuario(b0, adm, novoUsuario).usuarios.length, 8);
assert.throws(() => salvarUsuario(b0, com, novoUsuario), ErroRepositorio, "Comercial não cria usuário");
assert.throws(() => salvarUsuario(b0, adm, { ...novoUsuario, clinicas: [] }), ErroRepositorio, "Recepção precisa de clínica");
assert.deepEqual(salvarUsuario(b0, adm, { ...novoUsuario, papel: "comercial" }).usuarios.at(-1).clinicas, [], "Comercial vale para todas");

// restaurar
assert.deepEqual(restaurarDemonstracao(b3, adm), pontoZero());
assert.throws(() => restaurarDemonstracao(b3, com), ErroRepositorio);

// --- backup e migração ---
assert.equal(migrar(null), null);
assert.equal(migrar({ versao: 1 }), null, "formato desconhecido não vira banco");
assert.deepEqual(migrar(pontoZero()), pontoZero());
const copia = exportarBackup(b1);
assert.deepEqual(importarBackup(b0, adm, copia), b1);
assert.throws(() => importarBackup(b0, com, copia), ErroRepositorio, "só o Administrador restaura");
assert.throws(() => importarBackup(b0, adm, "{não é json"), ErroRepositorio);

const { usuarios: _u, ...semUsuarios } = pontoZero();
assert.equal(migrar(semUsuarios), null, "banco sem lista de usuários não vale");
assert.equal(migrar({ versao: VERSAO, clinicas: [] }), null);
assert.throws(() => importarBackup(b0, adm, JSON.stringify(semUsuarios)), ErroRepositorio);

// dados antigos: copia uma vez só; sem espaço para a cópia, protege a chave antiga
const memoria = (cheio) => {
  const m = new Map();
  return { m, get length() { return m.size; }, key: (i) => [...m.keys()][i] ?? null, getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => { if (cheio && k !== CHAVE) throw new Error("cheio"); m.set(k, v); } };
};
globalThis.localStorage = memoria(false);
localStorage.setItem(CHAVE, '{"versao":1}');
assert.equal(carregarProtegido().protegido, false);
carregarProtegido();
assert.equal([...localStorage.m.keys()].filter((k) => k.startsWith("cartilha:backup")).length, 1, "não repete a cópia");
globalThis.localStorage = memoria(true);
localStorage.setItem(CHAVE, '{"versao":1}');
assert.equal(carregarProtegido().protegido, true, "sem espaço para a cópia, não pode gravar por cima");

// --- redes órfãs ---
const convR = { id: "cr", clinicaId: "comn", nome: "Humana", cor: "#000", subtipos: [{ id: "cr-gold", nome: "Gold" }, { id: "cr-flex", nome: "Flex" }] };
let bR = salvarConvenio(b0, com, convR);
bR = salvarProfissional(bR, com, ficha("comn", { atende: { "cr-gold": "ce", "cr-flex": "c" }, restricoes: [{ texto: "x", subtipoId: "cr-gold" }] }));
bR = salvarExame(bR, com, { id: "xr", clinicaId: "comn", nome: "ECG", preparo: [], documentos: "", subtipos: ["cr-gold", "cr-flex"] });
// renomear mantém o id: nada se perde
const renomeado = salvarConvenio(bR, com, { ...convR, subtipos: [{ id: "cr-gold", nome: "Gold Nacional" }, { id: "cr-flex", nome: "Flex" }] });
assert.deepEqual(renomeado.profissionais[0].atende, { "cr-gold": "ce", "cr-flex": "c" });
// tirar a rede limpa os vínculos
const semGold = salvarConvenio(bR, com, { ...convR, subtipos: [{ id: "cr-flex", nome: "Flex" }] });
assert.deepEqual(semGold.profissionais[0].atende, { "cr-flex": "c" });
assert.equal(semGold.profissionais[0].restricoes[0].subtipoId, undefined);
assert.deepEqual(semGold.exames[0].subtipos, ["cr-flex"]);
assert.deepEqual(conflitosPlanos({ ...convR, gruposPlanos: [{ status: "nao_atende", titulo: "Não atendemos", planos: ["gold"] }] }, dadosDaClinica(bR, "comn")), ["gold"]);

// --- montarRedes (formulário) ---
const antesR = [{ id: "v-gold", nome: "Gold" }, { id: "v-flex", nome: "Flex" }];
assert.deepEqual(montarRedes("v", antesR, [{ id: "v-gold", nome: "Gold Nacional" }, { id: "v-flex", nome: "Flex" }], [], []).redes, [{ id: "v-gold", nome: "Gold Nacional" }, { id: "v-flex", nome: "Flex" }]);
assert.deepEqual(montarRedes("v", antesR, [{ id: "v-gold", nome: "  " }, { id: "v-flex", nome: "Flex" }], [], []).redes, antesR, "nome vazio mantém o anterior");
assert.match(montarRedes("v", antesR, [{ id: "v-gold", nome: "FLEX" }, { id: "v-flex", nome: "flex" }], [], []).erro, /mesmo nome/);
assert.deepEqual(montarRedes("v", antesR, [], [], ["Plano A"]).redes, [], "remover tudo não ressuscita pelos planos");
assert.deepEqual(montarRedes("v", [], [], [], ["Plano A", "Plano A"]).redes.map((r) => r.nome), ["Plano A"], "convênio novo usa os planos");
assert.equal(montarRedes("v", antesR, antesR, ["gold", "Prime"], []).redes.length, 3, "nova com nome existente não duplica");

// --- central × recepção ---
const central = quem("central-comn");
assert.equal(central.papel, "central");
assert(podeVerInterno(central) && !podeVerInterno(recComn));
assert(!podeEditar(central, "comn") && podeVer(central, "comn"), "Central só consulta");
const bI = salvarProfissional(b0, coord, ficha("comn", { observacoesInternas: "só a central" }));
assert.equal(dadosDaClinica(bI, "comn", central).profissionais[0].observacoesInternas, "só a central");
assert.equal(dadosDaClinica(bI, "comn", recComn).profissionais[0].observacoesInternas, undefined, "recepção não vê");
// migração da versão 3: a central vira papel central
const v3 = { ...pontoZero(), versao: 3, usuarios: pontoZero().usuarios.map((u) => u.id === "central-comn" ? { ...u, papel: "recepcao" } : u) };
assert.equal(migrar(v3).versao, VERSAO);
assert.equal(migrar(v3).usuarios.find((u) => u.id === "central-comn").papel, "central");
assert.throws(() => salvarUsuario(b0, adm, { ...novoUsuario, papel: "central", clinicas: [] }), ErroRepositorio, "Central precisa de clínica");

console.log("ok");
