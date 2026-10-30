import { CodigoQr } from "@/components/CodigoQr";
import { AccesoAnden } from "@/components/AccesoAnden";
import { LogoKlumbus } from "@/components/LogoKlumbus";
import { datosDelBoleto, fechaBoleto, horaBoleto, numeroBoleto, type AndenBoleto, type BoletoVista } from "@/lib/boleto";

/**
 * El boleto (parte negra con horas, datos, corte perforado y QR), igual en la confirmación de compra
 * y en Mis boletos (rediseño, oct-2026). Se acomoda al ancho que tiene (consulta de contenedor), no al
 * de la pantalla: acostado cuando hay espacio (≥ 832 px), de pie en celular o en columnas angostas.
 * Solo muestra los datos que hay: si falta uno, su fila no aparece.
 */
export function BoletoTarjeta({
  boleto,
  anden,
  alinear = "centro",
}: {
  boleto: BoletoVista;
  anden?: AndenBoleto | null;
  /** En la confirmación va centrado; en Mis boletos, alineado con sus botones. */
  alinear?: "centro" | "inicio";
}) {
  const textoCodigo = boleto.codigoQr.length <= 20 ? boleto.codigoQr : null;
  const datos = datosDelBoleto(boleto);
  return (
    // Sin los datos del pasajero (Mis boletos, mientras la API no los mande) el boleto va siempre de
    // pie: acostado quedaría un bloque negro alto y vacío al lado del QR. Su propio contenedor se
    // limita a 520 px, así las variantes @[52rem] (≥ 832 px) nunca aplican.
    <div className={`@container flex w-full ${datos.length > 0 ? "" : "max-w-[520px]"} ${alinear === "inicio" ? "justify-start" : "justify-center"}`}>
      <article
        className={`kb-ticket w-full max-w-[520px] @[52rem]:grid @[52rem]:max-w-none ${
          "@[52rem]:grid-cols-[1fr_1fr_250px]"
        }`}
      >
        <div className="kb-ticket__top flex flex-col gap-4 @[52rem]:justify-between @[52rem]:gap-5 @[52rem]:p-[26px]">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
            <LogoKlumbus className="h-[22px] shrink-0 @[52rem]:h-6" />
            <span className="min-w-0 text-right text-xs font-semibold text-kbyellow">{boleto.cooperativa}</span>
          </div>
          <div className="kb-timeline">
            <div>
              <div className="text-[26px] font-semibold tabular-nums @[52rem]:text-[30px]">{horaBoleto(boleto.salida)}</div>
              <div className="kb-timeline__city !text-ondark">{boleto.origen}</div>
            </div>
            <div className="flex flex-col items-center gap-[3px] text-[11px] text-ondark @[52rem]:text-xs">
              <span className="whitespace-nowrap">{fechaBoleto(boleto.salida)}</span>
              <div className="kb-timeline__line w-full [&::after]:!border-[#4A4F5C] [&::before]:!border-[#4A4F5C]">
                <span className="kb-timeline__bus shrink-0 !bg-kbyellow">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0B0D12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="4" y="3" width="16" height="15" rx="3" />
                    <path d="M4 11h16M8 21v-3M16 21v-3" />
                    <circle cx="8" cy="14.5" r=".6" />
                    <circle cx="16" cy="14.5" r=".6" />
                  </svg>
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold leading-tight @[52rem]:text-[22px]">{boleto.destino}</div>
              <div className="kb-timeline__city !text-ondark">Destino</div>
            </div>
          </div>
        </div>

        {datos.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-3.5 gap-y-3.5 p-5 @[52rem]:content-center @[52rem]:gap-y-4 @[52rem]:p-[26px]">
            {datos.map(([etiqueta, valor]) => (
              <div key={etiqueta} className={`min-w-0 ${etiqueta === "Pasajero" ? "col-span-2" : ""}`}>
                <dt className="text-[11px] text-muted-3">{etiqueta}</dt>
                <dd
                  className={`break-words text-sm font-semibold @[52rem]:text-[15px] ${
                    etiqueta === "Placa" ? "uppercase" : ""
                  } ${etiqueta === "Documento" || etiqueta === "Tarifa" || etiqueta === "Tasa de terminal" ? "tabular-nums" : ""}`}
                >
                  {etiqueta === "Asiento" && boleto.esVip ? (
                    <>
                      {boleto.asiento}
                      <span className="kb-tag kb-tag--yellow ml-1.5 align-middle">VIP</span>
                    </>
                  ) : (
                    valor
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <div className={`kb-ticket__cut @[52rem]:hidden ${datos.length === 0 ? "mt-5" : ""}`} />
        <div className="relative flex flex-col items-center gap-2 px-5 pb-5 pt-1 @[52rem]:justify-center @[52rem]:gap-2.5 @[52rem]:border-l-2 @[52rem]:border-dashed @[52rem]:border-line-2 @[52rem]:p-[22px]">
          <span className="absolute -left-[13px] -top-3 hidden h-6 w-6 rounded-full bg-kbbg @[52rem]:block" aria-hidden="true" />
          <span className="absolute -bottom-3 -left-[13px] hidden h-6 w-6 rounded-full bg-kbbg @[52rem]:block" aria-hidden="true" />
          <CodigoQr valor={boleto.codigoQr} />
          <span className="text-[13px] font-semibold tracking-[.14em] tabular-nums">
            <span className="sr-only">Boleto número </span>
            {numeroBoleto(boleto.id)}
          </span>
          {textoCodigo && <span className="text-xs tracking-[.12em] text-muted-2">{textoCodigo}</span>}
          <span className="text-xs text-muted-2">
            {anden && anden.estadoTasa !== "no_aplica" ? "Tu boleto · se valida al abordar" : "Muéstralo al subir"}
          </span>
          {anden && <AccesoAnden estado={anden.estadoTasa} codigo={anden.codigoTasa} />}
        </div>
      </article>
    </div>
  );
}
