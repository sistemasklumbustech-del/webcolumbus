"use client";

import { useEffect, useRef, useState } from "react";

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
const SALIDA_MS = 400;
const LOGO = "/img/klumbus-logo-fondo-oscuro.svg";

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

interface Particula {
  tx: number;
  ty: number;
  c: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  d: number;
  s: number;
}

export function BienvenidaMovil() {
  const [visible, setVisible] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lemaRef = useRef<HTMLDivElement>(null);
  const barraRef = useRef<HTMLElement>(null);
  // Al entrar, las partículas salen disparadas hacia afuera mientras la pantalla se desvanece.
  const explotarRef = useRef(false);
  // Momento en que empezó la bienvenida (lo marca el script): todo se mide desde ahí.
  const inicioRef = useRef(0);

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
    inicioRef.current = marca.inicio;
    setVisible(true);
  }, []);

  function entrar() {
    if (explotarRef.current) return;
    explotarRef.current = true;
    setSaliendo(true);
    window.setTimeout(() => setVisible(false), SALIDA_MS);
  }

  // Entrada automática a los 4 segundos.
  useEffect(() => {
    if (!visible) return;
    quitarCubierta();
    const restante = Math.max(0, DURACION_MS - SALIDA_MS - (performance.now() - inicioRef.current));
    const temporizador = window.setTimeout(entrar, restante);
    const bloqueoAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") entrar();
    };
    window.addEventListener("keydown", alTeclear);
    return () => {
      window.clearTimeout(temporizador);
      window.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = bloqueoAnterior;
    };
  }, [visible]);

  // Partículas del logo.
  useEffect(() => {
    if (!visible) return;
    const contenedor = contenedorRef.current;
    const cv = canvasRef.current;
    const lema = lemaRef.current;
    const barra = barraRef.current;
    if (!contenedor || !cv || !lema || !barra) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0;
    let H = 0;
    let pts: Particula[] = [];
    let polvo: { x: number; y: number; v: number; a: number; s: number }[] = [];
    let t0 = 0;
    let ultimoCuadro = 0;
    let raf = 0;
    let mx = -9999;
    let my = -9999;
    let cancelado = false;
    // Caja del logo (para el brillo que lo recorre).
    let logoX = 0;
    let logoY = 0;
    let logoW = 0;

    const img = new Image();
    img.src = LOGO;

    function construir() {
      const r = contenedor!.getBoundingClientRect();
      W = Math.round(r.width * dpr);
      H = Math.round(r.height * dpr);
      if (!W || !H) return;
      cv!.width = W;
      cv!.height = H;
      // En PC el logo no pasa de ~760 px de ancho (antes ocupaba el 84 % de la pantalla).
      const lw = Math.round(Math.min(W * 0.84, 760 * dpr));
      const lh = Math.round((lw * 570) / 2357);
      const ox = Math.round((W - lw) / 2);
      const oy = Math.round(H * 0.4 - lh / 2);
      logoX = ox;
      logoY = oy;
      logoW = lw;
      const off = document.createElement("canvas");
      off.width = W;
      off.height = H;
      const o = off.getContext("2d");
      if (!o) return;
      o.drawImage(img, ox, oy, lw, lh);
      let datos: Uint8ClampedArray;
      try {
        datos = o.getImageData(0, 0, W, H).data;
      } catch {
        return;
      }
      const paso = Math.max(1, Math.round((1.6 * dpr) / 1.5));
      let candidatas: [number, number, string][] = [];
      for (let y = oy; y < oy + lh; y += paso) {
        for (let x = ox; x < ox + lw; x += paso) {
          const i = (y * W + x) * 4;
          if (datos[i + 3] < 140) continue;
          const R = datos[i];
          const G = datos[i + 1];
          const B = datos[i + 2];
          if (R + G + B < 160) continue;
          candidatas.push([x, y, `rgb(${R},${G},${B})`]);
        }
      }
      const max = W * H > 900000 ? 16000 : 11000;
      if (candidatas.length > max) {
        for (let k = candidatas.length - 1; k > 0; k--) {
          const j = Math.floor(Math.random() * (k + 1));
          [candidatas[k], candidatas[j]] = [candidatas[j], candidatas[k]];
        }
        candidatas = candidatas.slice(0, max);
      }
      pts = candidatas.map((c) => {
        const ang = Math.random() * Math.PI * 2;
        const rad = (0.35 + Math.random() * 0.5) * Math.max(W, H);
        return {
          tx: c[0],
          ty: c[1],
          c: c[2],
          x: W / 2 + Math.cos(ang) * rad,
          y: H * 0.4 + Math.sin(ang) * rad,
          vx: 0,
          vy: 0,
          d: Math.random() * 0.4,
          s: (Math.random() < 0.15 ? 1.6 : 1.1) * dpr,
        };
      });
      polvo = Array.from({ length: 260 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        v: (0.05 + Math.random() * 0.25) * dpr,
        a: 0.08 + Math.random() * 0.25,
        s: (0.6 + Math.random()) * dpr,
      }));
      t0 = performance.now();
      ultimoCuadro = t0;
    }

    function cuadro(ahora: number) {
      raf = requestAnimationFrame(cuadro);
      if (!pts.length || !ctx) return;
      const t = reducir ? 1100 : ahora - t0;
      ctx.fillStyle = "rgba(11,13,18,0.38)";
      ctx.fillRect(0, 0, W, H);
      for (const q of polvo) {
        q.y -= q.v;
        if (q.y < 0) {
          q.y = H;
          q.x = Math.random() * W;
        }
        ctx.globalAlpha = q.a;
        ctx.fillStyle = "#FDD514";
        ctx.fillRect(q.x, q.y, q.s, q.s);
      }
      ctx.globalAlpha = 1;
      const fase = t < 750 ? "in" : "hold";
      const explotar = explotarRef.current;
      lema!.classList.toggle("is-on", t > 450);
      barra!.style.width = `${Math.min(100, (t / (DURACION_MS - SALIDA_MS)) * 100)}%`;
      // La física avanza por tiempo, no por cuadro: en equipos lentos (pocos cuadros por segundo) el logo se forma igual de rápido.
      const pasos = Math.max(1, Math.min(10, Math.round((ahora - ultimoCuadro) / 16.7)));
      ultimoCuadro = ahora;
      for (let paso = 0; paso < pasos; paso++) {
        for (const p of pts) {
          if (explotar) {
            // Salida: cada partícula se aleja del centro, más rápido cuanto más lejos está.
            p.vx = p.vx * 0.96 + (p.x - W / 2) * 0.012 + (Math.random() - 0.5) * dpr;
            p.vy = p.vy * 0.96 + (p.y - H * 0.4) * 0.012 + (Math.random() - 0.5) * dpr;
            p.x += p.vx;
            p.y += p.vy;
            continue;
          }
          const k = fase === "in" ? Math.max(0, Math.min(1, (t / 750 - p.d) / 0.5)) : 1;
          const sp = 0.06 + 0.14 * k;
          p.vx = (p.vx + (p.tx - p.x) * sp) * 0.72;
          p.vy = (p.vy + (p.ty - p.y) * sp) * 0.72;
          const ex = p.x - mx;
          const ey = p.y - my;
          const e2 = ex * ex + ey * ey;
          const R2 = 46 * dpr * (46 * dpr);
          if (e2 < R2) {
            const f = (1 - e2 / R2) * 6 * dpr;
            const el = Math.sqrt(e2) || 1;
            p.vx += (ex / el) * f;
            p.vy += (ey / el) * f;
          }
          if (fase === "hold" && !reducir) {
            p.vx += (Math.random() - 0.5) * 0.35 * dpr;
            p.vy += (Math.random() - 0.5) * 0.35 * dpr;
          }
          p.x += p.vx;
          p.y += p.vy;
        }
      }
      // Brillo: una franja de luz cruza el logo en diagonal justo después de formarse.
      const brillo = !reducir && !explotar && t > 700 && t < 1100;
      const frente = logoX - 120 * dpr + ((t - 700) / 400) * (logoW + 240 * dpr);
      const ancho = 34 * dpr;
      for (const p of pts) {
        if (brillo && Math.abs(p.tx + (p.ty - logoY) * 0.45 - frente) < ancho) {
          ctx.fillStyle = "#FFF8D6";
          ctx.fillRect(p.x - 0.4 * dpr, p.y - 0.4 * dpr, p.s + 0.8 * dpr, p.s + 0.8 * dpr);
        } else {
          ctx.fillStyle = p.c;
          ctx.fillRect(p.x, p.y, p.s, p.s);
        }
      }
    }

    function posicion(e: PointerEvent) {
      const r = cv!.getBoundingClientRect();
      mx = (e.clientX - r.left) * dpr;
      my = (e.clientY - r.top) * dpr;
    }
    const alSalir = () => {
      mx = my = -9999;
    };

    img.onload = () => {
      if (cancelado) return;
      construir();
      ctx.fillStyle = "#0B0D12";
      ctx.fillRect(0, 0, W, H);
      raf = requestAnimationFrame(cuadro);
    };
    cv.addEventListener("pointermove", posicion);
    cv.addEventListener("pointerleave", alSalir);
    let temporizadorResize: ReturnType<typeof setTimeout>;
    const alCambiarTamano = () => {
      clearTimeout(temporizadorResize);
      temporizadorResize = setTimeout(construir, 200);
    };
    window.addEventListener("resize", alCambiarTamano);

    return () => {
      cancelado = true;
      cancelAnimationFrame(raf);
      clearTimeout(temporizadorResize);
      cv.removeEventListener("pointermove", posicion);
      cv.removeEventListener("pointerleave", alSalir);
      window.removeEventListener("resize", alCambiarTamano);
    };
  }, [visible]);

  if (!visible) {
    // El script va en el HTML de la portada; React no lo vuelve a ejecutar al hidratar.
    return <script dangerouslySetInnerHTML={{ __html: SCRIPT_DECIDIR }} />;
  }

  return (
    <div
      ref={contenedorRef}
      role="dialog"
      aria-label="Bienvenida a Klumbus"
      onClick={entrar}
      className={`fixed inset-0 z-[200] overflow-hidden bg-[radial-gradient(120%_70%_at_50%_42%,#171A22_0%,#0B0D12_60%)] text-white transition-opacity duration-[400ms] ${
        saliendo ? "opacity-0" : "opacity-100"
      }`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          entrar();
        }}
        className="absolute right-4 top-4 z-[3] inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-ondark transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kbyellow md:right-8 md:top-6"
      >
        Saltar
      </button>
      <canvas ref={canvasRef} aria-label="Logo de Klumbus formado por partículas" role="img" className="absolute inset-0 block h-full w-full" />
      <div
        ref={lemaRef}
        className="absolute inset-x-6 top-[56%] z-[2] flex translate-y-3 flex-col gap-2 text-center opacity-0 transition-[opacity,transform] duration-[900ms] ease-out [&.is-on]:translate-y-0 [&.is-on]:opacity-100"
      >
        <b className="text-2xl font-semibold leading-tight tracking-[-0.01em] md:text-4xl">
          Todo Ecuador, <span className="text-kbyellow">a un boleto</span> de distancia.
        </b>
        <span className="text-sm text-ondark md:text-base">Sin filas. Sin papeleo.</span>
      </div>
      <div className="absolute inset-x-6 bottom-11 z-[2] flex flex-col items-center gap-3">
        <div className="h-1 w-[120px] overflow-hidden rounded-full bg-ink-3">
          <i ref={barraRef} className="block h-full w-0 rounded-full bg-kbyellow" />
        </div>
        <small className="text-xs text-muted-3">Entrando…</small>
      </div>
    </div>
  );
}
