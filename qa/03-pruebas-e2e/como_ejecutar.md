# Cómo ejecutar las pruebas E2E (Playwright)

> Suites alojadas en `e2e/suites/` desde el raíz del repositorio.
> Configuración: `playwright.config.ts` (raíz).

## Requisitos previos (una sola vez)

```bash
# 1. Dependencias raíz (Playwright pineado a 1.58.2)
npm install

# 2. Navegador Chromium (~150 MB)
node_modules/.bin/playwright install chromium
#   o con `--with-deps` si estás en Linux/CI:
#   node_modules/.bin/playwright install --with-deps chromium
```

## Ejecutar el smoke (no necesita backend)

```bash
npm run e2e:smoke
```

El smoke levanta automáticamente el frontend de Vinki en `http://localhost:5400`
(vía `webServer` del config) y valida que la home pública carga y muestra el
branding. Tiempo esperado: ~12 s.

## Ejecutar toda la suite E2E

```bash
npm run e2e
```

> ⚠️ Las suites que requieren autenticación o entrevistas necesitan el
> **backend corriendo aparte** y la base de datos con `seed` aplicado.

### Levantar backend + DB + Redis (recomendado)

```bash
docker compose up -d postgres redis
cd backend && npm ci && npx -y prisma@6.19.2 generate && npx -y prisma@6.19.2 migrate deploy && npx -y prisma@6.19.2 db seed
npm --prefix backend run start:dev
```

Después, en otra terminal:

```bash
npm run e2e
```

## Modo interactivo (debug local)

```bash
npm run e2e:ui      # UI Mode de Playwright (paso a paso, time travel)
npm run e2e:debug   # Inspector + breakpoints
```

## Ver el reporte HTML

```bash
npm run e2e:report
```

Se abre `./playwright-report/index.html` con detalles, capturas de pantalla
de los fallos y *traces* descargables.

## Variables de entorno relevantes

| Variable | Default | Uso |
|---|---|---|
| `PLAYWRIGHT_BASE_URL` | `http://localhost:5400` | Apunta a otro entorno (staging) |
| `CI` | (vacío) | Cuando está definido: `retries: 2`, `forbidOnly: true` |

## Notas sobre puertos (Windows)

En este entorno Windows el rango TCP `5079–5178` está reservado por el
kernel (Hyper-V/WSL). Por eso el frontend de E2E usa `5400` en vez del
default de Vite (`5173`). Si reproduces el problema en otra máquina:

```powershell
netsh int ipv4 show excludedportrange protocol=tcp
```

…revisa el rango y, si 5400 también estuviera ocupado, sobreescribe con
`PLAYWRIGHT_BASE_URL` y ajusta `playwright.config.ts` en consecuencia.

## Convenciones para agregar nuevas suites

```
e2e/suites/
  00-smoke/         # Humo — sin backend, sin auth.
  01-auth/          # Autenticación, registro, sesiones (RF-01 a RF-04).
  02-interview/     # Wizard + sesión + finalización (RF-05 a RF-18).
  03-evaluation/    # Captura de feedback (con `mockLLM`) (RF-19 a RF-26).
  ...
```

Reglas:

1. **Mockear el LLM por defecto** (`import { test } from '../../fixtures/llm-mock.fixture'`).
   Solo las suites de la Fase 7 (evaluación específica de RAG) usan el LLM real.
2. **Datos** se preparan con `seed` determinista, no en cada test.
3. **Page Objects** en `e2e/pages/`, helpers transversales en `e2e/helpers/`.
4. **Aserciones explícitas**: nunca depender de timeouts arbitrarios; usar
   `expect(...).toBeVisible()` o `expect.poll(...)`.
