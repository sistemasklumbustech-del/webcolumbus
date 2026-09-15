# CONTEXT.md — Columbus / TicketYa

Última actualización: 14-sep-2026. Este archivo resume todo lo decidido y avanzado hasta ahora, para que cualquier sesión nueva (Claude Code, otro desarrollador, o retomar en otro chat) parta del mismo punto sin tener que reconstruir el contexto desde cero.

---

## 1. Qué es el proyecto

Plataforma de venta en línea de boletos de transporte interprovincial en Ecuador (nombre interno: **Columbus**, también referido como **TicketYa**). Conecta tres partes:

- **Pasajeros**: buscan viajes, eligen asiento, pagan, reciben boleto con QR.
- **Cooperativas de transporte**: gestionan sus propias rutas, buses, choferes, ventas y liquidaciones — cada una aislada de las demás dentro del mismo sistema (multi-tenant real).
- **Terminal terrestre**: exige registro oficial de cada viaje y venta ante su propio sistema de tasas (SIAT3000, proveedor Derpacif S.A.).

Cliente formal del proyecto: **Terminal Terrestre de Machala EP** (documento de requerimiento funcional oficial recibido y analizado — ver sección 6).

---

## 2. Arquitectura del código

### 2.1 Separación en dos repos (09-sep-2026)

El proyecto era un monorepo (`ticketya`, Turborepo) y se dividió **quirúrgicamente, sin conservar historial de git** (decisión tomada a propósito) en dos repos nuevos:

- **Backend**: `https://github.com/sistemasklumbustech-del/apiklumbus`
- **Frontend**: repo separado, aún no trabajado en el servidor.

### 2.2 Backend (`columbus-api` / `apiklumbus`)

```
columbus-api/
├── package.json          -- raíz, workspaces npm: ["api", "db"] (sin Turborepo)
├── api/                   -- NestJS 11, arquitectura hexagonal
│   └── src/
│       ├── dominio/        -- puertos/interfaces, reglas de negocio puras
│       ├── aplicacion/     -- casos de uso
│       ├── infraestructura/-- implementaciones concretas (DB, pagos simulados, SIAT3000 futuro)
│       └── presentacion/   -- controllers, DTOs, guards (16 módulos de negocio)
└── db/                    -- @columbus/db — schema Drizzle + 42 migraciones + scripts de verificación RLS
```

- `npm install` va en la **raíz** (resuelve `@columbus/db` como symlink de workspace).
- `.env` real va en `api/.env` (no en la raíz).
- Puerto backend: **3001** (crítico — no debe chocar con el 3000 del frontend).

### 2.3 Frontend (`columbus-web`)

- Next.js 16 (App Router) + React 19 + Tailwind v4.
- Toda la comunicación con el backend pasa por un único archivo, `lib/api.ts` (~90 funciones, 40+ interfaces TypeScript replicadas a mano — **no hay generación automática de tipos compartidos**, es deuda técnica conocida).
- Variable de conexión: `NEXT_PUBLIC_API_URL`.

---

## 3. Base de datos — decisiones clave (no obvias, no reinventar)

### 3.1 Aislamiento multi-tenant (RLS)

- Dos roles de Postgres, **con nombres literales que forman parte de la lógica de seguridad — nunca renombrar**: `ticketya_app` y `ticketya_platform_admin`.
- `ticketya_platform_admin` **no usa el atributo nativo `BYPASSRLS`** — el "bypass" está incrustado como excepción dentro de cada política RLS (`current_user = 'ticketya_platform_admin'`, comparación de texto). Esto viene de una limitación histórica (Postgres administrado, sin superusuario real) que ya no aplica en el VPS actual, pero el mecanismo se mantuvo igual por consistencia con las 42 migraciones ya escritas.
- El backend usa **dos `Pool` de `pg` separados** (no `SET LOCAL role`), inyectados en NestJS como `DRIZZLE_DB` y `DRIZZLE_DB_PUBLICO` vía `DatabaseModule` (`@Global()`).
- El `cooperativa_id` de cada request se setea con `SELECT set_config('app.current_cooperativa_id', $1, true)` dentro de una transacción (`ejecutarComoCooperativa()`, en `infraestructura/database/tenant-transaction.ts`) — el `true` final es el equivalente parametrizado y seguro de `SET LOCAL`, se descarta solo al hacer commit/rollback.
- ⚠️ Antes de este diseño el backend se conectaba como superusuario `postgres`, lo que hacía que Postgres ignorara TODAS las políticas RLS (comportamiento estándar de Postgres con superusuarios) — la protección existía en la base de datos pero no se usaba de verdad. Ya corregido.

