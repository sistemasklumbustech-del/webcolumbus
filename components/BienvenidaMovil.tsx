"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

/**
 * Bienvenida: miles de partículas forman el logo, aparece el lema y entra sola al Inicio.
 *
 * Reglas (director, 30-oct-2026, para no frenar ventas ni Google):
 * - Solo la PRIMERA visita del navegador (se guarda en localStorage; si no se puede guardar, no sale).
 * - Solo si se entra por la portada (/) cargando la página. Nunca al navegar dentro de la web ni en
 *   enlaces directos (buscar, asientos, pago, boleto, Mi cuenta, correos…): el componente solo vive en
 *   la portada y además exige la marca que deja el script de abajo al cargar "/".
 * - Dura 1,5 s como máximo. No sale con "reducir movimiento" ni para buscadores.
 * - El contenido de la portada está en el HTML desde el primer momento, debajo de la bienvenida.
 *   La cubierta negra la crea el script (no viene en el HTML) y se quita sola a los 2 s si algo fallara.
 * Se puede saltar tocando la pantalla, con "Saltar" o con Esc.
 */
const CLAVE_VISTA = "klumbus-bienvenida-vista";
const DURACION_MS = 1500;

// El código de la animación solo se descarga cuando toca mostrarla (portada-velocidad).
const BienvenidaAnimacion = dynamic(() => import("./BienvenidaAnimacion").then((m) => m.BienvenidaAnimacion), {
  ssr: false,
});

type VentanaBienvenida = Window & { __kbBienvenida?: { inicio: number } };

/**
 * Corre mientras se lee el HTML de la portada, antes de pintar. Decide si toca bienvenida y, si toca,
 * pone la cubierta negra (y la marca que lee React). Todo dentro de try/catch: ante cualquier duda, no sale.
 */
const SCRIPT_DECIDIR = `(function(){try{
if(location.pathname!=="/")return;
if(/bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|google-inspectiontool/i.test(navigator.userAgent))return;
if(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)return;
if(localStorage.getItem("${CLAVE_VISTA}")==="1")return;
localStorage.setItem("${CLAVE_VISTA}","1");
if(localStorage.getItem("${CLAVE_VISTA}")!=="1")return;
window.__kbBienvenida={inicio:performance.now()};
var c=document.createElement("div");c.id="kb-bienvenida-cubierta";c.setAttribute("aria-hidden","true");
c.style.cssText="position:fixed;inset:0;z-index:200;background:radial-gradient(120% 70% at 50% 42%,#171A22 0%,#0B0D12 60%);animation:kb-cubierta-fuera .2s 1.8s forwards";
document.body.appendChild(c);
}catch(e){}})();`;

function quitarCubierta() {
  document.getElementById("kb-bienvenida-cubierta")?.remove();
}

export function BienvenidaMovil() {
  // Momento en que empezó (lo marca el script) o null si no toca.
  const [inicio, setInicio] = useState<number | null>(null);

  // Solo si el script de la portada lo decidió al cargar "/" (y queda tiempo suficiente).
  useEffect(() => {
    const marca = (window as VentanaBienvenida).__kbBienvenida;
    if (!marca) return;
    (window as VentanaBienvenida).__kbBienvenida = undefined;
    // Si la web tardó en cargar, ya no vale la pena: se quita la cubierta y se entra directo.
    if (performance.now() - marca.inicio > DURACION_MS - 700) {
      quitarCubierta();
      return;
    }
    setInicio(marca.inicio);
  }, []);

  if (inicio === null) {
    // El script va en el HTML de la portada; React no lo vuelve a ejecutar al hidratar.
    return <script dangerouslySetInnerHTML={{ __html: SCRIPT_DECIDIR }} />;
  }
  return <BienvenidaAnimacion inicio={inicio} onFin={() => setInicio(null)} />;
}
