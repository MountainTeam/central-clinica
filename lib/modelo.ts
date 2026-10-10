// Tipos do protótipo, um por futura tabela do banco. Ids são texto.

export type Tipo = "consulta" | "exame";
export type Papel = "administrador" | "comercial" | "coordenador" | "recepcao";

export const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
// ponytail: um intervalo por dia; dois turnos separados no mesmo dia viram lista por dia
export type Horario = { dia: string; inicio: string; fim: string };
export type Restricao = { texto: string; subtipoId?: string };

export type Organizacao = { id: string; nome: string };
export type Clinica = { id: string; organizacaoId: string; nome: string; logo?: string };
// clinicas vazio = todas; só vale para Administrador e Comercial
export type Usuario = { id: string; nome: string; email: string; papel: Papel; clinicas: string[] };

export type Especialidade = { id: string; clinicaId: string; nome: string; icone: string };
export type Subtipo = { id: string; nome: string };
export type Convenio = { id: string; clinicaId: string; nome: string; cor: string; logo?: string; subtipos: Subtipo[] };
export type Exame = { id: string; clinicaId: string; nome: string; preparo: string[]; documentos: string; subtipos: string[] };
// `atende` mapeia subtipo → "c" (consulta), "e" (exame) ou "ce" (ambos)
export type Profissional = {
  id: string;
  clinicaId: string;
  especialidadeId: string;
  nome: string;
  horarios: Horario[];
  idadeMinima?: number;
  procedimentos: string[];
  exames: string[];
  atende: Record<string, string>;
  restricoes: Restricao[];
  observacoes: string;
};

// Sobe quando o formato muda; dado guardado com outra versão é descartado
export const VERSAO = 2;
export type Banco = {
  versao: number;
  organizacoes: Organizacao[];
  clinicas: Clinica[];
  usuarios: Usuario[];
  especialidades: Especialidade[];
  convenios: Convenio[];
  exames: Exame[];
  profissionais: Profissional[];
};

// O que as telas de consulta recebem: os dados de uma clínica
export type DadosClinica = Pick<Banco, "especialidades" | "convenios" | "exames" | "profissionais">;
