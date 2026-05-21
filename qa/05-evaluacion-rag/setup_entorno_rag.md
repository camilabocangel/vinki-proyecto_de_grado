# Setup del entorno para la evaluación RAG (Fase 6)

> **Fecha:** 2026-05-21.
> **Estado:** entorno montado y dry-run verde. Pendiente de
> **autorización del docente** para usar la `OPENAI_API_KEY` real
> en la corrida live (6-RUN).
> **Vinculado a:** D-6 (alcance dual RAG), plan maestro § 5.5, § 7
> (entornos), `caracterizacion_rag.md`, `metricas_rag.md`.

---

## 1. Decisión de entorno

### 1.1 Intentos previos y descarte

| Opción | Resultado | Decisión |
|---|---|---|
| **Python MSYS2 mingw64** (lo que falló Semgrep en Fase 5-B) | `pip install pydantic` falla con *"Unsupported platform: 311 / Rust not found"*. Maturin no reconoce el SOABI de MSYS2. | ❌ **Descartada.** Pydantic es dependencia transitiva de Ragas; sin pydantic no hay Ragas. |
| **WSL2 Ubuntu** | `pip3` y `python3-venv` NO instalados por default; requiere `sudo apt install` interactivo (password). | ⚠ Documentado como **Opción B** para sesiones futuras donde el usuario haga el `sudo apt` manualmente (instrucciones en § 3). |
| **Docker (`python:3.11-slim`)** | Imagen liviana ~150 MB. `pip install ragas deepeval ...` instala sin issues. Sin necesidad de sudo. Reproducible al 100 %. | ✅ **Adoptada como entorno principal.** |
| **Google Colab** | Notebook compartible, sin instalación local. | Útil como entrega visual al tutor, NO como entorno principal por el riesgo de exposición de la key. |

### 1.2 Entorno final adoptado

**Docker con imagen custom `vinki-rag-eval:6pre`** definida en
[`Dockerfile`](Dockerfile).

**Versiones pineadas dentro de la imagen** (capturadas del build):

```
ragas         0.3.2
deepeval      2.9.7
openai        1.109.1
pandas        2.3.3
python-dotenv 1.2.2
datasets      3.6.0
tabulate      0.9.0
```

Y dependencias transitivas relevantes:

```
langchain        1.3.1
langchain-core   1.4.0
langchain-openai 1.1.9
langsmith        0.8.5
pydantic         2.13.4
pydantic-core    2.46.4
tiktoken         0.13.0
numpy            2.4.6
```

El build smoke-test verifica que las 5 librerías clave importan sin
error (`ragas`, `ragas.metrics`, `deepeval`, `openai`, `pandas`,
`dotenv`).

---

## 2. Reproducción

### 2.1 Build de la imagen (una sola vez)

```powershell
cd c:\Users\g5\Documents\University\ProyectoDeGrado
docker build -t vinki-rag-eval:6pre qa\05-evaluacion-rag\
```

Tiempo de build: ~3 min (descarga + pip install). La imagen pesa
~1.5 GB.

### 2.2 Dry-run (sin llamadas reales — validación del script)

```powershell
cd c:\Users\g5\Documents\University\ProyectoDeGrado
docker run --rm `
  -v "${PWD}:/workspace" -w /workspace `
  vinki-rag-eval:6pre `
  python qa/05-evaluacion-rag/evaluar_rag.py --dry-run
```

Salida esperada:

```
[dry-run] dataset cargado: 15 preguntas
[dry-run] distribución: {'in-domain': 10, 'edge-case': 3, 'out-of-domain': 2}
[dry-run] agregados calculados ✓
[dry-run] keys globales: ['faithfulness', 'answer_relevancy', 'context_precision',
   'context_recall', 'answer_correctness', 'hallucination_score',
   'latency_p50_ms', 'latency_p95_ms', 'latency_p99_ms', 'n_samples']
[dry-run] keys verdict: ['faithfulness', 'answer_relevancy', 'context_precision',
   'context_recall', 'answer_correctness', 'hallucination_rate', 'latency_p95_ms']
[dry-run] OK — script válido, listo para corrida live.
```

**Ejecutado el 2026-05-21 — output verificado verde.**

### 2.3 Corrida live (PENDIENTE de autorización del docente)

**Pre-requisitos:**

1. Backend de Vinki levantado con LLM real:
   ```powershell
   cd backend
   npm run start:perf:real    # script de Fase 5-A (D-15), arranca con LLM_SANDBOX=false
   ```
   Confirmar que escucha en `http://127.0.0.1:3000` (o el puerto que
   defina `.env`).

2. Sembrar el corpus de Vinki con los 5 documentos del seed dev:
   ```powershell
   cd backend
   npx -y prisma@6.19.2 db seed   # ejecuta backend/prisma/seed.ts
   ```

