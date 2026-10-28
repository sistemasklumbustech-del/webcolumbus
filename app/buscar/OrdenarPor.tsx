"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

/**
 * Fase 5-buscador (16-ago-2026) -- hallazgo real del director,
 * comparando con referencias reales (redBus, FlixBus): faltaba poder
 * ordenar los resultados. Mismo patrón que FiltrosBusqueda -- actualiza
 * la URL, el ordenamiento real ocurre en el servidor (page.tsx),
 * nunca se inventa nada del lado del cliente.
 *
 * Rediseño final (oct-2026): chips en vez de lista desplegable; las
 * mismas tres opciones y el mismo parámetro de URL.
 */
const OPCIONES = [
  { valor: "precio_asc", etiqueta: "Más barato" },
  { valor: "salida_temprano", etiqueta: "Más temprano" },
  { valor: "duracion", etiqueta: "Más rápido" },
] as const;

export function OrdenarPor() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pedido = searchParams.get("ordenarPor");
  const valorActual = OPCIONES.some((o) => o.valor === pedido) ? pedido : "precio_asc";

  function cambiar(valor: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("ordenarPor", valor);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div role="group" aria-label="Ordenar resultados" className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {OPCIONES.map((o) => (
        <button
          key={o.valor}
          type="button"
          aria-pressed={valorActual === o.valor}
          onClick={() => cambiar(o.valor)}
          className={`kb-chip shrink-0 ${valorActual === o.valor ? "is-active" : ""}`}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}
