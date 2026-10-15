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
    <div className="kb-alert kb-alert--info mt-4 flex-col text-left">
      <p className="text-sm font-bold text-[#7A5D00]">Pasajero menor de edad — RF-MENOR</p>
      <p className="mt-1 text-sm text-[#7A5D00]">{ETIQUETA_ACOMPANAMIENTO[menor.tipoAcompanamiento]}</p>
      {menor.adultoAcompananteNombre && (
        <p className="mt-1 text-sm text-[#7A5D00]">Acompañante: {menor.adultoAcompananteNombre}</p>
      )}
      {menor.adultoResponsableNombre && (
        <p className="mt-1 text-sm text-[#7A5D00]">
          Responsable: {menor.adultoResponsableNombre} — {menor.adultoResponsableDocumento}
          {menor.adultoResponsableTelefono && ` — ${menor.adultoResponsableTelefono}`}
        </p>
      )}

      {menor.yaVerificado ? (
        <p className="mt-3 text-sm font-semibold text-ok">✓ Documentos ya verificados.</p>
      ) : (
        <div className="mt-3 space-y-2">
          <label className="flex items-center gap-2 text-sm text-[#7A5D00]">
            <input type="checkbox" checked={docIdentidad} onChange={(e) => setDocIdentidad(e.target.checked)} />
            Documento de identidad del menor verificado
          </label>
          <label className="flex items-center gap-2 text-sm text-[#7A5D00]">
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
            className="kb-btn kb-btn--dark !h-10 !px-4 !text-sm disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Confirmar verificación"}
          </button>
          {error && <p className="text-xs font-medium text-kberror">{error}</p>}
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
        <h1 className="text-2xl font-bold text-brand-dark">Validar boleto</h1>
        <p className="mt-1 text-sm text-muted-2">
          Escanea el código QR del boleto (o pégalo aquí) para confirmar el abordaje.
        </p>
      </div>

      <form onSubmit={validar} className="kb-card kb-on-white p-6">
        <label htmlFor="validar-qr-codigo" className="mb-2 kb-label">
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
            className="kb-input"
          />
          <button
            type="submit"
            disabled={validando || !codigo.trim()}
            className="rounded-lg bg-kbyellow px-6 py-3 font-semibold text-brand-dark transition hover:brightness-95 disabled:opacity-50"
          >
            {validando ? "Validando..." : "Validar"}
          </button>
        </div>
      </form>

      <div className="kb-card kb-on-white p-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-2">
          ¿No tenés un escáner a mano?
        </p>

        {camaraActiva ? (
          <div className="space-y-3">
            <div className="relative mx-auto aspect-square max-w-xs overflow-hidden rounded-ctrl bg-black">
              <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-6 rounded-ctrl border-2 border-kbyellow" />
            </div>
            <p className="text-center text-xs text-muted-2">Apuntá al código QR del boleto...</p>
            <button
              type="button"
              onClick={detenerCamara}
              className="mx-auto block kb-btn kb-btn--outline !h-10 !px-4 !text-sm"
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
              className={`flex flex-col items-center justify-center gap-3 rounded-ctrl border-2 border-dashed px-4 py-6 text-center transition ${
                arrastrando ? "border-kbyellow bg-kbyellow" : "border-line"
              }`}
            >
              <p className="text-sm text-muted-2">
                {decodificando
                  ? "Leyendo la imagen..."
                  : "Arrastrá una foto o captura del QR aquí, pegala (Ctrl+V), o:"}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => archivoInputRef.current?.click()}
                  disabled={decodificando}
                  className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm disabled:opacity-50"
                >
                  Subir imagen
                </button>
                <button
                  type="button"
                  onClick={iniciarCamara}
                  disabled={decodificando}
                  className="kb-btn kb-btn--outline !h-10 !px-4 !text-sm disabled:opacity-50"
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
            {errorImagen && <p className="mt-2 text-xs font-medium text-kberror">{errorImagen}</p>}
            {errorCamara && <p className="mt-2 text-xs font-medium text-kberror">{errorCamara}</p>}
          </>
        )}
      </div>

      {ultimoResultado && (
        <div
          className={`rounded-card p-6 text-center ${ultimoResultado.valido ? "bg-ok-bg" : "bg-kberror-bg"}`}
        >
          <div
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl font-bold ${
              ultimoResultado.valido ? "bg-ok text-white" : "bg-kberror text-white"
            }`}
          >
            {ultimoResultado.valido ? "✓" : "✕"}
          </div>
          <p
            className={`mt-3 text-lg font-bold ${
              ultimoResultado.valido ? "text-ok" : "text-kberror"
            }`}
          >
            {ultimoResultado.mensaje}
          </p>
          {ultimoResultado.pasajeroNombre && (
            <p className="mt-1 text-base text-muted-2">{ultimoResultado.pasajeroNombre}</p>
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
        <div className="overflow-hidden kb-card kb-on-white">
          <div className="border-b border-line px-6 py-4">
            <h2 className="text-sm font-bold text-brand-dark">Últimas validaciones</h2>
          </div>
          <ul>
            {historial.map((h, i) => (
              <li key={i} className="flex items-center justify-between px-6 py-3 text-sm">
                <span className="text-muted-2">{h.pasajeroNombre ?? h.mensaje}</span>
                <span className={`font-semibold ${h.valido ? "text-ok" : "text-kberror"}`}>
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
