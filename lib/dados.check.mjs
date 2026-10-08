// Roda com: node lib/dados.check.mjs
import assert from "node:assert";
import { atende, dadosIniciais } from "./dados.ts";

const quem = (sub, tipo) =>
  dadosIniciais.profissionais.filter((p) => atende(p, sub, tipo)).map((p) => p.id);

// Lúcia só faz exame pela Unimed Essencial: não pode aparecer na busca por consulta
assert(!quem("unimed-essencial", "consulta").includes("lucia-ferraz"));
assert(quem("unimed-essencial", "exame").includes("lucia-ferraz"));
// todo subtipo citado existe
const subs = new Set(dadosIniciais.convenios.flatMap((c) => c.subtipos.map((s) => s.id)));
for (const p of dadosIniciais.profissionais) for (const s of Object.keys(p.atende)) assert(subs.has(s), `${p.id}: ${s}`);
for (const e of dadosIniciais.exames) for (const s of e.subtipos) assert(subs.has(s), `${e.id}: ${s}`);
console.log("ok");
