/**
 * Reduce una imagen ANTES de subirla (24-sep-2026): una foto de celular pesa
 * 4-10 MB y se subiría lenta o la rechazaría el límite del servidor. Se
 * redimensiona a un lado máximo y se convierte a WebP; el servidor la vuelve
 * a optimizar al guardarla. Los PDF y lo que no sea imagen pasan sin tocar.
 * Si por cualquier razón no se puede comprimir (navegador antiguo), devuelve
 * el archivo original.
 */
export async function comprimirImagen(archivo: File, ladoMaximo = 1600, calidad = 0.82): Promise<File> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type)) return archivo;
  try {
    const bitmap = await createImageBitmap(archivo, { imageOrientation: "from-image" });
    const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height));
    const ancho = Math.max(1, Math.round(bitmap.width * escala));
    const alto = Math.max(1, Math.round(bitmap.height * escala));
    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;
    const ctx = lienzo.getContext("2d");
    if (!ctx) return archivo;
    ctx.drawImage(bitmap, 0, 0, ancho, alto);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolver) => lienzo.toBlob(resolver, "image/webp", calidad));
    // Si no se pudo generar WebP, o quedó más grande que el original, se sube el original.
    if (!blob || blob.type !== "image/webp" || blob.size >= archivo.size) return archivo;
    const nombre = archivo.name.replace(/\.[^.]+$/, "") || "imagen";
    return new File([blob], `${nombre}.webp`, { type: "image/webp" });
  } catch {
    return archivo;
  }
}
