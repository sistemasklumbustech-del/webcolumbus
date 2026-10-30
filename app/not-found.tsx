import Link from "next/link";
import { PantallaAviso } from "@/components/PantallaAviso";

export const metadata = {
  title: "Página no encontrada | Klumbus",
};

/** 404 propio en español (antes salía el de Next.js en inglés: "This page could not be found."). */
export default function NoEncontrada() {
  return (
    <PantallaAviso
      codigo="Error 404"
      titulo="No encontramos esta página"
      texto="Puede que el enlace esté mal escrito o que la página ya no exista. Busca tu pasaje desde el inicio."
    >
      <Link href="/" className="kb-btn kb-btn--primary">
        Buscar pasajes
      </Link>
      <Link href="/ayuda" className="kb-btn kb-btn--outline">
        Ir a Ayuda
      </Link>
    </PantallaAviso>
  );
}
