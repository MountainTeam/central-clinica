// Única porta de leitura e gravação dos dados. Hoje guarda um JSON no navegador;
// na v1 estas mesmas funções passam a chamar o servidor, e as checagens de permissão vão junto.
import { VERSAO, type Banco, type Clinica, type Convenio, type DadosClinica, type Especialidade, type Exame, type Organizacao, type Profissional, type Usuario } from "./modelo.ts";
import { podeCriarClinica, podeCriarUsuario, podeEditar, podeVer } from "./permissoes.ts";
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

export function carregar(): Banco {
  try {
    const b = JSON.parse(localStorage.getItem(CHAVE) ?? "null");
    if (b && b.versao === VERSAO) return b as Banco;
  } catch {
    // navegador bloqueando o armazenamento ou JSON corrompido: recomeça do ponto zero
  }
  return pontoZero();
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

export const dadosDaClinica = (b: Banco, clinicaId: string): DadosClinica => ({
  especialidades: b.especialidades.filter((x) => x.clinicaId === clinicaId),
  convenios: b.convenios.filter((x) => x.clinicaId === clinicaId),
  exames: b.exames.filter((x) => x.clinicaId === clinicaId),
  profissionais: b.profissionais.filter((x) => x.clinicaId === clinicaId),
});

// --- gravação: sempre confere a permissão antes ---

export function salvarProfissional(b: Banco, u: Usuario, p: Profissional): Banco {
  conferirClinica(u, p, b.profissionais.find((x) => x.id === p.id));
  return { ...b, profissionais: gravarEm(b.profissionais, p) };
}

export function salvarExame(b: Banco, u: Usuario, e: Exame): Banco {
  conferirClinica(u, e, b.exames.find((x) => x.id === e.id));
  return { ...b, exames: gravarEm(b.exames, e) };
}

export function salvarConvenio(b: Banco, u: Usuario, c: Convenio): Banco {
  conferirClinica(u, c, b.convenios.find((x) => x.id === c.id));
  return { ...b, convenios: gravarEm(b.convenios, c) };
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

export function restaurarDemonstracao(_b: Banco, u: Usuario): Banco {
  exigir(podeCriarUsuario(u), "Só o Administrador restaura a demonstração.");
  return pontoZero();
}
