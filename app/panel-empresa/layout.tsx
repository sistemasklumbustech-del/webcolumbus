"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { VigilanteSesion } from "@/components/VigilanteSesion";
import { LogoKlumbus } from "@/components/LogoKlumbus";
import { obtenerToken, borrarToken, decodificarToken, tokenExpirado, type PayloadToken } from "@/lib/auth";
import { obtenerEstadoDatosCoop, type EstadoDatosCooperativa } from "@/lib/api";

/* Rediseño real del panel de cooperativa (25-ago-2026), Fase 1 --
   orden explícita del director: mismo nivel de calidad visual que
   ya se aplicó a /admin (sección 5.63, TailAdmin SaaS), pero con un
   acento de color DISTINTO -- para que cada panel se distinga a
   simple vista, sin tener que leer texto.

   Admin usa cobalto (azul, infraestructura de toda la plataforma).
   Este panel usa ÁMBAR (#f5a800) -- el color real de la marca
   Columbus (el bus, el logo) -- decisión real aprobada por el
   director tras verificar que coincide exacto con el real, en vez
   de inventar un color nuevo sin aprobación. Estado activo del menú
   en ámbar SUAVE (`bg-brand-amber/15`), no sólido -- para no
   confundirse con los botones de acción reales (ej. "Buscar
   pasajes"), que sí son ámbar sólido en todo el sitio. */

const ENLACES = [
  { href: "/panel-empresa", etiqueta: "Panel", icono: IconoPanel },
  { href: "/panel-empresa/rutas", etiqueta: "Rutas", icono: IconoRutas },
  { href: "/panel-empresa/unidades", etiqueta: "Unidades", icono: IconoUnidades },
  { href: "/panel-empresa/personal", etiqueta: "Personal", icono: IconoPersonal, soloAdmin: true },
  { href: "/panel-empresa/viajes", etiqueta: "Viajes", icono: IconoViajes },
  { href: "/panel-empresa/vender", etiqueta: "Vender boleto", icono: IconoVender },
  { href: "/panel-empresa/ventas", etiqueta: "Ventas", icono: IconoVentas },
  { href: "/panel-empresa/validar-qr", etiqueta: "Validar boleto", icono: IconoValidar },
  { href: "/panel-empresa/pagos-pendientes", etiqueta: "Pagos pendientes", icono: IconoPagos, soloAdmin: true },
  { href: "/panel-empresa/solicitudes-factura", etiqueta: "Facturas", icono: IconoFacturas, soloAdmin: true },
  { href: "/panel-empresa/ventas-por-confirmar", etiqueta: "Ventas por confirmar", icono: IconoPorConfirmar, soloAdmin: true },
  { href: "/panel-empresa/reclamos", etiqueta: "Reclamos", icono: IconoReclamos, soloAdmin: true },
  { href: "/panel-empresa/configuracion", etiqueta: "Configuración", icono: IconoConfiguracion, soloAdmin: true },
  { href: "/panel-empresa/carga-masiva", etiqueta: "Carga masiva", icono: IconoCargaMasiva, soloAdmin: true },
  { href: "/panel-empresa/credenciales-api", etiqueta: "Credenciales API", icono: IconoCredenciales, soloAdmin: true },
];

