import { DIAS, type Convenio, type DadosClinica, type GrupoPlano, type Horario, type Profissional, type Subtipo, type Tipo } from "./modelo.ts";

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

// ["Seg, Qua e Sex · 08:00–12:00"]; dias seguidos viram "Seg a Sex"
export function gruposHorarios(hs: Horario[]) {
  const pos = (d: string) => DIAS.indexOf(d as (typeof DIAS)[number]);
  const grupos = new Map<string, string[]>();
  for (const x of [...hs].sort((a, b) => pos(a.dia) - pos(b.dia))) {
    const k = `${x.inicio}–${x.fim}`;
    grupos.set(k, [...(grupos.get(k) ?? []), x.dia]);
  }
  const seguidos = (d: string[]) => d.length >= 3 && pos(d[d.length - 1]) - pos(d[0]) === d.length - 1;
  const lista = (d: string[]) =>
    seguidos(d) ? `${d[0]} a ${d[d.length - 1]}` : d.length > 1 ? `${d.slice(0, -1).join(", ")} e ${d[d.length - 1]}` : d[0];
  return [...grupos].map(([faixa, d]) => `${lista(d)} · ${faixa}`);
}

export function resumoHorarios(hs: Horario[]) {
  return hs.length ? gruposHorarios(hs).join("  |  ") : "Horários não informados";
}

export const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const slug = (t: string) => semAcento(t).trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export const palavras = (t: string) => semAcento(t).split(/[^a-z0-9]+/).filter(Boolean);

// Um erro de digitação: troca, falta, sobra ou inversão de duas letras vizinhas
function umErro(a: string, b: string) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return a.slice(i + 1) === b.slice(i + 1)
    || a.slice(i + 1) === b.slice(i)
    || a.slice(i) === b.slice(i + 1)
    || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
}

const achaPalavra = (w: string, ts: string[]) =>
  ts.some((t) => t.startsWith(w) || (w.length >= 4 && t.includes(w))
    || (w.length >= 5 && (umErro(w, t) || umErro(w, t.slice(0, w.length)))));

// "humana gold" acha "Humana Saúde · Gold": todas as palavras, em qualquer ordem
export function combina(texto: string, q: string) {
  const ws = palavras(q);
  if (!ws.length) return true;
  const ts = palavras(texto);
  return ws.every((w) => achaPalavra(w, ts));
}

export function pontuacao(texto: string, q: string) {
  if (!combina(texto, q)) return 0;
  const ws = palavras(q);
  const ts = palavras(texto);
  let p = 1;
  if (ts.join(" ").startsWith(ws.join(" "))) p += 4;
  if (ws.every((w) => ts.some((t) => t.startsWith(w)))) p += 2;
  if (ws.every((w) => ts.includes(w))) p += 1;
  return p;
}

// Para "o convênio do paciente cobre?": separa as redes encontradas entre as que cobrem e as que não
export function coberturaDaBusca(convenios: Convenio[], cobre: (s: Subtipo) => boolean, q: string) {
  return convenios.flatMap((c) => {
    if (!c.subtipos.length) return combina(c.nome, q) ? [{ convenio: c, cobre: [] as Subtipo[], naoCobre: [] as Subtipo[] }] : [];
    const achadas = c.subtipos.filter((s) => combina(`${c.nome} ${s.nome}`, q));
    return achadas.length ? [{ convenio: c, cobre: achadas.filter(cobre), naoCobre: achadas.filter((s) => !cobre(s)) }] : [];
  });
}

// O id da rede nasce do nome, mas não muda depois: renomear mantém o id
export function novaRedeId(convenioId: string, nome: string, usados: Set<string>) {
  const base = `${convenioId}-${slug(nome) || "rede"}`;
  let id = base;
  for (let n = 2; usados.has(id); n++) id = `${base}-${n}`;
  return id;
}

export function juntarRedes(convenioId: string, existentes: Subtipo[], nomes: string[]): Subtipo[] {
  const vistos = new Set(existentes.map((s) => slug(s.nome)));
  const usados = new Set(existentes.map((s) => s.id));
  const novas: Subtipo[] = [];
  for (const bruto of nomes) {
    const nome = bruto.trim().replace(/\s+/g, " ");
    if (!nome || vistos.has(slug(nome))) continue;
    vistos.add(slug(nome));
    const id = novaRedeId(convenioId, nome, usados);
    usados.add(id);
    novas.push({ id, nome });
  }
  return [...existentes, ...novas];
}

export const idsDeRedes = (d: Pick<DadosClinica, "convenios">) => new Set(d.convenios.flatMap((c) => c.subtipos.map((s) => s.id)));

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

export function gruposPlanosDoConvenio(c: Convenio): GrupoPlano[] {
  if (c.gruposPlanos !== undefined) return c.gruposPlanos;
  const nomesSubtipos = c.subtipos.map((s) => s.nome);
  return [
    {
      status: "atende",
      titulo: "Atende consultas e exames",
      planos: nomesSubtipos,
    },
    {
      status: "somente_exames",
      titulo: "Somente exames",
      nota: "Não precisa de encaminhamento para a clínica",
      planos: [],
    },
    {
      status: "nao_atende",
      titulo: "Não atendemos",
      planos: [],
    },
  ];
}

export function observacoesDoConvenio(c: Convenio): string[] {
  if (c.observacoesGerais !== undefined) return c.observacoesGerais;
  return [];
}

