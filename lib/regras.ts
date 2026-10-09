import { DIAS, type DadosClinica, type Horario, type Profissional, type Tipo } from "./modelo.ts";

// A pergunta mais comum da central: "quem atende o convênio X para Y?"
export function atende(p: Profissional, subtipoId: string, tipo: Tipo) {
  return (p.atende[subtipoId] ?? "").includes(tipo === "consulta" ? "c" : "e");
}

export function subtipoInfo(d: DadosClinica, subtipoId: string) {
  for (const convenio of d.convenios) {
    const subtipo = convenio.subtipos.find((s) => s.id === subtipoId);
    if (subtipo) return { convenio, subtipo };
  }
}

// "Seg, Qua e Sex · 08:00–12:00"; dias seguidos viram "Seg a Sex"
export function resumoHorarios(hs: Horario[]) {
  if (!hs.length) return "Horários não informados";
  const pos = (d: string) => DIAS.indexOf(d as (typeof DIAS)[number]);
  const grupos = new Map<string, string[]>();
  for (const x of [...hs].sort((a, b) => pos(a.dia) - pos(b.dia))) {
    const k = `${x.inicio}–${x.fim}`;
    grupos.set(k, [...(grupos.get(k) ?? []), x.dia]);
  }
  const seguidos = (d: string[]) => d.length >= 3 && pos(d[d.length - 1]) - pos(d[0]) === d.length - 1;
  const lista = (d: string[]) =>
    seguidos(d) ? `${d[0]} a ${d[d.length - 1]}` : d.length > 1 ? `${d.slice(0, -1).join(", ")} e ${d[d.length - 1]}` : d[0];
  return [...grupos].map(([faixa, d]) => `${lista(d)} · ${faixa}`).join("  |  ");
}

export const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const slug = (t: string) => semAcento(t).trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const LIGACOES = /^(de|da|do|das|dos|e)$/i;
// "Dra. Helena Duarte" → "HD"; "COMN" → "CO"; "Clínica de Oncologia" → "CO"
export function iniciais(nome: string) {
  const partes = nome.replace(/^Dr[a]?\.\s*/, "").split(/\s+/).filter((p) => p && !LIGACOES.test(p));
  if (!partes.length) return "?";
  return (partes.length === 1 ? partes[0].slice(0, 2) : partes[0][0] + partes[1][0]).toUpperCase();
}

export const novoId = (prefixo: string) =>
  `${prefixo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// Cor automática de convênio novo (fallback quando não há logo)
export const CORES = ["#0d9b86", "#2d6be0", "#d1344b", "#ea7a1a", "#7c3aed", "#0891b2", "#ca8a04", "#db2777"];
export const corDoIndice = (n: number) => CORES[n % CORES.length];
