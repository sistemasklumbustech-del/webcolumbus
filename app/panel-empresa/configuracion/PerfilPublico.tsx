"use client";

import { useEffect, useState, type FormEvent } from "react";
import { obtenerPerfilPublicoCoop, guardarPerfilPublicoCoop } from "@/lib/api";
import { obtenerToken } from "@/lib/auth";

const claseCampo =
  "w-full rounded-lg border border-brand-light bg-white px-3 py-2 text-sm text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium";
const claseEtiqueta = "mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70";

const SUGERENCIAS_SERVICIOS = [
  "Venta de boletos en línea",
  "Encomiendas",
  "Servicio de carga",
  "Alquiler de buses para grupos",
  "Atención al cliente 24 horas",
];
const SUGERENCIAS_BENEFICIOS = [
  "Asientos reclinables",
  "Cambios de fecha según política",
  "Descuento a tercera edad y niños",
  "Cargadores USB",
  "Conductores capacitados",
];

/** Lista corta de textos que se agregan, se quitan y se sugieren con un toque. */
function ListaEditable({
  id,
  etiqueta,
  ayuda,
  valores,
  sugerencias,
  maximo,
  largoMaximo,
  onCambio,
}: {
  id: string;
  etiqueta: string;
  ayuda: string;
  valores: string[];
  sugerencias: string[];
  maximo: number;
  largoMaximo: number;
  onCambio: (v: string[]) => void;
}) {
  const [nuevo, setNuevo] = useState("");

  function agregar(texto: string) {
    const t = texto.trim().replace(/\s+/g, " ");
    if (!t || valores.length >= maximo) return;
    if (valores.some((v) => v.toLowerCase() === t.toLowerCase())) return;
    onCambio([...valores, t]);
    setNuevo("");
  }

  const pendientes = sugerencias.filter((s) => !valores.some((v) => v.toLowerCase() === s.toLowerCase()));

  return (
    <div>
      <label htmlFor={id} className={claseEtiqueta}>
        {etiqueta}
      </label>
      <p className="mb-2 text-xs text-brand-dark/50">{ayuda}</p>
      {valores.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2">
          {valores.map((v) => (
            <li
              key={v}
              className="flex items-center gap-1.5 rounded-full bg-brand-light px-3 py-1 text-sm text-brand-dark"
            >
              {v}
              <button
                type="button"
                onClick={() => onCambio(valores.filter((x) => x !== v))}
                aria-label={`Quitar ${v}`}
                className="text-brand-dark/50 hover:text-red-600"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {valores.length < maximo && (
        <div className="flex gap-2">
          <input
            id={id}
            value={nuevo}
            maxLength={largoMaximo}
            onChange={(e) => setNuevo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                agregar(nuevo);
              }
            }}
            placeholder="Escribe y pulsa Enter"
            className={claseCampo}
          />
          <button
            type="button"
            onClick={() => agregar(nuevo)}
            disabled={!nuevo.trim()}
            className="shrink-0 rounded-lg border border-brand-light px-4 py-2 text-sm font-semibold text-brand-dark hover:bg-brand-light/40 disabled:opacity-40"
          >
            Agregar
          </button>
        </div>
      )}
      {pendientes.length > 0 && valores.length < maximo && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-brand-dark/50">Sugerencias:</span>
          {pendientes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => agregar(s)}
              className="rounded-full border border-dashed border-brand-light px-3 py-1 text-xs text-brand-dark/70 hover:bg-brand-light/40"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
      <p className="mt-1 text-xs text-brand-dark/40">
        {valores.length} de {maximo}
      </p>
    </div>
  );
}

/**
 * Lo que la cooperativa cuenta de sí misma en la página pública "Cooperativas"
 * (26-sep-2026). Los buses, las ciudades y las rutas no se escriben aquí: se
 * muestran solos a partir de su flota y sus rutas.
 */
export function PerfilPublicoCoop({ onExito, onError }: { onExito: (m: string) => void; onError: (m: string) => void }) {
  const [descripcion, setDescripcion] = useState("");
  const [servicios, setServicios] = useState<string[]>([]);
  const [beneficios, setBeneficios] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const token = obtenerToken();
    if (!token) return;
    obtenerPerfilPublicoCoop(token)
      .then((p) => {
        setDescripcion(p.descripcion);
        setServicios(p.servicios);
        setBeneficios(p.beneficios);
      })
      .catch((e) => onError(e instanceof Error ? e.message : "No se pudo cargar el perfil público."))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const token = obtenerToken();
    if (!token) return;
    setGuardando(true);
    try {
      const guardado = await guardarPerfilPublicoCoop(token, { descripcion, servicios, beneficios });
      setDescripcion(guardado.descripcion);
      setServicios(guardado.servicios);
      setBeneficios(guardado.beneficios);
      onExito("Perfil público actualizado — ya se ve en la página Cooperativas.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo guardar el perfil público.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
      <h2 className="font-display text-lg font-bold text-brand-dark">Perfil público de la cooperativa</h2>
      <p className="mt-1 max-w-2xl text-sm text-brand-dark/70">
        Lo que verán los pasajeros en la página <strong>Cooperativas</strong> de Klumbus. Tus buses, las ciudades a las
        que llegas y tus rutas aparecen solos.
      </p>

      {cargando ? (
        <p className="mt-4 text-sm text-brand-dark/50">Cargando...</p>
      ) : (
        <form onSubmit={guardar} className="mt-4 space-y-5">
          <div>
            <label htmlFor="pp-descripcion" className={claseEtiqueta}>
              Quiénes son
            </label>
            <textarea
              id="pp-descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              maxLength={600}
              rows={4}
              placeholder="Cuenta en pocas líneas quién es tu cooperativa, desde cuándo opera y qué te distingue."
              className={claseCampo}
            />
            <p className="mt-1 text-xs text-brand-dark/40">{descripcion.length} de 600</p>
          </div>
          <ListaEditable
            id="pp-servicios"
            etiqueta="Servicios que prestan"
            ayuda="Por ejemplo: encomiendas, alquiler de buses, atención 24 horas."
            valores={servicios}
            sugerencias={SUGERENCIAS_SERVICIOS}
            maximo={10}
            largoMaximo={80}
            onCambio={setServicios}
          />
          <ListaEditable
            id="pp-beneficios"
            etiqueta="Beneficios para el pasajero"
            ayuda="Lo que el pasajero gana viajando contigo: comodidad, descuentos, políticas."
            valores={beneficios}
            sugerencias={SUGERENCIAS_BENEFICIOS}
            maximo={10}
            largoMaximo={120}
            onCambio={setBeneficios}
          />
          <button
            type="submit"
            disabled={guardando}
            className="rounded-lg bg-brand-amber px-5 py-2.5 text-sm font-semibold text-brand-dark transition hover:brightness-95 disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Guardar perfil público"}
          </button>
        </form>
      )}
    </section>
  );
}
