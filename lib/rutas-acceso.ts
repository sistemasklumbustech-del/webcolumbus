/**
 * Pantallas de acceso y cuenta que van sin el menú ni el pie del sitio (solo logo y "Volver al
 * inicio"), con el mismo marco que Ingresar (rediseño, 30-oct-2026).
 */
export const RUTAS_ACCESO = [
  "/ingresar",
  "/registro",
  "/recuperar-password",
  "/restablecer-password",
  "/verificar-correo",
  "/confirmar-cambio-correo",
];

export function esRutaAcceso(pathname: string): boolean {
  return RUTAS_ACCESO.includes(pathname);
}
