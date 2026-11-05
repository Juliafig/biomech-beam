# Publicar Lab Planner en Cloudflare (sin Lovable)

Esta rama (`cloudflare`) es la versión independiente de Lovable, con inicio de
sesión. La rama `main` sigue conectada a Lovable y no se ve afectada.

Orden recomendado: **1 → 2 → 3 → 4 → 5 → 6**. Solo hace falta hacerlo una vez.

---

## 1. Crear tu propia base de datos en Supabase (gratis)

La base de datos actual vive en Lovable Cloud, donde no puedes cambiar los
permisos. Por eso la app independiente usa un proyecto de Supabase propio.

1. Crea una cuenta en https://supabase.com y pulsa **New project**.
   - Región: la más cercana (p. ej. *Central EU (Frankfurt)*).
   - Guarda la contraseña de la base de datos en un lugar seguro.
2. Abre **SQL Editor → New query**.
3. Abre el archivo [`supabase/setup.sql`](supabase/setup.sql) de este repositorio,
   copia todo su contenido y pégalo.
4. **Antes de ejecutar**, busca `applus.com` y cámbialo por el dominio del email
   de tu empresa (solo la parte después de la @). Para varios dominios:
   `('empresa.com'), ('otra-empresa.com')`.
5. Pulsa **Run**. Debe terminar sin errores.

> Solo podrán registrarse emails de esos dominios. Para añadir otro dominio más
> adelante, ejecuta en el SQL Editor:
> `insert into public.allowed_email_domains (domain) values ('nuevo-dominio.com');`

## 2. Configurar el inicio de sesión en Supabase

En tu proyecto de Supabase:

1. **Authentication → Sign In / Providers → Email**: deja activado
   **Confirm email** (viene activado por defecto). Así nadie puede registrarse
   con un email que no sea suyo.
2. **Authentication → URL Configuration**:
   - **Site URL**: la dirección de tu app en Cloudflare (paso 5), p. ej.
     `https://lab-planner.tu-usuario.workers.dev`. Puedes volver a este paso
     cuando la tengas.
   - **Redirect URLs**: añade `https://lab-planner.tu-usuario.workers.dev/**`
     (y `http://localhost:8080/**` si vas a probar en tu ordenador).
3. **Emails (importante si sois varios):** el servidor de correo que trae
   Supabase de serie solo envía unos pocos emails por hora y es para pruebas.
   Para el equipo, configura un servidor propio en
   **Authentication → Emails → SMTP Settings** (el SMTP de tu empresa, o un
   servicio con plan gratuito como Resend o Brevo).

## 3. Copiar tus datos desde Lovable Cloud

Necesitas Node.js instalado en tu ordenador (https://nodejs.org, versión 22).

1. En Supabase: **Project Settings → API Keys** y copia:
   - la **Project URL** (`https://xxxx.supabase.co`, en Project Settings → Data API)
   - una **Secret key** (`sb_secret_...`). Es secreta: no la compartas ni la subas a GitHub.
2. En una terminal, dentro de la carpeta del proyecto (rama `cloudflare`):

   ```bash
   npm install
   NEW_SUPABASE_URL="https://xxxx.supabase.co" NEW_SUPABASE_SECRET_KEY="sb_secret_..." node scripts/migrar-datos.mjs
   ```

   El script lee los datos antiguos de Lovable Cloud (con los valores actuales
   de `.env`) y los copia al proyecto nuevo, sustituyendo los datos de ejemplo.
   El historial del asistente no se copia.

## 4. Apuntar la app a la base de datos nueva

Edita el archivo `.env` y cambia **las dos líneas `VITE_`** (y sus copias sin
`VITE_`) por los valores del proyecto nuevo:

```
VITE_SUPABASE_URL="https://xxxx.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
```

La *publishable key* está en **Project Settings → API Keys** y es pública
(va dentro de la web); los permisos los protege la base de datos.
Sube el cambio a la rama `cloudflare` en GitHub.

Haz este paso **después** del paso 3.

## 5. Publicar en Cloudflare

1. Crea una cuenta gratuita en https://dash.cloudflare.com.
2. **Workers & Pages → Create → Workers → Import a repository**.
3. Conecta GitHub y elige el repositorio `biomech-beam`.
4. Configura:
   - **Project name:** `lab-planner` (debe coincidir con `name` en `wrangler.jsonc`)
   - **Production branch:** `cloudflare`
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy`
5. Pulsa **Deploy**. Tendrás una dirección del tipo
   `https://lab-planner.<tu-subdominio>.workers.dev`
   (ponla en Supabase, paso 2).

Cada cambio que se suba a la rama `cloudflare` se publica solo.

## 6. Asistente de IA (opcional)

1. Crea una cuenta en https://platform.claude.com, añade crédito y crea una
   **API key** (`sk-ant-...`).
2. En Cloudflare, en el Worker: **Settings → Variables and Secrets → Add**:

| Nombre | Tipo | Valor |
|---|---|---|
| `ANTHROPIC_API_KEY` | Secret | La clave de Claude |
| `CLAUDE_MODEL` | Text (opcional) | `claude-haiku-5-5` para gastar menos (por defecto `claude-opus-5-5`) |

3. Vuelve a desplegar (**Deployments → Retry**).

Solo los usuarios con sesión iniciada pueden usar el asistente.

---

## Cómo funciona el inicio de sesión

- Cada persona crea su cuenta en la pantalla de inicio con su **email de
  empresa** y una contraseña, y la confirma desde el email que recibe.
- Sin sesión iniciada no se puede ver ni modificar nada: la base de datos lo
  rechaza aunque alguien intente acceder directamente.
- Las cuentas con otro dominio o sin confirmar no ven datos.
- El historial del asistente es privado de cada usuario.
- Para quitar el acceso a alguien: Supabase → **Authentication → Users** →
  borrar el usuario.

## Probar en tu ordenador (opcional)

```bash
npm install
npm run dev          # http://localhost:8080
```

Con el entorno real de Cloudflare:

```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." > .dev.vars   # no se sube a GitHub
npm run build
npx wrangler dev
```
