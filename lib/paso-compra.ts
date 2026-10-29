"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Paso "4 Boleto" de la barra de compra (rediseño, 29-oct-2026). La confirmación vive en la misma
 * dirección que el pago (/viajes/:id/checkout), así que el encabezado no puede saberlo por la URL:
 * la pantalla de pago avisa aquí cuando ya muestra los boletos emitidos. Solo cambia qué paso se
 * resalta; no toca la compra.
 */
let boletoEmitido = false;
const oyentes = new Set<() => void>();

function avisar(valor: boolean) {
  if (boletoEmitido === valor) return;
  boletoEmitido = valor;
  oyentes.forEach((o) => o());
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

/** Lo usa el encabezado: ¿la pantalla actual ya muestra el boleto emitido? */
export function useBoletoEmitido(): boolean {
  return useSyncExternalStore(suscribir, () => boletoEmitido, () => false);
}

/** Lo usa la pantalla de confirmación mientras está a la vista. */
export function useMarcarBoletoEmitido(activo: boolean) {
  useEffect(() => {
    if (!activo) return;
    avisar(true);
    return () => avisar(false);
  }, [activo]);
}
