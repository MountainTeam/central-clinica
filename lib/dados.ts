// Dados de exemplo do protótipo. Nomes fictícios; segue o esquema da skill `modelo-dados-clinica`.
// ponytail: tudo em memória; troca por Postgres quando o protótipo for aprovado.

export type Tipo = "consulta" | "exame";
export type Perfil = "admin" | "leitura";
// Setor: parceria dentro de uma mesma clínica (ex.: COMN e Oncology). Quem é de um setor só vê os médicos dele.
export type Setor = { id: string; nome: string };
// Usuário sem clínica vê todas; sem setor vê a clínica inteira.
export type Usuario = { id: string; nome: string; email: string; perfil: Perfil; clinicaId?: string; setorId?: string };

export type Especialidade = { id: string; nome: string; icone: string };
export type Subtipo = { id: string; nome: string };
export type Convenio = { id: string; nome: string; cor: string; subtipos: Subtipo[] };
export type Exame = { id: string; nome: string; preparo: string[]; documentos: string; subtipos: string[] };
export type Restricao = { texto: string; subtipoId?: string };
export const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
// ponytail: um intervalo por dia; se algum médico tiver dois turnos separados no mesmo dia, vira lista por dia
export type Horario = { dia: string; inicio: string; fim: string };
// `atende` mapeia subtipo → "c" (consulta), "e" (exame) ou "ce" (ambos)
export type Profissional = {
  id: string;
  nome: string;
  especialidadeId: string;
  horarios: Horario[];
  idadeMinima?: number;
  procedimentos: string[];
  exames: string[];
  atende: Record<string, string>;
  restricoes: Restricao[];
  observacoes: string;
  setorId?: string; // vazio = compartilhado entre os setores
};

export type Dados = {
  setores: Setor[];
  especialidades: Especialidade[];
  convenios: Convenio[];
  exames: Exame[];
  profissionais: Profissional[];
};
export type Clinica = { id: string; nome: string; cidade: string; dados: Dados };

export const dadosVazios = (): Dados => ({ setores: [], especialidades: [], convenios: [], exames: [], profissionais: [] });

const h = (dias: string, inicio: string, fim: string): Horario[] =>
  dias.split(" ").map((dia) => ({ dia, inicio, fim }));

const sub = (conv: string, nomes: string[]): Subtipo[] =>
  nomes.map((n) => ({ id: `${conv}-${n.toLowerCase().replace(/\s+/g, "-")}`, nome: n }));

