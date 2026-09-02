# Plan: VitalFit — App de gestión de gimnasio para entrenadores

> Estado: plan aprobado en sesión de planificación (2026-09-02). Pendiente de ejecución.
> IMPORTANTE — Diseño UI: la interfaz debe seguir el diseño de Claude Design del usuario:
> https://claude.ai/design/p/0d29aeab-7fab-457a-bbfd-65bd5949faef?file=VitalFit+v2.dc.html
> Archivos del proyecto de diseño: `VitalFit v2.dc.html` (56 KB, principal), `image-slot.js`, `ios-frame.jsx`, `support.js`, `uploads/WhatsApp Image 2026-09-02 at 8.55.08 AM.jpeg` (logo).
> EL USUARIO YA ENTREGÓ EL DISEÑO: `D:\Projects\vital-fit\desing\VitalFit.html` (1.4MB, export
> autocontenido "Bundled Page" — los archivos reales van en base64 dentro de
> `<script type="__bundler/manifest">`). PRIMER PASO de la implementación: ejecutar
> `node scripts/unpack-design.js` (ya escrito) para extraerlos a `design/extracted/`, y si la
> estructura del manifest difiere de lo asumido, ajustar el script inspeccionando el JSON.
> Estudiar el `.dc.html` extraído (markup + CSS reales) antes de construir la UI.
> Dato adicional: el repo GitHub es https://github.com/RobertoGP96/vital-fit (PÚBLICO — no
> commitear secretos; `.env.local` en .gitignore).
>
> Lo observado del diseño (capturas): tema verde oscuro (fondo #0B1F14, radial-gradient #1C4230→#0B1F14),
> acento verde HeroUI #17C964 (hover #12A150), marco iPhone, header "VitalFit" con logo + campana,
> saludo "Hola, {nombre}" con fecha, buscador "Buscar clientes, sesiones...", tarjeta hero verde
> "Entrena. Mide. Evoluciona." con CTA "Ver clientes", 3 accesos rápidos (Horario, Clientes, Pagos),
> sección "Sesiones de hoy" con tarjetas por sesión (tipo con chip de color: Fuerza, Funcional; hora ·
> duración; avatares de participantes; badge "x/y asistieron"; check verde para marcar asistencia de
> todos; en detalle, check individual por participante), sección "Tus clientes", menú inferior con
> cápsula activa animada ("pop" elástico + etiqueta que se despliega con fundido). Props de diseño
> configurables: rolAdmin (bool), controlAsistencia (bool), unidadesPorDefecto (cm/in). 2 páginas.
> Animaciones: @keyframes navPop { 0% scale(.8); 55% scale(1.07); 100% scale(1) }.
> Fuente: Google Fonts (link css2 en el head del diseño).

## Contexto

El usuario quiere desarrollar desde cero (el directorio `D:\Projects\vital-fit` está vacío) una aplicación **mobile-first en español** para que los entrenadores de su gimnasio gestionen a sus clientes: datos personales de contacto, medidas corporales repetidas en el tiempo (piernas, abdomen, glúteos, peso… en cm o pulgadas), fotos de progreso, historia clínica (patologías), dieta, sesiones y horarios semanales — **individuales o grupales** (un entrenador atiende a varios clientes en el mismo horario, visible en el calendario) —, asistencia **opcional** por participante, pagos manuales (**mensualidades** como forma principal + formas excepcionales como sesión suelta), y reportes de evolución por período. Tres roles: un **admin** registra entrenadores y clientes y controla todo; un **coordinador** (entrenador con permisos extra) puede asignar clientes a cualquier entrenador —o a sí mismo— y planificar los horarios/sesiones de todos; los **entrenadores** solo ven sus clientes asignados. Los clientes NO inician sesión (son registros). Contexto: gimnasio en Cuba → moneda CUP, email poco fiable (alta por contraseña temporal en persona), conectividad limitada (PWA ligera).

## Decisiones confirmadas con el usuario

- **Backend**: Supabase. **El usuario proporcionará el proyecto/cuenta de Supabase a usar** (NO se usará la cuenta conectada a la sesión original para crear la base de datos). Las migraciones se escribirán como archivos SQL locales en `supabase/migrations/`, aplicables al proyecto que entregue el usuario (vía Supabase CLI, SQL Editor, o el conector que él conecte).
- **Pagos**: registro manual, sin pasarela. Moneda **CUP**. Entrenadores pueden registrar pagos de SUS clientes asignados; solo admin edita/elimina.
- **PWA instalable**, UI 100% en español, mobile-first, siguiendo el diseño de Claude Design (ver arriba).
- **Stack** (verificado contra docs actuales, sept 2026): Next.js 16.3 (App Router, Turbopack default) · React 19 · Tailwind **v4** · **HeroUI v3** (`@heroui/react` + `@heroui/styles` — sin provider, sin framer-motion; requiere Tailwind v4) · `motion` (framer-motion renombrado) para transiciones · `lucide-react` · `@supabase/supabase-js` + `@supabase/ssr` · `recharts` · `react-hook-form` + `zod` + `@hookform/resolvers` · `date-fns` (locale `es`) + `@internationalized/date` · `browser-image-compression` · PWA con **`@serwist/turbopack`** (`@serwist/next` es solo-webpack, incompatible con Next 16).

## Arquitectura

### 1. Base de datos (PostgreSQL en Supabase — 16 migraciones)

Tablas (snake_case, todas con `created_by default auth.uid()`, `created_at`, `updated_at` por trigger, y RLS habilitada EN la misma migración que las crea):

| Tabla | Propósito clave |
|---|---|
| `profiles` | 1:1 con `auth.users` (staff): `role` enum (`admin`/`coordinator`/`trainer`), `full_name`, `phone`, `specialty`, `is_active`. Trigger `handle_new_user` la crea leyendo `raw_app_meta_data->>'role'` (seguro SOLO porque el signup público estará deshabilitado). El admin puede promover/degradar entrenador↔coordinador. |
| `clients` | Registro sin login: contacto, `birth_date`, `sex`, `marital_status`, `height_cm`, `preferred_units` (`metric`/`imperial`, solo display), contacto de emergencia, `goals`, `is_active` (soft-delete). El peso NO va aquí (es serie temporal). |
| `trainer_client_assignments` | Pivote de acceso N:M con `revoked_at` (revocar = timestamp, nunca DELETE → auditoría + corte inmediato). Índice único parcial por asignación activa. |
| `measurement_types` | Catálogo extensible (admin agrega filas, no columnas): `code`, `name_es`, `canonical_unit` (`cm`/`kg`/`%`), `sort_order`. Seed: peso, grasa_corporal, pecho, cintura, abdomen, cadera, gluteos, pierna_izq/der, pantorrilla_izq/der, brazo_izq/der, espalda. |
| `measurement_records` + `measurement_values` | Un registro = una toma de medidas en una fecha (`measured_at`, `input_units`); valores SIEMPRE almacenados en unidad canónica métrica (UI convierte 1 in = 2.54 cm) — las gráficas nunca mezclan unidades. |
| `progress_photos` | Metadatos (`storage_path` único, `pose` enum frente/espalda/perfiles, `taken_on`); binarios en Storage. |
| `medical_records` | Historia clínica: `record_type` enum (patologia/lesion/alergia/medicacion/cirugia/nota_clinica), `title`, `description`, `diagnosed_on`, `is_current`. |
| `diet_plans` | `title`, `content` (markdown), vigencia, `is_active`. |
| `session_types` | Catálogo (nombre, duración default, color para agenda). |
| `schedules` | Plantilla semanal recurrente del **entrenador** (weekday ISO + `start_time` + `duration_min` + `session_type_id` + `capacity` opcional + vigencia): un slot puede ser individual o **grupal**. Constraint de exclusión GiST (`timerange`) impide doble-reserva del entrenador en plantilla. `date`+`time` local (gimnasio único, evita líos de DST). |
| `schedule_participants` | N:M plantilla↔clientes: qué clientes asisten recurrentemente a ese slot (1 fila = individual, varias = grupal). |
| `sessions` | Ocurrencias materializadas (de plantilla vía RPC `generate_sessions(from,to)` idempotente — copia también los participantes —, o ad-hoc): `trainer_id`, fecha/hora/duración, `capacity`, `status` enum programada/completada/cancelada. **Sin `client_id`**: los asistentes viven en `session_participants`. |
| `session_participants` | N:M sesión↔clientes (unique `(session_id, client_id)`; check opcional contra `capacity`). El calendario muestra la sesión una vez con el conteo de participantes. |
| `attendance_records` | **1 fila opcional por participante** (`session_id`, `client_id` unique juntos; `attended`, `checked_in_at`): sin fila = "no se registró" — asistencia genuinamente opcional y por persona (en una grupal se marca a cada cliente por separado, o a ninguno). |
| `membership_plans` | Catálogo: precio, `currency` default **'CUP'**, `duration_days`, `sessions_included` (NULL = ilimitadas). Cubre mensualidad, quincena, paquete de N sesiones… |
| `client_memberships` | Membresía vigente por cliente: `starts_on`/`ends_on`, `price_agreed`, `status` (activa/vencida/cancelada/pausada). |
| `payments` | `concept` enum (**'mensualidad'** — flujo principal, liga `membership_id` — / **'sesion_suelta'** — caso excepcional, liga `session_id` opcional — / **'otro'** — excepcional libre con notas), `amount`, `currency` 'CUP', `method` (efectivo/transferencia/otro), `status` (pagado/pendiente/vencido), `paid_on`/`due_on`, período cubierto, `reference`. FK a clients con `ON DELETE RESTRICT` (historial financiero sobrevive). |

**Funciones de reporte** (SECURITY INVOKER — RLS sigue mandando): `get_measurement_series(client, from, to, codes[])` para gráficas; `get_progress_summary(client, from, to)` → primera/última/delta por métrica ("bajó 4 cm de abdomen"); `get_attendance_summary(client, from, to)` sobre `session_participants` LEFT JOIN `attendance_records` respetando la semántica opcional (asistió/faltó/no_registrado); vistas `v_latest_measurements`, `v_weekly_schedule` (slots con conteo y nombres de participantes), `v_payment_overview` (con `security_invoker = true`). Mantenimiento diario `refresh_payment_statuses()` (pendiente→vencido, membresías vencidas) vía `pg_cron`.

### 2. Seguridad (RLS + roles)

- **Rol en dos capas coherentes** (se escriben juntas al crear el usuario; si el admin promueve entrenador↔coordinador se actualizan ambas vía Admin API):
  - `app_metadata.role` en el JWT → lo leen **middleware y UI** vía `getClaims()` (cero queries por request; el usuario no puede modificar app_metadata). Tras un cambio de rol el claim puede quedar viejo ≤1h (solo afecta gating cosmético de UI; los DATOS los corta RLS de inmediato).
  - Funciones **SECURITY DEFINER STABLE** para **RLS**: `is_admin()`, `is_coordinator_or_admin()`, `is_trainer_of(client_id)`, `has_client_access(client_id)` leyendo `profiles` + `trainer_client_assignments` (sin recursión RLS; revocación/desactivación/degradación corta el acceso a datos en la siguiente query aunque el JWT siga vivo ≤1h). Siempre invocadas como `(select public.is_admin())` → InitPlan, una evaluación por statement (patrón documentado de Supabase).
- **Alcance del rol coordinador** (mínimo privilegio): ve el roster completo de `clients` (para poder asignar) y la lista de entrenadores; crea/revoca asignaciones hacia cualquier entrenador o hacia sí mismo; crea/edita `schedules`/`sessions`/participantes de CUALQUIER entrenador (planificación). Los datos detallados de un cliente (medidas, fotos, historia clínica, dieta, pagos) siguen exigiendo asignación — si los necesita, se asigna a sí mismo. NO puede: crear/desactivar cuentas, cambiar roles, editar/eliminar pagos ni gestionar catálogos (todo eso sigue siendo admin).
- **Patrón de políticas** (todas `TO authenticated`; `anon` no tiene NADA): `clients` → select `has_client_access(id) OR is_coordinator_or_admin()` (el coordinador ve el roster), insert admin, update `has_client_access`, delete admin. Tablas hijas de cliente (medidas, fotos, historia, dieta) → `has_client_access(client_id)` para select/insert/update, delete solo admin (o autor de su propio registro en medidas/fotos) — el coordinador NO las ve sin asignación. `trainer_client_assignments` → escritura `is_coordinator_or_admin()`. `schedules`/`sessions` → `is_coordinator_or_admin() OR trainer_id = auth.uid()` (cada entrenador gestiona sus propios slots; el coordinador planifica los de todos); `schedule_participants`/`session_participants` → derivadas del padre: el entrenador dueño agrega solo clientes con `has_client_access`, el coordinador/admin agrega clientes asignados al entrenador de la sesión (validación app + check DB); `attendance_records` → derivada de la sesión/participante. Catálogos → select todos, escritura admin. `payments`: select `has_client_access`; **insert `is_admin() OR (has_client_access(client_id) AND recorded_by = auth.uid())`**; update/delete solo admin. Trigger `protect_profile_privileged_cols` impide que un no-admin cambie `role`/`is_active` de ningún profile.
- **Storage**: buckets privados `progress-photos` (10 MB, jpeg/png/webp/heic) y `avatars`; convención de path `<client_id>/<yyyy-mm-dd>_<uuid>.webp` → políticas sobre `storage.objects` reutilizan `has_client_access((storage.foldername(name))[1]::uuid)` — espejo exacto del modelo de tablas. Servir con `createSignedUrl` (nunca bucket público).

### 3. Autenticación y flujos admin

- **Sesión SSR**: `@supabase/ssr` con cookies `getAll`/`setAll`; `src/middleware.ts` → `updateSession()` refresca sesión con `getClaims()`, redirige sin sesión → `/login`, fuerza `/cambiar-contrasena` si claim `must_change_password`, gate de cortesía `/admin/**` por claim. **Middleware = UX; la autorización real vive en layouts + `requireAdmin()` dentro de cada server action + RLS** (lección CVE-2025-29927). Matcher excluye assets PWA.
- **3 factories Supabase**: `lib/supabase/client.ts` (browser), `server.ts` (RSC/actions, `await cookies()`), `admin.ts` (service key `sb_secret_`, con `import 'server-only'` — rompe el build si se importa en cliente). Usar claves nuevas `sb_publishable_`/`sb_secret_`.
- **Alta de entrenador/coordinador** (sin email — se entrega en persona): server action `createTrainer` → `requireAdmin()` + rate limit + zod → `auth.admin.createUser({ email, password: temporal, email_confirm: true, app_metadata: { role: 'trainer' | 'coordinator', must_change_password: true }, user_metadata: { full_name } })` con service key → trigger crea profile → contraseña temporal legible (ej. `Vf-58392714`) mostrada UNA sola vez, jamás persistida. Primer login → middleware fuerza cambio → action `changePassword` limpia el flag vía Admin API + `refreshSession()`. Reset de contraseña por el admin = mismo mecanismo.
- **Bootstrap primer admin**: script idempotente `scripts/seed-admin.ts` (Admin API + env `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`), ejecutado tras las migraciones.
- **Baja de entrenador**: ban (`ban_duration: '876000h'`) + `profiles.is_active = false`, nunca DELETE (preserva `created_by` e histórico); UI de reasignación de sus clientes; reversible.
- **Asignaciones**: server action con el cliente de sesión (RLS activa como segunda capa) + `revalidatePath`; rutas dinámicas (leen cookies) → el entrenador ve cambios en su siguiente request.

### 4. Frontend (Next.js 16 + HeroUI v3, mobile-first, según diseño Claude Design)

Setup completo de HeroUI v3 = `@import "tailwindcss"; @import "@heroui/styles";` en `globals.css` + tokens `@theme` (sin `hero.ts`, sin provider). Root layout: `lang="es"`, `Toast.Provider`, `I18nProvider locale="es-ES"` (DatePicker/Calendar en español). Tema del diseño: fondo verde oscuro #0B1F14 con gradiente radial #1C4230, acento #17C964/#12A150.

**Mapa de rutas** (URLs en español):

```
src/app/
├── (auth)/login
├── (app)/                      # shell autenticado: header + BottomTabs
│   ├── panel                   # dashboard según diseño: saludo "Hola, {nombre}" + fecha, buscador,
│   │                           #   hero "Entrena. Mide. Evoluciona.", accesos rápidos, "Sesiones de hoy"
│   │                           #   (asistencia por participante), "Tus clientes"
│   ├── clientes                # lista + búsqueda (?q=), /nuevo, /[id]/ con layout de tabs-como-links:
│   │   └── [id]/{datos, medidas(+nueva), fotos, historial, dieta, sesiones, pagos, informe}
│   ├── agenda                  # vista semanal (?semana=), sesiones individuales Y grupales (badge de nº de
│   │                           #   participantes), crear/editar en Drawer, asistencia opcional por participante;
│   │                           #   coordinador/admin: selector de entrenador (?entrenador=) para planificar la
│   │                           #   agenda de cualquiera
│   ├── pagos                   # lista global con estados + /nuevo (Drawer)
│   ├── mas                     # perfil, tema, cerrar sesión, enlaces gestión/admin según rol
│   └── cambiar-contrasena
├── (gestion)/gestion/asignaciones   # admin + coordinador: asignar clientes ↔ entrenadores (o a sí mismo)
├── (admin)/admin/{entrenadores, page(overview)}   # solo admin; layout re-verifica rol
└── api/informes/[clientId]/export   # HTML imprimible → compartir/PDF
```

- **Navegación**: `BottomTabs` custom fijo (Inicio `LayoutDashboard`, Clientes `Users`, Agenda `CalendarDays`, Pagos `Wallet`, Más `Menu`), cápsula activa animada según el diseño (pop elástico tipo navPop + etiqueta desplegable con fundido, `motion` `layoutId`), safe-areas (`env(safe-area-inset-*)`, `viewportFit: 'cover'`), FAB contextual por pantalla. Formularios en `Drawer` (bottom sheet), no modales centrados.
- **Transiciones**: `(app)/template.tsx` con `motion.div` enter-only (~180ms, respeta `prefers-reduced-motion`); sin animaciones de salida.
- **Datos**: Server Components por defecto (cada page hace su fetch con el cliente server + `Suspense`/`Skeleton`); client components solo hojas (forms RHF, charts, uploader); mutaciones vía server actions en `src/actions/*` (zod → autorizar → mutar → `revalidatePath` → `{ok}|{error}`); schemas zod compartidos en `src/lib/validation/`.
- **Fotos desde el móvil**: `<input type="file" accept="image/*" capture="environment">` → compresión client-side (`browser-image-compression`, ~0.4 MB, 1600px, webp — clave con la conectividad cubana) → upload directo browser→Storage (sin pasar MB por server actions) → action `savePhotoRecord` → thumbnails con signed URLs + `next/image` (`remotePatterns`). Tags de pose con Chips, visor fullscreen, comparador antes/después.
- **Gráficas de evolución**: `recharts` con `next/dynamic`; **una métrica por Card** (multi-línea es ilegible en 390px): stack vertical Peso/Abdomen/Piernas/Glúteos… cada una con badge de delta (`-3.2 cm ▼`); `DateRangePicker` + presets 30d/90d/6m/todo escribiendo `?desde=&hasta=` → series y deltas calculados server-side (`get_measurement_series`/`get_progress_summary`).
- **PWA**: `@serwist/turbopack` (SW vía route handler), `app/manifest.ts` (name VitalFit, `lang: es`, `display: standalone`, iconos 192/512/maskable + apple-touch-icon; generar iconos desde el logo del gimnasio subido al proyecto de diseño), precache del shell, `NetworkFirst` para navegación con fallback `/offline`, **nunca cachear REST/auth de Supabase** (riesgo de fuga de sesión); sin mutaciones offline en v1.
- **Componentes compartidos** (`src/components/`): `BottomTabs`, `StatCard`, `ClientCard`, `ClientTabsNav`, `MeasurementForm` (grid de `NumberField` con `inputMode="decimal"`, toggle cm/in, optimizado para <30s de pie en el gym), `EvolutionChart`+`DeltaBadge`, `PhotoUploader`+`PhotoGrid`, `WeekAgenda` (franja de 7 días con scroll-snap; cada sesión muestra hora, tipo con su color y chip `Grupal · N` cuando hay varios participantes), `SessionForm` (selector **multi-cliente** de participantes — solo clientes asignados —, capacidad opcional, recurrencia semanal), `SessionDetailDrawer` (lista de participantes con `AttendanceToggle` tri-estado POR participante — nunca bloquea —, agregar/quitar participantes; check "marcar todos" como en el diseño), `PaymentForm` (selector de concepto: **mensualidad** → elige plan/membresía, **sesión suelta** → liga sesión opcional, **otro** → notas libres), `PaymentStatusChip`, `SearchInput` (debounced → `?q=`), `ConfirmDialog`, `EmptyState`, `forms/fields.tsx` (bindings RHF↔HeroUI).

## Fases de implementación

**Fase 0 — Esquema de base de datos** (archivos locales): escribir las 16 migraciones SQL en `supabase/migrations/` en orden (`create_enums_and_utilities` → `create_profiles` → `create_clients` → `create_trainer_client_assignments` → `create_security_helpers` → `enable_rls_core` → `create_measurements` → `create_progress_photos` → `create_medical_records` → `create_diet_plans` → `create_scheduling` (incluye participantes) → `create_attendance` → `create_payments` → `create_storage_buckets_and_policies` → `create_report_functions_and_views` → `seed_catalogs`). **Cuando el usuario proporcione su proyecto de Supabase** (URL + clave `sb_publishable_` + clave `sb_secret_`, o conectando su propio conector MCP): aplicar las migraciones allí, revisar advisors de seguridad/rendimiento, y generar los tipos TypeScript → `src/types/database.types.ts`. El desarrollo del frontend (Fases 1+) puede avanzar en paralelo mientras llega el proyecto.

**Fase 1 — Scaffold**: `create-next-app` (TS, Tailwind, src-dir, `@/*`) + deps § stack → `globals.css` HeroUI v3 + tokens del tema verde del diseño → root layout (es, Toast, I18n) → factories Supabase + `middleware.ts` → `.env.local` → `scripts/seed-admin.ts` → verificar que un Button de HeroUI renderiza.

**Fase 2 — Auth**: login (server action, mensaje de error genérico), logout, `/cambiar-contrasena` con enforcement de `must_change_password`, route groups con layouts-gate, `lib/auth.ts` (`getSessionInfo`/`requireAdmin`). Ejecutar seed del admin y probar login E2E.

**Fase 3 — Shell**: `(app)/layout.tsx` + BottomTabs (cápsula animada del diseño) + template transitions + `/panel` según el diseño (hero, accesos, sesiones de hoy, tus clientes) con StatCards reales (streaming + Skeleton).

**Fase 4 — Clientes** (primer slice vertical completo, establece el patrón RSC/action/RLS): lista+búsqueda, alta, detail layout con tabs, tab Datos personales.

**Fase 5 — Medidas**: MeasurementForm + historial + primeras EvolutionCharts. **Fase 6 — Fotos**: uploader con compresión + bucket privado + galería. **Fase 7 — Agenda**: WeekAgenda con sesiones individuales/grupales + SessionForm multi-participante + `generate_sessions` + asistencia por participante + "sesiones de hoy" en panel. **Fase 8 — Pagos**: planes/membresías, PaymentForm con conceptos (mensualidad/sesión suelta/otro), listas global/por-cliente, derivación de vencidos + StatCard. (5–8 independientes entre sí tras la 4.)

**Fase 9 — Informes**: página de rango + deltas + export imprimible. **Fase 10 — Gestión y admin**: `/gestion/asignaciones` (admin + coordinador), planificación multi-entrenador en agenda, CRUD entrenadores (crear cuenta con rol entrenador/coordinador y contraseña temporal, reset, promover↔degradar coordinador, desactivar+reasignar), overview global. **Fase 11 — PWA y hardening**: serwist + manifest + iconos + `/offline`, estados loading/error/empty, reduced-motion, revisión final RLS + advisors + `npm run build`.

**Pasos del usuario** (se le indicarán en el momento): (1) proporcionar el proyecto de Supabase a usar (URL + claves, o conectar su conector); (2) en su Dashboard: Auth → deshabilitar "Allow new users to sign up" (**invariante de seguridad del trigger**); (3) copiar la clave `sb_secret_` a `.env.local` (`SUPABASE_SECRET_KEY`); (4) opcional: activar claves JWT asimétricas; (5) colocar los archivos del diseño en `D:\Projects\vital-fit\design\` si no se pudieron importar automáticamente.

## Verificación

1. **Migraciones**: al aplicarlas en el proyecto que proporcione el usuario, listar tablas y revisar advisors de seguridad/rendimiento sin errores; consultas de humo sobre las funciones de reporte.
2. **RLS end-to-end (crítico)**: con tres cuentas reales (admin + coordinador + entrenador de prueba) en el navegador integrado — el entrenador SOLO ve clientes asignados (tablas Y fotos en Storage); el coordinador ve el roster y asigna (incluso a sí mismo) y planifica la agenda de otro entrenador, pero NO ve medidas/historia de clientes no asignados ni puede editar pagos o crear cuentas; revocar asignación y comprobar corte inmediato; intentar `/admin` como trainer/coordinador → redirect.
3. **App**: dev server vía `.claude/launch.json` + browser pane con preset **mobile** (375×812): flujo completo admin (crear entrenador → ver contraseña temporal → login entrenador → cambio forzado de contraseña → registrar cliente/medidas/foto → crear sesión **grupal** con varios clientes y verla en la agenda con su conteo → marcar asistencia de un participante sí y otro no → registrar pago de mensualidad y uno excepcional de sesión suelta → informe con gráficas), safe-areas y tabs. Comparar visualmente contra el diseño de Claude Design.
4. **Build y PWA**: `npm run build` limpio; manifest + SW registrado; Lighthouse PWA instalable.

## Archivos críticos

- `supabase/migrations/*` (16) — esquema, helpers de seguridad, RLS, storage, reportes, seeds
- `src/middleware.ts` + `src/lib/supabase/{client,server,admin,middleware}.ts` + `src/lib/auth.ts`
- `src/app/globals.css` (todo el setup HeroUI v3 + tema del diseño) y `src/app/layout.tsx`
- `src/app/(app)/layout.tsx` (shell + BottomTabs) y `src/app/(app)/clientes/[id]/layout.tsx` (tabs del cliente)
- `src/actions/*.ts` (mutaciones por dominio) + `src/lib/validation/*.ts` (zod compartido)
- `scripts/seed-admin.ts` · `src/app/manifest.ts` + `src/app/sw.ts` · `src/types/database.types.ts` (generado)
- `design/` — archivos del diseño de Claude Design (referencia visual)
