import { Hero } from "@/components/Hero";
import { ComoFunciona } from "@/components/ComoFunciona";
import { DestinosPopulares } from "@/components/DestinosPopulares";
import { TerminalesAliadas } from "@/components/TerminalesAliadas";
import { FranjaBanners } from "@/components/FranjaBanners";
import { RutasDisponibles } from "@/components/RutasDisponibles";
import { BienvenidaMovil } from "@/components/BienvenidaMovil";
import { ComparativaTaquilla } from "@/components/ComparativaTaquilla";
import { AppProximamente } from "@/components/AppProximamente";

export default function InicioPage() {
  return (
    <main className="flex-1">
      <BienvenidaMovil />
      <Hero />

      <FranjaBanners />

      <ComoFunciona />
      <DestinosPopulares />
      <TerminalesAliadas />

      <RutasDisponibles />

      <ComparativaTaquilla />
      <AppProximamente />
    </main>
  );
}