function IconoPanel({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}
function IconoRutas({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.2 7.5C10 10 14 14 15.8 16.5" strokeDasharray="2.5 2.5" />
    </svg>
  );
}
function IconoUnidades({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="6" width="18" height="10" rx="2" />
      <path d="M3 11h18" />
      <circle cx="7.5" cy="18.5" r="1.5" />
      <circle cx="16.5" cy="18.5" r="1.5" />
    </svg>
  );
}
function IconoPersonal({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="7" r="3" />
      <path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6" />
      <path d="M16 5.5c1.7.4 3 2 3 3.9 0 1.7-1 3.1-2.5 3.7" />
      <path d="M18 14.5c2.4.6 4 2.7 4 5.5" />
    </svg>
  );
}
function IconoViajes({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </svg>
  );
}
function IconoVender({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h4" />
    </svg>
  );
}
function IconoVentas({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}
function IconoValidar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 15l2.5 2.5L21 13" />
    </svg>
  );
}
function IconoPagos({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}
function IconoFacturas({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2h9l3 3v17H6z" />
      <path d="M9 9h6M9 13h6M9 17h4" />
    </svg>
  );
}
function IconoPorConfirmar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function IconoCredenciales({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l9-9M16 7l3 3M14 9l2 2" />
    </svg>
  );
}
function IconoReclamos({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M12 8v3M12 14h.01" />
    </svg>
  );
}
function IconoConfiguracion({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function IconoCargaMasiva({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 15V3M8 7l4-4 4 4" />
      <path d="M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" />
    </svg>
  );
}

/**
 * Protección de acceso a nivel de interfaz — SOLO para experiencia de
 * usuario (evitar que alguien vea un panel vacío o roto por no tener
 * sesión). No es la barrera de seguridad real: esa vive en el backend
 * (JwtAuthGuard + RolesGuard en cada endpoint de /coop/*), que rechaza
 * la petición sin importar lo que haga esta pantalla.
 */
export default function PanelEmpresaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [payload, setPayload] = useState<PayloadToken | null>(null);
  const [verificando, setVerificando] = useState(true);
  const [estadoDatos, setEstadoDatos] = useState<EstadoDatosCooperativa | null>(null);
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  const [menuColapsado, setMenuColapsado] = useState(false);

  useEffect(() => {
    // Preferencia por navegador (conveniencia individual, no estado que
    // deba compartirse entre dispositivos) -- si no está disponible
    // (ventana privada, storage bloqueado), simplemente arranca expandido.
    try {
      setMenuColapsado(localStorage.getItem("panelEmpresaMenuColapsado") === "1");
    } catch {
      // sin storage disponible -- se queda expandido.
    }
  }, []);

  function alternarMenuColapsado() {
    setMenuColapsado((previo) => {
      const nuevo = !previo;
      try {
        localStorage.setItem("panelEmpresaMenuColapsado", nuevo ? "1" : "0");
      } catch {
        // sin storage disponible -- el cambio igual aplica en esta sesión.
      }
      return nuevo;
    });
  }

  useEffect(() => {
    const token = obtenerToken();
    if (!token) {
      router.replace(`/ingresar?volverA=${encodeURIComponent(pathname)}`);
      return;
    }
    const datos = decodificarToken(token);
    if (!datos || tokenExpirado(datos)) {
      borrarToken();
      router.replace(`/ingresar?volverA=${encodeURIComponent(pathname)}`);
      return;
    }
    if (datos.rol !== "admin_cooperativa" && datos.rol !== "vendedor") {
      router.replace("/");
      return;
    }
    setPayload(datos);
    setVerificando(false);

    if (datos.rol === "admin_cooperativa") {
      obtenerEstadoDatosCoop(token)
        .then(setEstadoDatos)
        .catch(() => {
          // silencioso a propósito -- un fallo al cargar el banner no
          // debe impedir que el resto del panel funcione.
        });
    }
  }, [router, pathname]);

  useEffect(() => {
    setMenuMovilAbierto(false);
  }, [pathname]);

  function salir() {
    borrarToken();
    router.replace("/ingresar");
  }

  if (verificando) {
    return (
      <div className="flex flex-1 items-center justify-center bg-kbbg">
        <p className="text-sm text-muted-2">Verificando sesión...</p>
      </div>
    );
  }

  const enlacesVisibles = ENLACES.filter((enlace) => !enlace.soloAdmin || payload?.rol === "admin_cooperativa");

  const IconoSalir = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );

  return (
    <div className={`kb-app flex-1 ${menuColapsado ? "lg:grid-cols-[76px_1fr]" : ""}`}>
      {/* Menú lateral negro (diseño final): opción activa en amarillo con texto negro. */}
      <aside className="kb-sidebar sticky top-0 h-screen overflow-y-auto !px-3">
        <div className={`mb-6 flex items-center ${menuColapsado ? "justify-center" : "px-2"}`}>
          {menuColapsado ? (
            // eslint-disable-next-line @next/next/no-img-element -- ícono SVG propio
            <img src="/img/klumbus-icono.svg" alt="Klumbus" className="h-8 w-auto" />
          ) : (
            <LogoKlumbus className="h-7" />
          )}
        </div>
        {!menuColapsado && <span className="kb-tag kb-tag--yellow mb-3 ml-2 self-start">Panel Empresa</span>}
        <nav className="flex flex-1 flex-col gap-1" aria-label="Menú del panel">
          {enlacesVisibles.map((enlace) => {
            const activo = pathname === enlace.href;
            const Icono = enlace.icono;
            return (
              <Link
                key={enlace.href}
                href={enlace.href}
                title={menuColapsado ? enlace.etiqueta : undefined}
                aria-current={activo ? "page" : undefined}
                className={`${activo ? "is-active" : ""} ${menuColapsado ? "justify-center !px-0" : ""}`}
              >
                <Icono className="h-5 w-5 shrink-0" />
                {!menuColapsado && enlace.etiqueta}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 flex flex-col gap-1 border-t border-ink-3 pt-4">
          <button
            onClick={alternarMenuColapsado}
            title={menuColapsado ? "Expandir menú" : "Ocultar menú"}
            className={`flex h-11 w-full items-center gap-3 rounded-xl text-sm font-medium text-ondark transition hover:bg-ink-2 hover:text-white ${
              menuColapsado ? "justify-center" : "px-3"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 transition-transform ${menuColapsado ? "rotate-180" : ""}`} aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
              <path d="M9 18V6" strokeOpacity="0.4" />
            </svg>
            {!menuColapsado && "Ocultar menú"}
          </button>
          {!menuColapsado && (
            <p className="px-3 pt-1 text-xs text-muted-3">
              {payload?.rol === "admin_cooperativa" ? "Administrador" : "Vendedor"}
            </p>
          )}
          <button
            onClick={salir}
            title={menuColapsado ? "Salir" : undefined}
            className={`flex h-11 w-full items-center gap-3 rounded-xl text-sm font-medium text-ondark transition hover:bg-ink-2 hover:text-white ${
              menuColapsado ? "justify-center" : "px-3"
            }`}
          >
            {IconoSalir}
            {!menuColapsado && "Salir"}
          </button>
        </div>
      </aside>

      {menuMovilAbierto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/60" onClick={() => setMenuMovilAbierto(false)} />
          <aside className="kb-sidebar absolute inset-y-0 left-0 w-72 overflow-y-auto !flex shadow-float">
            <div className="mb-4 flex items-center justify-between px-2">
              <LogoKlumbus className="h-7" />
              <button
                onClick={() => setMenuMovilAbierto(false)}
                aria-label="Cerrar menú"
                className="rounded-xl p-2 text-ondark hover:bg-ink-2 hover:text-white"
              >
                ✕
              </button>
            </div>
            <nav className="flex flex-col gap-1" aria-label="Menú del panel">
              {enlacesVisibles.map((enlace) => {
                const activo = pathname === enlace.href;
                const Icono = enlace.icono;
                return (
                  <Link key={enlace.href} href={enlace.href} className={activo ? "is-active" : ""}>
                    <Icono className="h-5 w-5 shrink-0" />
                    {enlace.etiqueta}
                  </Link>
                );
              })}
            </nav>
            <button
              onClick={salir}
              className="mt-4 flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-ondark hover:bg-ink-2 hover:text-white"
            >
              {IconoSalir}
              Salir
            </button>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <VigilanteSesion />
        {/* Celular: barra negra con el menú (en PC el menú es el lateral). */}
        <header className="kb-header sticky top-0 z-30 lg:hidden">
          <div className="flex h-16 items-center justify-between px-5">
            <LogoKlumbus className="h-6" />
            <button
              onClick={() => setMenuMovilAbierto(true)}
              aria-label="Abrir menú"
              className="grid h-[42px] w-[42px] place-items-center rounded-full bg-white/12 text-white"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
        </header>
        <main className="kb-main kb-on-white">
          {estadoDatos && estadoDatos.estado !== "al_dia" && (
            <div className={`kb-alert mb-5 flex-wrap items-center ${estadoDatos.estado === "bloqueado" ? "kb-alert--error" : "kb-alert--info"}`}>
              <span className="font-medium">
                {estadoDatos.estado === "bloqueado" ? (
                  <>
                    Tus datos legales llevan {estadoDatos.mesesSinConfirmar} meses sin confirmarse — crear
                    horarios recurrentes y la carga masiva están bloqueados hasta que los confirmes.{" "}
                  </>
                ) : (
                  <>Tus datos legales llevan {estadoDatos.mesesSinConfirmar} meses sin confirmarse. </>
                )}
                <Link href="/panel-empresa/configuracion" className="font-bold underline">
                  Confirmar mis datos
                </Link>
              </span>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
