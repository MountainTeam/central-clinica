"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import UnidadesPage from "@/app/(app)/page";

export default function Clinicas() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);
  return <UnidadesPage />;
}
