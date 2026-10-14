import type { Convenio, DadosClinica } from "./modelo.ts";
import { combina, slug } from "./regras.ts";

export type Atendimento = "c" | "e" | "ce";

function dividir(linha: string, sep: string) {
  const celulas: string[] = [];
  let atual = "", aspas = false;
  for (const ch of linha) {
    if (ch === '"') aspas = !aspas;
    else if (ch === sep && !aspas) { celulas.push(atual); atual = ""; }
    else atual += ch;
  }
  celulas.push(atual);
  return celulas;
}

// aceita colagem do Excel (tab) e CSV com ; ou ,
export function lerTabela(texto: string): string[][] {
  const linhas = texto.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  const sep = ["\t", ";", ","].find((s) => linhas.some((l) => l.includes(s)));
  return linhas.map((l) => (sep ? dividir(l, sep) : [l]).map((c) => c.trim()));
}

const CABECALHOS = new Set(["rede", "plano", "produto", "medico", "profissional"]);
export function semCabecalho(linhas: string[][]): string[][] {
  return linhas.length && CABECALHOS.has(slug(linhas[0][0] ?? "")) ? linhas.slice(1) : linhas;
}

export function planejarRedes(c: Convenio, nomes: string[]) {
  const existentes: string[] = [], novas: string[] = [], repetidas: string[] = [];
  const conhecidas = new Set(c.subtipos.map((s) => slug(s.nome)));
  const vistas = new Set<string>();
  for (const nome of nomes.map((n) => n.trim()).filter(Boolean)) {
    const chave = slug(nome);
    if (vistas.has(chave)) repetidas.push(nome);
    else if (conhecidas.has(chave)) existentes.push(nome);
    else novas.push(nome);
    vistas.add(chave);
  }
  return { novas, existentes, repetidas };
}

function lerAtendimento(texto: string): Atendimento {
  const t = slug(texto);
  return t.startsWith("consulta") ? "c" : t.startsWith("exame") ? "e" : "ce";
}

export function planejarRedesPorMedico(d: DadosClinica, _c: Convenio, linhas: string[][]) {
  const itens: { profissionalId: string; medico: string; rede: string; atendimento: Atendimento }[] = [];
  const semMedico: string[] = [];
  for (const [medico = "", rede = "", atendimento = ""] of linhas) {
    if (!medico || !rede) continue;
    const achados = d.profissionais.filter((p) => combina(p.nome, medico));
    if (achados.length !== 1) { if (!semMedico.includes(medico)) semMedico.push(medico); continue; }
    itens.push({ profissionalId: achados[0].id, medico: achados[0].nome, rede, atendimento: lerAtendimento(atendimento) });
  }
  return { itens, semMedico };
}
