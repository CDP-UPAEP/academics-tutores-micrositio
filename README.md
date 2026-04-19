# Academics Tutores — Micrositio Sincronizado con Notion

Sitio estático de centro de ayuda para padres de familia que se **regenera automáticamente cada noche** a partir de la base "📖 Registro de manuales" en Notion.

---

## 🏗️ Arquitectura

```
 Notion (privado)          GitHub Actions (cron nocturno)       GitHub Pages
 ┌─────────────────┐       ┌──────────────────────────────┐      ┌──────────────────┐
 │ Registro de     │       │  1. Lee la base vía API      │      │  index.html      │
 │ manuales        │──────▶│  2. Filtra: Academics +      │─────▶│  (público)       │
 │                 │  API  │     Actualizado + Visible    │      │                  │
 │                 │       │  3. Regenera HTML estático   │      │  URL pública     │
 └─────────────────┘       └──────────────────────────────┘      └──────────────────┘
       ↑
       │ Tu equipo edita aquí (única fuente de verdad)
```

> **🔄 Nota sobre el renombre en curso:** el producto actualmente se llama `ACADEMICS` en la base "Productos y herramientas", pero está siendo renombrado a `Academics Tutores`. El script acepta **ambos nombres simultáneamente** para que el sitio siga funcionando durante la transición. Una vez consolidado el renombre, puedes limpiar la lista dejando solo el nombre nuevo.

---

## ✅ Estado actual de la base Notion

Tu base ya tiene estas propiedades configuradas correctamente:

| Propiedad | Tipo | Estado |
|---|---|---|
| `Título de manual` | Title | ✅ |
| `Descripción Corta` | Text | ✅ |
| `Categoría Pública` | Select | ✅ (sin opciones aún, se crean después) |
| `Duración Estimada` | Select | ✅ (crear 4 opciones, ver abajo) |
| `Tipo de Recurso` | Select: Video / Manual | ✅ |
| `Estado` | Status: Actualizado / Por actualizar / Obsoleto | ✅ |
| `Visible en micrositio` | Checkbox | ✅ |
| `URL` | URL | ✅ |
| `Rollup` | Rollup (título del producto relacionado) | ✅ |
| `Herramienta o Producto` | Relation a "Productos y herramientas" | ✅ |

**⚠️ Antes de llenar manuales, crea en `Duración Estimada` estas 4 opciones:**
- `1-2 min`
- `3-5 min`
- `6-10 min`
- `+10 min`

Las opciones de `Categoría Pública` las puedes ir creando conforme definas los materiales. El script detecta automáticamente qué categorías existen y genera los filtros dinámicamente — no necesitas tocar código cuando agregues o quites una categoría.

---

## 📅 Plan de trabajo recomendado

### 🟢 FASE 1 — Ahora, sin permisos del administrador

1. **Crear las 4 opciones de `Duración Estimada`** en Notion (30 segundos)
2. **Llenar manuales en Notion** con todos los campos completos, incluso marcando `Visible en micrositio` y `Estado = Actualizado`
3. **Subir este proyecto a un repo de GitHub** (instrucciones abajo)
4. **Activar GitHub Pages** en el repo
5. **Preparar el pedido al administrador** (plantilla abajo)

### 🟡 FASE 2 — Cuando tengas el token del administrador

1. Agregar los 2 secretos al repo
2. Conectar la integración a la base en Notion
3. Disparar el primer build manualmente
4. Tu sitio está vivo con los materiales que ya llenaste en la FASE 1

---

## ✉️ Plantilla para pedir permiso al administrador

> **Asunto:** Solicitud de integración Notion de solo-lectura
>
> Hola [nombre],
>
> Necesito crear una integración interna en nuestro workspace de Notion (iddupaep) para automatizar la publicación del centro de ayuda de padres de familia de Academics Tutores. Te detallo:
>
> **Qué hace:** lee periódicamente nuestra base "📖 Registro de manuales" y publica automáticamente los manuales marcados como "Actualizado" y "Visible en micrositio" en un sitio público estático.
>
> **Permisos requeridos:** solo-lectura (Read content). No modifica ni elimina nada.
>
> **Alcance:** únicamente la base "📖 Registro de manuales". No tiene acceso a otros espacios del workspace.
>
> **Qué necesito de ti:**
> 1. Entrar a https://www.notion.so/my-integrations
> 2. Crear una integración interna llamada "Micrositio Centro de Ayuda" con permisos de solo-lectura
> 3. Compartirme el token (Internal Integration Secret)
> 4. En la base "📖 Registro de manuales" → menú `...` → Connections → agregar la integración
>
> Quedo atento.

