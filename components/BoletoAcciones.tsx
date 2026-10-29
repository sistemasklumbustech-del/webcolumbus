"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { descargarBoletoPdf, type BoletoDeRecibo } from "@/lib/api";
import { tokenValido } from "@/lib/auth";
import { fechaBoleto, horaBoleto, numeroBoleto, textoParaCompartir, type GrupoBoletos } from "@/lib/boleto";

/**
 * Botones Descargar y Compartir del boleto confirmado (aprobado por el director, 29-oct-2026).
 *
 * Descargar:
 * - con sesión: el PDF real de cada boleto (el mismo de Mis boletos);
 * - sin cuenta: la ventana de imprimir del navegador ("Guardar como PDF") con una hoja propia:
 *   solo el boleto, QR grande, una página por boleto, en blanco y negro.
 *
 * Compartir: texto sin QR. En celular, el menú de compartir del teléfono; en PC, se copia.
 */
export function BoletoAcciones({ grupos, codigosAnden }: { grupos: GrupoBoletos[]; codigosAnden: Record<string, BoletoDeRecibo> }) {
  const [descargando, setDescargando] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [montado, setMontado] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setMontado(true);
    return () => clearTimeout(temporizador.current);
  }, []);

  async function descargar() {
    setErrorDescarga(null);
    const token = tokenValido();
    if (!token) {
      window.print();
      return;
    }
    setDescargando(true);
    try {
      for (const grupo of grupos) {
        for (const boleto of grupo.boletos) {
          await descargarBoletoPdf(token, boleto.id);
        }
      }
    } catch (err) {
      setErrorDescarga(err instanceof Error ? err.message : "No se pudo descargar el boleto.");
    } finally {
      setDescargando(false);
    }
  }

  async function compartir() {
    const texto = textoParaCompartir(grupos);
    const esCelular = window.matchMedia("(pointer: coarse)").matches;
    if (esCelular && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: texto.split("\n")[0], text: texto });
        return;
      } catch (err) {
        // Si la persona cierra el menú, no se hace nada más.
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      const area = document.createElement("textarea");
      area.value = texto;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }
    setCopiado(true);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setCopiado(false), 2500);
  }

  return (
    <>
      <div className="grid w-full grid-cols-2 gap-2.5 md:flex md:w-auto md:gap-3">
        <button type="button" onClick={descargar} disabled={descargando} className="kb-btn kb-btn--primary !px-4 md:!px-7">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
          </svg>
          {descargando ? (
            "Descargando…"
          ) : (
            <>
              <span className="md:hidden">Descargar</span>
              <span className="hidden md:inline">Descargar PDF</span>
            </>
          )}
        </button>
        {/* Aviso "Copiado" en el mismo botón por 2,5 s (no tapa nada de la pantalla). */}
        <button
          type="button"
          onClick={compartir}
          className={`kb-btn kb-btn--outline w-full !px-4 md:w-[164px] md:!px-7 ${copiado ? "!text-ok" : ""}`}
        >
          {copiado ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12l5 5L20 7" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4" />
            </svg>
          )}
          {copiado ? "Copiado" : "Compartir"}
        </button>
        <span role="status" aria-live="polite" className="sr-only">
          {copiado ? "Copiado al portapapeles" : ""}
        </span>
      </div>
      {errorDescarga && <p className="kb-alert kb-alert--error w-full text-sm md:order-last md:basis-full">{errorDescarga}</p>}
      {montado && createPortal(<HojaImpresion grupos={grupos} codigosAnden={codigosAnden} />, document.body)}
    </>
  );
}

/** QR en SVG: queda nítido a cualquier tamaño en la impresión. */
function QrImpresion({ valor, className }: { valor: string; className: string }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let vigente = true;
    QRCode.toString(valor, { type: "svg", margin: 0, color: { dark: "#000000", light: "#ffffff" } }).then((s) => {
      if (vigente) setSvg(s);
    });
    return () => {
      vigente = false;
    };
  }, [valor]);
  return <div className={className} dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** Hoja de impresión: no se ve en pantalla; al imprimir es lo único que sale. */
