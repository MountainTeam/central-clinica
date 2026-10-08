// Dados de exemplo do protótipo. Nomes fictícios; segue o esquema da skill `modelo-dados-clinica`.
// ponytail: tudo em memória; troca por Postgres quando o protótipo for aprovado.

export type Tipo = "consulta" | "exame";
export type Perfil = "admin" | "leitura";

export type Especialidade = { id: string; nome: string; icone: string };
export type Subtipo = { id: string; nome: string };
export type Convenio = { id: string; nome: string; cor: string; subtipos: Subtipo[] };
export type Exame = { id: string; nome: string; preparo: string[]; documentos: string; subtipos: string[] };
export type Restricao = { texto: string; subtipoId?: string };
// `atende` mapeia subtipo → "c" (consulta), "e" (exame) ou "ce" (ambos)
export type Profissional = {
  id: string;
  nome: string;
  especialidadeId: string;
  dias: string;
  idadeMinima?: number;
  procedimentos: string[];
  exames: string[];
  atende: Record<string, string>;
  restricoes: Restricao[];
  observacoes: string;
};

export type Dados = {
  especialidades: Especialidade[];
  convenios: Convenio[];
  exames: Exame[];
  profissionais: Profissional[];
};

const sub = (conv: string, nomes: string[]): Subtipo[] =>
  nomes.map((n) => ({ id: `${conv}-${n.toLowerCase().replace(/\s+/g, "-")}`, nome: n }));

