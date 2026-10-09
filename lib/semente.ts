import { VERSAO, type Banco, type Organizacao, type Usuario } from "./modelo.ts";

// Ponto zero da demonstração: organizações, clínicas e usuários de teste. O resto começa vazio.
const ESTRUTURA: { org: Organizacao; clinicas: [id: string, nome: string][] }[] = [
  { org: { id: "oncologia-mastologia", nome: "Clínica de Oncologia e Mastologia" }, clinicas: [["comn", "COMN"], ["oncy", "ONCY"]] },
  { org: { id: "promater", nome: "Promater" }, clinicas: [["promater", "Promater"]] },
  { org: { id: "nossa-clinica", nome: "Nossa Clínica" }, clinicas: [["nossa-clinica", "Nossa Clínica"]] },
  { org: { id: "oncology-group-mossoro", nome: "Oncology Group - Mossoró" }, clinicas: [["oncology-group-mossoro", "Oncology Group - Mossoró"]] },
  { org: { id: "oncoclinicas", nome: "Oncoclínicas" }, clinicas: [["oncoclinicas", "Oncoclínicas"]] },
  { org: { id: "oncoclinicas-mossoro", nome: "Oncoclínicas Mossoró" }, clinicas: [["oncoclinicas-mossoro", "Oncoclínicas Mossoró"]] },
  { org: { id: "sao-marcos", nome: "Clínica São Marcos" }, clinicas: [["sao-marcos", "Clínica São Marcos"]] },
];

const USUARIOS: Usuario[] = [
  { id: "administrador", nome: "Administrador", email: "administrador@exemplo.com.br", papel: "administrador", clinicas: [] },
  { id: "comercial", nome: "Comercial", email: "comercial@exemplo.com.br", papel: "comercial", clinicas: [] },
  { id: "coordenador-comn", nome: "Coordenador COMN", email: "coordenacao.comn@exemplo.com.br", papel: "coordenador", clinicas: ["comn"] },
  { id: "central-comn", nome: "Central de atendimento COMN", email: "central.comn@exemplo.com.br", papel: "recepcao", clinicas: ["comn"] },
  { id: "recepcao-comn", nome: "Recepção COMN", email: "recepcao.comn@exemplo.com.br", papel: "recepcao", clinicas: ["comn"] },
  { id: "recepcao-oncy", nome: "Recepção ONCY", email: "recepcao.oncy@exemplo.com.br", papel: "recepcao", clinicas: ["oncy"] },
  { id: "usuario-promater", nome: "Usuário Promater", email: "usuario@promater.exemplo.com.br", papel: "recepcao", clinicas: ["promater"] },
];

export function pontoZero(): Banco {
  return {
    versao: VERSAO,
    organizacoes: ESTRUTURA.map((e) => ({ ...e.org })),
    clinicas: ESTRUTURA.flatMap((e) => e.clinicas.map(([id, nome]) => ({ id, organizacaoId: e.org.id, nome }))),
    usuarios: USUARIOS.map((u) => ({ ...u, clinicas: [...u.clinicas] })),
    especialidades: [],
    convenios: [],
    exames: [],
    profissionais: [],
  };
}
