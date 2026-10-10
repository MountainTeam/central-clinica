// Roda com: node lib/dados.check.mjs   (imprime "ok" quando tudo passa)
import assert from "node:assert";
import { atende, corDoIndice, iniciais, novoId, resumoHorarios, slug, subtipoInfo } from "./regras.ts";
import { pontoZero } from "./semente.ts";
import { VERSAO } from "./modelo.ts";
import { podeCriarClinica, podeCriarUsuario, podeEditar, podeVer } from "./permissoes.ts";
import {
  ErroRepositorio, clinicasDo, dadosDaClinica, restaurarDemonstracao, salvarClinica, salvarConvenio,
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

console.log("ok");
