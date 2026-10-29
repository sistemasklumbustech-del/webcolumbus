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

  return (
    <nav aria-label="Elegir otra fecha" className="border-b border-line bg-white">
      <ol className="mx-auto flex max-w-[1280px] gap-2 overflow-x-auto px-5 py-3 [-ms-overflow-style:none] [scrollbar-width:none] md:px-16 [&::-webkit-scrollbar]:hidden">
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
                  {precio === undefined ? "—" : `$${precio.toFixed(2)}`}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