### 3.2 Migraciones

- 42 migraciones de esquema (`packages/db/migrations/*.sql`, numeradas) + 5 migraciones manuales (`migrations/manual/`).
- **Orden real de las manuales (no alfabético)**: `004_habilitar_login_roles.sql` → `001_bypass_rls_admin.sql` (histórico/no-op) → `002_grants_app_role.sql` → `003_auditoria_inmutable.sql` → `005_grants_banners_y_default_privileges.sql`.
- Se aplican con `npm run db:migrar` (`db/scripts/aplicar-migraciones.cjs`), que lleva registro propio en `_migraciones_aplicadas` — correrlo varias veces es seguro, no reaplica nada.
- `005` ya dejó configurado `ALTER DEFAULT PRIVILEGES` — **cualquier tabla nueva hereda automáticamente los permisos correctos**, no hace falta escribir un GRANT manual para tablas nuevas.
- Requiere `DATABASE_URL_MIGRACIONES` con privilegios de superusuario — nunca la conexión normal de la app.

### 3.3 Pruebas de aislamiento

- `packages/db/verify_rls_isolation.cjs` y `verify_edge_cases.cjs` — scripts standalone (no parte de `npm test`), se corren manualmente contra una base ya migrada.

---

## 4. Infraestructura / servidor

### 4.1 VPS actual (el que se está configurando ahora)

| Dato | Valor |
|---|---|
| Proveedor | Hostinger, **exclusivo** para este proyecto |
| IP | `141.136.44.185` |
| Hostname | `srv1976698` |
| SO | Ubuntu 24.04.5 LTS |
| Plan | KVM 4 — 4 vCPU / 16 GB RAM / 200 GB SSD |
| Acceso | usuario `dev` (grupo `sudo`), SSH con llave |
| Base de datos | `ticketya` (Postgres 16, cluster único, puerto 5432) |
| Ambientes | **Uno solo por ahora** (decisión tomada 14-sep-2026, para ganar tiempo) — no hay separación dev/staging/prod todavía; queda como posible trabajo futuro |

### 4.2 Seguridad ya aplicada y verificada

- UFW activo: solo 22 (SSH), 80, 443 permitidos. 5432 denegado y verificado desde afuera.
- `listen_addresses = 'localhost'` en Postgres — ni siquiera escucha en la interfaz pública.
- `pg_hba.conf` sin ninguna regla `0.0.0.0/0`.
- Las contraseñas de `ticketya_app` y `ticketya_platform_admin` **fueron rotadas** (14-sep-2026) tras exponerse accidentalmente en un chat — las actuales solo existen en `api/.env` del servidor.

### 4.3 Historial relevante (para no repetir errores)

Hubo un VPS anterior compartido (con otro proyecto, `dentax_db`) donde se llegó a tener Postgres expuesto a `0.0.0.0` sin firewall — **ya no se está usando ese servidor**, se migró a este VPS dedicado. Si en algún momento aparece referencia a "el servidor compartido" o a `dentax`, es de ese contexto anterior, ya descartado.

---

## 5. Integración con el terminal (SIAT3000 / Derpacif)

### 5.1 Qué es

Web service **SOAP** (WSDL, `ws_ApiSiat?wsdl`) de Derpacif S.A., para registrar electrónicamente ante el terminal cada viaje y cada venta de boleto, y obtener un código de tasa (QR de 20 dígitos) obligatorio para que el boleto sea válido en el terminal físico.

### 5.2 Decisión de arquitectura

Puerto de dominio + adaptador (no acoplar el backend directo al SOAP de Derpacif, porque no todos los terminales de Ecuador usan el mismo proveedor):

```
dominio/integraciones-terminal/integracion-terminal.ports.ts
infraestructura/integraciones-terminal/derpacif-siat3000/...
```

### 5.3 Modelo de datos — YA DISEÑADO, aún no migrado a producción

Archivo `db/schema/integraciones-terminal.ts` (entregado, compila sin errores contra el resto del schema real). Soporta el **Modo A/B de usuario técnico** que exige el requerimiento funcional del TTM (RF-016):

