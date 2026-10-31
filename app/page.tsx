import { Hero } from "@/components/Hero";
import { FOTOS, srcHorizontal, srcVertical } from "@/lib/hero-fotos";
import { ComoFunciona } from "@/components/ComoFunciona";
import { RutasDisponibles } from "@/components/RutasDisponibles";
import { BienvenidaMovil } from "@/components/BienvenidaMovil";
import { ComparativaTaquilla } from "@/components/ComparativaTaquilla";
import { AppProximamente } from "@/components/AppProximamente";
import dynamic from "next/dynamic";

// Secciones de más abajo: se importan con next/dynamic para que el JavaScript de sus partes
// interactivas (franja de banners, carrusel de destinos, mapa de salidas) vaya en trozos aparte y no
// compita con la foto principal al cargar. Siguen saliendo en el HTML: se ven igual y Google las lee.
const FranjaBannersPortada = dynamic(() => import("@/components/SeccionesPortada").then((m) => m.FranjaBannersPortada));
const DestinosPopulares = dynamic(() => import("@/components/DestinosPopulares").then((m) => m.DestinosPopulares));
const TerminalesAliadas = dynamic(() => import("@/components/TerminalesAliadas").then((m) => m.TerminalesAliadas));

// La portada se guarda 60 s en el servidor (navegacion-rapida): abre al instante sin esperar a la API.
export const revalidate = 60;

export default function InicioPage() {
  return (
    <main className="flex-1">
      {/* Aviso temprano al navegador (va al <head>): la primera foto del Hero se empieza a bajar antes
          que el resto. Una para celular y otra para PC; cada pantalla pide solo la suya (portada-velocidad). */}
      <link
        rel="preload"
        as="image"
        type="image/avif"
        media="(max-width: 767px)"
        imageSrcSet={srcVertical(FOTOS[0].vertical, "avif")}
        imageSizes="100vw"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        type="image/avif"
        media="(min-width: 768px)"
        imageSrcSet={srcHorizontal(FOTOS[0].horizontal, "avif")}
        imageSizes="(min-width: 1280px) 560px, 36vw"
        fetchPriority="high"
      />
      <BienvenidaMovil />
      <Hero />

      <FranjaBannersPortada />

      <ComoFunciona />
      <DestinosPopulares />
      <TerminalesAliadas />

      <RutasDisponibles />

      <ComparativaTaquilla />
      <AppProximamente />
    </main>
  );
}
