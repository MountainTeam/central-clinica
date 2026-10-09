// Roda com: node lib/dados.check.mjs
import assert from "node:assert";
import { atende, clinicasIniciais, resumoHorarios, usuariosIniciais, visivelPara, DIAS } from "./dados.ts";

const [centro, norte] = clinicasIniciais.map((c) => c.dados);
const quem = (d, sub, tipo) => d.profissionais.filter((p) => atende(p, sub, tipo)).map((p) => p.id);

// Lúcia só faz exame pela Unimed Essencial: não pode aparecer na busca por consulta
assert(!quem(centro, "unimed-essencial", "consulta").includes("lucia-ferraz"));
assert(quem(centro, "unimed-essencial", "exame").includes("lucia-ferraz"));
// cada clínica só enxerga os próprios médicos
assert(!norte.profissionais.some((p) => p.id === "lucia-ferraz"));

for (const c of clinicasIniciais) {
  const subs = new Set(c.dados.convenios.flatMap((x) => x.subtipos.map((s) => s.id)));
  const exames = new Set(c.dados.exames.map((e) => e.id));
  for (const p of c.dados.profissionais) {
    for (const s of Object.keys(p.atende)) assert(subs.has(s), `${c.id}/${p.id}: ${s}`);
    for (const e of p.exames) assert(exames.has(e), `${c.id}/${p.id}: exame ${e}`);
    for (const h of p.horarios) assert(DIAS.includes(h.dia) && h.inicio < h.fim, `${c.id}/${p.id}: ${JSON.stringify(h)}`);
  }
  for (const e of c.dados.exames) for (const s of e.subtipos) assert(subs.has(s), `${c.id}/${e.id}: ${s}`);
}

assert.equal(resumoHorarios([{ dia: "Sex", inicio: "08:00", fim: "12:00" }, { dia: "Seg", inicio: "08:00", fim: "12:00" }, { dia: "Ter", inicio: "14:00", fim: "18:00" }]),
  "Seg e Sex · 08:00–12:00  |  Ter · 14:00–18:00");
assert.equal(resumoHorarios([]), "Horários não informados");
assert.equal(resumoHorarios(["Seg", "Ter", "Qua", "Qui", "Sex"].map((dia) => ({ dia, inicio: "07:00", fim: "13:00" }))), "Seg a Sex · 07:00–13:00");
assert.equal(resumoHorarios(["Seg", "Qua", "Sex"].map((dia) => ({ dia, inicio: "07:00", fim: "13:00" }))), "Seg, Qua e Sex · 07:00–13:00");
// setores: COMN não vê oncologistas, Oncology não vê COMN; compartilhado aparece para os dois
const comn = visivelPara(centro, "comn"), onco = visivelPara(centro, "oncology");
const ids = (d) => d.profissionais.map((p) => p.id);
assert(ids(comn).includes("helena-duarte") && !ids(comn).includes("marcelo-antunes"));
assert(ids(onco).includes("marcelo-antunes") && !ids(onco).includes("helena-duarte"));
assert(ids(comn).includes("andre-valenca") && ids(onco).includes("andre-valenca"));
assert(!onco.especialidades.some((e) => e.id === "dermato"), "especialidade sem médico visível deve sumir");
assert.equal(visivelPara(centro, undefined), centro);
for (const u of usuariosIniciais) if (u.setorId) {
  const c = clinicasIniciais.find((x) => x.id === u.clinicaId);
  assert(c?.dados.setores.some((s) => s.id === u.setorId), `${u.id}: setor inexistente`);
}
for (const c of clinicasIniciais) for (const p of c.dados.profissionais)
  if (p.setorId) assert(c.dados.setores.some((s) => s.id === p.setorId), `${c.id}/${p.id}: setor ${p.setorId}`);
console.log("ok");
