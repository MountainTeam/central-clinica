"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { dadosIniciais, type Dados, type Perfil } from "./dados";

export type Painel = { tipo: "profissional" | "exame"; id: string } | null;
export type Formulario =
  | { tipo: "profissional"; id?: string }
  | { tipo: "especialidade" }
  | { tipo: "convenio" }
  | { tipo: "exame"; id?: string }
  | null;

type Store = {
  dados: Dados;
  setDados: (f: (d: Dados) => Dados) => void;
  perfil: Perfil | null;
  carregado: boolean;
  entrar: (p: Perfil) => void;
  sair: () => void;
  painel: Painel;
  abrir: (p: Painel) => void;
  form: Formulario;
  abrirForm: (f: Formulario) => void;
  aviso: string | null;
  avisar: (t: string) => void;
};

const Ctx = createContext<Store | null>(null);

export function Provider({ children }: { children: React.ReactNode }) {
  const [dados, setDadosState] = useState(dadosIniciais);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregado, setCarregado] = useState(false);
  const [painel, abrir] = useState<Painel>(null);
  const [form, abrirForm] = useState<Formulario>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ponytail: perfil no navegador só para o protótipo; na v1 vira sessão checada no servidor
  useEffect(() => {
    try {
      const p = localStorage.getItem("perfil");
      if (p === "admin" || p === "leitura") setPerfil(p);
    } catch {}
    setCarregado(true);
  }, []);

  const entrar = (p: Perfil) => {
    setPerfil(p);
    try { localStorage.setItem("perfil", p); } catch {}
  };
  const sair = () => {
    setPerfil(null);
    try { localStorage.removeItem("perfil"); } catch {}
  };
  const avisar = useCallback((t: string) => {
    setAviso(t);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAviso(null), 2400);
  }, []);
  const setDados = (f: (d: Dados) => Dados) => setDadosState(f);

  return (
    <Ctx.Provider value={{ dados, setDados, perfil, carregado, entrar, sair, painel, abrir, form, abrirForm, aviso, avisar }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore fora do Provider");
  return s;
}
