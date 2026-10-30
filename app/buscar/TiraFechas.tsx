import Link from "next/link";

/**
 * Tira de fechas con el precio de cada día (diseño oficial de Resultados, 28-oct-2026).
 * 7 días seguidos alrededor de la fecha buscada (nunca antes de hoy). Cada día muestra el precio más
 * bajo "desde" si hay viajes, o "—" si no hay. Los precios salen de la consulta de alternativas de la
 * API (`/viajes/alternativas?completo=true`), la misma que ya usa "Ver todas las fechas": no hay
 * cálculo nuevo. Tocar un día repite la misma búsqueda con esa fecha.
 * Etapa 2: los días sin salidas se ven apagados, dicen "Sin salidas" y no se pueden tocar. Solo cuando
 * la consulta de precios respondió (`hayDatos`); si falló, todos los días quedan tocables con "—".
 */
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function sumarDias(iso: string, n: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d + n));
  return f.toISOString().slice(0, 10);
}

function hoyEcuador(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guayaquil" }).format(new Date());
}

export function TiraFechas({
  fecha,
  precios,
  hrefFecha,
  hayDatos,
}: {
  fecha: string;
  precios: Map<string, number>;
  hayDatos: boolean;
  hrefFecha: (f: string) => string;
}) {
  const hoy = hoyEcuador();
  let inicio = sumarDias(fecha, -3);
  if (inicio < hoy) inicio = hoy;
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(inicio, i));
  // Días con viajes fuera de la tira (30-oct-2026): el más cercano antes y después, para alcanzarlos
  // sin adivinar. Mismos datos de /viajes/alternativas (próximos 45 días); ninguna llamada nueva.
  const conViajes = hayDatos ? [...precios.keys()].sort() : [];
  const anterior = [...conViajes].reverse().find((d) => d < dias[0] && d >= hoy);
  const siguiente = conViajes.find((d) => d > dias[dias.length - 1]);
  const etiquetaDia = (d: string) => {
    const [a, m, dd] = d.split("-").map(Number);
    return `${DIAS[new Date(Date.UTC(a, m - 1, dd)).getUTCDay()]} ${dd} ${MESES[m - 1]}`;
  };
  const saltar = (d: string, lado: "antes" | "despues") => (
    <li key={`salto-${lado}`} className="min-w-[128px] flex-1">
      <Link
        href={hrefFecha(d)}
        className="flex h-full items-center gap-1.5 rounded-tab bg-kbyellow-soft px-2.5 py-2 text-ink transition hover:shadow-[inset_0_0_0_1.5px_#0B0D12]"
      >
        {lado === "antes" && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        )}
        <span className="min-w-0 flex-1 text-center">
          <span className="sr-only">{lado === "antes" ? "Fecha anterior con viajes: " : "Próxima fecha con viajes: "}</span>
          <span className="block whitespace-nowrap text-xs font-semibold">{etiquetaDia(d)}</span>
          <span className="block whitespace-nowrap text-[15px] font-semibold tabular-nums">
            <span className="text-[11px] font-medium opacity-75">desde </span>${precios.get(d)?.toFixed(2)}
          </span>
        </span>
        {lado === "despues" && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
            <path d="M9 5l7 7-7 7" />
          </svg>
        )}
      </Link>
    </li>
  );

  return (
    <nav aria-label="Elegir otra fecha" className="border-b border-line bg-white">
      <ol className="mx-auto flex max-w-[1280px] gap-2 overflow-x-auto px-5 py-3 [-ms-overflow-style:none] [scrollbar-width:none] md:px-16 [&::-webkit-scrollbar]:hidden">
        {anterior && saltar(anterior, "antes")}
        {dias.map((d) => {
          const [a, m, dd] = d.split("-").map(Number);
          const diaSemana = DIAS[new Date(Date.UTC(a, m - 1, dd)).getUTCDay()];
          const precio = precios.get(d);
          const actual = d === fecha;
          const fecha_ = `${diaSemana} ${dd} ${MESES[m - 1]}`;
          if (hayDatos && precio === undefined && !actual) {
            return (
              <li key={d} className="min-w-[92px] flex-1">
                <span
                  aria-disabled="true"
                  className="flex h-full cursor-not-allowed flex-col items-center rounded-tab bg-kbbg px-2 py-2 text-center"
                >
                  <span className="text-xs text-muted-3">{fecha_}</span>
                  <span className="text-[13px] font-medium leading-[22px] text-muted-3">Sin salidas</span>
                </span>
              </li>
            );
          }
          return (
            <li key={d} className="min-w-[92px] flex-1">
              <Link
                href={hrefFecha(d)}
                aria-current={actual ? "date" : undefined}
                className={`flex h-full flex-col items-center rounded-tab px-2 py-2 text-center transition ${
                  actual ? "bg-ink text-white" : "bg-white text-ink shadow-[inset_0_0_0_1px_#E9EBF0] hover:shadow-[inset_0_0_0_1.5px_#0B0D12]"
                }`}
              >
                <span className={`text-xs ${actual ? "text-ondark" : "text-muted-2"}`}>
                  {fecha_}
                </span>
                <span className={`text-[15px] font-semibold tabular-nums ${precio === undefined ? (actual ? "text-ondark" : "text-muted-3") : actual ? "text-kbyellow" : ""}`}>
                  {precio === undefined ? (
                    hayDatos ? "Sin salidas" : "—"
                  ) : (
                    <>
                      <span className="text-[11px] font-medium opacity-75">desde </span>${precio.toFixed(2)}
                    </>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
        {siguiente && saltar(siguiente, "despues")}
      </ol>
    </nav>
  );
}