function HojaImpresion({ grupos, codigosAnden }: { grupos: GrupoBoletos[]; codigosAnden: Record<string, BoletoDeRecibo> }) {
  return (
    <div className="kb-hoja-boletos" aria-hidden="true">
      {grupos.flatMap((grupo) =>
        grupo.boletos.map((boleto) => {
          const anden = codigosAnden[boleto.id];
          const andenListo = anden?.estadoTasa === "lista" && anden.codigoTasa;
          const textoCodigo = boleto.codigoQr.length <= 20 ? boleto.codigoQr : null;
          const datos: [string, string][] = [
            ["Pasajero", boleto.compradorNombre],
            ["Documento", boleto.compradorDocumento ?? "—"],
            ["Asiento", `${boleto.numeroAsiento}${boleto.esVip ? " · VIP" : ""}`],
            ["Cooperativa", boleto.cooperativaNombre],
            ...(boleto.unidadIdentificador ? [["Disco", boleto.unidadIdentificador] as [string, string]] : []),
            ...(boleto.unidadPlaca ? [["Placa", boleto.unidadPlaca] as [string, string]] : []),
            ["Tarifa", `$${boleto.precioPagado.toFixed(2)}`],
            ...(boleto.tasaTerminal > 0 ? [["Tasa de terminal", `$${boleto.tasaTerminal.toFixed(2)}`] as [string, string]] : []),
          ];
          return (
            <section key={boleto.id} className="kb-hoja-boleto">
              <div className="kb-hoja-boleto__marco">
                <header className="kb-hoja-boleto__cabecera">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/img/klumbus-logo-fondo-claro.svg" alt="Klumbus" className="kb-hoja-boleto__logo" />
                  <div className="kb-hoja-boleto__numero">
                    <span>Boleto electrónico · N.º</span>
                    <b>{numeroBoleto(boleto.id)}</b>
                  </div>
                </header>
                {grupo.tramo && <p className="kb-hoja-boleto__tramo">{grupo.tramo}</p>}
                <div className="kb-hoja-boleto__ruta">
                  <div>
                    <span>Origen</span>
                    <b>{boleto.rutaOrigenCiudad}</b>
                  </div>
                  <i aria-hidden="true">→</i>
                  <div>
                    <span>Destino</span>
                    <b>{boleto.rutaDestinoCiudad}</b>
                  </div>
                </div>
                <div className="kb-hoja-boleto__salida">
                  <div>
                    <span>Fecha</span>
                    <b>{fechaBoleto(boleto.horaSalidaProgramada)}</b>
                  </div>
                  <div>
                    <span>Hora de salida</span>
                    <b>{horaBoleto(boleto.horaSalidaProgramada)}</b>
                  </div>
                </div>
                <dl className="kb-hoja-boleto__datos">
                  {datos.map(([etiqueta, valor]) => (
                    <div key={etiqueta}>
                      <dt>{etiqueta}</dt>
                      <dd>{valor}</dd>
                    </div>
                  ))}
                </dl>
                <div className="kb-hoja-boleto__codigos">
                  <figure>
                    <QrImpresion valor={boleto.codigoQr} className="kb-hoja-boleto__qr" />
                    <figcaption>
                      <b>Muestra este código al abordar</b>
                      {textoCodigo && <span>{textoCodigo}</span>}
                    </figcaption>
                  </figure>
                  {andenListo && (
                    <figure>
                      <QrImpresion valor={anden.codigoTasa as string} className="kb-hoja-boleto__qr kb-hoja-boleto__qr--anden" />
                      <figcaption>
                        <b>Acceso al andén</b>
                        <span>Preséntalo en el torniquete del terminal.</span>
                        <span>{anden.codigoTasa}</span>
                      </figcaption>
                    </figure>
                  )}
                </div>
                <footer className="kb-hoja-boleto__pie">klumbustech.com</footer>
              </div>
            </section>
          );
        }),
      )}
    </div>
  );
}
