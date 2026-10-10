"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { Usuario } from "@/lib/modelo";
import { PAPEIS } from "@/lib/permissoes";
import { useStore } from "@/lib/store";
import { Logo } from "@/components/ui";

const campo = "h-12 w-full rounded-xl border border-borda bg-superficie px-4 text-[15px] outline-none transition placeholder:text-suave/60 focus:border-verde focus:ring-4 focus:ring-verde/15";

export default function Login() {
  const { entrar, banco } = useStore();
  const router = useRouter();
  const [usuarioId, setUsuarioId] = useState("coordenador-comn");
  const escolhido = banco.usuarios.find((u) => u.id === usuarioId) ?? banco.usuarios[0];
  const alcance = (u: Usuario) =>
    `${PAPEIS[u.papel].rotulo} · ${u.clinicas.length ? u.clinicas.map((id) => banco.clinicas.find((c) => c.id === id)?.nome ?? id).join(", ") : "todas as clínicas"}`;

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Painel da marca */}
      <div
        className="gradiente-marca relative hidden overflow-hidden p-12 text-white lg:flex"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          minHeight: "100vh",
        }}
      >
        <div className="bolha absolute -left-24 top-1/4 size-96 rounded-full bg-emerald-300/30 blur-3xl" />
        <div className="bolha absolute -right-16 bottom-10 size-80 rounded-full bg-sky-300/30 blur-3xl" style={{ animationDelay: "-7s" }} />
        
        <div
          className="entrar"
          style={{
            position: "absolute",
            top: "2.5rem",
            left: "2.5rem",
            zIndex: 30,
          }}
        >
          <Logo claro />
        </div>

        <div
          className="relative z-10 entrar"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            maxWidth: "960px",
            margin: "auto",
            padding: "1.5rem",
          }}
        >
          <img
            src="/Fundo%20Login.png"
            alt="Guia Comercial"
            style={{
              width: "100%",
              maxWidth: "880px",
              maxHeight: "75vh",
              objectFit: "contain",
              display: "block",
              margin: "0 auto",
              filter: "drop-shadow(0 16px 40px rgba(0, 0, 0, 0.22))",
            }}
          />
        </div>
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center p-6">
        <form className="w-full max-w-sm" onSubmit={(e) => { e.preventDefault(); entrar(escolhido.id); router.replace("/"); }}>
          <div className="entrar mb-10 lg:hidden"><Logo /></div>
          <h2 className="entrar text-[28px] font-bold tracking-tight" style={{ "--i": 1 } as React.CSSProperties}>Entrar</h2>

          <div className="entrar mt-8 space-y-4" style={{ "--i": 3 } as React.CSSProperties}>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">E-mail</span>
              <input key={escolhido.id} type="email" defaultValue={escolhido.email} className={campo} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Senha</span>
              <input type="password" placeholder="••••••••" className={campo} />
            </label>
            <fieldset>
              <legend className="mb-1.5 block text-sm font-semibold">Usuário de teste</legend>
              <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                {banco.usuarios.map((u) => (
                  <label key={u.id} className="pressionavel flex cursor-pointer items-center gap-3 rounded-xl border border-borda bg-superficie px-3 py-2.5 has-[:checked]:border-verde/50 has-[:checked]:bg-verde-claro">
                    <input type="radio" name="usuario" value={u.id} checked={u.id === escolhido.id} onChange={() => setUsuarioId(u.id)} className="size-4 accent-verde" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{u.nome}</span>
                      <span className="block truncate text-xs text-suave">{alcance(u)}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <button type="submit" className="entrar pressionavel gradiente-marca group mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl font-semibold text-white shadow-card hover:brightness-105" style={{ "--i": 4 } as React.CSSProperties}>
            Entrar <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
