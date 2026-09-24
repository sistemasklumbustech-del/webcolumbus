"use client";

import { useRef, useState } from "react";

/**
 * Elegir una imagen desde el computador o el celular (con la cámara o la
 * galería), con vista previa. Como alternativa flexible también permite
 * pegar el enlace de una imagen ya subida. El archivo se sube con `subir`
 * (que lo reduce de tamaño y devuelve la URL final); el enlace pegado se usa tal cual.
 */
export function SelectorImagen({
  id,
  valor,
  onCambio,
  subir,
  redonda = false,
  onError,
}: {
  id: string;
  valor: string;
  onCambio: (url: string) => void;
  subir: (archivo: File) => Promise<string>;
  redonda?: boolean;
  onError?: (mensaje: string) => void;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setAviso(null);
    setSubiendo(true);
    try {
      onCambio(await subir(archivo));
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo subir la imagen.";
      setAviso(mensaje);
      onError?.(mensaje);
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        {valor ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL dinámica del almacenamiento, no un asset local
          <img
            src={valor}
            alt="Vista previa"
            className={`h-16 w-16 shrink-0 object-cover ring-1 ring-black/10 ${redonda ? "rounded-full" : "rounded-lg"}`}
          />
        ) : (
          <div
            aria-hidden="true"
            className={`flex h-16 w-16 shrink-0 items-center justify-center bg-brand-light/40 text-center text-[10px] text-brand-dark/40 ${redonda ? "rounded-full" : "rounded-lg"}`}
          >
            Sin imagen
          </div>
        )}
        <div>
          <input
            ref={entrada}
            id={`${id}-archivo`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={alElegir}
            className="sr-only"
          />
          <button
            type="button"
            disabled={subiendo}
            onClick={() => entrada.current?.click()}
            className="rounded-lg bg-brand-amber px-4 py-2 text-sm font-semibold text-brand-dark transition hover:brightness-95 disabled:opacity-50"
          >
            {subiendo ? "Subiendo..." : valor ? "Cambiar imagen" : "Subir imagen"}
          </button>
          <p className="mt-1 text-xs text-brand-dark/50">Desde tu computador o celular · JPG, PNG o WEBP.</p>
        </div>
      </div>
      {aviso && <p className="text-sm font-medium text-red-600">{aviso}</p>}
      <details className="text-xs text-brand-dark/60">
        <summary className="cursor-pointer font-semibold">O pega el enlace de una imagen</summary>
        <input
          id={id}
          type="text"
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          placeholder="https://..."
          className="mt-2 w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
        />
      </details>
    </div>
  );
}
