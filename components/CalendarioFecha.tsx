"use client";

import { DayPicker } from "react-day-picker";
import { es } from "react-day-picker/locale";

/** Calendario del campo de fecha. Va aparte para que solo se descargue al abrirlo. */
export function CalendarioFecha({
  valor,
  minimo,
  onElegir,
}: {
  valor: Date;
  minimo?: Date;
  onElegir: (fecha: Date) => void;
}) {
  return (
            <DayPicker
              mode="single"
              locale={es}
              selected={valor}
              defaultMonth={valor}
              disabled={minimo ? { before: minimo } : undefined}
              onSelect={(fecha) => {
                if (fecha) onElegir(fecha);
              }}
              classNames={{
                root: "text-ink",
                months: "flex gap-4",
                month: "space-y-2",
                month_caption: "flex items-center justify-center py-1 text-sm font-semibold text-ink capitalize",
                nav: "flex items-center justify-between absolute inset-x-0 top-0 px-1",
                button_previous:
                  "flex h-8 w-8 items-center justify-center rounded-ctrl text-muted-2 hover:bg-kbbg hover:text-ink disabled:opacity-30",
                button_next:
                  "flex h-8 w-8 items-center justify-center rounded-ctrl text-muted-2 hover:bg-kbbg hover:text-ink disabled:opacity-30",
                chevron: "fill-current",
                weekdays: "flex",
                weekday: "w-9 text-center text-[11px] font-semibold uppercase text-muted-3",
                week: "flex",
                day: "p-0.5",
                day_button:
                  "flex h-9 w-9 items-center justify-center rounded-ctrl text-sm text-ink transition hover:bg-kbbg",
                today: "font-bold underline decoration-kbyellow decoration-2 underline-offset-4",
                selected: "[&>button]:bg-kbyellow [&>button]:text-ink [&>button]:font-bold [&>button]:hover:bg-kbyellow",
                outside: "text-muted-3",
                disabled: "text-line-2 hover:bg-transparent cursor-not-allowed",
              }}
            />
  );
}
