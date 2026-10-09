"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Banco, Clinica, DadosClinica, Usuario } from "./modelo";
import { podeEditar } from "./permissoes";
import { carregar, clinicasDo, dadosDaClinica, gravar } from "./repositorio";
import { pontoZero } from "./semente";

export type Painel = { tipo: "exame"; id: string } | null;
export type Formulario =
  | { tipo: "profissional"; id?: string }
  | { tipo: "especialidade" }
  | { tipo: "convenio"; id?: string }
  | { tipo: "exame"; id?: string }
  | { tipo: "organizacao" }
  | { tipo: "clinica"; id?: string }
  | { tipo: "usuario" }
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
  entrar: (usuarioId: string) => void;
  sair: () => void;
  // aplica uma gravação do repositório; mostra o aviso de sucesso ou a mensagem de recusa
  executar: (op: (b: Banco, u: Usuario) => Banco, sucesso: string) => boolean;
  painel: Painel;
  abrir: (p: Painel) => void;
  form: Formulario;
  abrirForm: (f: Formulario) => void;
  aviso: { texto: string; erro: boolean } | null;
  avisar: (t: string, erro?: boolean) => void;
};

const Ctx = createContext<Store | null>(null);

const SESSAO_USUARIO = "cartilha:usuario";
const SESSAO_CLINICA = "cartilha:clinica";
const lerLocal = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const gravarLocal = (k: string, v: string | null) => {
  try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch {}
};
const VAZIO: DadosClinica = { especialidades: [], convenios: [], exames: [], profissionais: [] };

export function Provider({ children }: { children: React.ReactNode }) {
  const [banco, setBanco] = useState<Banco>(pontoZero);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [clinicaId, setClinicaId] = useState<string | null>(null);
  const [carregado, setCarregado] = useState(false);
  const [painel, abrir] = useState<Painel>(null);
  const [form, abrirForm] = useState<Formulario>(null);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const avisouFalha = useRef(false);

  const avisar = useCallback((t: string, erro = false) => {
    setAviso({ texto: t, erro });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAviso(null), 2800);
  }, []);

  // ponytail: sessão no navegador só para o protótipo; na v1 vira login de verdade no servidor
  useEffect(() => {
    setBanco(carregar());
    setUsuarioId(lerLocal(SESSAO_USUARIO));
    setClinicaId(lerLocal(SESSAO_CLINICA));
    setCarregado(true);
  }, []);

  // toda mudança vai para o navegador; se não couber, o app segue em memória e avisa uma vez
  useEffect(() => {
    if (!carregado) return;
    if (!gravar(banco) && !avisouFalha.current) {
      avisouFalha.current = true;
      avisar("Não foi possível salvar neste navegador. As mudanças valem só até fechar a página.", true);
    }
  }, [banco, carregado, avisar]);

  const usuario = banco.usuarios.find((u) => u.id === usuarioId) ?? null;
  const clinicas = usuario ? clinicasDo(banco, usuario) : [];
  // clínica guardada que deixou de ser permitida cai na primeira permitida
  const clinica = clinicas.find((c) => c.id === clinicaId) ?? clinicas[0] ?? null;

  const escolherClinica = (id: string) => {
    setClinicaId(id);
    gravarLocal(SESSAO_CLINICA, id);
    abrir(null);
  };
  const entrar = (id: string) => {
    setUsuarioId(id);
    gravarLocal(SESSAO_USUARIO, id);
    setClinicaId(null);
    gravarLocal(SESSAO_CLINICA, null);
  };
  const sair = () => {
    setUsuarioId(null);
    gravarLocal(SESSAO_USUARIO, null);
    abrir(null);
    abrirForm(null);
  };
  const executar = (op: (b: Banco, u: Usuario) => Banco, sucesso: string) => {
    if (!usuario) return false;
    try {
      setBanco(op(banco, usuario));
      avisar(sucesso);
      return true;
    } catch (e) {
      avisar(e instanceof Error ? e.message : "Não foi possível salvar.", true);
      return false;
    }
  };

  return (
    <Ctx.Provider value={{
      banco, usuario, carregado, clinicas, clinica,
      dados: clinica ? dadosDaClinica(banco, clinica.id) : VAZIO,
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
