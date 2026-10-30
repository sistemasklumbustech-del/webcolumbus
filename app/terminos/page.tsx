import { obtenerTerminosVigente, type VersionTerminos } from "@/lib/api";
import { BotonReintentar } from "@/components/BotonReintentar";
import { DocumentoLegal, DocumentoLegalError, idDeSeccion, type SeccionLegal } from "@/components/DocumentoLegal";

export const metadata = {
  title: "Términos de Servicio | Klumbus",
};

/**
 * RF-024 (17-sep-2026) -- página dinámica, ya no texto fijo: trae la
 * versión vigente desde el backend (terminos_condiciones), que es la
 * misma que el registro y el checkout de invitado registran como
 * aceptada. El contenido se guarda en texto plano con un formato
 * simple ("N. Título" seguido de párrafo, o de líneas "- " para
 * listas) -- se parsea aquí en vez de guardar HTML/markdown crudo en
 * la base, para no abrir la puerta a inyectar markup desde el panel
 * de administración que todavía no existe (RF-024 solo cubre
 * versionado y aceptación, no un editor de contenido).
 */
function seccionesDe(contenido: string): SeccionLegal[] {
  const bloques = contenido.trim().split(/\n\n+/);
  return bloques.map((bloque, i) => {
    const [titulo, ...resto] = bloque.split("\n").filter(Boolean);
    const esLista = resto.length > 0 && resto.every((l) => l.trim().startsWith("- "));
    return {
      id: idDeSeccion(titulo, i),
      titulo,
      bloques: esLista
        ? [{ tipo: "lista", items: resto.map((l) => l.replace(/^-\s*/, "")) }]
        : [{ tipo: "parrafo", texto: resto.join(" ") }],
    };
  });
}

export default async function TerminosPage() {
  let version: VersionTerminos;
  try {
    version = await obtenerTerminosVigente();
  } catch {
    return <DocumentoLegalError titulo="Términos de Servicio" accion={<BotonReintentar />} />;
  }
  const fechaVigencia = new Date(version.vigenteDesde).toLocaleDateString("es-EC", {
    timeZone: "America/Guayaquil",
    month: "long",
    year: "numeric",
  });

  return (
    <DocumentoLegal
      titulo="Términos de Servicio"
      subtitulo={`Versión ${version.version} · vigente desde ${fechaVigencia}`}
      secciones={seccionesDe(version.contenido)}
      pie={
        <>
          Este documento es un borrador redactado de buena fe según cómo opera la plataforma hoy.
          No sustituye una revisión legal formal.
        </>
      }
    />
  );
}
