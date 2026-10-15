"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listarCuentasCobroAdmin,
  verificarCuentaCobro,
  rechazarCuentaCobro,
  type EstadoCuentaCobro,
  type ResultadoCuentasCobro,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";
import { ETIQUETA_ENTIDAD } from "@/lib/entidades-financieras";
import { Toast } from "@/components/Toast";

const LIMITE_PAGINA = 10;

const claseCampo =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium";

const ESTADOS: Array<{ valor: EstadoCuentaCobro | ""; etiqueta: string }> = [
  { valor: "pendiente_verificacion", etiqueta: "Por verificar" },
  { valor: "verificada", etiqueta: "Verificadas" },
  { valor: "rechazada", etiqueta: "Rechazadas" },
  { valor: "", etiqueta: "Todas" },
];

const BADGE: Record<string, string> = {
  pendiente_verificacion: "kb-status--wait",
  verificada: "kb-status--ok",
  rechazada: "kb-status--error",
};
const NOMBRE_ESTADO: Record<string, string> = {
  pendiente_verificacion: "Por verificar",
  verificada: "Verificada",
  rechazada: "Rechazada",
};

/** Revisión de las cuentas bancarias donde las cooperativas reciben sus liquidaciones. */
export default function CuentasCobroAdminPage() {
  const [estado, setEstado] = useState<EstadoCuentaCobro | "">("pendiente_verificacion");
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [resultado, setResultado] = useState<ResultadoCuentasCobro | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [rechazando, setRechazando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [trabajando, setTrabajando] = useState(false);

  // Se aplica al cambiar cualquier filtro, sin recargar la página; la pequeña espera evita una consulta por letra.
  const [version, setVersion] = useState(0);
  const cargar = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    const token = obtenerToken();
    if (!token) return;
    let vigente = true;
    setCargando(true);
    const espera = setTimeout(() => {
      listarCuentasCobroAdmin(token, {
        estado: estado || undefined,
        busqueda: busqueda.trim() || undefined,
        pagina,
        limite: LIMITE_PAGINA,
      })
        .then((r) => {
          if (vigente) setResultado(r);
        })
        .catch((e) => {
          if (vigente) setError(e instanceof Error ? e.message : "No se pudieron cargar las cuentas.");
        })
        .finally(() => {
          if (vigente) setCargando(false);
        });
    }, 250);
    return () => {
      vigente = false;
      clearTimeout(espera);
    };
  }, [estado, busqueda, pagina, version]);

  const cuentas = resultado?.filas ?? null;
  const totalPaginas = Math.max(1, Math.ceil((resultado?.total ?? 0) / LIMITE_PAGINA));

  async function accion(fn: (token: string) => Promise<unknown>, ok: string) {
    const token = obtenerToken();
    if (!token) return;
    setTrabajando(true);
    try {
      await fn(token);
      setExito(ok);
      setRechazando(null);
      setMotivo("");
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar la acción.");
    } finally {
      setTrabajando(false);
    }
  }

  return (
    <div className="space-y-6">
      <Toast mensaje={error} onCerrar={() => setError(null)} tipo="error" />
      <Toast mensaje={exito} onCerrar={() => setExito(null)} tipo="exito" />

      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Cuentas de cobro</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-2">
          Cuentas bancarias donde cada cooperativa recibe sus liquidaciones. Antes de verificar una, comprueba que el
          titular y su RUC o cédula correspondan a la cooperativa. Solo las verificadas reciben pagos.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-2xl">
        <div>
          <label htmlFor="cc-estado" className="kb-label">
            Estado
          </label>
          <select
            id="cc-estado"
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value as EstadoCuentaCobro | "");
              setPagina(1);
            }}
            className={claseCampo}
          >
            {ESTADOS.map((e) => (
              <option key={e.valor} value={e.valor}>
                {e.etiqueta}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="cc-buscar" className="kb-label">
            Buscar
          </label>
          <input
            id="cc-buscar"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
            placeholder="Cooperativa, titular, RUC o correo"
            className={claseCampo}
          />
        </div>
      </div>

      {cuentas === null ? (
        <p className="text-sm text-muted-2">Cargando...</p>
      ) : cuentas.length === 0 ? (
        <p className="kb-card kb-on-white p-6 text-sm text-muted-2">No hay cuentas con estos filtros.</p>
      ) : (
        <ul className="space-y-3">
          {cuentas.map((c) => (
            <li key={c.id} className="kb-card kb-on-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-brand-dark">{c.cooperativaNombre}</p>
                  <p className="text-xs text-muted-2">
                    Enviada el {new Date(c.creadoEn).toLocaleDateString("es-EC", { timeZone: "America/Guayaquil" })}
                  </p>
                </div>
                <span className={"kb-status " + (BADGE[c.estado] ?? "")}>
                  {NOMBRE_ESTADO[c.estado] ?? c.estado}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-2">Banco</dt>
                  <dd className="text-brand-dark">{ETIQUETA_ENTIDAD[c.entidadFinanciera] ?? c.entidadFinanciera}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-2">Cuenta</dt>
                  <dd className="break-all text-brand-dark">
                    {c.tipoCuenta} · {c.numeroCuenta}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-2">Titular</dt>
                  <dd className="text-brand-dark">{c.titularNombre}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-2">{c.titularTipoIdentificacion === "ruc" ? "RUC" : "Cédula"}</dt>
                  <dd className="text-brand-dark">{c.titularIdentificacion}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted-2">Correo de avisos</dt>
                  <dd className="break-all text-brand-dark">{c.correoNotificacion}</dd>
                </div>
              </dl>
              {c.estado === "rechazada" && c.motivoRechazo && (
                <p className="mt-3 text-sm text-kberror">Motivo: {c.motivoRechazo}</p>
              )}

              {c.estado === "pendiente_verificacion" && (
                <div className="mt-4">
                  {rechazando === c.id ? (
                    <div className="space-y-2">
                      <label htmlFor={"mot-" + c.id} className="kb-label">
                        Motivo del rechazo (lo verá la cooperativa)
                      </label>
                      <input
                        id={"mot-" + c.id}
                        value={motivo}
                        maxLength={300}
                        onChange={(e) => setMotivo(e.target.value)}
                        className={claseCampo}
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={trabajando || motivo.trim().length < 5}
                          onClick={() => accion((t) => rechazarCuentaCobro(t, c.id, motivo), "Cuenta rechazada.")}
                          className="kb-btn !h-9 !px-3 !text-xs bg-kberror text-white disabled:opacity-50"
                        >
                          Confirmar rechazo
                        </button>
                        <button
                          type="button"
                          onClick={() => setRechazando(null)}
                          className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={trabajando}
                        onClick={() => accion((t) => verificarCuentaCobro(t, c.id), "Cuenta verificada.")}
                        className="kb-btn kb-btn--primary !h-11 !px-5 !text-sm disabled:opacity-40"
                      >
                        Verificar cuenta
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRechazando(c.id);
                          setMotivo("");
                        }}
                        className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm text-kberror"
                      >
                        Rechazar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {resultado !== null && resultado.total > 0 && (
        <div className="flex items-center justify-between kb-card kb-on-white px-4 py-3 text-sm text-muted-2">
          <span>
            {resultado.total} cuenta{resultado.total === 1 ? "" : "s"} · Página {pagina} de {totalPaginas}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina <= 1 || cargando}
              className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina >= totalPaginas || cargando}
              className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
