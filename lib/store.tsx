"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { clinicasIniciais, dadosVazios, usuariosIniciais, visivelPara, type Clinica, type Dados, type Perfil, type Setor, type Usuario } from "./dados";

export type Painel = { tipo: "exame"; id: string } | null;
export type Formulario =
  | { tipo: "profissional"; id?: string }
  | { tipo: "especialidade" }
  | { tipo: "convenio" }
  | { tipo: "exame"; id?: string }
  | { tipo: "clinica" }
  | { tipo: "setor" }
  | { tipo: "usuario" }
  | null;

type Store = {
  usuarios: Usuario[];
  usuario: Usuario | null;
  criarUsuario: (u: Omit<Usuario, "id">) => void;
  // clínicas que o usuário pode abrir
  clinicas: Clinica[];
  clinica: Clinica;
  escolherClinica: (id: string) => void;
  criarClinica: (nome: string, cidade: string) => void;
  setor: Setor | undefined;
  // dados da clínica escolhida, já filtrados pelo setor do usuário
  dados: Dados;
  setDados: (f: (d: Dados) => Dados) => void;
  perfil: Perfil | null;
  carregado: boolean;
  entrar: (usuarioId: string) => void;
  sair: () => void;
  painel: Painel;
  abrir: (p: Painel) => void;
  form: Formulario;
  abrirForm: (f: Formulario) => void;
  aviso: string | null;
  avisar: (t: string) => void;
};

const Ctx = createContext<Store | null>(null);

const lerLocal = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const gravarLocal = (k: string, v: string | null) => {
  try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch {}
};

export function Provider({ children }: { children: React.ReactNode }) {
  const [todasClinicas, setClinicas] = useState(clinicasIniciais);
  const [clinicaId, setClinicaId] = useState(clinicasIniciais[0].id);
  const [usuarios, setUsuarios] = useState(usuariosIniciais);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [carregado, setCarregado] = useState(false);
  const [painel, abrir] = useState<Painel>(null);
  const [form, abrirForm] = useState<Formulario>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ponytail: sessão no navegador só para o protótipo; na v1 vira login de verdade checado no servidor
  useEffect(() => {
    const u = lerLocal("usuario");
    if (u && usuariosIniciais.some((x) => x.id === u)) setUsuarioId(u);
    const c = lerLocal("clinica");
    if (c && clinicasIniciais.some((x) => x.id === c)) setClinicaId(c);
    setCarregado(true);
  }, []);

  const usuario = usuarios.find((u) => u.id === usuarioId) ?? null;
  const clinicas = usuario?.clinicaId ? todasClinicas.filter((c) => c.id === usuario.clinicaId) : todasClinicas;
  const clinica = clinicas.find((c) => c.id === clinicaId) ?? clinicas[0];
  const setor = clinica.dados.setores.find((s) => s.id === usuario?.setorId);

  const escolherClinica = (id: string) => { setClinicaId(id); gravarLocal("clinica", id); abrir(null); };
  const criarClinica = (nome: string, cidade: string) => {
    const id = `clinica-${Date.now()}`;
    setClinicas((cs) => [...cs, { id, nome, cidade, dados: dadosVazios() }]);
    escolherClinica(id);
  };
  // edição sempre sobre os dados completos da clínica (só o admin edita, e ele vê tudo)
  const setDados = (f: (d: Dados) => Dados) =>
    setClinicas((cs) => cs.map((c) => (c.id === clinica.id ? { ...c, dados: f(c.dados) } : c)));
  const criarUsuario = (u: Omit<Usuario, "id">) => setUsuarios((us) => [...us, { ...u, id: `usuario-${Date.now()}` }]);

  const entrar = (id: string) => {
    setUsuarioId(id);
    gravarLocal("usuario", id);
    const c = usuarios.find((u) => u.id === id)?.clinicaId;
    if (c) escolherClinica(c);
  };
  const sair = () => { setUsuarioId(null); gravarLocal("usuario", null); };
  const avisar = useCallback((t: string) => {
    setAviso(t);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAviso(null), 2400);
  }, []);

  return (
    <Ctx.Provider value={{
      usuarios, usuario, criarUsuario, clinicas, clinica, escolherClinica, criarClinica, setor,
      dados: visivelPara(clinica.dados, usuario?.setorId), setDados,
      perfil: usuario?.perfil ?? null, carregado, entrar, sair, painel, abrir, form, abrirForm, aviso, avisar,
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
