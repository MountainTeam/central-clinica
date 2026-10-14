// Única porta de leitura e gravação dos dados. Hoje guarda um JSON no navegador;
// na v1 estas mesmas funções passam a chamar o servidor, e as checagens de permissão vão junto.
import { VERSAO, type Banco, type Clinica, type Convenio, type DadosClinica, type Especialidade, type Exame, type Organizacao, type Profissional, type Usuario } from "./modelo.ts";
import { podeCriarClinica, podeCriarUsuario, podeEditar, podeVer, podeVerInterno } from "./permissoes.ts";
import { pontoZero } from "./semente.ts";

export const CHAVE = "cartilha:v1";

export class ErroRepositorio extends Error {}

const SEM_PERMISSAO = "Seu usuário não pode editar esta clínica.";

function exigir(ok: boolean, mensagem: string) {
  if (!ok) throw new ErroRepositorio(mensagem);
}

function gravarEm<T extends { id: string }>(lista: T[], item: T): T[] {
  return lista.some((x) => x.id === item.id) ? lista.map((x) => (x.id === item.id ? item : x)) : [...lista, item];
}

// Confere a clínica nova e, se o item já existia, também a antiga (não dá para "puxar" item de outra clínica)
function conferirClinica(u: Usuario, item: { clinicaId: string }, antes?: { clinicaId: string }) {
  exigir(podeEditar(u, item.clinicaId) && (!antes || podeEditar(u, antes.clinicaId)), SEM_PERMISSAO);
}

// --- armazenamento ---

export const CHAVE_BACKUP = "cartilha:backup";

const LISTAS = ["organizacoes", "clinicas", "usuarios", "especialidades", "convenios", "exames", "profissionais"] as const;

// Leva um banco guardado para a versão atual; null quando não reconhece o formato
export function migrar(b: unknown): Banco | null {
  if (!b || typeof b !== "object") return null;
  let banco = b as Banco;
  if (!LISTAS.every((l) => Array.isArray(banco[l]))) return null;
  // versão 3 → 4: a central de atendimento ganha papel próprio
  if (banco.versao === 3) banco = { ...banco, versao: 4, usuarios: banco.usuarios.map((u) => u.id === "central-comn" && u.papel === "recepcao" ? { ...u, papel: "central" } : u) };
  return banco.versao === VERSAO ? banco : null;
}

// Guarda uma cópia do que não dá para ler, sem repetir a mesma cópia; false quando não coube
function guardarCopia(bruto: string): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(`${CHAVE_BACKUP}:`) && localStorage.getItem(k) === bruto) return true;
    }
    localStorage.setItem(`${CHAVE_BACKUP}:${new Date().toISOString()}`, bruto);
    return true;
  } catch {
    return false;
  }
}

// protegido: há dados antigos que não puderam ser copiados; quem chama não deve gravar por cima
export function carregarProtegido(): { banco: Banco; protegido: boolean } {
  let bruto: string | null;
  try { bruto = localStorage.getItem(CHAVE); } catch { return { banco: pontoZero(), protegido: false }; }
  if (!bruto) return { banco: pontoZero(), protegido: false };
  try {
    const b = migrar(JSON.parse(bruto));
    if (b) return { banco: b, protegido: false };
  } catch {}
  // formato que esta versão não entende: guarda uma cópia antes de recomeçar, para não perder cadastro
  return { banco: pontoZero(), protegido: !guardarCopia(bruto) };
}

export const carregar = (): Banco => carregarProtegido().banco;

export const exportarBackup = (b: Banco) => JSON.stringify(b, null, 2);

export function importarBackup(_b: Banco, u: Usuario, texto: string): Banco {
  exigir(podeCriarUsuario(u), "Só o Administrador restaura uma cópia.");
  let novo: Banco | null = null;
  try { novo = migrar(JSON.parse(texto)); } catch {}
  exigir(!!novo, "Esse arquivo não é uma cópia da cartilha.");
  return novo!;
}

export function gravar(b: Banco): boolean {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(b));
    return true;
  } catch {
    return false;
  }
}

// --- leitura ---

export const clinicasDo = (b: Banco, u: Usuario): Clinica[] => b.clinicas.filter((c) => podeVer(u, c.id));

// Recepção recebe médicos e exames sem as observações internas
export function dadosDaClinica(b: Banco, clinicaId: string, u?: Usuario): DadosClinica {
  const tudo = !u || podeVerInterno(u);
  const semInterno = <T extends { observacoesInternas?: string }>({ observacoesInternas: _, ...resto }: T) => resto as T;
  const exames = b.exames.filter((x) => x.clinicaId === clinicaId);
  const profissionais = b.profissionais.filter((x) => x.clinicaId === clinicaId);
  return {
    especialidades: b.especialidades.filter((x) => x.clinicaId === clinicaId),
    convenios: b.convenios.filter((x) => x.clinicaId === clinicaId),
    exames: tudo ? exames : exames.map(semInterno),
    profissionais: tudo ? profissionais : profissionais.map(semInterno),
  };
}

// --- gravação: sempre confere a permissão antes ---

export function salvarProfissional(b: Banco, u: Usuario, p: Profissional): Banco {
  conferirClinica(u, p, b.profissionais.find((x) => x.id === p.id));
  return { ...b, profissionais: gravarEm(b.profissionais, p) };
}

export function salvarExame(b: Banco, u: Usuario, e: Exame): Banco {
  conferirClinica(u, e, b.exames.find((x) => x.id === e.id));
  return { ...b, exames: gravarEm(b.exames, e) };
}

