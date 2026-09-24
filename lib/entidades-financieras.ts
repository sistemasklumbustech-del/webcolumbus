import type { EntidadFinanciera } from "@/lib/api";

export const ENTIDADES_FINANCIERAS: Array<{ valor: EntidadFinanciera; etiqueta: string }> = [
  { valor: "banco_pichincha", etiqueta: "Banco Pichincha" },
  { valor: "banco_guayaquil", etiqueta: "Banco Guayaquil" },
  { valor: "banco_pacifico", etiqueta: "Banco del Pacífico" },
  { valor: "produbanco", etiqueta: "Produbanco" },
  { valor: "banco_bolivariano", etiqueta: "Banco Bolivariano" },
  { valor: "banco_internacional", etiqueta: "Banco Internacional" },
  { valor: "diners_club", etiqueta: "Diners Club" },
  { valor: "banco_ruminahui", etiqueta: "Banco Rumiñahui" },
  { valor: "coop_jep", etiqueta: "Coop. JEP" },
  { valor: "coop_jardin_azuayo", etiqueta: "Coop. Jardín Azuayo" },
  { valor: "otro", etiqueta: "Otra entidad" },
];

export const ETIQUETA_ENTIDAD: Record<string, string> = Object.fromEntries(
  ENTIDADES_FINANCIERAS.map((e) => [e.valor, e.etiqueta]),
);