- `credenciales_integracion_terminal` — 1 fila por terminal físico, define modo (`unico` | `por_cooperativa`).
- `credenciales_terminal_por_cooperativa` — solo si el modo es `por_cooperativa`.
- `mapeo_entidades_terminal` — traduce IDs locales ↔ IDs del terminal (bus/ruta/tarifa).
- `registros_tasa_terminal` — auditoría + idempotencia de cada llamada real (el QR vive acá).

**Nunca se guarda el secreto real de autenticación en estas tablas** — solo una referencia (`secretoRef`), porque el mecanismo real de autenticación de SIAT3000 todavía no está confirmado por Derpacif.

### 5.4 Estado real: Fase 0 (bloqueada, esperando respuesta externa)

Carta con 11 preguntas técnicas redactada y lista para enviar a Derpacif/TTM (vigencia del WSDL de 2018, mecanismo de autenticación real, modo A o B soportado, formato de varios campos inconsistentes en el manual, ambiente de certificación/sandbox, catálogo de errores). **No confirmado si ya se envió ni si hay respuesta.**

No avanzar la Fase 2 (adaptador SOAP real) sin esas respuestas — se estaría codeando contra suposiciones.

---

## 6. Requerimiento funcional formal del cliente (TTM EP)

Documento recibido: `Requerimiento_Funcional_Plataforma_Venta_Boletos_TTM_EP.docx` (25 RF, 12 RN, 12 RNF, matriz de trazabilidad, criterios de aceptación).

**Hallazgo principal**: gran parte de los 25 requisitos **ya estaban implementados** antes de leer el documento (compra como invitado, desglose de precios, idempotencia en pagos, comprobantes multi-emisor, LOPDP — derecho de eliminación y principio de conservación con limpieza automática de tokens). No se está partiendo de cero frente a este documento.

**Brechas reales identificadas** (trabajo pendiente genuino):
1. Conector SIAT3000 real (bloqueado en Fase 0, sección 5.4).
2. Modo A/B de usuario técnico (ya diseñado en el schema, sección 5.3, pendiente de migrar).
3. Estado explícito de orden (RF-006, 9 estados) — hoy es implícito, derivado de combinar `pagos.estado` + `boletos.estado`.
4. Aplicación móvil — no existe ningún código todavía.
5. Versionado de términos y condiciones (RF-024) — no confirmado si existe.
6. Reportes de conciliación pago↔boleto↔tasa↔comprobante.
7. Ambiente de certificación separado de producción para pruebas con SIAT3000.

Plan completo de 11 fases entregado (desde Fase 0 hasta certificación end-to-end) — ver el informe `Analisis_Plan_Fases_TTM_EP.md` si se necesita el detalle completo de cada fase.

---

## 7. Estado actual exacto (dónde quedamos)

- ✅ Repos separados y subidos a GitHub.
- ✅ VPS dedicado provisionado, Postgres 16 instalado, seguridad de red (UFW/pg_hba) verificada.
- ✅ Base `ticketya` creada, roles `ticketya_app`/`ticketya_platform_admin` creados con contraseñas rotadas.
- ✅ Schema de integración SIAT3000 diseñado y verificado que compila.
- ⏳ **Pendiente inmediato**: copiar `integraciones-terminal.ts` al repo antes de migrar, instalar Node.js en el VPS, clonar el repo ahí, `npm install`, generar la migración 42+1, correr `npm run db:migrar`, correr los scripts de verificación RLS, levantar la API por primera vez.
- ⏳ Nginx + systemd (para que la API sobreviva reinicios y tenga HTTPS) — no empezado.
- ⏳ Frontend — no desplegado en ningún servidor todavía.
- ⏳ Carta a Derpacif/TTM con las 11 preguntas — redactada, no confirmado si se envió.
- ⏳ Documento de presentación para el cliente (alcance final, lenguaje simple, con diagramas) — ya entregado en `.md` y `.html`.

---

## 8. Convenciones a respetar en todo el proyecto

- Todo el código, comentarios y nombres de variables/tablas del dominio de negocio están en **español**.
- Nunca renombrar `ticketya_app` / `ticketya_platform_admin` — son literales usados dentro de políticas RLS.
- Nunca commitear `.env` reales — solo `.env.example`.
- Nunca conectar el backend como superusuario de Postgres.
- Cualquier tabla nueva no necesita GRANT manual (ya cubierto por `ALTER DEFAULT PRIVILEGES`).
- No usar `BYPASSRLS` nativo aunque ahora sí haya superusuario disponible — mantener el mecanismo de excepción por política, por consistencia con las migraciones existentes.