const unidadeCentro: Dados = {
  setores: [{ id: "comn", nome: "COMN" }, { id: "oncology", nome: "Oncology" }],
  especialidades: [
    { id: "dermato", nome: "Dermatologia", icone: "Sparkles" },
    { id: "masto", nome: "Mastologia", icone: "Ribbon" },
    { id: "gineco", nome: "Ginecologia", icone: "Flower2" },
    { id: "cardio", nome: "Cardiologia", icone: "HeartPulse" },
    { id: "orto", nome: "Ortopedia", icone: "Bone" },
    { id: "endo", nome: "Endocrinologia", icone: "Activity" },
    { id: "oftalmo", nome: "Oftalmologia", icone: "Eye" },
    { id: "pediatria", nome: "Pediatria", icone: "Baby" },
    { id: "oncologia", nome: "Oncologia clínica", icone: "Microscope" },
    { id: "hemato", nome: "Hematologia", icone: "Droplet" },
  ],
  convenios: [
    { id: "unimed", nome: "Unimed", cor: "#0f9d76", subtipos: sub("unimed", ["Essencial", "Flex", "Rede fechada"]) },
    { id: "bradesco", nome: "Bradesco Saúde", cor: "#d1344b", subtipos: sub("bradesco", ["Nacional", "Top", "Efetivo"]) },
    { id: "amil", nome: "Amil", cor: "#2563eb", subtipos: sub("amil", ["S380", "S450", "One"]) },
    { id: "sulamerica", nome: "SulAmérica", cor: "#ea7a1a", subtipos: sub("sulamerica", ["Clássico", "Especial"]) },
    { id: "hapvida", nome: "Hapvida", cor: "#7c3aed", subtipos: sub("hapvida", ["Mix", "Nosso Plano"]) },
  ],
  exames: [
    {
      id: "us-mamas",
      nome: "Ultrassonografia de mamas",
      preparo: ["Não precisa de jejum.", "Evitar desodorante, talco ou creme nas mamas e axilas no dia.", "Trazer exames de imagem anteriores, se tiver."],
      documentos: "Pedido médico, documento com foto e carteirinha do convênio.",
      subtipos: ["unimed-essencial", "unimed-flex", "bradesco-nacional", "bradesco-top", "amil-s450", "sulamerica-especial"],
    },
    {
      id: "paaf",
      nome: "Punção aspirativa (PAAF)",
      preparo: ["Suspender AAS e anticoagulantes só com orientação do médico que pediu.", "Pode se alimentar normalmente.", "Vir com acompanhante.", "Trazer ultrassom recente da região."],
      documentos: "Pedido médico com CID, autorização prévia do convênio e documento com foto.",
      subtipos: ["unimed-flex", "bradesco-top", "amil-s450", "amil-one"],
    },
    {
      id: "ecg",
      nome: "Eletrocardiograma",
      preparo: ["Não precisa de jejum.", "Evitar óleo ou creme no peito.", "Chegar 15 minutos antes."],
      documentos: "Pedido médico e carteirinha do convênio.",
      subtipos: ["unimed-essencial", "unimed-flex", "unimed-rede-fechada", "bradesco-nacional", "bradesco-top", "bradesco-efetivo", "amil-s380", "amil-s450", "hapvida-mix"],
    },
    {
      id: "eco",
      nome: "Ecocardiograma",
      preparo: ["Não precisa de jejum.", "Usar roupa confortável, de preferência de duas peças."],
      documentos: "Pedido médico e carteirinha do convênio.",
      subtipos: ["unimed-flex", "bradesco-top", "amil-s450", "amil-one", "sulamerica-especial"],
    },
    {
      id: "ergometrico",
      nome: "Teste ergométrico",
      preparo: ["Refeição leve até 2 horas antes.", "Vir de tênis e roupa de academia.", "Não tomar café no dia.", "Perguntar ao médico sobre suspender betabloqueador."],
      documentos: "Pedido médico, autorização prévia e documento com foto.",
      subtipos: ["unimed-flex", "bradesco-top", "sulamerica-especial"],
    },
    {
      id: "colposcopia",
      nome: "Colposcopia",
      preparo: ["Não estar menstruada.", "Sem relação sexual nas 48 horas anteriores.", "Não usar creme vaginal por 3 dias."],
      documentos: "Pedido médico e carteirinha do convênio.",
      subtipos: ["unimed-essencial", "unimed-flex", "bradesco-nacional", "amil-s380", "hapvida-mix", "hapvida-nosso-plano"],
    },
    {
      id: "retina",
      nome: "Mapeamento de retina",
      preparo: ["A pupila será dilatada: vir com acompanhante e não dirigir depois.", "Trazer óculos em uso."],
      documentos: "Pedido médico e carteirinha do convênio.",
      subtipos: ["unimed-essencial", "unimed-flex", "bradesco-nacional", "amil-s450"],
    },
    {
      id: "densitometria",
      nome: "Densitometria óssea",
      preparo: ["Não tomar suplemento de cálcio nas 24 horas anteriores.", "Não ter feito exame com contraste nos últimos 7 dias.", "Vir sem objetos de metal."],
      documentos: "Pedido médico e carteirinha do convênio.",
      subtipos: ["unimed-flex", "bradesco-top", "amil-s450", "sulamerica-clássico"],
    },
  ],
  profissionais: [
    {
      id: "helena-duarte", setorId: "comn", nome: "Dra. Helena Duarte", especialidadeId: "dermato", horarios: h("Seg Qua Sex", "08:00", "12:00"),
      procedimentos: ["Lobuloplastia", "Biópsia de pele", "Retirada de sinal", "Cauterização"], exames: [],
      atende: { "unimed-essencial": "c", "unimed-flex": "c", "bradesco-top": "c", "amil-s450": "c" },
      restricoes: [{ texto: "Unimed: no máximo 5 pacientes por dia.", subtipoId: "unimed-flex" }],
      observacoes: "Procedimentos só depois de uma consulta de avaliação.",
    },
    {
      id: "marina-coelho", setorId: "comn", nome: "Dra. Marina Coelho", especialidadeId: "dermato", horarios: h("Ter Qui", "13:00", "18:00"),
      procedimentos: ["Lobuloplastia", "Peeling químico", "Retirada de sinal"], exames: [],
      atende: { "unimed-flex": "c", "bradesco-nacional": "c", "bradesco-top": "c", "sulamerica-especial": "c" },
      restricoes: [], observacoes: "",
    },
    {
      id: "rafael-moreira", setorId: "comn", nome: "Dr. Rafael Moreira", especialidadeId: "dermato", horarios: h("Seg Ter Qua Qui Sex", "13:00", "18:00"), idadeMinima: 12,
      procedimentos: ["Biópsia de pele", "Crioterapia"], exames: [],
      atende: { "unimed-essencial": "c", "unimed-rede-fechada": "c", "amil-s380": "c", "hapvida-mix": "c" },
      restricoes: [], observacoes: "Não faz lobuloplastia.",
    },
    {
      id: "lucia-ferraz", setorId: "comn", nome: "Dra. Lúcia Ferraz", especialidadeId: "masto", horarios: h("Qua Sex", "08:00", "12:00"), idadeMinima: 18,
      procedimentos: ["Punção aspirativa", "Biópsia de mama"], exames: ["us-mamas", "paaf"],
      atende: { "unimed-flex": "ce", "unimed-essencial": "e", "bradesco-top": "ce", "amil-s450": "ce", "amil-one": "e" },
      restricoes: [{ texto: "Unimed Essencial: só exame, não atende consulta." }],
      observacoes: "Pacientes com nódulo já diagnosticado têm prioridade de encaixe.",
    },
    {
      id: "camila-rocha", setorId: "comn", nome: "Dra. Camila Rocha", especialidadeId: "gineco", horarios: h("Seg Qui", "08:00", "18:00"),
      procedimentos: ["Inserção de DIU", "Colposcopia", "Cauterização de colo"], exames: ["colposcopia"],
      atende: { "unimed-essencial": "ce", "unimed-flex": "ce", "bradesco-nacional": "ce", "hapvida-mix": "c", "hapvida-nosso-plano": "e" },
      restricoes: [{ texto: "Só 4 pacientes acima de 60 anos por turno." }],
      observacoes: "",
    },
    {
      id: "renata-alencar", setorId: "comn", nome: "Dra. Renata Alencar", especialidadeId: "gineco", horarios: h("Ter", "13:00", "17:00"),
      procedimentos: ["Inserção de DIU"], exames: ["us-mamas"],
      atende: { "amil-s380": "c", "amil-s450": "ce", "sulamerica-especial": "ce" },
      restricoes: [], observacoes: "Atende gestantes só até a 12ª semana; depois, encaminhar para o pré-natal.",
    },
    {
      id: "andre-valenca", nome: "Dr. André Valença", especialidadeId: "cardio", horarios: h("Seg Ter Qua Qui", "07:00", "12:00"),
      procedimentos: ["Risco cirúrgico"], exames: ["ecg", "eco", "ergometrico"],
      atende: { "unimed-essencial": "ce", "unimed-flex": "ce", "unimed-rede-fechada": "e", "bradesco-top": "ce", "sulamerica-especial": "ce" },
      restricoes: [{ texto: "Teste ergométrico só às terças." }],
      observacoes: "",
    },
    {
      id: "igor-sampaio", setorId: "comn", nome: "Dr. Igor Sampaio", especialidadeId: "cardio", horarios: h("Sex", "08:00", "18:00"), idadeMinima: 16,
      procedimentos: ["Risco cirúrgico"], exames: ["ecg"],
      atende: { "bradesco-nacional": "ce", "bradesco-efetivo": "e", "amil-s380": "ce", "hapvida-mix": "ce" },
      restricoes: [], observacoes: "",
    },
    {
      id: "bruno-teles", setorId: "comn", nome: "Dr. Bruno Teles", especialidadeId: "orto", horarios: h("Ter Qui", "08:00", "12:00"),
      procedimentos: ["Infiltração articular", "Imobilização"], exames: ["densitometria"],
      atende: { "unimed-flex": "ce", "bradesco-top": "c", "amil-s450": "ce" },
      restricoes: [{ texto: "Não atende coluna; encaminhar para o Dr. de plantão." }],
      observacoes: "",
    },
    {
      id: "patricia-lins", setorId: "comn", nome: "Dra. Patrícia Lins", especialidadeId: "endo", horarios: h("Qua", "08:00", "17:00"),
      procedimentos: ["Punção de tireoide"], exames: ["paaf"],
      atende: { "unimed-essencial": "c", "unimed-flex": "ce", "sulamerica-clássico": "c" },
      restricoes: [{ texto: "Unimed: só 3 primeiras consultas por dia.", subtipoId: "unimed-essencial" }],
      observacoes: "Trazer exames de sangue recentes na primeira consulta.",
    },
    {
      id: "tiago-arruda", setorId: "comn", nome: "Dr. Tiago Arruda", especialidadeId: "oftalmo", horarios: h("Seg Ter Qua Qui Sex", "14:00", "19:00"),
      procedimentos: ["Retirada de corpo estranho"], exames: ["retina"],
      atende: { "unimed-essencial": "ce", "unimed-flex": "ce", "bradesco-nacional": "ce", "amil-s450": "ce" },
      restricoes: [], observacoes: "",
    },
    {
      id: "sofia-barreto", setorId: "comn", nome: "Dra. Sofia Barreto", especialidadeId: "pediatria", horarios: h("Seg Qua Sex", "08:00", "12:00"),
      procedimentos: ["Teste do pezinho"], exames: [],
      atende: { "unimed-essencial": "c", "unimed-flex": "c", "unimed-rede-fechada": "c", "hapvida-mix": "c", "hapvida-nosso-plano": "c" },
      restricoes: [{ texto: "Atende só até 12 anos." }],
      observacoes: "",
    },
    {
      id: "marcelo-antunes", setorId: "oncology", nome: "Dr. Marcelo Antunes", especialidadeId: "oncologia", horarios: h("Seg Qua Sex", "08:00", "14:00"), idadeMinima: 18,
      procedimentos: ["Primeira consulta oncológica", "Revisão de quimioterapia"], exames: [],
      atende: { "unimed-flex": "c", "unimed-rede-fechada": "c", "bradesco-top": "c", "amil-one": "c", "sulamerica-especial": "c" },
      restricoes: [{ texto: "Primeira consulta só com laudo de biópsia em mãos." }],
      observacoes: "Pacientes em tratamento têm prioridade de encaixe.",
    },
    {
      id: "fernanda-queiroz", setorId: "oncology", nome: "Dra. Fernanda Queiroz", especialidadeId: "oncologia", horarios: h("Ter Qui", "13:00", "19:00"), idadeMinima: 18,
      procedimentos: ["Primeira consulta oncológica", "Segunda opinião"], exames: [],
      atende: { "unimed-flex": "c", "bradesco-nacional": "c", "bradesco-top": "c", "amil-s450": "c" },
      restricoes: [], observacoes: "",
    },
    {
      id: "paulo-freitas", setorId: "oncology", nome: "Dr. Paulo Freitas", especialidadeId: "hemato", horarios: h("Qua", "08:00", "17:00"),
      procedimentos: ["Mielograma"], exames: [],
      atende: { "unimed-flex": "c", "amil-s450": "c", "amil-one": "c" },
      restricoes: [{ texto: "Unimed: só 4 primeiras consultas por semana.", subtipoId: "unimed-flex" }], observacoes: "",
    },
  ],
};

