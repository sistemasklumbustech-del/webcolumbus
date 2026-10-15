"use client";

import { useEffect, useState } from "react";
import {
  obtenerConfiguracionFiscal,
  actualizarConfiguracionFiscal,
  obtenerConfiguracionVip,
  actualizarConfiguracionVip,
  obtenerPoliticaCancelacionReprogramacion,
  actualizarPoliticaCancelacionReprogramacion,
  obtenerEstadoDatosCoop,
  confirmarDatosCoop,
  type ConfiguracionFiscal,
  type ConfiguracionVip,
  type PoliticaCancelacionReprogramacion,
  type EstadoDatosCooperativa,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";
import { Toast } from "@/components/Toast";
import { MetodosPago } from "./MetodosPago";
import { CuentaCobroCoop } from "./CuentaCobro";
import { PerfilPublicoCoop } from "./PerfilPublico";

/**
 * Configuración de la cooperativa (29-jul-2026) — antes no existía
 * ninguna pantalla para esto, ni siquiera para lo fiscal que ya tenía
 * backend desde el 21-jul. Se construye ahora junto con la política de
 * cancelación/reprogramación (hallazgo real: Transportes Occidental,
 * Machala, no permite cambios ni devoluciones).
 */
export default function ConfiguracionPage() {
  const [fiscal, setFiscal] = useState<ConfiguracionFiscal | null>(null);
  const [politica, setPolitica] = useState<PoliticaCancelacionReprogramacion | null>(null);
  const [vip, setVip] = useState<ConfiguracionVip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [guardandoFiscal, setGuardandoFiscal] = useState(false);
  const [guardandoPolitica, setGuardandoPolitica] = useState(false);
  const [guardandoVip, setGuardandoVip] = useState(false);

  // Ítem 10, Fase 2 (04-ago-2026) -- actualización periódica
  // obligatoria de datos legales.
  const [estadoDatos, setEstadoDatos] = useState<EstadoDatosCooperativa | null>(null);
  const [razonSocial, setRazonSocial] = useState("");
  const [ruc, setRuc] = useState("");
  const [direccionLegal, setDireccionLegal] = useState("");
  const [contactoNombre, setContactoNombre] = useState("");
  const [contactoCorreo, setContactoCorreo] = useState("");
  const [contactoTelefono, setContactoTelefono] = useState("");
  const [guardandoDatos, setGuardandoDatos] = useState(false);

  useEffect(() => {
    const token = obtenerToken();
    if (!token) return;
    obtenerConfiguracionFiscal(token)
      .then(setFiscal)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar."));
    obtenerConfiguracionVip(token)
      .then(setVip)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar."));
    obtenerPoliticaCancelacionReprogramacion(token)
      .then(setPolitica)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar."));
    obtenerEstadoDatosCoop(token)
      .then((res) => {
        setEstadoDatos(res);
        setRazonSocial(res.datosActuales.razonSocial);
        setRuc(res.datosActuales.ruc);
        setDireccionLegal(res.datosActuales.direccionLegal ?? "");
        setContactoNombre(res.datosActuales.contactoNombre ?? "");
        setContactoCorreo(res.datosActuales.contactoCorreo ?? "");
        setContactoTelefono(res.datosActuales.contactoTelefono ?? "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar."));
  }, []);

  async function guardarFiscal(e: React.FormEvent) {
    e.preventDefault();
    const token = obtenerToken();
    if (!token || !fiscal) return;
    setGuardandoFiscal(true);
    setError(null);
    try {
      await actualizarConfiguracionFiscal(token, fiscal);
      setMensajeExito("Configuración fiscal actualizada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardandoFiscal(false);
    }
  }

  /** Correccion real 18-ago-2026: el recargo VIP ahora es una politica fija de la cooperativa. */
  async function guardarVip(e: React.FormEvent) {
    e.preventDefault();
    const token = obtenerToken();
    if (!token || !vip) return;
    setGuardandoVip(true);
    setError(null);
    try {
      await actualizarConfiguracionVip(token, vip);
      setMensajeExito("Recargo VIP actualizado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardandoVip(false);
    }
  }

  /**
   * Ítem 10 (04-ago-2026) -- revisar y dejar igual también es una
   * confirmación válida, no hace falta cambiar nada para "aprobar".
   */
  async function confirmarDatos(e: React.FormEvent) {
    e.preventDefault();
    const token = obtenerToken();
    if (!token) return;
    setGuardandoDatos(true);
    setError(null);
    try {
      await confirmarDatosCoop(token, {
        razonSocial,
        ruc,
        direccionLegal,
        contactoNombre,
        contactoCorreo,
        contactoTelefono,
      });
      setEstadoDatos({ estado: "al_dia", datosActuales: { razonSocial, ruc, direccionLegal, contactoNombre, contactoCorreo, contactoTelefono } });
      setMensajeExito("Datos confirmados. Podrás confirmarlos de nuevo en 6 meses.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo confirmar.");
    } finally {
      setGuardandoDatos(false);
    }
  }

  async function guardarPolitica(e: React.FormEvent) {
    e.preventDefault();
    const token = obtenerToken();
    if (!token || !politica) return;
    setGuardandoPolitica(true);
    setError(null);
    try {
      await actualizarPoliticaCancelacionReprogramacion(token, politica);
      setMensajeExito("Política de cancelación/reprogramación actualizada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardandoPolitica(false);
    }
  }

  if (!fiscal || !politica || !vip) {
    return (
      <main className="mx-auto max-w-2xl flex-1 px-4 py-10">
        {error ? (
          <div className="kb-alert kb-alert--error">
            {error}
          </div>
        ) : (
          <p className="text-sm text-muted-2">Cargando...</p>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-10">
      <Toast mensaje={mensajeExito} onCerrar={() => setMensajeExito(null)} />

      <h1 className="text-2xl font-bold text-brand-dark">Configuración</h1>
      <p className="mt-1 text-sm text-muted-2">
        Ajustes propios de tu cooperativa — cada empresa afiliada configura los suyos.
      </p>

      <PerfilPublicoCoop onExito={setMensajeExito} onError={setError} />

      <CuentaCobroCoop onExito={setMensajeExito} onError={setError} />

      <MetodosPago onExito={setMensajeExito} onError={setError} />

      {/* Ítem 10, Fase 2 (04-ago-2026) -- actualización periódica obligatoria de datos legales */}
      {estadoDatos && (
        <form
          onSubmit={confirmarDatos}
          className="mt-6 space-y-4 kb-card kb-on-white p-6"
        >
          <div>
            <h2 className="text-base font-bold text-brand-dark">Datos legales</h2>
            <p className="mt-1 text-xs text-muted-2">
              Revisa que estén correctos y confirma, aunque no cambies nada — se te pide cada 6
              meses.
            </p>
          </div>

          {estadoDatos.estado === "bloqueado" && (
            <p className="kb-alert kb-alert--error !px-3 !py-2 !text-xs">
              Llevan {estadoDatos.mesesSinConfirmar} meses sin confirmarse — crear horarios
              recurrentes y la carga masiva están bloqueados hasta que confirmes.
            </p>
          )}
          {estadoDatos.estado === "advertencia" && (
            <p className="kb-alert kb-alert--info !px-3 !py-2 !text-xs">
              Llevan {estadoDatos.mesesSinConfirmar} meses sin confirmarse.
            </p>
          )}
          {estadoDatos.estado === "al_dia" && (
            <p className="kb-alert kb-alert--ok !px-3 !py-2 !text-xs">
              Al día.
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="config-razon-social" className="kb-label">
                Razón social
              </label>
              <input
                id="config-razon-social"
                type="text"
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
                className="w-full kb-input"
              />
            </div>
            <div>
              <label htmlFor="config-ruc" className="kb-label">
                RUC
              </label>
              <input
                id="config-ruc"
                type="text"
                value={ruc}
                onChange={(e) => setRuc(e.target.value)}
                className="w-full kb-input"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="config-direccion-legal" className="kb-label">
                Dirección legal
              </label>
              <input
                id="config-direccion-legal"
                type="text"
                value={direccionLegal}
                onChange={(e) => setDireccionLegal(e.target.value)}
                className="w-full kb-input"
              />
            </div>
            <div>
              <label htmlFor="config-contacto-nombre" className="kb-label">
                Nombre de contacto
              </label>
              <input
                id="config-contacto-nombre"
                type="text"
                value={contactoNombre}
                onChange={(e) => setContactoNombre(e.target.value)}
                className="w-full kb-input"
              />
            </div>
            <div>
              <label htmlFor="config-contacto-correo" className="kb-label">
                Correo de contacto
              </label>
              <input
                id="config-contacto-correo"
                type="email"
                value={contactoCorreo}
                onChange={(e) => setContactoCorreo(e.target.value)}
                className="w-full kb-input"
              />
            </div>
            <div>
              <label htmlFor="config-contacto-telefono" className="kb-label">
                Teléfono de contacto
              </label>
              <input
                id="config-contacto-telefono"
                type="text"
                value={contactoTelefono}
                onChange={(e) => setContactoTelefono(e.target.value)}
                className="w-full kb-input"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={guardandoDatos}
            className="kb-btn kb-btn--primary !h-11 !px-5 !text-sm"
          >
            {guardandoDatos ? "Confirmando..." : "Confirmar datos"}
          </button>
        </form>
      )}

      {/* Política de cancelación/reprogramación */}
      <form
        onSubmit={guardarPolitica}
        className="mt-6 space-y-5 kb-card kb-on-white p-6"
      >
        <div>
          <h2 className="text-base font-bold text-brand-dark">
            Cancelación y reprogramación
          </h2>
          <p className="mt-1 text-xs text-muted-2">
            Configúralas por separado — cancelar es una venta perdida para ti, reprogramar no,
            así que no tienen que ir juntas.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-ctrl bg-kbbg px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-brand-dark">Permitir cancelaciones</p>
            {!politica.permiteCancelacion && (
              <p className="text-xs text-[#7A5D00]">
                Si no viaja, el pasajero pierde el boleto completo.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() =>
              setPolitica((p) => (p ? { ...p, permiteCancelacion: !p.permiteCancelacion } : p))
            }
            className={`relative h-6 w-11 rounded-full transition ${
              politica.permiteCancelacion ? "bg-ink" : "bg-line-2"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full transition ${
                politica.permiteCancelacion ? "left-5 bg-kbyellow" : "left-0.5 bg-white"
              }`}
            />
          </button>
        </div>
        {politica.permiteCancelacion && (
          <div>
            <label htmlFor="config-horas-cancelacion" className="kb-label">
              Horas mínimas antes de la salida para poder cancelar
            </label>
            <input
              id="config-horas-cancelacion"
              type="number"
              min={0}
              max={720}
              value={politica.horasLimiteCancelacion ?? ""}
              placeholder="2 (valor de reserva si lo dejas vacío)"
              onChange={(e) =>
                setPolitica((p) =>
                  p
                    ? {
                        ...p,
                        horasLimiteCancelacion: e.target.value ? Number(e.target.value) : null,
                      }
                    : p,
                )
              }
              className="w-full kb-input"
            />
          </div>
        )}

        <div className="flex items-center justify-between rounded-ctrl bg-kbbg px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-brand-dark">Permitir reprogramaciones</p>
            {!politica.permiteReprogramacion && (
              <p className="text-xs text-[#7A5D00]">
                El pasajero no podrá cambiar de fecha, ni con crédito ni pagando la diferencia.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() =>
              setPolitica((p) =>
                p ? { ...p, permiteReprogramacion: !p.permiteReprogramacion } : p,
              )
            }
            className={`relative h-6 w-11 rounded-full transition ${
              politica.permiteReprogramacion ? "bg-ink" : "bg-line-2"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full transition ${
                politica.permiteReprogramacion ? "left-5 bg-kbyellow" : "left-0.5 bg-white"
              }`}
            />
          </button>
        </div>
        {politica.permiteReprogramacion && (
          <div>
            <label htmlFor="config-horas-reprogramacion" className="kb-label">
              Horas mínimas antes de la salida para poder reprogramar
            </label>
            <input
              id="config-horas-reprogramacion"
              type="number"
              min={0}
              max={720}
              value={politica.horasLimiteReprogramacion ?? ""}
              placeholder="2 (valor de reserva si lo dejas vacío)"
              onChange={(e) =>
                setPolitica((p) =>
                  p
                    ? {
                        ...p,
                        horasLimiteReprogramacion: e.target.value ? Number(e.target.value) : null,
                      }
                    : p,
                )
              }
              className="w-full kb-input"
            />
          </div>
        )}

        {!politica.permiteCancelacion || !politica.permiteReprogramacion ? (
          <p className="kb-alert kb-alert--info !px-3 !py-2 !text-xs">
            El pasajero verá una alerta clara sobre esto antes de pagar, en la pantalla de elegir
            asiento y en la confirmación de compra.
          </p>
        ) : null}

        {error && <p className="text-sm font-medium text-kberror">{error}</p>}
        <button
          type="submit"
          disabled={guardandoPolitica}
          className="kb-btn kb-btn--primary !h-11 !px-5 !text-sm"
        >
          {guardandoPolitica ? "Guardando..." : "Guardar política"}
        </button>
      </form>

      {/* Configuración fiscal (IVA) */}
      <form
        onSubmit={guardarFiscal}
        className="mt-6 space-y-4 kb-card kb-on-white p-6"
      >
        <h2 className="text-base font-bold text-brand-dark">IVA</h2>
        <div>
          <label htmlFor="config-iva-porcentaje" className="kb-label">
            Porcentaje de IVA
          </label>
          <input
            id="config-iva-porcentaje"
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={fiscal.ivaPorcentaje}
            onChange={(e) => setFiscal((f) => (f ? { ...f, ivaPorcentaje: Number(e.target.value) } : f))}
            className="w-full kb-input"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-brand-dark">
          <input
            type="checkbox"
            checked={fiscal.ivaVisibleEnBoleto}
            onChange={(e) => setFiscal((f) => (f ? { ...f, ivaVisibleEnBoleto: e.target.checked } : f))}
          />
          Mostrar el desglose de IVA en el boleto
        </label>
        <label className="flex items-center gap-2 text-sm text-brand-dark">
          <input
            type="checkbox"
            checked={fiscal.ivaSigueTasaNacional}
            onChange={(e) =>
              setFiscal((f) => (f ? { ...f, ivaSigueTasaNacional: e.target.checked } : f))
            }
          />
          Seguir automáticamente la tasa nacional de IVA
        </label>
        <button
          type="submit"
          disabled={guardandoFiscal}
          className="kb-btn kb-btn--primary !h-11 !px-5 !text-sm"
        >
          {guardandoFiscal ? "Guardando..." : "Guardar IVA"}
        </button>
      </form>

      {/* Recargo VIP -- correccion real 18-ago-2026, antes se pedia en cada viaje */}
      <form
        onSubmit={guardarVip}
        className="mt-6 space-y-4 kb-card kb-on-white p-6"
      >
        <h2 className="text-base font-bold text-brand-dark">Recargo VIP</h2>
        <p className="text-sm text-muted-2">
          Se cobra sobre los asientos marcados como VIP en tus unidades. Este valor se pre-llena
          automáticamente al crear un viaje nuevo -- puedes ajustarlo puntualmente por viaje si hace falta.
        </p>
        <div>
          <label htmlFor="config-vip-recargo" className="kb-label">
            Recargo VIP por defecto (USD)
          </label>
          <input
            id="config-vip-recargo"
            type="number"
            min={0}
            step="0.01"
            value={vip.recargoVipDefault}
            onChange={(e) => setVip((v) => (v ? { ...v, recargoVipDefault: Number(e.target.value) } : v))}
            className="w-full kb-input"
          />
        </div>
        <button
          type="submit"
          disabled={guardandoVip}
          className="kb-btn kb-btn--primary !h-11 !px-5 !text-sm"
        >
          {guardandoVip ? "Guardando..." : "Guardar recargo VIP"}
        </button>
      </form>
    </main>
  );
}
