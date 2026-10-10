import type { Papel, Usuario } from "./modelo.ts";

export const PAPEIS: Record<Papel, { rotulo: string; descricao: string }> = {
  administrador: { rotulo: "Administrador", descricao: "Tudo, inclusive usuários" },
  comercial: { rotulo: "Comercial", descricao: "Tudo, menos usuários" },
  coordenador: { rotulo: "Coordenador", descricao: "Edita as clínicas dele" },
  recepcao: { rotulo: "Recepção/Central", descricao: "Só consulta" },
};

// Administrador e Comercial enxergam todas as clínicas
const global = (u: Usuario) => u.papel === "administrador" || u.papel === "comercial";

export const podeVer = (u: Usuario, clinicaId: string) => global(u) || u.clinicas.includes(clinicaId);
export const podeEditar = (u: Usuario, clinicaId: string) =>
  global(u) || (u.papel === "coordenador" && u.clinicas.includes(clinicaId));
export const podeCriarClinica = (u: Usuario) => global(u);
export const podeCriarUsuario = (u: Usuario) => u.papel === "administrador";
