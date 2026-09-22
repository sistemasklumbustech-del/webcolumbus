import { obtenerTerminosVigente } from "@/lib/api";

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
function renderizarContenido(contenido: string) {
  const bloques = contenido.trim().split(/\n\n+/);
  return bloques.map((bloque, i) => {
    const [titulo, ...resto] = bloque.split("\n").filter(Boolean);
    const esLista = resto.length > 0 && resto.every((l) => l.trim().startsWith("- "));
    return (
      <div key={i}>
        <h2>{titulo}</h2>
        {esLista ? (
          <ul>
            {resto.map((l, j) => (
              <li key={j}>{l.replace(/^-\s*/, "")}</li>
            ))}
          </ul>
        ) : (
          <p>{resto.join(" ")}</p>
        )}
      </div>
    );
  });
}

export default async function TerminosPage() {
  const version = await obtenerTerminosVigente();
  const fechaVigencia = new Date(version.vigenteDesde).toLocaleDateString("es-EC", {
    timeZone: "America/Guayaquil",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-12">
      <h1 className="font-display text-2xl font-bold text-brand-dark">Términos de Servicio</h1>
      <p className="mt-1 text-sm text-brand-dark/50">
        Versión {version.version} — vigente desde {fechaVigencia}
      </p>

      <div className="prose prose-sm mt-8 max-w-none text-brand-dark/80 [&>div>h2]:mt-8 [&>div>h2]:font-display [&>div>h2]:text-lg [&>div>h2]:font-bold [&>div>h2]:text-brand-dark [&>div>p]:mt-3 [&>div>p]:leading-relaxed [&>div>ul]:mt-3 [&>div>ul]:list-disc [&>div>ul]:pl-5">
        {renderizarContenido(version.contenido)}
      </div>

      <p className="mt-10 rounded-lg bg-brand-light/40 px-4 py-3 text-xs text-brand-dark/50">
        Este documento es un borrador redactado de buena fe según cómo opera la plataforma hoy.
        No sustituye una revisión legal formal.
      </p>
    </main>
  );
}
