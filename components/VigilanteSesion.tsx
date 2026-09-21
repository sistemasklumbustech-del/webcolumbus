"use client";

import { useEffect } from "react";
import { API_URL } from "@/lib/api";
import { borrarToken, obtenerToken } from "@/lib/auth";

/**
 * Rutas de /auth donde un 401 significa "credenciales o código
 * incorrectos", no "sesión vencida" -- no deben sacar a nadie del panel.
 */
const RUTAS_AUTH_SIN_VIGILANCIA =
  /^\/auth\/(login|registro|2fa|refresh|solicitar-reset|restablecer-password|verificar-correo|confirmar-cambio-correo)/;

/**
 * Hallazgo real, 21-sep-2026: cuando el token vencía con una pantalla
 * del panel abierta, cada acción fallaba con "Unauthorized" y el
 * usuario no sabía qué hacer -- la sesión solo se revisaba al cambiar
 * de página. Este componente envuelve fetch mientras el panel está
 * montado: ante un 401 de la API con un token guardado, borra la
 * sesión y lleva a "Iniciar sesión", volviendo después a la misma
 * pantalla.
 */
export function VigilanteSesion() {
  useEffect(() => {
    const fetchOriginal = window.fetch;

    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const respuesta = await fetchOriginal(...args);
      if (respuesta.status !== 401) return respuesta;

      const entrada = args[0];
      const url =
        typeof entrada === "string" ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
      if (!url.startsWith(API_URL) || !obtenerToken()) return respuesta;

      const ruta = url.slice(API_URL.length);
      if (RUTAS_AUTH_SIN_VIGILANCIA.test(ruta)) return respuesta;

      borrarToken();
      const volverA = encodeURIComponent(window.location.pathname);
      window.location.assign(`/ingresar?volverA=${volverA}&sesion=vencida`);
      return respuesta;
    };

    return () => {
      window.fetch = fetchOriginal;
    };
  }, []);

  return null;
}
