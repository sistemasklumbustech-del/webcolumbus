"use client";

import { useEffect, useState } from "react";
import { obtenerReciboCompra, type BoletoDeRecibo, type EstadoTasaBoleto } from "@/lib/api";
import { tokenValido } from "@/lib/auth";
import { CodigoQr } from "./CodigoQr";

/**
 * Código de acceso al andén (07-oct-2026): la tasa del terminal (SIAT 3000). Su QR es el que lee
 * el torniquete del terminal, distinto del QR del boleto, que valida la cooperativa al abordar.
 * El código llega después del pago, cuando la cooperativa registra el pasaje en el terminal.
 */
export function AccesoAnden({ estado, codigo }: { estado: EstadoTasaBoleto; codigo: string | null }) {
  if (estado === "no_aplica") return null;

  if (estado === "lista" && codigo) {
    return (
      <div className="mt-4 rounded-xl bg-brand-light/30 p-4 text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-dark/70">Acceso al andén</p>
        <p className="mt-0.5 text-xs text-brand-dark/60">Preséntalo en el torniquete del terminal.</p>
        <div className="mt-2">
          <CodigoQr valor={codigo} />
        </div>
        <p className="mt-1 font-mono text-xs tracking-wider text-brand-dark/60">{codigo}</p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-left text-xs text-amber-900 ring-1 ring-amber-200">
      <p className="font-bold">Acceso al andén</p>
      {estado === "en_revision" ? (
        <p className="mt-0.5">
          Tu código de acceso al andén está en revisión. Si no llega antes de tu salida, escríbenos a soporte.
        </p>
      ) : (
        <p className="mt-0.5">
          Estamos generando tu código de acceso al andén. Te lo enviamos por correo apenas esté listo; también
          aparece aquí y en Mis boletos.
        </p>
      )}
    </div>
  );
}

/**
 * Consulta el estado del código de andén de cada boleto de una compra y sigue preguntando cada
 * 10 segundos mientras alguno esté en proceso (máximo unos 5 minutos: pasado ese tiempo, el
 * pasajero lo ve en Mis boletos o en su correo). Devuelve un mapa por id de boleto.
 */
export function useCodigosAnden(compraId: string | null): Record<string, BoletoDeRecibo> {
  const [boletos, setBoletos] = useState<Record<string, BoletoDeRecibo>>({});

  useEffect(() => {
    if (!compraId) return;
    let cancelado = false;
    let intentos = 0;
    let temporizador: ReturnType<typeof setTimeout> | undefined;

    async function consultar() {
      const token = tokenValido();
      if (!token || cancelado) return;
      intentos += 1;
      let sigue = false;
      try {
        const recibo = await obtenerReciboCompra(token, compraId as string);
        if (cancelado) return;
        setBoletos(Object.fromEntries(recibo.boletos.map((b) => [b.boletoId, b])));
        sigue = recibo.boletos.some((b) => b.estadoTasa === "en_proceso");
      } catch {
        // Sin el recibo, el pasajero igual tiene su boleto: el código se verá en Mis boletos.
        return;
      }
      if (sigue && intentos < 30) temporizador = setTimeout(consultar, 10_000);
    }

    void consultar();
    return () => {
      cancelado = true;
      if (temporizador) clearTimeout(temporizador);
    };
  }, [compraId]);

  return boletos;
}