const unidadeNorte: Dados = {
  setores: [],
  especialidades: [
    { id: "clinica-geral", nome: "Clínica geral", icone: "Stethoscope" },
    { id: "cardio", nome: "Cardiologia", icone: "HeartPulse" },
    { id: "dermato", nome: "Dermatologia", icone: "Sparkles" },
    { id: "nutricao", nome: "Nutrição", icone: "Apple" },
  ],
  convenios: [
    { id: "unimed", nome: "Unimed", cor: "#0f9d76", subtipos: sub("unimed", ["Essencial", "Flex"]) },
    { id: "cassi", nome: "Cassi", cor: "#1d4ed8", subtipos: sub("cassi", ["Nacional"]) },
    { id: "geap", nome: "Geap", cor: "#0891b2", subtipos: sub("geap", ["Referência", "Essencial"]) },
  ],
  exames: [
    {
      id: "ecg", nome: "Eletrocardiograma",
      preparo: ["Não precisa de jejum.", "Evitar óleo ou creme no peito."],
      documentos: "Pedido médico e carteirinha do convênio.",
      subtipos: ["unimed-essencial", "unimed-flex", "cassi-nacional", "geap-referência"],
    },
    {
      id: "bioimpedancia", nome: "Bioimpedância",
      preparo: ["Jejum de 4 horas.", "Não fazer atividade física nas 12 horas anteriores.", "Beber 2 litros de água no dia anterior.", "Vir sem objetos de metal."],
      documentos: "Pedido do nutricionista.",
      subtipos: ["unimed-flex", "cassi-nacional"],
    },
    {
      id: "dermatoscopia", nome: "Dermatoscopia",
      preparo: ["Vir sem maquiagem ou creme na região.", "Não se expor ao sol nos 7 dias anteriores."],
      documentos: "Pedido médico e carteirinha do convênio.",
      subtipos: ["unimed-flex", "geap-referência", "geap-essencial"],
    },
  ],
  profissionais: [
    {
      id: "julia-matos", nome: "Dra. Júlia Matos", especialidadeId: "clinica-geral", horarios: h("Seg Ter Qua Qui Sex", "07:00", "13:00"),
      procedimentos: ["Atestado de saúde ocupacional"], exames: [],
      atende: { "unimed-essencial": "c", "unimed-flex": "c", "cassi-nacional": "c", "geap-referência": "c", "geap-essencial": "c" },
      restricoes: [], observacoes: "Encaixes só no primeiro horário da manhã.",
    },
    {
      id: "henrique-paiva", nome: "Dr. Henrique Paiva", especialidadeId: "cardio", horarios: [...h("Ter Qui", "08:00", "12:00"), ...h("Sáb", "08:00", "11:00")], idadeMinima: 18,
      procedimentos: ["Risco cirúrgico"], exames: ["ecg"],
      atende: { "unimed-flex": "ce", "cassi-nacional": "ce", "geap-referência": "e" },
      restricoes: [{ texto: "Geap: só exame, não atende consulta." }], observacoes: "",
    },
    {
      id: "beatriz-nunes", nome: "Dra. Beatriz Nunes", especialidadeId: "dermato", horarios: h("Qua Sex", "13:00", "18:00"),
      procedimentos: ["Lobuloplastia", "Biópsia de pele"], exames: ["dermatoscopia"],
      atende: { "unimed-flex": "ce", "geap-referência": "ce", "geap-essencial": "e" },
      restricoes: [{ texto: "No máximo 6 pacientes por convênio por tarde." }], observacoes: "",
    },
    {
      id: "carla-pinheiro", nome: "Carla Pinheiro (nutricionista)", especialidadeId: "nutricao", horarios: h("Seg Qua", "14:00", "19:00"),
      procedimentos: ["Plano alimentar"], exames: ["bioimpedancia"],
      atende: { "unimed-flex": "ce", "cassi-nacional": "ce" },
      restricoes: [], observacoes: "Retorno em até 30 dias sem custo.",
    },
  ],
};

