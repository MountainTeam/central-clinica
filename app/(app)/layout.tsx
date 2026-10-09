import { Suspense } from "react";
import { Estrutura } from "@/components/estrutura";

// A casca usa a URL (menu ativo, página do médico). Na rota dinâmica /profissionais/[id]
// ela só existe no navegador, e o Next 16 exige Suspense em volta.
export default function LayoutApp({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={null}>
      <Estrutura>{children}</Estrutura>
    </Suspense>
  );
}
