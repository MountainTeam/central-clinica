"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { combina, gruposPlanosDoConvenio, novoId, observacoesDoConvenio } from "@/lib/regras";
import { salvarConvenio } from "@/lib/repositorio";
import type { Convenio } from "@/lib/modelo";
import { Botao, CabecalhoPagina, LogoMarca, Vazio } from "@/components/ui";

export default function Convenios() {
  const { dados, clinica, podeEditarAtual, abrirForm, executar } = useStore();
  const [busca, setBusca] = useState("");

  const conveniosFiltrados = dados.convenios.filter((c) =>
    combina(c.nome, busca)
  );

  const criarConvenioModelo = () => {
    if (!clinica) return;
    const convId = novoId("conv");
    const modelo: Convenio = {
      id: convId,
      clinicaId: clinica.id,
      nome: "Saúde Mais",
      cor: "#0b7a69",
      subtipos: [
        { id: `${convId}-essencial`, nome: "Essencial" },
        { id: `${convId}-prime`, nome: "Prime" },
        { id: `${convId}-select`, nome: "Select" },
        { id: `${convId}-preferencial`, nome: "Preferencial" },
        { id: `${convId}-facil`, nome: "Fácil" },
      ],
      gruposPlanos: [
        {
          status: "atende",
          titulo: "Atende consultas e exames",
          planos: [
            "Essencial",
            "Prime",
            "Select",
            "Quality",
            "Flex Empresarial",
            "Compacto",
            "Intercâmbio",
            "Federação",
          ],
        },
        {
          status: "somente_exames",
          titulo: "Somente exames",
          nota: "Não precisa de encaminhamento para a clínica",
          planos: ["Preferencial", "Fácil", "Prático", "Pleno", "Flex"],
        },
        {
          status: "nao_atende",
          titulo: "Não atendemos",
          planos: ["Life", "Ser"],
        },
      ],
      observacoesGerais: [
        "Procedimentos ginecológicos não precisam de pacote",
        "Biópsia: apenas autorização do procedimento",
        "Documentação por e-mail de autorização",
      ],
    };

    executar((b, u) => salvarConvenio(b, u, modelo), "Convênio modelo Saúde Mais adicionado com sucesso!");
  };

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Convênios e manuais de atendimento"
        acao={
          podeEditarAtual && (
            <div className="flex flex-wrap items-center gap-2">
              {dados.convenios.length === 0 && (
                <Botao variante="secundario" onClick={criarConvenioModelo}>
                  <Sparkles className="size-4 text-verde" />
                  Carregar modelo (Saúde Mais)
                </Botao>
              )}
              <Botao onClick={() => abrirForm({ tipo: "convenio" })}>
                <Plus className="size-4" />
                Novo convênio
              </Botao>
            </div>
          )
        }
      />

      {/* Barra de pesquisa de convênios */}
      <div className="entrar relative max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-suave" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar convênio por nome..."
          className="h-11 w-full rounded-2xl border border-borda bg-superficie pl-10 pr-3 text-[15px] outline-none transition focus:border-verde focus:ring-4 focus:ring-verde/15"
        />
      </div>

      {/* Grade de cartões de convênios */}
      {conveniosFiltrados.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {conveniosFiltrados.map((conv, i) => {
            const grupos = gruposPlanosDoConvenio(conv);
            const obs = observacoesDoConvenio(conv);
            const gAtende = grupos.find((g) => g.status === "atende");
            const gSomente = grupos.find((g) => g.status === "somente_exames");
            const gNao = grupos.find((g) => g.status === "nao_atende");

            const countAtende = gAtende?.planos.length ?? 0;
            const countSomente = gSomente?.planos.length ?? 0;
            const countNao = gNao?.planos.length ?? 0;

            return (
              <Link
                key={conv.id}
                href={`/convenios/${conv.id}`}
                style={{ "--i": i } as React.CSSProperties}
                className="entrar pressionavel levanta group flex flex-col justify-between rounded-3xl border border-borda bg-superficie p-6 shadow-card transition-all hover:border-verde/40 hover:shadow-elevado"
              >
                <div>
                  <div className="mb-4">
                    <LogoMarca nome={conv.nome} logo={conv.logo} cor={conv.cor} tamanho="lg" />
                  </div>

                  <h2 className="text-xl font-bold tracking-tight text-texto group-hover:text-verde transition-colors">
                    {conv.nome}
                  </h2>
                  <p className="mt-1 text-[13px] text-suave">Manual e regras da carteirinha</p>

                  <div className="mt-5 space-y-2 border-t border-borda/60 pt-4 text-[13px] font-medium">
                    <div className="flex items-center justify-between text-texto">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-verde" />
                        Consultas e exames
                      </span>
                      <span className={`font-bold ${countAtende ? "text-texto" : "text-suave"}`}>{countAtende} planos</span>
                    </div>

                    <div className="flex items-center justify-between text-texto">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-alerta" />
                        Somente exames
                      </span>
                      <span className={`font-bold ${countSomente ? "text-texto" : "text-suave"}`}>{countSomente} planos</span>
                    </div>

                    {countNao > 0 && (
                      <div className="flex items-center justify-between text-texto">
                        <span className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-perigo" />
                          Não atendidos
                        </span>
                        <span className="font-bold text-texto">{countNao} planos</span>
                      </div>
                    )}

                    {obs.length > 0 && (
                      <div className="flex items-center justify-between text-suave pt-1">
                        <span className="flex items-center gap-1.5">
                          <ShieldAlert className="size-3.5 text-alerta" />
                          Regras operacionais
                        </span>
                        <span className="font-semibold text-texto">{obs.length} ativas</span>
                      </div>
                    )}
                  </div>
                </div>

              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-borda bg-superficie p-8 text-center shadow-card">
          <Vazio
            texto={
              busca
                ? "Nenhum convênio encontrado com esse nome."
                : "Nenhum convênio cadastrado nesta unidade."
            }
          />
          {podeEditarAtual && !busca && (
            <div className="mt-4 flex justify-center gap-3">
              <Botao onClick={criarConvenioModelo}>
                <Sparkles className="size-4" /> Inserir convênio modelo (Saúde Mais)
              </Botao>
              <Botao variante="secundario" onClick={() => abrirForm({ tipo: "convenio" })}>
                <Plus className="size-4" /> Cadastrar novo convênio
              </Botao>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