3. Hacer login como `recruiter` o `admin` y capturar la cookie
   `access_token` para pasársela al script (el endpoint
   `/api/knowledge/search` requiere `@Roles('recruiter','admin')`):
   ```powershell
   $body = '{"email":"recruiter@vinki.test","password":"..."}'
   $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/auth/login' `
        -Method Post -ContentType 'application/json' -Body $body `
        -UseBasicParsing -SessionVariable s
   # Extraer cookie
   $cookieHeader = ($s.Cookies.GetCookies('http://127.0.0.1:3000') |
     ForEach-Object { "$($_.Name)=$($_.Value)" }) -join '; '
   $env:BACKEND_COOKIE = $cookieHeader
   ```

4. Corrida (desde repo root):
   ```powershell
   docker run --rm `
     -v "${PWD}:/workspace" -w /workspace `
     -e BACKEND_COOKIE `
     vinki-rag-eval:6pre `
     python qa/05-evaluacion-rag/evaluar_rag.py --live `
       --backend-url http://host.docker.internal:3000 `
       --judge-model gpt-4o-mini `
       --answerer-model gpt-4o-mini
   ```

   `host.docker.internal` es el alias DNS que Docker Desktop expone
   para que el contenedor alcance servicios del host (el backend
   Vinki corriendo en Windows). Es necesario porque `127.0.0.1`
   dentro del contenedor apunta al contenedor mismo, no al host.

5. Resultados generados:
   - `qa/05-evaluacion-rag/resultados_rag.json` — detalle por
     pregunta + agregados.
   - `qa/05-evaluacion-rag/resultados_rag.md` — tabla legible para
     el informe.

### 2.4 Lectura de la key OpenAI

El script (`evaluar_rag.py` línea ~268) hace:

```python
load_dotenv(dotenv_path=REPO_ROOT / "backend" / ".env", override=False)
api_key = os.environ.get("OPENAI_API_KEY", "")
```

La key se lee desde `backend/.env` (NO trackeado por git, cubierto
por `.gitignore:11`). El script:

- Valida que la key empieza por `sk-` y tiene `len >= 30`.
- Imprime solo el prefijo (`sk-proj-...`) — nunca el valor completo.
- Si la key no es válida o no está, aborta con error claro.

---

## 3. Opción B alternativa — WSL2 (sin Docker)

Si en una sesión futura el usuario prefiere WSL2 en lugar de Docker:

```bash
# Dentro de WSL2 Ubuntu (UNA SOLA VEZ, requiere password sudo):
sudo apt update
sudo apt install -y python3-venv python3-pip

# Crear venv:
python3 -m venv ~/vinki-rag-eval
source ~/vinki-rag-eval/bin/activate

# Instalar deps (mismas versiones que el Dockerfile):
pip install 'ragas>=0.2,<0.4' 'deepeval>=2.0,<3.0' 'openai>=1.50,<2.0' \
            'pandas>=2.2,<3.0' 'python-dotenv>=1.0,<2.0' \
            'datasets>=2.20,<4.0' 'tabulate>=0.9,<1.0'

# Ejecutar (el repo se accede vía /mnt/c/):
cd /mnt/c/Users/g5/Documents/University/ProyectoDeGrado
python qa/05-evaluacion-rag/evaluar_rag.py --dry-run
```

Trade-off: WSL no requiere imagen Docker (~1.5 GB) pero sí requiere
un `sudo apt install` inicial. Ambas opciones llegan al mismo
resultado funcional.

---

## 4. Estimación de costo (corrida live)

Detalle ya documentado en el diagnóstico previo. Resumen para 6-RUN:

| Métrica | Valor |
|---|---|
| Preguntas | 15 |
| Llamadas a LLM por pregunta (modelo que responde) | 1 (≈ 1500 input + 300 output tokens) |
| Llamadas al juez Ragas por pregunta (5 métricas) | ≈ 7 (cada una ≈ 500 + 100 tokens) |
| Llamadas al juez DeepEval por pregunta (Hallucination) | ≈ 1 (≈ 500 + 100 tokens) |
| Llamadas al embedder (Ragas usa text-embedding-3-small) | ≈ 3 por pregunta (relevancy + correctness) |
| Costo total estimado | **$0.02-0.20 USD** |
| Modelos usados | `gpt-4o-mini` (answerer + juez) + `text-embedding-3-small` |

---

## 5. Estado de Fase 6-PRE

✅ **Entorno listo:**
- Imagen Docker `vinki-rag-eval:6pre` construida.
- Script `evaluar_rag.py` validado en dry-run.
- Dataset de 15 preguntas + 4 documentos de soporte
  (`caracterizacion_rag.md`, `metodologia_dataset.md`,
  `metricas_rag.md`, este archivo).
- Métodos de invocación documentados para ambos modos (dry-run y
  live).

⏳ **Pendiente para 6-RUN:**
- Autorización del docente para usar la key OpenAI con presupuesto
  estimado $0.02-0.20 USD.
- Levantar backend con `npm run start:perf:real` + sembrar corpus.
- Ejecutar corrida live + redactar reporte.
