/**
 * Preguntas frecuentes de Ayuda (reescritas el 30-oct-2026 a partir de lo que hace hoy el sistema,
 * leído en el código de la web y de la API). Regla del director: la Ayuda no promete nada que el
 * sistema no haga. Los textos marcados en el documento de revisión para Jorge (ayuda-textos-para-jorge)
 * se confirman con él antes de publicar.
 */
export interface PreguntaAyuda {
  p: string;
  r: string;
  /** Acceso directo opcional bajo la respuesta. "whatsapp" abre el WhatsApp de soporte. */
  enlace?: { texto: string; href: string };
}

export interface TemaPreguntas {
  id: string;
  titulo: string;
  preguntas: PreguntaAyuda[];
}

export const TEMAS_AYUDA: TemaPreguntas[] = [
  {
    id: "antes-de-viajar",
    titulo: "Antes de viajar",
    preguntas: [
      {
        p: "¿Qué necesito para subir al bus?",
        r: "Tu código QR del boleto (en el celular o impreso) y el documento del pasajero que registraste al comprar (cédula o pasaporte). Si compraste con tarifa de niño, tercera edad o discapacidad, o un asiento solo para mujeres, se verifica con el documento al abordar.",
      },
      {
        p: "¿Qué es el acceso al andén?",
        r: "En los terminales que lo usan, es un segundo código QR para pasar el torniquete del terminal. Aparece en tu boleto cuando está listo. Si tu cooperativa no lo usa, no verás este código y solo necesitas el QR de tu boleto.",
      },
      {
        p: "¿Con cuánta anticipación llego al terminal?",
        r: "Te recomendamos llegar al menos 30 minutos antes de la salida para ubicar tu andén y abordar con calma.",
      },
    ],
  },
  {
    id: "mi-boleto",
    titulo: "Mi boleto",
    preguntas: [
      {
        p: "¿Dónde encuentro mi boleto?",
        r: "Al terminar la compra ves tu boleto con su QR: puedes descargarlo, compartirlo o tomarle una captura. También te llega a tu correo con el boleto en PDF (revisa la carpeta de spam). Si tienes cuenta, siempre está en Mi cuenta → Mis boletos.",
        enlace: { texto: "Ir a Mis boletos", href: "/perfil?tab=boletos" },
      },
      {
        p: "Compré sin cuenta y no encuentro mi boleto",
        r: "Busca el correo de Klumbus en el correo que dejaste al comprar (revisa también la carpeta de spam). Si no lo encuentras, escríbenos por WhatsApp con el nombre del pasajero, la ruta y la fecha del viaje.",
        enlace: { texto: "Escríbenos por WhatsApp", href: "whatsapp" },
      },
      {
        p: "¿Me avisan antes del viaje?",
        r: "Sí: unas 24 horas antes de la salida te enviamos un recordatorio al WhatsApp que dejaste al comprar.",
      },
    ],
  },
  {
    id: "cambios",
    titulo: "Cambios y cancelaciones",
    preguntas: [
      {
        p: "¿Puedo cancelar mi boleto?",
        r: "Depende de la cooperativa: antes de pagar te avisamos si no permite cancelar. Si lo permite, con tu cuenta lo cancelas en Mis boletos → Más opciones → Cancelar boleto, hasta las horas antes de la salida que fija la cooperativa. Al cancelar se libera tu asiento; hoy la cancelación no genera devolución de dinero.",
      },
      {
        p: "¿Puedo cambiar la fecha o la hora de mi viaje?",
        r: "Por ahora el cambio no se hace desde la web. Escríbenos por WhatsApp y te ayudamos según la política de la cooperativa. Si el nuevo pasaje es más barato, la diferencia queda como crédito en tu cuenta (Mi cuenta → Créditos) para usarlo con esa misma cooperativa.",
        enlace: { texto: "Escríbenos por WhatsApp", href: "whatsapp" },
      },
      {
        p: "Compré sin cuenta, ¿cómo cancelo o cambio?",
        r: "Escríbenos por WhatsApp o con el formulario de abajo, con el nombre del pasajero, la ruta y la fecha. Te ayudamos según la política de la cooperativa.",
        enlace: { texto: "Escríbenos por WhatsApp", href: "whatsapp" },
      },
    ],
  },
  {
    id: "pagos",
    titulo: "Pagos y factura",
    preguntas: [
      {
        p: "¿Cómo puedo pagar?",
        r: "Con tarjeta de crédito o débito, o con DeUna. Algunas cooperativas también aceptan transferencia: subes el comprobante y la cooperativa lo revisa antes de confirmar tu boleto. Las opciones que aparecen al pagar son las que acepta esa cooperativa.",
      },
      {
        p: "Mi pago fue rechazado",
        r: "Revisa los datos de tu tarjeta y que tenga saldo o cupo, o prueba con otra forma de pago. Si el problema sigue, escríbenos y cuéntanos qué mensaje te apareció.",
      },
      {
        p: "¿Cómo pido mi factura?",
        r: "Con tu cuenta, en Mis boletos → Más opciones → Solicitar factura. La cooperativa la emite en su propio sistema y te la envía. Si compraste sin cuenta, escríbenos con los datos de tu compra.",
      },
    ],
  },
  {
    id: "cuenta",
    titulo: "Mi cuenta y reclamos",
    preguntas: [
      {
        p: "Olvidé mi contraseña",
        r: "En Iniciar sesión, toca “¿Olvidaste tu contraseña?” y te enviamos un enlace a tu correo para crear una nueva.",
        enlace: { texto: "Recuperar contraseña", href: "/recuperar-password" },
      },
      {
        p: "No me llegó el correo para verificar mi cuenta",
        r: "Revisa la carpeta de spam. Si no está, pide un enlace nuevo (te pediremos iniciar sesión).",
        enlace: { texto: "Pedir un enlace nuevo", href: "/verificar-correo?reenviar=1" },
      },
      {
        p: "Tuve un problema con mi viaje o mi cobro",
        r: "Con tu cuenta: en Mis boletos → Más opciones → Reportar un problema. La cooperativa recibe tu reclamo y te responde por correo; sigues el estado en Mis reclamos. Sin cuenta: escríbenos por WhatsApp o con el formulario de abajo.",
      },
    ],
  },
];
