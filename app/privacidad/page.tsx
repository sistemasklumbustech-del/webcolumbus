import { DocumentoLegal, type SeccionLegal } from "@/components/DocumentoLegal";

export const metadata = {
  title: "Política de Privacidad | Klumbus",
};

/**
 * Política de Privacidad -- footer real (20-ago-2026). Describe los
 * datos que la plataforma realmente recolecta, confirmado contra el
 * código real (cedula/documento para validar identidad, telefono
 * para WhatsApp -- aunque hoy simulado, correo, datos de pago que
 * pasan por pasarelas externas, no se guardan en la plataforma).
 *
 * Rediseño (30-oct-2026): mismo texto, ahora como datos para el índice y las anclas.
 */
const SECCIONES: SeccionLegal[] = [
  {
    id: "seccion-1",
    titulo: "1. Qué datos recolectamos",
    bloques: [
      { tipo: "parrafo", texto: "Para poder venderte un boleto real y que puedas abordar, necesitamos:" },
      {
        tipo: "lista",
        items: [
          "Tu nombre completo y número de cédula o pasaporte -- para identificarte al abordar.",
          "Tu correo y/o teléfono -- para enviarte la confirmación de tu compra.",
          "Los datos de tu pago -- estos los procesa directamente la pasarela de pago (tarjeta, De Una, PayPhone, transferencia); Klumbus no almacena tu número de tarjeta.",
        ],
      },
    ],
  },
  {
    id: "seccion-2",
    titulo: "2. Para qué usamos tus datos",
    bloques: [
      {
        tipo: "lista",
        items: [
          "Generar tu boleto con código QR y validarte al abordar.",
          "Enviarte la confirmación de compra y avisos sobre tu viaje.",
          "Calcular descuentos legales cuando aplican (menor de edad, tercera edad, discapacidad).",
          "Prevenir fraude y mantener segura tu cuenta.",
        ],
      },
    ],
  },
  {
    id: "seccion-3",
    titulo: "3. Con quién compartimos tus datos",
    bloques: [
      {
        tipo: "parrafo",
        texto:
          "Compartimos los datos estrictamente necesarios de tu viaje (nombre, documento, asiento) con la cooperativa de transporte que opera tu boleto -- es quien necesita validar tu identidad al abordar. No vendemos tus datos a terceros con fines de publicidad.",
      },
    ],
  },
  {
    id: "seccion-4",
    titulo: "4. Cuánto tiempo guardamos tus datos",
    bloques: [
      {
        tipo: "parrafo",
        texto:
          "Guardamos el historial de tus compras mientras tengas una cuenta activa. Si eliminas tu cuenta, anonimizamos tus datos personales -- los boletos ya emitidos conservan la información del pasajero que viajó, por requisito de auditoría del transporte.",
      },
    ],
  },
  {
    id: "seccion-5",
    titulo: "5. Tus derechos",
    bloques: [
      {
        tipo: "parrafo",
        texto:
          "Puedes pedirnos ver, corregir, o eliminar tu cuenta y tus datos personales en cualquier momento desde tu perfil, o escribiéndonos directamente.",
      },
    ],
  },
  {
    id: "seccion-6",
    titulo: "6. Contacto",
    bloques: [
      {
        tipo: "parrafo",
        texto:
          "Para cualquier duda sobre tus datos, puedes escribirnos a través de los datos de contacto que aparecen en el pie de página de este sitio.",
      },
    ],
  },
];

export default function PrivacidadPage() {
  return (
    <DocumentoLegal
      titulo="Política de Privacidad"
      subtitulo="Última actualización: agosto de 2026"
      secciones={SECCIONES}
      pie={
        <>
          Este documento es un borrador redactado de buena fe según cómo opera la plataforma hoy.
          No sustituye una revisión legal formal.
        </>
      }
    />
  );
}
