"use client";

import { useState } from "react";
import {
  type Celda,
  type DistribucionAsientos,
  type Etiqueta,
  type PisoDistribucionAsientos,
} from "@/lib/api";
import { MapaAsientosBus } from "@/components/MapaAsientosBus";

type Posicion = "frente" | "atras" | "ninguno";
type Disposicion = "2+2" | "2+1" | "1+1";
type Herramienta = "vip" | "mujeres" | "normal";

interface ConfigPiso {
  nombre: string;
  asientos: number;
  disposicion: Disposicion;
  vip: boolean;
  bano: Posicion;
  escalera: Posicion;
}

const LETRAS_POR_DISPOSICION: Record<Disposicion, Array<string | null>> = {
  "2+2": ["A", "B", null, "C", "D"],
  "2+1": ["A", "B", null, "C"],
  "1+1": ["A", null, "B"],
};

const MAX_ASIENTOS_PISO = 60;
const MAPA_VACIO = new Map<string, string>();
const SIN_SELECCION: string[] = [];

const claseCampo =
  "w-full rounded-lg border border-brand-light bg-white px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium";
const claseEtiqueta = "mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70";

/**
 * Arma los pisos con la numeración corrida (la fila 1 del segundo piso
 * continúa donde termina el primero, porque cada número de asiento es único
 * en todo el vehículo) y aplica las etiquetas que la cooperativa pintó.
 */
function construirDistribucion(
  pisosCfg: ConfigPiso[],
  etiquetas: Record<string, Etiqueta[]>,
): { distribucion: DistribucionAsientos; total: number } {
  let numeroFila = 1;
  let total = 0;
  const pisos: PisoDistribucionAsientos[] = pisosCfg.map((cfg) => {
    const patron = LETRAS_POR_DISPOSICION[cfg.disposicion];
    const porFila = patron.filter((p) => p !== null).length;
    const filas: Array<{ celdas: Celda[] }> = [];
    let restante = cfg.asientos;
    while (restante > 0) {
      let colocados = 0;
      const celdas: Celda[] = patron.map((letra) => {
        if (letra === null || colocados >= restante) return null;
        colocados += 1;
        const numero = `${numeroFila}${letra}`;
        const tags = etiquetas[numero] ?? [];
        return tags.length > 0 ? { numero, etiquetas: tags } : numero;
      });
      filas.push({ celdas });
      restante -= Math.min(porFila, restante);
      numeroFila += 1;
    }
    total += cfg.asientos;
    return {
      nombre: cfg.nombre,
      ...(cfg.vip ? { categoria: "vip" } : {}),
      bano: cfg.bano,
      escalera: cfg.escalera,
      filas,
    };
  });
  return { distribucion: { pisos }, total };
}

const PLANTILLAS: Record<"un_piso" | "dos_pisos", (tieneBano: boolean) => ConfigPiso[]> = {
  un_piso: (tieneBano) => [
    { nombre: "Piso único", asientos: 40, disposicion: "2+2", vip: false, bano: tieneBano ? "atras" : "ninguno", escalera: "ninguno" },
  ],
  // Lo habitual en un doble piso con servicio VIP: abajo pocos asientos amplios (2+1),
  // arriba la capacidad grande (2+2); el baño va abajo y la escalera al frente.
  dos_pisos: (tieneBano) => [
    { nombre: "Piso 1", asientos: 15, disposicion: "2+1", vip: true, bano: tieneBano ? "atras" : "ninguno", escalera: "frente" },
    { nombre: "Piso 2", asientos: 36, disposicion: "2+2", vip: false, bano: "ninguno", escalera: "frente" },
  ],
};

/**
 * Constructor visual de la distribución de asientos (24-sep-2026): reemplaza
 * el JSON a mano. La cooperativa elige pisos, cuántos asientos y disposición
 * de cada uno; marca piso VIP, y con la herramienta pinta asientos VIP o
 * exclusivos para mujeres sobre la misma vista previa que verá el pasajero.
 * Por debajo genera el mismo formato de distribución de siempre.
 */