---

## 🚀 Paso a paso: Setup en GitHub (FASE 1)

### 1. Crea el repo

1. Crea un nuevo repositorio en GitHub llamado `academics-tutores-micrositio` (privado está bien)
2. Descarga este proyecto, descomprime
3. En la terminal:

```bash
cd academics-tutores-sync
git init
git add .
git commit -m "Initial: Micrositio Academics Tutores"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/academics-tutores-micrositio.git
git push -u origin main
```

### 2. Activa GitHub Pages

En el repo → **Settings** → **Pages** → Source: **GitHub Actions** → Save

---

## 🚀 Paso a paso: Activación (FASE 2, cuando tengas el token)

### 1. Agrega los secretos

Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Nombre | Valor |
|---|---|
| `NOTION_TOKEN` | El token que te dé el administrador |
| `NOTION_DATABASE_ID` | `31308c5f6bd780b9969ad177b95cb675` |

### 2. Dispara el primer build

Repo → **Actions** → **Sincronizar Micrositio desde Notion** → **Run workflow**

En ~30 segundos tu sitio estará en:
```
https://TU-USUARIO.github.io/academics-tutores-micrositio/
```

---

## 🔄 Operación del día a día (cuando ya esté funcionando)

### Para agregar un tutorial nuevo
1. Tu equipo crea la página en la base "Registro de manuales" en Notion
2. Llena: Título, Descripción Corta, Categoría Pública, Tipo de Recurso, Duración Estimada, URL
3. En `Herramienta o Producto` selecciona **Academics Tutores** (o **ACADEMICS** mientras no se complete el renombre — el script acepta ambos)
4. Marca `Estado = Actualizado` y `Visible en micrositio = ☑`
5. En la próxima sincronización nocturna (6:00 AM CDMX) aparecerá en el sitio

### Para retirar un tutorial del sitio (sin borrarlo)
- **Opción A:** desmarca `Visible en micrositio`
- **Opción B:** cambia `Estado` a `Obsoleto` o `Por actualizar`

### Para forzar sincronización inmediata
Repo → **Actions** → **Sincronizar Micrositio** → **Run workflow**

---

## 🧪 Probar localmente

```bash
npm install
cp .env.example .env
# Edita .env con el NOTION_TOKEN y NOTION_DATABASE_ID (solo cuando tengas el token)
npm run build
npx serve public  # Ver el resultado en http://localhost:3000
```

---

## 🚀 Expandir a otros productos del DIT

Cuando quieras un micrositio para CANVAS, Sorteo, Asana, etc:

1. Duplica este repo
2. En `scripts/build.js`, cambia estas líneas:
   ```js
   productNames: ['Canvas'],       // antes: ['Academics Tutores', 'ACADEMICS']
   displayName: 'Canvas',          // antes: 'Academics Tutores'
   ```
3. Ajusta el template HTML con el branding del producto (título, descripción, colores si aplica)
4. Nueva integración + nuevos secretos + nuevo GitHub Pages

La base de Notion **sigue siendo la misma**: un solo lugar para gestionar contenido de todos los productos del DIT.

---

## 📁 Estructura de archivos

```
.
├── .github/workflows/sync.yml    # Cron nocturno + deploy automático
├── scripts/
│   └── build.js                  # Lee Notion, genera HTML
├── templates/
│   └── index.template.html       # Template del sitio
├── data/
│   └── tutorials.json            # Snapshot JSON (autogenerado, útil para debug)
├── public/
│   └── index.html                # Sitio final (autogenerado, no editar a mano)
├── package.json
├── .env.example
└── README.md
```

---

## ❓ Troubleshooting

**"Error: object_not_found" o "Could not find database"**
→ El token no tiene acceso a la base. Verifica en Notion: base "📖 Registro de manuales" → `...` → Connections → asegúrate que "Micrositio Centro de Ayuda" esté ahí.

**"0 manuales encontrados"**
→ Revisa que al menos un manual cumpla los 3 criterios: Estado=Actualizado + Visible=✓ + Herramienta=Academics Tutores (o ACADEMICS).

**"Error: Property 'Descripción Corta' does not exist"**
→ Revisa ortografía exacta en Notion (acentos y mayúsculas cuentan).

**El sitio no se actualiza**
→ Revisa la pestaña **Actions** del repo. Si el workflow falló, el log muestra el error exacto.
