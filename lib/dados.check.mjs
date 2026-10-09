// Roda com: node lib/dados.check.mjs   (imprime "ok" quando tudo passa)
import assert from "node:assert";
import { atende, corDoIndice, iniciais, novoId, resumoHorarios, slug, subtipoInfo } from "./regras.ts";
import { pontoZero } from "./semente.ts";
import { VERSAO } from "./modelo.ts";

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
assert.equal(b.organizacoes.length, 7);
assert.equal(b.clinicas.length, 8);
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

console.log("ok");