export const clinicasIniciais: Clinica[] = [
  { id: "centro", nome: "Unidade Centro", cidade: "Centro", dados: unidadeCentro },
  { id: "norte", nome: "Unidade Norte", cidade: "Zona Norte", dados: unidadeNorte },
];

export const usuariosIniciais: Usuario[] = [
  { id: "coordenacao", nome: "Coordenação", email: "coordenacao@clinica.com.br", perfil: "admin" },
  { id: "marcacao-comn", nome: "Marcação COMN", email: "comn@clinica.com.br", perfil: "leitura", clinicaId: "centro", setorId: "comn" },
  { id: "marcacao-oncology", nome: "Marcação Oncology", email: "oncology@clinica.com.br", perfil: "leitura", clinicaId: "centro", setorId: "oncology" },
  { id: "atendente-norte", nome: "Atendente Unidade Norte", email: "norte@clinica.com.br", perfil: "leitura", clinicaId: "norte" },
];

// O que um usuário de setor enxerga: os médicos do setor dele e os compartilhados.
// Especialidades sem nenhum médico visível somem, para não poluir a tela.
// ponytail: filtro só no navegador; na v1 o servidor filtra por setor antes de responder.
export function visivelPara(d: Dados, setorId?: string): Dados {
  if (!setorId) return d;
  const profissionais = d.profissionais.filter((p) => !p.setorId || p.setorId === setorId);
  const especialidades = d.especialidades.filter((e) => profissionais.some((p) => p.especialidadeId === e.id));
  return { ...d, profissionais, especialidades };
}

