"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { validarQrCoop, verificarMenorCoop, type ResultadoValidacionQr, type InfoMenor } from "@/lib/api";
import { obtenerToken } from "@/lib/auth";

type Resultado = ResultadoValidacionQr & { codigo: string };

/**
 * Lee el primer código QR de una imagen (foto o captura de pantalla del
 * boleto, ej. reenviada por WhatsApp) -- caso real reportado: sin esto,
 * soltar o pegar una imagen sobre la página no hacía nada útil (en el
 * mejor caso el navegador la abría en otra pestaña, su comportamiento
 * por defecto para un archivo soltado sin manejador).
 */
async function decodificarQrDeImagen(archivo: Blob): Promise<string | null> {
  const bitmap = await createImageBitmap(archivo).catch(() => null);
  if (!bitmap) return null;
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const contexto = canvas.getContext("2d");
  if (!contexto) return null;
  contexto.drawImage(bitmap, 0, 0);
  const { data, width, height } = contexto.getImageData(0, 0, canvas.width, canvas.height);
  const resultado = jsQR(data, width, height);
  return resultado?.data ?? null;
}

const ETIQUETA_ACOMPANAMIENTO: Record<string, string> = {
  con_padre_madre_tutor: "Viaja con padre/madre/tutor en esta misma compra",
  con_autorizacion: "Viaja con autorización de un adulto responsable",
};

