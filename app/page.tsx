import { Hero } from "@/components/Hero";
import { ComoFunciona } from "@/components/ComoFunciona";
import { DestinosPopulares } from "@/components/DestinosPopulares";
import { TerminalesAliadas } from "@/components/TerminalesAliadas";
import { FranjaBanners } from "@/components/FranjaBanners";
import { RutasDisponibles } from "@/components/RutasDisponibles";
import { BienvenidaMovil } from "@/components/BienvenidaMovil";

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

      <section className="mx-auto max-w-[1280px] px-5 pb-14 pt-[30px] md:px-16 md:pt-14">
        <h2 className="mb-3.5 text-[21px] font-semibold md:mb-[18px] md:text-2xl">¿Por qué Klumbus?</h2>
        <div className="flex flex-col gap-2.5 md:grid md:grid-cols-3 md:gap-4">
          <div className="rounded-[20px] bg-kbyellow-soft p-4 md:rounded-card md:p-6">
            <p className="mb-1 text-[15px] font-semibold md:mb-1.5 md:text-[17px]">Todas las cooperativas</p>
            <p className="text-[13px] text-[#4A4F5C] md:text-sm">
              Compara horarios y precios de distintas cooperativas para la misma ruta, en un solo lugar.
            </p>
          </div>
          <div className="rounded-[20px] bg-kbyellow-soft p-4 md:rounded-card md:p-6">
            <p className="mb-1 text-[15px] font-semibold md:mb-1.5 md:text-[17px]">Asiento elegido por ti</p>
            <p className="text-[13px] text-[#4A4F5C] md:text-sm">
              Ve el mapa real del bus y elige tu puesto antes de pagar.
            </p>
          </div>
          <div className="rounded-[20px] bg-kbyellow-soft p-4 md:rounded-card md:p-6">
            <p className="mb-1 text-[15px] font-semibold md:mb-1.5 md:text-[17px]">Boleto digital al instante</p>
            <p className="text-[13px] text-[#4A4F5C] md:text-sm">
              Tu código QR llega apenas se confirma el pago — nada que imprimir.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
