# Publicar Lab Planner en Cloudflare (sin Lovable)

Esta rama (`cloudflare`) es la versión independiente de Lovable. La rama `main`
sigue conectada a Lovable y no se ve afectada.

## Qué cambia respecto a la versión de Lovable

- El asistente usa **Claude directamente** (clave propia de Anthropic) en lugar
  de la pasarela de IA de Lovable.
- Las dependencias se instalan con **npm** desde el registro público
  (`package-lock.json`). Se quitaron `bun.lock` (apuntaba a un registro privado
  de Lovable), `xlsx` (no se usaba) y el adaptador de la pasarela de Lovable.
- `wrangler.jsonc` define el Worker de Cloudflare (`lab-planner`).

## 1. Crear la clave de Claude (para el asistente)

1. Entra en https://platform.claude.com y crea una cuenta.
2. Añade un método de pago o crédito (se paga por uso).
3. En **API Keys**, crea una clave y cópiala (empieza por `sk-ant-`).

El asistente usa `claude-opus-5-5` por defecto. Para gastar menos puedes poner
la variable `CLAUDE_MODEL` = `claude-haiku-5-5` (ver paso 3).

Si no necesitas el asistente, puedes saltarte este paso: el resto de la app
funciona igual; solo la página «Assistant» mostrará un error.

## 2. Conectar el repositorio en Cloudflare

1. Crea una cuenta gratuita en https://dash.cloudflare.com.
2. Ve a **Workers & Pages → Create → Workers → Import a repository**.
3. Conecta GitHub y elige el repositorio `biomech-beam`.
4. Configura:
   - **Project name:** `lab-planner` (debe coincidir con `name` en `wrangler.jsonc`)
   - **Production branch:** `cloudflare`
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy`
5. Pulsa **Deploy**. Al terminar tendrás una dirección del tipo
   `https://lab-planner.<tu-subdominio>.workers.dev`.

A partir de ahí, cada cambio que se suba a la rama `cloudflare` se publica solo.

## 3. Variables y secretos

En el Worker: **Settings → Variables and Secrets → Add**.

| Nombre | Tipo | ¿Obligatoria? | Valor |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Secret | Para el asistente | La clave del paso 1 |
| `CLAUDE_MODEL` | Text | No | p. ej. `claude-haiku-5-5` (por defecto `claude-opus-5-5`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | No | Solo si tienes acceso a tu proyecto de Supabase y quieres que el asistente lo use con permisos de servidor |

La URL y la clave pública de Supabase ya vienen en el archivo `.env` del
repositorio y se incluyen al compilar; no hace falta configurarlas.

Después de añadir variables, vuelve a desplegar (**Deployments → Retry** o sube
cualquier cambio).

## 4. Probar en tu ordenador (opcional)

```bash
npm install
npm run dev          # servidor de desarrollo en http://localhost:8080
```

Para probar con el entorno real de Cloudflare:

```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." > .dev.vars   # no se sube a GitHub
npm run build
npx wrangler dev
```

## Avisos importantes

- **Seguridad:** ahora mismo la base de datos permite leer y modificar todo a
  cualquiera que tenga la clave pública (que va dentro de la web), y la ruta
  `/api/chat` no pide inicio de sesión. Con una dirección pública, cualquiera
  que la encuentre podría ver/cambiar los datos o gastar tu crédito de Claude.
  Se recomienda añadir inicio de sesión antes de compartir la dirección.
- **Supabase:** si el proyecto de Supabase lo creó Lovable Cloud, los datos
  siguen en la cuenta de Lovable. Para independizarte del todo, crea un proyecto
  propio en https://supabase.com, aplica las migraciones de `supabase/migrations`,
  copia los datos y cambia los valores de `.env`.
- **Cambios hechos en Lovable** van a la rama `main` y no llegan a esta rama
  automáticamente.
