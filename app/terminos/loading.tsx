import { EsqueletoPagina } from "@/components/EsqueletoPagina";

/** Se ve al instante mientras el servidor prepara la página (navegacion-rapida). */
export default function Cargando() {
  return <EsqueletoPagina tipo="texto" />;
}
