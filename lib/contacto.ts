/**
 * Teléfono de soporte con el prefijo de Ecuador: "0995632587" -> "+593 99 563 2587"
 * (y el enlace "tel:+593995632587"). Si el número ya trae prefijo o tiene otra forma, se deja igual.
 * Compartido por el pie y Ayuda (mismo formato en todo el sitio).
 */
export function formatearTelefono(telefono: string | null): { texto: string; enlace: string } | null {
  if (!telefono) return null;
  const digitos = telefono.replace(/\D/g, "");
  if (/^0\d{9}$/.test(digitos)) {
    const n = digitos.slice(1);
    return { texto: `+593 ${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5)}`, enlace: `+593${n}` };
  }
  if (/^593\d{9}$/.test(digitos)) {
    const n = digitos.slice(3);
    return { texto: `+593 ${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5)}`, enlace: `+593${n}` };
  }
  return { texto: telefono, enlace: telefono.replace(/\s/g, "") };
}

/**
 * WhatsApp de soporte de Klumbus (confirmado por Adrián, 30-oct-2026: +593 99 563 2587) con el
 * mensaje inicial aprobado.
 */
export const WHATSAPP_SOPORTE = "593995632587";
export function enlaceWhatsappSoporte(mensaje = "Hola Klumbus, necesito ayuda con…"): string {
  return `https://wa.me/${WHATSAPP_SOPORTE}?text=${encodeURIComponent(mensaje)}`;
}
