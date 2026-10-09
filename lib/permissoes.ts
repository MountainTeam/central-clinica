import type { Papel, Usuario } from "./modelo.ts";

export const PAPEIS: Record<Papel, { rotulo: string; descricao: string }> = {
  administrador: { rotulo: "Administrador", descricao: "Vê e edita todas as clínicas e cria usuários." },
  comercial: { rotulo: "Comercial", descricao: "Vê e edita todas as clínicas; não cria usuários." },
  coordenador: { rotulo: "Coordenador", descricao: "Edita só as clínicas vinculadas." },
  recepcao: { rotulo: "Recepção/Central", descricao: "Só consulta as clínicas vinculadas." },
};

// Administrador e Comercial enxergam todas as clínicas
const global = (u: Usuario) => u.papel === "administrador" || u.papel === "comercial";

export const podeVer = (u: Usuario, clinicaId: string) => global(u) || u.clinicas.includes(clinicaId);
export const podeEditar = (u: Usuario, clinicaId: string) =>
  global(u) || (u.papel === "coordenador" && u.clinicas.includes(clinicaId));
export const podeCriarClinica = (u: Usuario) => global(u);
export const podeCriarUsuario = (u: Usuario) => u.papel === "administrador";
export const podeVerTelaClinicas = (u: Usuario) => u.papel !== "recepcao";
