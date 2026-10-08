"use client";

import { useState } from "react";
import { Check, FileSpreadsheet, RotateCcw, UploadCloud } from "lucide-react";
import { useStore } from "@/lib/store";
import { Botao, CabecalhoPagina, Vazio } from "@/components/ui";

const etapas = ["Enviar planilha", "Conferir simulação", "Gravar"];

// ponytail: simulação fixa; a leitura real do arquivo segue a skill `importar-planilha` na v1
const simulacao = [
  { rotulo: "Profissionais", novos: 64, atualizados: 12 },
  { rotulo: "Convênios", novos: 9, atualizados: 2 },
  { rotulo: "Tipos de rede", novos: 31, atualizados: 0 },
  { rotulo: "Exames", novos: 22, atualizados: 4 },
];

export default function Importar() {
  const { perfil, avisar } = useStore();
  const [arquivo, setArquivo] = useState<string | null>(null);
  const [etapa, setEtapa] = useState(0);
  const [arrastando, setArrastando] = useState(false);

  if (perfil !== "admin") return <Vazio texto="Só o administrador pode importar planilhas." />;

  const receber = (f?: File) => { if (f) { setArquivo(f.name); setEtapa(1); } };

  return (
    <div className="max-w-3xl">
      <CabecalhoPagina titulo="Importar planilha" descricao="Carga inicial de médicos, convênios e exames a partir de CSV ou Excel." />

      <ol className="entrar mb-8 flex items-center gap-2" style={{ "--i": 1 } as React.CSSProperties}>
        {etapas.map((t, i) => (
          <li key={t} className="flex flex-1 items-center gap-2">
            <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold transition-colors duration-300 ${i < etapa ? "gradiente-marca text-white" : i === etapa ? "bg-verde-claro text-verde ring-2 ring-verde/30" : "bg-fundo text-suave ring-1 ring-borda"}`}>
              {i < etapa ? <Check className="size-4" strokeWidth={3} /> : i + 1}
            </span>
            <span className={`hidden text-sm font-semibold sm:block ${i <= etapa ? "text-texto" : "text-suave"}`}>{t}</span>
            {i < etapas.length - 1 && <span className="h-px flex-1 bg-borda" />}
          </li>
        ))}
      </ol>

      {etapa === 0 && (
        <label
          onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => { e.preventDefault(); setArrastando(false); receber(e.dataTransfer.files[0]); }}
          className={`entrar flex cursor-pointer flex-col items-center rounded-3xl border-2 border-dashed px-6 py-16 text-center transition-colors duration-200 ${arrastando ? "border-verde bg-verde-claro" : "border-borda bg-superficie hover:border-verde/50"}`}
          style={{ "--i": 2 } as React.CSSProperties}>
          <span className={`grid size-14 place-items-center rounded-2xl gradiente-marca text-white transition-transform duration-300 ease-saida ${arrastando ? "scale-110" : ""}`}>
            <UploadCloud className="size-7" />
          </span>
          <p className="mt-4 text-lg font-semibold">Arraste a planilha aqui</p>
          <p className="mt-1 text-sm text-suave">ou clique para escolher · CSV, XLSX</p>
          <input type="file" accept=".csv,.xlsx,.xls" className="sr-only" onChange={(e) => receber(e.target.files?.[0])} />
        </label>
      )}

      {etapa >= 1 && (
        <div className="space-y-5">
          <div className="entrar flex items-center gap-3 rounded-2xl border border-borda bg-superficie p-4">
            <FileSpreadsheet className="size-6 text-verde" />
            <span className="flex-1 truncate font-semibold">{arquivo}</span>
            <button onClick={() => { setEtapa(0); setArquivo(null); }} className="pressionavel flex items-center gap-1.5 text-sm font-semibold text-suave hover:text-texto">
              <RotateCcw className="size-4" />Trocar
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {simulacao.map((s, i) => (
              <div key={s.rotulo} className="entrar rounded-2xl border border-borda bg-superficie p-4" style={{ "--i": i + 1 } as React.CSSProperties}>
                <p className="text-sm text-suave">{s.rotulo}</p>
                <p className="mt-2 text-2xl font-bold">+{s.novos}</p>
                <p className="text-xs text-suave">{s.atualizados} atualizados</p>
              </div>
            ))}
          </div>

          <div className="entrar rounded-2xl bg-alerta-claro p-4 text-sm text-alerta" style={{ "--i": 5 } as React.CSSProperties}>
            3 linhas não serão importadas: convênio sem tipo de rede (linhas 14, 27 e 80). Observações já escritas à mão não serão sobrescritas.
          </div>

          {etapa === 1 ? (
            <div className="flex justify-end gap-2">
              <Botao variante="secundario" onClick={() => { setEtapa(0); setArquivo(null); }}>Cancelar</Botao>
              <Botao onClick={() => { setEtapa(3); avisar("Planilha importada (simulação)"); }}>Gravar dados</Botao>
            </div>
          ) : (
            <div className="entrar flex items-center gap-3 rounded-2xl bg-verde-claro p-4 font-semibold text-verde">
              <Check className="size-5" strokeWidth={3} />Importação concluída. No protótipo, nada foi gravado de verdade.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
