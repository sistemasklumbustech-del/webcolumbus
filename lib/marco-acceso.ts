/** Texto de la foto en las pantallas de cuenta (recuperar/restablecer contraseña, verificar o cambiar correo). */
export const MARCO_CUENTA = {
  titulo: "Tu cuenta,",
  destacado: "segura y a mano.",
  puntos: ["Boletos con QR", "Compra sin filas", "Todas las cooperativas"],
  pestana: null,
} as const;

/**
 * ¿El error de la API es "enlace vencido o no válido"? Así la pantalla muestra solo su propio texto
 * (con tildes) y no repite el mensaje de la API. Se compara sin tildes porque la API hoy los manda
 * sin ellas ("no es valido o ya expiro"). Si es otro error, se muestra el mensaje de la API tal cual.
 */
export function esEnlaceVencido(mensaje: string | null | undefined): boolean {
  if (!mensaje) return false;
  const texto = mensaje.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /no es valido|expir|vencid|enlace no valido|falta el codigo/.test(texto);
}
