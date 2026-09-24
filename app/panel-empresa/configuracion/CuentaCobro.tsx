"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  listarCuentasCobroCoop,
  registrarCuentaCobro,
  type CuentaCobro,
  type DatosCuentaCobro,
  type EntidadFinanciera,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";
import { ENTIDADES_FINANCIERAS, ETIQUETA_ENTIDAD } from "@/lib/entidades-financieras";

const claseCampo =
  "w-full rounded-lg border border-brand-light bg-white px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium";
const claseEtiqueta = "mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70";

const VACIO: DatosCuentaCobro = {
  entidadFinanciera: "banco_pichincha",
  tipoCuenta: "ahorros",
  numeroCuenta: "",
  titularNombre: "",
  titularTipoIdentificacion: "ruc",
  titularIdentificacion: "",
  correoNotificacion: "",
};

const enmascarar = (n: string) => (n.length > 4 ? "•••• " + n.slice(-4) : n);

/**
 * Cuenta donde la cooperativa recibe el dinero de los boletos que se pagan
 * en línea. La plataforma cobra al pasajero y luego le liquida a esta
 * cuenta; el admin de la plataforma la verifica antes de usarla.
 */
export function CuentaCobroCoop({ onExito, onError }: { onExito: (m: string) => void; onError: (m: string) => void }) {
  const [cuentas, setCuentas] = useState<CuentaCobro[] | null>(null);
  const [form, setForm] = useState<DatosCuentaCobro>(VACIO);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(() => {
    const token = obtenerToken();
    if (!token) return;
    listarCuentasCobroCoop(token)
      .then(setCuentas)
      .catch((e) => onError(e instanceof Error ? e.message : "No se pudo cargar la cuenta de cobro."));
  }, [onError]);

  useEffect(cargar, [cargar]);

  const vigente = cuentas?.find((c) => c.estado === "verificada") ?? null;
  const pendiente = cuentas?.find((c) => c.estado === "pendiente_verificacion") ?? null;
  const rechazada = !pendiente ? (cuentas?.find((c) => c.estado === "rechazada") ?? null) : null;
  const mostrarForm = editando || (cuentas !== null && !vigente && !pendiente);

  function cambiar<K extends keyof DatosCuentaCobro>(clave: K, valor: DatosCuentaCobro[K]) {
    setForm((f) => ({ ...f, [clave]: valor }));
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const token = obtenerToken();
    if (!token) return;
    setGuardando(true);
    try {
      await registrarCuentaCobro(token, form);
      onExito("Cuenta enviada — la plataforma la revisará antes de usarla para tus liquidaciones.");
      setForm(VACIO);
      setEditando(false);
      cargar();
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo guardar la cuenta.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
      <h2 className="font-display text-lg font-bold text-brand-dark">Cuenta para recibir tus pagos</h2>
      <p className="mt-1 max-w-2xl text-sm text-brand-dark/70">
        Los pasajeros pagan en línea (tarjeta o DeUna) y la plataforma te liquida el dinero de tus boletos a esta cuenta
        bancaria. Debe estar a nombre de la cooperativa (o de su representante legal).
      </p>

      {cuentas === null ? (
        <p className="mt-4 text-sm text-brand-dark/60">Cargando...</p>
      ) : (
        <div className="mt-4 space-y-3">
          {vigente && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <p className="font-semibold">Cuenta verificada</p>
              <p className="mt-1">
                {ETIQUETA_ENTIDAD[vigente.entidadFinanciera]} · {vigente.tipoCuenta} · {enmascarar(vigente.numeroCuenta)}
              </p>
              <p>{vigente.titularNombre}</p>
            </div>
          )}
          {pendiente && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">En revisión</p>
              <p className="mt-1">
                {ETIQUETA_ENTIDAD[pendiente.entidadFinanciera]} · {pendiente.tipoCuenta} · {enmascarar(pendiente.numeroCuenta)}
                {" — "}
                {vigente ? "mientras se revisa, seguimos liquidando a la cuenta verificada." : "todavía no se te puede liquidar."}
              </p>
            </div>
          )}
          {rechazada && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              <p className="font-semibold">La última cuenta enviada fue rechazada</p>
              <p className="mt-1">{rechazada.motivoRechazo}</p>
            </div>
          )}

          {!mostrarForm && (
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="rounded-lg border border-brand-light px-4 py-2 text-sm font-semibold text-brand-dark transition hover:bg-brand-light/40"
            >
              {vigente || pendiente ? "Cambiar de cuenta" : "Agregar cuenta"}
            </button>
          )}

          {mostrarForm && (
            <form onSubmit={enviar} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="cc-entidad" className={claseEtiqueta}>
                  Banco o cooperativa
                </label>
                <select
                  id="cc-entidad"
                  value={form.entidadFinanciera}
                  onChange={(e) => cambiar("entidadFinanciera", e.target.value as EntidadFinanciera)}
                  className={claseCampo}
                >
                  {ENTIDADES_FINANCIERAS.map((e) => (
                    <option key={e.valor} value={e.valor}>
                      {e.etiqueta}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="cc-tipo" className={claseEtiqueta}>
                  Tipo de cuenta
                </label>
                <select
                  id="cc-tipo"
                  value={form.tipoCuenta}
                  onChange={(e) => cambiar("tipoCuenta", e.target.value as "ahorros" | "corriente")}
                  className={claseCampo}
                >
                  <option value="ahorros">Ahorros</option>
                  <option value="corriente">Corriente</option>
                </select>
              </div>
              <div>
                <label htmlFor="cc-numero" className={claseEtiqueta}>
                  Número de cuenta
                </label>
                <input
                  id="cc-numero"
                  required
                  inputMode="numeric"
                  value={form.numeroCuenta}
                  onChange={(e) => cambiar("numeroCuenta", e.target.value)}
                  className={claseCampo}
                />
              </div>
              <div>
                <label htmlFor="cc-titular" className={claseEtiqueta}>
                  Titular de la cuenta
                </label>
                <input
                  id="cc-titular"
                  required
                  maxLength={150}
                  value={form.titularNombre}
                  onChange={(e) => cambiar("titularNombre", e.target.value)}
                  className={claseCampo}
                />
              </div>
              <div>
                <label htmlFor="cc-tipoid" className={claseEtiqueta}>
                  Identificación del titular
                </label>
                <select
                  id="cc-tipoid"
                  value={form.titularTipoIdentificacion}
                  onChange={(e) => cambiar("titularTipoIdentificacion", e.target.value as "cedula" | "ruc")}
                  className={claseCampo}
                >
                  <option value="ruc">RUC (13 dígitos)</option>
                  <option value="cedula">Cédula (10 dígitos)</option>
                </select>
              </div>
              <div>
                <label htmlFor="cc-id" className={claseEtiqueta}>
                  Número de {form.titularTipoIdentificacion === "ruc" ? "RUC" : "cédula"}
                </label>
                <input
                  id="cc-id"
                  required
                  inputMode="numeric"
                  maxLength={13}
                  value={form.titularIdentificacion}
                  onChange={(e) => cambiar("titularIdentificacion", e.target.value)}
                  className={claseCampo}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="cc-correo" className={claseEtiqueta}>
                  Correo para avisos de pago
                </label>
                <input
                  id="cc-correo"
                  type="email"
                  required
                  value={form.correoNotificacion}
                  onChange={(e) => cambiar("correoNotificacion", e.target.value)}
                  className={claseCampo}
                />
              </div>
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <button
                  type="submit"
                  disabled={guardando}
                  className="rounded-lg bg-brand-amber px-5 py-2 text-sm font-semibold text-brand-dark transition hover:brightness-95 disabled:opacity-50"
                >
                  {guardando ? "Enviando..." : "Enviar para verificación"}
                </button>
                {editando && (
                  <button
                    type="button"
                    onClick={() => setEditando(false)}
                    className="rounded-lg border border-brand-light px-4 py-2 text-sm font-semibold text-brand-dark/70 hover:bg-brand-light/40"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
