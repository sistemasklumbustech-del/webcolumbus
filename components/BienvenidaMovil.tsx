"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Bienvenida (diseño final, oct-2026): solo en celular y solo la primera vez. Miles de
 * partículas forman el logo, aparece el lema y a los 4 segundos entra sola al Inicio. Se
 * guarda en el navegador que ya se vio para no repetirla. Se puede saltar tocando la pantalla.
 * Con "reducir movimiento" activado se muestra el logo ya formado, sin animación.
 */
const CLAVE_VISTA = "klumbus-bienvenida-vista";
const DURACION_MS = 4000;
const LOGO = "/img/klumbus-logo-fondo-oscuro.svg";

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

function yaVista(): boolean {
  try {
    return window.localStorage.getItem(CLAVE_VISTA) === "1";
  } catch {
    return false;
  }
}

function marcarVista() {
  try {
    window.localStorage.setItem(CLAVE_VISTA, "1");
  } catch {
    /* sin almacenamiento: simplemente se mostrará de nuevo */
  }
}

export function BienvenidaMovil() {
  const [visible, setVisible] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lemaRef = useRef<HTMLDivElement>(null);
  const barraRef = useRef<HTMLElement>(null);

  // Decide si se muestra: celular (menos de 768 px) y primera visita.
  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) return;
    if (yaVista()) return;
    setVisible(true);
  }, []);

  function entrar() {
    marcarVista();
    setSaliendo(true);
    window.setTimeout(() => setVisible(false), 450);
  }

  // Entrada automática a los 4 segundos.
  useEffect(() => {
    if (!visible) return;
    const temporizador = window.setTimeout(entrar, DURACION_MS);
    const bloqueoAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(temporizador);
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

    const img = new Image();
    img.src = LOGO;

    function construir() {
      const r = contenedor!.getBoundingClientRect();
      W = Math.round(r.width * dpr);
      H = Math.round(r.height * dpr);
      if (!W || !H) return;
      cv!.width = W;
      cv!.height = H;
      const lw = Math.round(W * 0.84);
      const lh = Math.round((lw * 570) / 2357);
      const ox = Math.round((W - lw) / 2);
      const oy = Math.round(H * 0.4 - lh / 2);
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
        const rad = (0.6 + Math.random() * 0.8) * Math.max(W, H);
        return {
          tx: c[0],
          ty: c[1],
          c: c[2],
          x: W / 2 + Math.cos(ang) * rad,
          y: H * 0.4 + Math.sin(ang) * rad,
          vx: 0,
          vy: 0,
          d: Math.random() * 0.5,
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
      const t = reducir ? 2600 : ahora - t0;
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
      const fase = t < 2300 ? "in" : "hold";
      lema!.classList.toggle("is-on", t > 1600);
      barra!.style.width = `${Math.min(100, (t / DURACION_MS) * 100)}%`;
      // La física avanza por tiempo, no por cuadro: en equipos lentos (pocos cuadros por segundo) el logo se forma igual de rápido.
      const pasos = Math.max(1, Math.min(10, Math.round((ahora - ultimoCuadro) / 16.7)));
      ultimoCuadro = ahora;
      for (let paso = 0; paso < pasos; paso++) {
        for (const p of pts) {
          const k = fase === "in" ? Math.max(0, Math.min(1, (t / 2300 - p.d) / 0.5)) : 1;
          const sp = 0.04 + 0.1 * k;
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
      for (const p of pts) {
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x, p.y, p.s, p.s);
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

  if (!visible) return null;

  return (
    <div
      ref={contenedorRef}
      role="dialog"
      aria-label="Bienvenida a Klumbus"
      onClick={entrar}
      className={`fixed inset-0 z-[200] overflow-hidden bg-[radial-gradient(120%_70%_at_50%_42%,#171A22_0%,#0B0D12_60%)] text-white transition-opacity duration-[450ms] md:hidden ${
        saliendo ? "opacity-0" : "opacity-100"
      }`}
    >
      <canvas ref={canvasRef} aria-label="Logo de Klumbus formado por partículas" role="img" className="absolute inset-0 block h-full w-full" />
      <div
        ref={lemaRef}
        className="absolute inset-x-6 top-[56%] z-[2] flex translate-y-3 flex-col gap-2 text-center opacity-0 transition-[opacity,transform] duration-[900ms] ease-out [&.is-on]:translate-y-0 [&.is-on]:opacity-100"
      >
        <b className="text-2xl font-semibold leading-tight tracking-[-0.01em]">
          Todo Ecuador, <span className="text-kbyellow">a un boleto</span> de distancia.
        </b>
        <span className="text-sm text-ondark">Sin filas. Sin papeleo.</span>
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