export function ConstructorBus({
  tieneBano,
  onCambio,
  onLimpiar,
}: {
  tieneBano: boolean;
  onCambio: (distribucion: DistribucionAsientos, capacidadTotal: number) => void;
  onLimpiar: () => void;
}) {
  const [pisosCfg, setPisosCfg] = useState<ConfigPiso[] | null>(null);
  const [etiquetas, setEtiquetas] = useState<Record<string, Etiqueta[]>>({});
  const [herramienta, setHerramienta] = useState<Herramienta>("vip");
  const [filasMujeres, setFilasMujeres] = useState<Record<number, string>>({});

  function aplicar(cfg: ConfigPiso[], tags: Record<string, Etiqueta[]>) {
    setPisosCfg(cfg);
    setEtiquetas(tags);
    const { distribucion, total } = construirDistribucion(cfg, tags);
    onCambio(distribucion, total);
  }

  function elegirPlantilla(clave: "un_piso" | "dos_pisos") {
    aplicar(PLANTILLAS[clave](tieneBano), {});
  }

  if (pisosCfg === null) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/70">Empieza con una plantilla</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => elegirPlantilla("un_piso")}
            className="rounded-lg border border-brand-light bg-white px-4 py-2 text-sm font-semibold text-brand-dark transition hover:bg-brand-light/40"
          >
            Bus de un piso
          </button>
          <button
            type="button"
            onClick={() => elegirPlantilla("dos_pisos")}
            className="rounded-lg border border-brand-light bg-white px-4 py-2 text-sm font-semibold text-brand-dark transition hover:bg-brand-light/40"
          >
            Bus de dos pisos (VIP abajo)
          </button>
        </div>
      </div>
    );
  }

  const { distribucion, total } = construirDistribucion(pisosCfg, etiquetas);

  function cambiarPiso(i: number, cambios: Partial<ConfigPiso>) {
    if (!pisosCfg) return;
    const nuevo = pisosCfg.map((p, idx) => (idx === i ? { ...p, ...cambios } : p));
    // Al reducir asientos o cambiar la disposición, los números cambian: se descartan las marcas de asientos que ya no existen.
    const { distribucion: d } = construirDistribucion(nuevo, {});
    const validos = new Set(
      d.pisos?.flatMap((p) => p.filas.flatMap((f) => f.celdas.map((c) => (c === null ? null : typeof c === "string" ? c : c.numero)))),
    );
    const tags = Object.fromEntries(Object.entries(etiquetas).filter(([n]) => validos.has(n)));
    aplicar(nuevo, tags);
  }

  function alternarDosPisos(dos: boolean) {
    aplicar(PLANTILLAS[dos ? "dos_pisos" : "un_piso"](tieneBano), {});
  }

  function pintar(numero: string) {
    const pisoDelAsiento = distribucion.pisos?.find((p) =>
      p.filas.some((f) => f.celdas.some((c) => c !== null && (typeof c === "string" ? c : c.numero) === numero)),
    );
    const actuales = etiquetas[numero] ?? [];
    let nuevas: Etiqueta[];
    if (herramienta === "normal") nuevas = [];
    else if (herramienta === "vip" && pisoDelAsiento?.categoria === "vip") return; // ya es VIP por el piso
    else nuevas = actuales.includes(herramienta) ? actuales.filter((e) => e !== herramienta) : [...actuales, herramienta];
    const tags = { ...etiquetas };
    if (nuevas.length === 0) delete tags[numero];
    else tags[numero] = nuevas;
    aplicar(pisosCfg!, tags);
  }

  /** Marca (o quita) "solo mujeres" en las primeras N filas del piso indicado. */
  function bloqueMujeres(pisoIdx: number, quitar: boolean) {
    const n = Math.max(0, Math.floor(Number(filasMujeres[pisoIdx] ?? "0")));
    const piso = distribucion.pisos?.[pisoIdx];
    if (!piso || n === 0) return;
    const tags = { ...etiquetas };
    for (const fila of piso.filas.slice(0, n)) {
      for (const c of fila.celdas) {
        if (c === null) continue;
        const numero = typeof c === "string" ? c : c.numero;
        const sin = (tags[numero] ?? []).filter((e) => e !== "mujeres");
        const nuevas: Etiqueta[] = quitar ? sin : [...sin, "mujeres"];
        if (nuevas.length === 0) delete tags[numero];
        else tags[numero] = nuevas;
      }
    }
    aplicar(pisosCfg!, tags);
  }

  const esDosPisos = pisosCfg.length > 1;
  const HERRAMIENTAS: Array<{ valor: Herramienta; etiqueta: string; clase: string }> = [
    { valor: "vip", etiqueta: "VIP", clase: "bg-amber-500 text-white" },
    { valor: "mujeres", etiqueta: "Solo mujeres", clase: "bg-pink-500 text-white" },
    { valor: "normal", etiqueta: "Quitar marca", clase: "bg-brand-dark text-white" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={claseEtiqueta}>Pisos del bus</p>
          <div className="inline-flex overflow-hidden rounded-lg border border-brand-light bg-white text-sm font-semibold">
            <button
              type="button"
              aria-pressed={!esDosPisos}
              onClick={() => esDosPisos && alternarDosPisos(false)}
              className={`px-4 py-2 transition ${!esDosPisos ? "bg-brand-cobalto text-white" : "text-brand-dark hover:bg-brand-light/40"}`}
            >
              Un piso
            </button>
            <button
              type="button"
              aria-pressed={esDosPisos}
              onClick={() => !esDosPisos && alternarDosPisos(true)}
              className={`px-4 py-2 transition ${esDosPisos ? "bg-brand-cobalto text-white" : "text-brand-dark hover:bg-brand-light/40"}`}
            >
              Dos pisos
            </button>
          </div>
        </div>
        <p className="text-sm text-brand-dark/70">
          Capacidad total: <span className="font-bold text-brand-dark">{total} asientos</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {pisosCfg.map((piso, i) => (
          <fieldset key={i} className="space-y-3 rounded-xl border border-brand-light bg-white p-4">
            <legend className="px-1 text-sm font-bold text-brand-dark">{piso.nombre}</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={`cb-as-${i}`} className={claseEtiqueta}>
                  Asientos
                </label>
                <input
                  id={`cb-as-${i}`}
                  type="number"
                  min={1}
                  max={MAX_ASIENTOS_PISO}
                  value={piso.asientos}
                  onChange={(e) =>
                    cambiarPiso(i, { asientos: Math.min(MAX_ASIENTOS_PISO, Math.max(1, Math.floor(Number(e.target.value) || 1))) })
                  }
                  className={claseCampo}
                />
              </div>
              <div>
                <label htmlFor={`cb-di-${i}`} className={claseEtiqueta}>
                  Disposición
                </label>
                <select
                  id={`cb-di-${i}`}
                  value={piso.disposicion}
                  onChange={(e) => cambiarPiso(i, { disposicion: e.target.value as Disposicion })}
                  className={claseCampo}
                >
                  <option value="2+2">2 + 2</option>
                  <option value="2+1">2 + 1 (más amplio)</option>
                  <option value="1+1">1 + 1 (cama / suite)</option>
                </select>
              </div>
              <div>
                <label htmlFor={`cb-ba-${i}`} className={claseEtiqueta}>
                  Baño
                </label>
                <select
                  id={`cb-ba-${i}`}
                  value={piso.bano}
                  onChange={(e) => cambiarPiso(i, { bano: e.target.value as Posicion })}
                  className={claseCampo}
                >
                  <option value="ninguno">Sin baño en este piso</option>
                  <option value="atras">Atrás</option>
                  <option value="frente">Al frente</option>
                </select>
              </div>
              {esDosPisos && (
                <div>
                  <label htmlFor={`cb-es-${i}`} className={claseEtiqueta}>
                    Escalera
                  </label>
                  <select
                    id={`cb-es-${i}`}
                    value={piso.escalera}
                    onChange={(e) => cambiarPiso(i, { escalera: e.target.value as Posicion })}
                    className={claseCampo}
                  >
                    <option value="frente">Al frente</option>
                    <option value="atras">Atrás</option>
                    <option value="ninguno">Sin escalera</option>
                  </select>
                </div>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-brand-dark">
              <input
                type="checkbox"
                checked={piso.vip}
                onChange={(e) => cambiarPiso(i, { vip: e.target.checked })}
                className="h-4 w-4 accent-amber-500"
              />
              Todo este piso es VIP
            </label>
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-24">
                <label htmlFor={`cb-fm-${i}`} className={claseEtiqueta}>
                  Filas mujeres
                </label>
                <input
                  id={`cb-fm-${i}`}
                  type="number"
                  min={0}
                  placeholder="0"
                  value={filasMujeres[i] ?? ""}
                  onChange={(e) => setFilasMujeres((f) => ({ ...f, [i]: e.target.value }))}
                  className={claseCampo}
                />
              </div>
              <button
                type="button"
                onClick={() => bloqueMujeres(i, false)}
                className="rounded-lg bg-pink-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-pink-600"
              >
                Reservar del frente
              </button>
              <button
                type="button"
                onClick={() => bloqueMujeres(i, true)}
                className="rounded-lg border border-brand-light px-3 py-2 text-xs font-semibold text-brand-dark/70 transition hover:bg-brand-light/40"
              >
                Quitar
              </button>
            </div>
          </fieldset>
        ))}
      </div>

      <div>
        <p className={claseEtiqueta}>Pintar asientos sueltos — elige la marca y toca el asiento</p>
        <div className="flex flex-wrap gap-2">
          {HERRAMIENTAS.map((h) => (
            <button
              key={h.valor}
              type="button"
              aria-pressed={herramienta === h.valor}
              onClick={() => setHerramienta(h.valor)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                herramienta === h.valor ? h.clase : "border border-brand-light bg-white text-brand-dark/70 hover:bg-brand-light/40"
              }`}
            >
              {h.etiqueta}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
        <MapaAsientosBus
          pisos={distribucion.pisos ?? []}
          estadoPorNumero={MAPA_VACIO}
          seleccionados={SIN_SELECCION}
          onAlternar={pintar}
          tieneBano={pisosCfg.some((p) => p.bano !== "ninguno")}
        />
      </div>

      <button
        type="button"
        onClick={() => {
          setPisosCfg(null);
          setEtiquetas({});
          onLimpiar();
        }}
        className="text-xs font-semibold text-brand-dark/60 underline decoration-dotted underline-offset-2"
      >
        Descartar y empezar de cero
      </button>
    </div>
  );
}