export const dadosIniciais: Dados = {
  especialidades: [
    { id: "dermato", nome: "Dermatologia", icone: "Sparkles" },
    { id: "masto", nome: "Mastologia", icone: "Ribbon" },
    { id: "gineco", nome: "Ginecologia", icone: "Flower2" },
    { id: "cardio", nome: "Cardiologia", icone: "HeartPulse" },
    { id: "orto", nome: "Ortopedia", icone: "Bone" },
    { id: "endo", nome: "Endocrinologia", icone: "Activity" },
    { id: "oftalmo", nome: "Oftalmologia", icone: "Eye" },
    { id: "pediatria", nome: "Pediatria", icone: "Baby" },
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
      id: "helena-duarte", nome: "Dra. Helena Duarte", especialidadeId: "dermato", dias: "Seg, Qua e Sex · manhã",
      procedimentos: ["Lobuloplastia", "Biópsia de pele", "Retirada de sinal", "Cauterização"], exames: [],
      atende: { "unimed-essencial": "c", "unimed-flex": "c", "bradesco-top": "c", "amil-s450": "c" },
      restricoes: [{ texto: "Unimed: no máximo 5 pacientes por dia.", subtipoId: "unimed-flex" }],
      observacoes: "Procedimentos só depois de uma consulta de avaliação.",
    },
    {
      id: "marina-coelho", nome: "Dra. Marina Coelho", especialidadeId: "dermato", dias: "Ter e Qui · tarde",
      procedimentos: ["Lobuloplastia", "Peeling químico", "Retirada de sinal"], exames: [],
      atende: { "unimed-flex": "c", "bradesco-nacional": "c", "bradesco-top": "c", "sulamerica-especial": "c" },
      restricoes: [], observacoes: "",
    },
    {
      id: "rafael-moreira", nome: "Dr. Rafael Moreira", especialidadeId: "dermato", dias: "Seg a Sex · tarde", idadeMinima: 12,
      procedimentos: ["Biópsia de pele", "Crioterapia"], exames: [],
      atende: { "unimed-essencial": "c", "unimed-rede-fechada": "c", "amil-s380": "c", "hapvida-mix": "c" },
      restricoes: [], observacoes: "Não faz lobuloplastia.",
    },
    {
      id: "lucia-ferraz", nome: "Dra. Lúcia Ferraz", especialidadeId: "masto", dias: "Qua e Sex · manhã", idadeMinima: 18,
      procedimentos: ["Punção aspirativa", "Biópsia de mama"], exames: ["us-mamas", "paaf"],
      atende: { "unimed-flex": "ce", "unimed-essencial": "e", "bradesco-top": "ce", "amil-s450": "ce", "amil-one": "e" },
      restricoes: [{ texto: "Unimed Essencial: só exame, não atende consulta." }],
      observacoes: "Pacientes com nódulo já diagnosticado têm prioridade de encaixe.",
    },
    {
      id: "camila-rocha", nome: "Dra. Camila Rocha", especialidadeId: "gineco", dias: "Seg e Qui · manhã e tarde",
      procedimentos: ["Inserção de DIU", "Colposcopia", "Cauterização de colo"], exames: ["colposcopia"],
      atende: { "unimed-essencial": "ce", "unimed-flex": "ce", "bradesco-nacional": "ce", "hapvida-mix": "c", "hapvida-nosso-plano": "e" },
      restricoes: [{ texto: "Só 4 pacientes acima de 60 anos por turno." }],
      observacoes: "",
    },
    {
      id: "renata-alencar", nome: "Dra. Renata Alencar", especialidadeId: "gineco", dias: "Ter · tarde",
      procedimentos: ["Inserção de DIU"], exames: ["us-mamas"],
      atende: { "amil-s380": "c", "amil-s450": "ce", "sulamerica-especial": "ce" },
      restricoes: [], observacoes: "Atende gestantes só até a 12ª semana; depois, encaminhar para o pré-natal.",
    },
    {
      id: "andre-valenca", nome: "Dr. André Valença", especialidadeId: "cardio", dias: "Seg a Qui · manhã",
      procedimentos: ["Risco cirúrgico"], exames: ["ecg", "eco", "ergometrico"],
      atende: { "unimed-essencial": "ce", "unimed-flex": "ce", "unimed-rede-fechada": "e", "bradesco-top": "ce", "sulamerica-especial": "ce" },
      restricoes: [{ texto: "Teste ergométrico só às terças." }],
      observacoes: "",
    },
    {
      id: "igor-sampaio", nome: "Dr. Igor Sampaio", especialidadeId: "cardio", dias: "Sex · manhã e tarde", idadeMinima: 16,
      procedimentos: ["Risco cirúrgico"], exames: ["ecg"],
      atende: { "bradesco-nacional": "ce", "bradesco-efetivo": "e", "amil-s380": "ce", "hapvida-mix": "ce" },
      restricoes: [], observacoes: "",
    },
    {
      id: "bruno-teles", nome: "Dr. Bruno Teles", especialidadeId: "orto", dias: "Ter e Qui · manhã",
      procedimentos: ["Infiltração articular", "Imobilização"], exames: ["densitometria"],
      atende: { "unimed-flex": "ce", "bradesco-top": "c", "amil-s450": "ce" },
      restricoes: [{ texto: "Não atende coluna; encaminhar para o Dr. de plantão." }],
      observacoes: "",
    },
    {
      id: "patricia-lins", nome: "Dra. Patrícia Lins", especialidadeId: "endo", dias: "Qua · manhã e tarde",
      procedimentos: ["Punção de tireoide"], exames: ["paaf"],
      atende: { "unimed-essencial": "c", "unimed-flex": "ce", "sulamerica-clássico": "c" },
      restricoes: [{ texto: "Unimed: só 3 primeiras consultas por dia.", subtipoId: "unimed-essencial" }],
      observacoes: "Trazer exames de sangue recentes na primeira consulta.",
    },
    {
      id: "tiago-arruda", nome: "Dr. Tiago Arruda", especialidadeId: "oftalmo", dias: "Seg a Sex · tarde",
      procedimentos: ["Retirada de corpo estranho"], exames: ["retina"],
      atende: { "unimed-essencial": "ce", "unimed-flex": "ce", "bradesco-nacional": "ce", "amil-s450": "ce" },
      restricoes: [], observacoes: "",
    },
    {
      id: "sofia-barreto", nome: "Dra. Sofia Barreto", especialidadeId: "pediatria", dias: "Seg, Qua e Sex · manhã",
      procedimentos: ["Teste do pezinho"], exames: [],
      atende: { "unimed-essencial": "c", "unimed-flex": "c", "unimed-rede-fechada": "c", "hapvida-mix": "c", "hapvida-nosso-plano": "c" },
      restricoes: [{ texto: "Atende só até 12 anos." }],
      observacoes: "",
    },
  ],
};

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

export const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const iniciais = (nome: string) =>
  nome.replace(/^Dr[a]?\.\s*/, "").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("");