function BloqueMenor({ menor, onVerificado }: { menor: InfoMenor; onVerificado: () => void }) {
  const [docIdentidad, setDocIdentidad] = useState(false);
  const [docAutorizacion, setDocAutorizacion] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    const token = obtenerToken();
    if (!token) return;
    setGuardando(true);
    setError(null);
    try {
      await verificarMenorCoop(token, menor.boletoId, docIdentidad, docAutorizacion);
      onVerificado();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la verificación.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl bg-amber-50 p-4 text-left ring-1 ring-amber-200">
      <p className="text-sm font-bold text-amber-800">Pasajero menor de edad — RF-MENOR</p>
      <p className="mt-1 text-sm text-amber-700">{ETIQUETA_ACOMPANAMIENTO[menor.tipoAcompanamiento]}</p>
      {menor.adultoAcompananteNombre && (
        <p className="mt-1 text-sm text-amber-700">Acompañante: {menor.adultoAcompananteNombre}</p>
      )}
      {menor.adultoResponsableNombre && (
        <p className="mt-1 text-sm text-amber-700">
          Responsable: {menor.adultoResponsableNombre} — {menor.adultoResponsableDocumento}
          {menor.adultoResponsableTelefono && ` — ${menor.adultoResponsableTelefono}`}
        </p>
      )}

      {menor.yaVerificado ? (
        <p className="mt-3 text-sm font-semibold text-emerald-700">✓ Documentos ya verificados.</p>
      ) : (
        <div className="mt-3 space-y-2">
          <label className="flex items-center gap-2 text-sm text-amber-800">
            <input type="checkbox" checked={docIdentidad} onChange={(e) => setDocIdentidad(e.target.checked)} />
            Documento de identidad del menor verificado
          </label>
          <label className="flex items-center gap-2 text-sm text-amber-800">
            <input
              type="checkbox"
              checked={docAutorizacion}
              onChange={(e) => setDocAutorizacion(e.target.checked)}
            />
            Documento de autorización verificado
          </label>
          <button
            type="button"
            onClick={confirmar}
            disabled={guardando || (!docIdentidad && !docAutorizacion)}
            className="rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Confirmar verificación"}
          </button>
          {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}

export default function ValidarQrPage() {
  const [codigo, setCodigo] = useState("");
  const [validando, setValidando] = useState(false);
  const [ultimoResultado, setUltimoResultado] = useState<Resultado | null>(null);
  const [historial, setHistorial] = useState<Resultado[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const archivoInputRef = useRef<HTMLInputElement>(null);

  const [arrastrando, setArrastrando] = useState(false);
  const [decodificando, setDecodificando] = useState(false);
  const [errorImagen, setErrorImagen] = useState<string | null>(null);

  const [camaraActiva, setCamaraActiva] = useState(false);
  const [errorCamara, setErrorCamara] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cuadroAnimacionRef = useRef<number | null>(null);

  // El escáner de QR físico (si se usa uno) funciona escribiendo el
  // código como si fuera un teclado — por eso el campo debe estar
  // siempre enfocado y listo, sin que el vendedor tenga que hacer clic
  // cada vez entre un boleto y el siguiente.
  useEffect(() => {
    inputRef.current?.focus();
  }, [ultimoResultado]);

  const ejecutarValidacion = useCallback(async (codigoCrudo: string) => {
    const token = obtenerToken();
    const codigoLimpio = codigoCrudo.trim();
    if (!token || !codigoLimpio) return;

    setValidando(true);
    try {
      const res = await validarQrCoop(token, codigoLimpio);
      const conCodigo: Resultado = { ...res, codigo: codigoLimpio };
      setUltimoResultado(conCodigo);
      setHistorial((prev) => [conCodigo, ...prev].slice(0, 8));
    } catch (err) {
      setUltimoResultado({
        valido: false,
        mensaje: err instanceof Error ? err.message : "No se pudo validar el boleto.",
        codigo: codigoLimpio,
      });
    } finally {
      setCodigo("");
      setValidando(false);
    }
  }, []);

  function validar(e: React.FormEvent) {
    e.preventDefault();
    void ejecutarValidacion(codigo);
  }

  const procesarImagen = useCallback(
    async (archivo: Blob) => {
      setErrorImagen(null);
      setDecodificando(true);
      try {
        const texto = await decodificarQrDeImagen(archivo);
        if (!texto) {
          setErrorImagen("No se encontró ningún código QR en esa imagen. Probá con una foto más nítida.");
          return;
        }
        await ejecutarValidacion(texto);
      } catch {
        setErrorImagen("No se pudo leer esa imagen.");
      } finally {
        setDecodificando(false);
      }
    },
    [ejecutarValidacion],
  );

  // Soltar una imagen en cualquier parte de la página (no solo la zona
  // marcada) -- sin este listener, el navegador la abre en otra pestaña,
  // que era exactamente el problema reportado.
  useEffect(() => {
    function evitarAperturaDeArchivo(e: DragEvent) {
      e.preventDefault();
    }
    window.addEventListener("dragover", evitarAperturaDeArchivo);
    window.addEventListener("drop", evitarAperturaDeArchivo);
    return () => {
      window.removeEventListener("dragover", evitarAperturaDeArchivo);
      window.removeEventListener("drop", evitarAperturaDeArchivo);
    };
  }, []);

  // Pegar una imagen copiada (ej. captura de pantalla con Ctrl+V) en
  // cualquier parte de la página -- mismo criterio que "pégalo aquí" ya
  // existía para el texto del código, extendido a imágenes.
  useEffect(() => {
    function alPegar(e: ClipboardEvent) {
      const archivo = Array.from(e.clipboardData?.items ?? [])
        .find((item) => item.type.startsWith("image/"))
        ?.getAsFile();
      if (archivo) {
        e.preventDefault();
        void procesarImagen(archivo);
      }
    }
    window.addEventListener("paste", alPegar);
    return () => window.removeEventListener("paste", alPegar);
  }, [procesarImagen]);

  function alSoltarEnZona(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setArrastrando(false);
    const archivo = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/"));
    if (archivo) void procesarImagen(archivo);
    else setErrorImagen("Eso no es una imagen. Arrastrá una foto o captura del código QR.");
  }

  function alSeleccionarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (archivo) void procesarImagen(archivo);
  }

  const detenerCamara = useCallback(() => {
    if (cuadroAnimacionRef.current !== null) {
      cancelAnimationFrame(cuadroAnimacionRef.current);
      cuadroAnimacionRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCamaraActiva(false);
  }, []);

  // Función declarada (no useCallback) a propósito: se llama a sí misma
  // en cada cuadro vía requestAnimationFrame, y una declaración de
  // función normal queda hoisted -- evita la referencia circular que
  // tendría un useCallback apuntándose a sí mismo antes de existir.
  function escanearCuadroDeVideo() {
    const video = videoRef.current;
    if (!video || video.readyState < video.HAVE_ENOUGH_DATA) {
      cuadroAnimacionRef.current = requestAnimationFrame(escanearCuadroDeVideo);
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const contexto = canvas.getContext("2d");
    if (contexto) {
      contexto.drawImage(video, 0, 0, canvas.width, canvas.height);
      const { data, width, height } = contexto.getImageData(0, 0, canvas.width, canvas.height);
      const resultado = jsQR(data, width, height);
      if (resultado?.data) {
        detenerCamara();
        void ejecutarValidacion(resultado.data);
        return;
      }
    }
    cuadroAnimacionRef.current = requestAnimationFrame(escanearCuadroDeVideo);
  }

  async function iniciarCamara() {
    setErrorCamara(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamaraActiva(true);
      cuadroAnimacionRef.current = requestAnimationFrame(escanearCuadroDeVideo);
    } catch {
      setErrorCamara("No se pudo acceder a la cámara. Revisá los permisos del navegador para este sitio.");
    }
  }

  // Suelta la cámara si el vendedor sale de la pantalla con el escaneo
  // activo -- nunca debe quedar encendida en segundo plano.
  useEffect(() => detenerCamara, [detenerCamara]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-dark">Validar boleto</h1>
        <p className="mt-1 text-sm text-brand-dark/70">
          Escanea el código QR del boleto (o pégalo aquí) para confirmar el abordaje.
        </p>
      </div>

      <form onSubmit={validar} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <label htmlFor="validar-qr-codigo" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
          Código QR
        </label>
        <div className="flex gap-3">
          <input
            id="validar-qr-codigo"
            ref={inputRef}
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Escanea o pega el código aquí..."
            autoFocus
            className="flex-1 rounded-lg border border-brand-light bg-white px-4 py-3 text-lg text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
          <button
            type="submit"
            disabled={validando || !codigo.trim()}
            className="rounded-lg bg-brand-amber px-6 py-3 font-semibold text-brand-dark transition hover:brightness-95 disabled:opacity-50"
          >
            {validando ? "Validando..." : "Validar"}
          </button>
        </div>
      </form>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
          ¿No tenés un escáner a mano?
        </p>

        {camaraActiva ? (
          <div className="space-y-3">
            <div className="relative mx-auto aspect-square max-w-xs overflow-hidden rounded-xl bg-black">
              <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-brand-amber/80" />
            </div>
            <p className="text-center text-xs text-brand-dark/50">Apuntá al código QR del boleto...</p>
            <button
              type="button"
              onClick={detenerCamara}
              className="mx-auto block rounded-lg border border-brand-light px-4 py-2 text-sm font-semibold text-brand-dark/70 hover:bg-brand-light/40"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setArrastrando(true);
              }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={alSoltarEnZona}
              className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
                arrastrando ? "border-brand-amber bg-brand-amber/10" : "border-brand-light"
              }`}
            >
              <p className="text-sm text-brand-dark/60">
                {decodificando
                  ? "Leyendo la imagen..."
                  : "Arrastrá una foto o captura del QR aquí, pegala (Ctrl+V), o:"}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => archivoInputRef.current?.click()}
                  disabled={decodificando}
                  className="rounded-lg border border-brand-light px-4 py-2 text-sm font-semibold text-brand-dark transition hover:bg-brand-light/40 disabled:opacity-50"
                >
                  Subir imagen
                </button>
                <button
                  type="button"
                  onClick={iniciarCamara}
                  disabled={decodificando}
                  className="rounded-lg border border-brand-light px-4 py-2 text-sm font-semibold text-brand-dark transition hover:bg-brand-light/40 disabled:opacity-50"
                >
                  Usar cámara
                </button>
              </div>
              <input
                ref={archivoInputRef}
                type="file"
                accept="image/*"
                onChange={alSeleccionarArchivo}
                className="hidden"
              />
            </div>
            {errorImagen && <p className="mt-2 text-xs font-medium text-red-600">{errorImagen}</p>}
            {errorCamara && <p className="mt-2 text-xs font-medium text-red-600">{errorCamara}</p>}
          </>
        )}
      </div>

      {ultimoResultado && (
        <div
          className={`rounded-2xl p-6 text-center shadow-sm ring-1 ${
            ultimoResultado.valido
              ? "bg-emerald-50 ring-emerald-200"
              : "bg-red-50 ring-red-200"
          }`}
        >
          <div
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl font-bold ${
              ultimoResultado.valido ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
            }`}
          >
            {ultimoResultado.valido ? "✓" : "✕"}
          </div>
          <p
            className={`mt-3 font-display text-lg font-bold ${
              ultimoResultado.valido ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {ultimoResultado.mensaje}
          </p>
          {ultimoResultado.pasajeroNombre && (
            <p className="mt-1 text-base text-brand-dark/70">{ultimoResultado.pasajeroNombre}</p>
          )}
          {ultimoResultado.menor && (
            <BloqueMenor
              menor={ultimoResultado.menor}
              onVerificado={() =>
                setUltimoResultado((prev) =>
                  prev ? { ...prev, menor: { ...prev.menor!, yaVerificado: true } } : prev,
                )
              }
            />
          )}
        </div>
      )}

      {historial.length > 0 && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="border-b border-black/5 px-6 py-4">
            <h2 className="font-display text-sm font-bold text-brand-dark">Últimas validaciones</h2>
          </div>
          <ul className="divide-y divide-black/5">
            {historial.map((h, i) => (
              <li key={i} className="flex items-center justify-between px-6 py-3 text-sm">
                <span className="text-brand-dark/70">{h.pasajeroNombre ?? h.mensaje}</span>
                <span className={`font-semibold ${h.valido ? "text-emerald-600" : "text-red-600"}`}>
                  {h.valido ? "Válido" : "Rechazado"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
