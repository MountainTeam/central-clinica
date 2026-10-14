"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Banco, Clinica, DadosClinica, Usuario } from "./modelo";
import { podeEditar } from "./permissoes";
import { CHAVE, carregarProtegido, clinicasDo, dadosDaClinica, gravar } from "./repositorio";
import { pontoZero } from "./semente";

export type Painel = { tipo: "exame"; id: string } | null;
type Aviso = { texto: string; erro: boolean; acao?: { rotulo: string; fazer: () => void } };
export type Formulario =
  | { tipo: "profissional"; id?: string }
  | { tipo: "especialidade"; id?: string }
  | { tipo: "convenio"; id?: string }
  | { tipo: "exame"; id?: string }
  | { tipo: "organizacao" }
  | { tipo: "clinica"; id?: string }
  | { tipo: "usuario"; id?: string }
  | null;

type Store = {
  banco: Banco;
  usuario: Usuario | null;
  carregado: boolean;
  // clínicas que o usuário pode ver e a atual
  clinicas: Clinica[];
  clinica: Clinica | null;
  // dados da clínica atual, no formato que as telas de consulta usam
  dados: DadosClinica;
  podeEditarAtual: boolean;
  escolherClinica: (id: string) => void;
  // devolve true quando já dá para ir direto à busca (unidade lembrada ou única)
  entrar: (usuarioId: string) => boolean;
  sair: () => void;
  // aplica uma gravação do repositório; mostra o aviso de sucesso ou a mensagem de recusa
  // com `desfazer`, o aviso ganha o botão "Desfazer", que restaura o banco anterior
  executar: (op: (b: Banco, u: Usuario) => Banco, sucesso: string, opcoes?: { desfazer?: boolean }) => boolean;
  painel: Painel;
  abrir: (p: Painel) => void;
  form: Formulario;
  abrirForm: (f: Formulario) => void;
  aviso: Aviso | null;
  avisar: (t: string, erro?: boolean, acao?: Aviso["acao"]) => void;
};

const Ctx = createContext<Store | null>(null);

const SESSAO_USUARIO = "cartilha:usuario";
const SESSAO_CLINICA = "cartilha:clinica";
const lerLocal = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const gravarLocal = (k: string, v: string | null) => {
  try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch {}
};
const DADOS_ANTIGOS = "Os dados guardados neste navegador são de um formato antigo e não deu para copiá-los: nada foi apagado e nada será salvo. Libere espaço no navegador ou fale com o administrador.";
const VAZIO: DadosClinica = { especialidades: [], convenios: [], exames: [], profissionais: [] };

export function Provider({ children }: { children: React.ReactNode }) {
  const [banco, setBanco] = useState<Banco>(pontoZero);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [clinicaId, setClinicaId] = useState<string | null>(null);
  const [carregado, setCarregado] = useState(false);
  const [painel, abrir] = useState<Painel>(null);
  const [form, abrirForm] = useState<Formulario>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [protegido, setProtegido] = useState(false);
  const bancoRef = useRef(banco);
  bancoRef.current = banco;
  // resultado da última exclusão com "Desfazer"; qualquer outra gravação depois dele invalida o botão
  const excluido = useRef<Banco | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const avisar = useCallback((t: string, erro = false, acao?: Aviso["acao"]) => {
    setAviso({ texto: t, erro, acao });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAviso(null), acao ? 6000 : 2800);
  }, []);

  // ponytail: sessão no navegador só para o protótipo; na v1 vira login de verdade no servidor
  useEffect(() => {
    const c = carregarProtegido();
    setBanco(c.banco);
    setProtegido(c.protegido);
    if (c.protegido) avisar(DADOS_ANTIGOS, true);
    setUsuarioId(lerLocal(SESSAO_USUARIO));
    setClinicaId(lerLocal(SESSAO_CLINICA));
    setCarregado(true);
  }, []);

  // toda mudança vai para o navegador; se não couber, o app segue em memória e avisa a cada falha
  useEffect(() => {
    if (!carregado) return;
    if (protegido) return;
    if (!gravar(banco)) avisar("Não deu para salvar no navegador: o espaço acabou. Baixe uma cópia de segurança em Usuários.", true);
  }, [banco, carregado, protegido, avisar]);

  useEffect(() => {
    if (banco !== excluido.current) setAviso((a) => (a?.acao ? { ...a, acao: undefined } : a));
  }, [banco]);

  // outra aba gravou: pega o banco novo, para esta aba não sobrescrever com dados velhos
  useEffect(() => {
    const ouvir = (e: StorageEvent) => {
      if (e.key !== CHAVE) return;
      const c = carregarProtegido();
      setBanco(c.banco);
      setProtegido(c.protegido);
    };
    window.addEventListener("storage", ouvir);
    return () => window.removeEventListener("storage", ouvir);
  }, []);

  // cópia restaurada sem o usuário logado: volta ao login em vez de ficar sem usuário
  useEffect(() => {
    if (!carregado || !usuarioId || banco.usuarios.some((u) => u.id === usuarioId)) return;
    setUsuarioId(null);
    gravarLocal(SESSAO_USUARIO, null);
    abrir(null);
    abrirForm(null);
  }, [banco, carregado, usuarioId]);

  const usuario = banco.usuarios.find((u) => u.id === usuarioId) ?? null;
  const clinicas = usuario ? clinicasDo(banco, usuario) : [];
  // a última unidade escolhida neste navegador, se ainda for permitida; com uma só, ela mesma
  const unidade = (cs: Clinica[]) => cs.find((c) => c.id === clinicaId) ?? (cs.length === 1 ? cs[0] : null);
  const clinica = unidade(clinicas);

  const escolherClinica = (id: string) => {
    setClinicaId(id);
    gravarLocal(SESSAO_CLINICA, id);
    abrir(null);
  };
  const entrar = (id: string) => {
    setUsuarioId(id);
    gravarLocal(SESSAO_USUARIO, id);
    const u = banco.usuarios.find((x) => x.id === id);
    return !!u && !!unidade(clinicasDo(banco, u));
  };
  const sair = () => {
    setUsuarioId(null);
    gravarLocal(SESSAO_USUARIO, null);
    abrir(null);
    abrirForm(null);
  };
  const executar = (op: (b: Banco, u: Usuario) => Banco, sucesso: string, opcoes?: { desfazer?: boolean }) => {
    if (!usuario) return false;
    if (protegido) { avisar(DADOS_ANTIGOS, true); return false; }
    try {
      const novo = op(banco, usuario);
      const anterior = banco;
      setBanco(novo);
      excluido.current = opcoes?.desfazer ? novo : null;
      avisar(sucesso, false, opcoes?.desfazer ? { rotulo: "Desfazer", fazer: () => {
        if (protegido) { avisar(DADOS_ANTIGOS, true); return; }
        if (bancoRef.current !== novo) { avisar("Não dá mais para desfazer: houve outra alteração depois.", true); return; }
        setBanco(anterior);
        avisar("Exclusão desfeita");
      } } : undefined);
      return true;
    } catch (e) {
      avisar(e instanceof Error ? e.message : "Não foi possível salvar.", true);
      return false;
    }
  };

  return (
    <Ctx.Provider value={{
      banco, usuario, carregado, clinicas, clinica,
      dados: clinica ? dadosDaClinica(banco, clinica.id, usuario ?? undefined) : VAZIO,
      podeEditarAtual: !!usuario && !!clinica && podeEditar(usuario, clinica.id),
      escolherClinica, entrar, sair, executar, painel, abrir, form, abrirForm, aviso, avisar,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore fora do Provider");
  return s;
}