// A pergunta mais comum da central: "quem atende o convênio X para Y?"
export function atende(p: Profissional, subtipoId: string, tipo: Tipo) {
  return (p.atende[subtipoId] ?? "").includes(tipo === "consulta" ? "c" : "e");
}

export function subtipoInfo(dados: Dados, subtipoId: string) {
  for (const c of dados.convenios) {
    const s = c.subtipos.find((s) => s.id === subtipoId);
    if (s) return { convenio: c, subtipo: s };
  }
}

// "Seg, Qua e Sex · 08:00–12:00" (agrupa dias com o mesmo horário)
export function resumoHorarios(hs: Horario[]) {
  if (!hs.length) return "Horários não informados";
  const grupos = new Map<string, string[]>();
  for (const x of [...hs].sort((a, b) => DIAS.indexOf(a.dia as never) - DIAS.indexOf(b.dia as never))) {
    const k = `${x.inicio}–${x.fim}`;
    grupos.set(k, [...(grupos.get(k) ?? []), x.dia]);
  }
  const pos = (d: string) => DIAS.indexOf(d as never);
  const seguidos = (d: string[]) => d.length >= 3 && pos(d.at(-1)!) - pos(d[0]) === d.length - 1;
  const lista = (d: string[]) =>
    seguidos(d) ? `${d[0]} a ${d.at(-1)}` : d.length > 1 ? `${d.slice(0, -1).join(", ")} e ${d.at(-1)}` : d[0];
  return [...grupos].map(([faixa, d]) => `${lista(d)} · ${faixa}`).join("  |  ");
}

export const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const iniciais = (nome: string) =>
  nome.replace(/^Dr[a]?\.\s*/, "").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("");