export function salvarExameComProfissionais(b: Banco, u: Usuario, e: Exame, profsIds: string[]): Banco {
  conferirClinica(u, e, b.exames.find((x) => x.id === e.id));
  const examesAtualizados = gravarEm(b.exames, e);
  const profissionaisAtualizados = b.profissionais.map((p) => {
    if (p.clinicaId !== e.clinicaId) return p;
    const selecionado = profsIds.includes(p.id);
    const jaPossui = p.exames.includes(e.id);
    if (selecionado && !jaPossui) {
      return { ...p, exames: [...p.exames, e.id] };
    }
    if (!selecionado && jaPossui) {
      return { ...p, exames: p.exames.filter((id) => id !== e.id) };
    }
    return p;
  });
  return { ...b, exames: examesAtualizados, profissionais: profissionaisAtualizados };
}

// rede que saiu do convênio não pode continuar marcada em médico nem em exame
function limparRedes(b: Banco, clinicaId: string, ids: Set<string>): Banco {
  if (!ids.size) return b;
  return {
    ...b,
    profissionais: b.profissionais.map((p) => p.clinicaId !== clinicaId ? p : {
      ...p,
      atende: Object.fromEntries(Object.entries(p.atende).filter(([id]) => !ids.has(id))),
      restricoes: p.restricoes.map((r) => r.subtipoId && ids.has(r.subtipoId) ? { texto: r.texto } : r),
    }),
    exames: b.exames.map((e) => e.clinicaId !== clinicaId ? e : { ...e, subtipos: e.subtipos.filter((id) => !ids.has(id)) }),
  };
}

export function salvarConvenio(b: Banco, u: Usuario, c: Convenio): Banco {
  const antes = b.convenios.find((x) => x.id === c.id);
  conferirClinica(u, c, antes);
  const ficam = new Set(c.subtipos.map((s) => s.id));
  const sairam = new Set((antes?.subtipos ?? []).map((s) => s.id).filter((id) => !ficam.has(id)));
  return limparRedes({ ...b, convenios: gravarEm(b.convenios, c) }, c.clinicaId, sairam);
}

export function salvarEspecialidade(b: Banco, u: Usuario, e: Especialidade): Banco {
  conferirClinica(u, e, b.especialidades.find((x) => x.id === e.id));
  return { ...b, especialidades: gravarEm(b.especialidades, e) };
}

export function salvarClinica(b: Banco, u: Usuario, c: Clinica): Banco {
  const existe = b.clinicas.some((x) => x.id === c.id);
  exigir(existe ? podeEditar(u, c.id) : podeCriarClinica(u), existe ? SEM_PERMISSAO : "Só Administrador e Comercial criam clínicas.");
  exigir(b.organizacoes.some((o) => o.id === c.organizacaoId), "Escolha uma organização válida.");
  return { ...b, clinicas: gravarEm(b.clinicas, c) };
}

export function salvarOrganizacao(b: Banco, u: Usuario, o: Organizacao): Banco {
  exigir(podeCriarClinica(u), "Só Administrador e Comercial criam organizações.");
  return { ...b, organizacoes: gravarEm(b.organizacoes, o) };
}

export function salvarUsuario(b: Banco, u: Usuario, novo: Usuario): Banco {
  exigir(podeCriarUsuario(u), "Só o Administrador cria usuários.");
  const todas = novo.papel === "administrador" || novo.papel === "comercial";
  exigir(todas || novo.clinicas.length > 0, "Vincule pelo menos uma clínica.");
  return { ...b, usuarios: gravarEm(b.usuarios, todas ? { ...novo, clinicas: [] } : novo) };
}

// --- exclusão: acha o item, confere a clínica e devolve um banco novo ---

function achar<T extends { id: string; clinicaId: string }>(lista: T[], u: Usuario, id: string): T {
  const item = lista.find((x) => x.id === id);
  exigir(!!item, "Não encontrado.");
  conferirClinica(u, item!);
  return item!;
}

export function excluirProfissional(b: Banco, u: Usuario, id: string): Banco {
  achar(b.profissionais, u, id);
  return { ...b, profissionais: b.profissionais.filter((x) => x.id !== id) };
}

export function excluirExame(b: Banco, u: Usuario, id: string): Banco {
  achar(b.exames, u, id);
  return {
    ...b,
    exames: b.exames.filter((x) => x.id !== id),
    profissionais: b.profissionais.map((p) => p.exames.includes(id) ? { ...p, exames: p.exames.filter((e) => e !== id) } : p),
  };
}

export function excluirConvenio(b: Banco, u: Usuario, id: string): Banco {
  const c = achar(b.convenios, u, id);
  return limparRedes({ ...b, convenios: b.convenios.filter((x) => x.id !== id) }, c.clinicaId, new Set(c.subtipos.map((s) => s.id)));
}

export function excluirEspecialidade(b: Banco, u: Usuario, id: string): Banco {
  achar(b.especialidades, u, id);
  const n = b.profissionais.filter((p) => p.especialidadeId === id).length;
  exigir(n === 0, `Mova os ${n} médicos desta especialidade antes de excluir.`);
  return { ...b, especialidades: b.especialidades.filter((x) => x.id !== id) };
}

export function excluirUsuario(b: Banco, u: Usuario, id: string): Banco {
  exigir(podeCriarUsuario(u), "Só o Administrador exclui usuários.");
  exigir(id !== u.id, "Você não pode excluir o próprio usuário.");
  exigir(b.usuarios.some((x) => x.id === id), "Não encontrado.");
  return { ...b, usuarios: b.usuarios.filter((x) => x.id !== id) };
}

export function restaurarDemonstracao(_b: Banco, u: Usuario): Banco {
  exigir(podeCriarUsuario(u), "Só o Administrador restaura a demonstração.");
  return pontoZero();
}
