"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, FlaskConical, ShieldCheck, Stethoscope } from "lucide-react";
import { useStore } from "@/lib/store";
import { Logo } from "@/components/ui";

const campo = "h-12 w-full rounded-xl border border-borda bg-superficie px-4 text-[15px] outline-none transition placeholder:text-suave/60 focus:border-verde focus:ring-4 focus:ring-verde/15";

export default function Login() {
  const { entrar, usuarios, clinicas } = useStore();
  const router = useRouter();
  const [usuarioId, setUsuarioId] = useState(usuarios[1]?.id ?? usuarios[0].id);
  const escolhido = usuarios.find((u) => u.id === usuarioId)!;
  const alcance = (u: typeof escolhido) => {
    if (u.perfil === "admin") return "Vê e edita todas as clínicas";
    const c = clinicas.find((x) => x.id === u.clinicaId);
    const s = c?.dados.setores.find((x) => x.id === u.setorId);
    return s ? `${c?.nome} · só médicos do setor ${s.nome}` : `${c?.nome ?? "Todas as clínicas"} · só consulta`;
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Painel da marca */}
      <div className="gradiente-marca relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col">
        <div className="bolha absolute -left-24 top-1/4 size-96 rounded-full bg-emerald-300/30 blur-3xl" />
        <div className="bolha absolute -right-16 bottom-10 size-80 rounded-full bg-sky-300/30 blur-3xl" style={{ animationDelay: "-7s" }} />
        <div className="relative entrar"><Logo claro /></div>

        <div className="relative my-auto max-w-md">
          <h1 className="entrar text-4xl font-bold leading-tight tracking-tight" style={{ "--i": 2 } as React.CSSProperties}>
            Tudo o que a central precisa, num lugar só.
          </h1>
          <p className="entrar mt-4 text-lg text-white/80" style={{ "--i": 3 } as React.CSSProperties}>
            Médicos, convênios e preparo de exames, prontos para consultar durante a ligação.
          </p>
          <svg viewBox="0 0 600 120" className="mt-10 w-full" fill="none" aria-hidden>
            <path className="ecg" d="M0 60 H170 L190 60 L205 30 L222 95 L240 10 L258 105 L272 60 H340 L355 48 L370 60 H600"
              stroke="white" strokeOpacity="0.85" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="mt-8 flex flex-wrap gap-2">
            {[[Stethoscope, "Especialidades e médicos"], [ShieldCheck, "Convênios por rede"], [FlaskConical, "Preparo de exames"]].map(([I, t], i) => {
              const Ic = I as typeof Stethoscope;
              return (
                <span key={t as string} className="entrar flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm ring-1 ring-white/25 backdrop-blur" style={{ "--i": 5 + i } as React.CSSProperties}>
                  <Ic className="size-4" />{t as string}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center p-6">
        <form className="w-full max-w-sm" onSubmit={(e) => { e.preventDefault(); entrar(usuarioId); router.replace(escolhido.clinicaId ? "/" : "/clinicas"); }}>
          <div className="entrar mb-10 lg:hidden"><Logo /></div>
          <h2 className="entrar text-[28px] font-bold tracking-tight" style={{ "--i": 1 } as React.CSSProperties}>Entrar</h2>
          <p className="entrar mt-1 text-suave" style={{ "--i": 2 } as React.CSSProperties}>Use o acesso que a coordenação te passou.</p>

          <div className="entrar mt-8 space-y-4" style={{ "--i": 3 } as React.CSSProperties}>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">E-mail</span>
              <input key={usuarioId} type="email" defaultValue={escolhido.email} placeholder="voce@clinica.com.br" className={campo} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Senha</span>
              <input type="password" placeholder="••••••••" className={campo} />
            </label>
            <fieldset>
              <legend className="mb-1.5 block text-sm font-semibold">Usuário de teste <span className="font-normal text-suave">(só no protótipo)</span></legend>
              <div className="space-y-1.5">
                {usuarios.map((u) => (
                  <label key={u.id} className="pressionavel flex cursor-pointer items-center gap-3 rounded-xl border border-borda bg-superficie px-3 py-2.5 has-[:checked]:border-verde/50 has-[:checked]:bg-verde-claro">
                    <input type="radio" name="usuario" value={u.id} checked={u.id === usuarioId} onChange={() => setUsuarioId(u.id)} className="size-4 accent-verde" />
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
