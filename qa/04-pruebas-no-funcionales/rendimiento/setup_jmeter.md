# Setup de Apache JMeter — Fase 5 (Rendimiento)

> **Decisión vinculada:** D-9 (JMeter como herramienta oficial, no k6).
> **Objetivo:** documentar el entorno de pruebas de carga listo para la
> Fase 5-A (ejecución).
> **Estado de este documento:** preparatorio — JMeter pendiente de
> instalación manual.

---

## Estado verificado del entorno

| Componente | Estado | Detalle |
|---|---|---|
| **Java** | ✅ Instalado | OpenJDK Temurin 17.0.18+8 (`java -version`). JMeter requiere Java 8+; 17 es ideal. |
| **JMeter** | ✅ Instalado en `F:\apache-jmeter-5.6.3\apache-jmeter-5.6.3\` | Apache JMeter 5.6.3 verificado. **NO está en `PATH` del sistema** — invocación directa por ruta absoluta. **Heap JVM forzado a 256–512 MB** (`$env:JVM_ARGS = '-Xms256m -Xmx512m'`) por insuficiencia de pagefile con el default 1 GB. |
| **Docker test infra** | ✅ Levantada | `vinki-postgres-test` (puerto 5434) y `vinki-redis-test` (puerto 6381), ambos `(healthy)`. |
| **Backend en modo perf** | ✅ Verificable con `npm run start:perf` | Wrapper `backend/test/perf/start-perf.ts` carga `.env.test` y arranca Nest. `GET /api/health` responde `status:"ok"` en puerto 3002. |
| **Seed de perf** | ✅ Operativo | `npm run seed:perf` siembra 10 000 preguntas + 1 docto knowledge `status='ready'` + 3 usuarios + 1 entrevista activa en ~15 s. |
| **ThrottlerModule** | ✅ Refactorizado (D-14) | Límites externalizados a env. `.env.test` los eleva a 100 000 / 300 000 para permitir 50 concurrentes. |

---

## 1. Instalación de Apache JMeter (resuelta — Fase 5-A)

JMeter 5.6.3 quedó instalado manualmente por el usuario en:

```
F:\apache-jmeter-5.6.3\apache-jmeter-5.6.3\
```

(Doble carpeta porque la release extraída conserva la subcarpeta
nombrada igual que el zip.) **NO se agregó al `PATH` del sistema**;
todos los comandos de este proyecto invocan el ejecutable por ruta
absoluta para que la corrida sea reproducible en cualquier máquina
clonando el repo (basta con cambiar una variable).

### Variable `JMETER_HOME` recomendada

Para no tener que copiar la ruta larga en cada comando, exportar la
variable de entorno `JMETER_HOME` al inicio de cada sesión:

```powershell
$env:JMETER_HOME = 'F:\apache-jmeter-5.6.3\apache-jmeter-5.6.3'
```

### Heap JVM forzado (workaround pagefile pequeño)

El binario `jmeter.bat` default asigna `-Xms1g -Xmx1g`. En esta
máquina (Windows 11, 8 GB RAM, pagefile administrado por el sistema)
el JVM aborta con:

```
OpenJDK 64-Bit Server VM warning: INFO: os::commit_memory(...) failed;
error='The paging file is too small for this operation to complete'
```

**Workaround vigente:** exportar `JVM_ARGS` antes de cada invocación
de JMeter para reducir el heap a 256–512 MB. Para los planes de Fase
5-A es suficiente; si en el futuro se necesita más memoria
(percentiles muy finos sobre datasets gigantes), aumentar el pagefile
del sistema.

```powershell
$env:JVM_ARGS = '-Xms256m -Xmx512m'
```

### Verificación

```powershell
$env:JVM_ARGS = '-Xms256m -Xmx512m'
& "$env:JMETER_HOME\bin\jmeter.bat" --version
# → Apache JMeter 5.6.3
```

### Plugins opcionales

Para gráficos extendidos (latencias por threadgroup, percentiles
estilo "perfmon"), usar **JMeter Plugins Manager**:

1. Descargar `jmeter-plugins-manager-X.Y.Z.jar` desde
   <https://jmeter-plugins.org/install/Install/>.
2. Copiarlo a `apache-jmeter-5.6.3/lib/ext/`.
3. Reiniciar JMeter — aparece "Plugins Manager" en el menú "Options".

Los plugins más útiles para Vinki (a instalar desde el Plugins Manager
una vez disponible):

- **Custom Thread Groups** — para perfiles de carga "ultimate" con
  rampas más finas.
- **3 Basic Graphs (PerfMon)** — gráfico de tiempos de respuesta vs
  tiempo, throughput vs tiempo, hits/s.

---

## 2. Topología de la prueba

```
   ┌─────────────────────────────┐
   │       JMeter (cliente)       │
   │   http://127.0.0.1:3002      │  ← localhost loopback
   └────────────┬─────────────────┘
                │
                ▼
   ┌─────────────────────────────┐
   │   Backend Nest (start:perf)  │  ← PORT=3002, LLM_SANDBOX=true
   │   (npm run start:perf)       │     THROTTLE_*_LIMIT elevados
   └────┬──────────────────┬──────┘
        │                  │
        ▼                  ▼
   ┌─────────────┐   ┌─────────────┐
   │ Postgres    │   │ Redis       │
   │ test :5434  │   │ test :6381  │
   │ + pgvector  │   │             │
   └─────────────┘   └─────────────┘
```

Todos los componentes corren en la **misma máquina** sobre `127.0.0.1`.
Esto es coherente con el alcance académico (medir arquitectura, no
network jitter). Si en el futuro se quiere medir desde otro host,
basta con cambiar `PLAYWRIGHT_BASE_URL` equivalente en el `.jmx`.

---

## 3. Procedimiento operativo para una corrida de Fase 5-A

### 3.1 Pre-requisitos por sesión

```powershell
# (1) Infra de test arriba:
docker compose -f docker-compose.test.yml up -d
# Esperar a que vinki-postgres-test y vinki-redis-test estén (healthy).
docker ps --filter "name=vinki-postgres-test" --filter "name=vinki-redis-test"

# (2) Migraciones aplicadas (una sola vez por DB virgen):
cd backend
$env:DATABASE_URL = "postgresql://vinki:vinki_test@localhost:5434/vinki_test?schema=public"
npx -y prisma@6.19.2 migrate deploy
Remove-Item Env:DATABASE_URL
```

### 3.2 Sembrar el dataset de perf

```powershell
cd backend
npm run seed:perf
# → 10 000 preguntas + 1 docto knowledge (status='ready') + 3 usuarios + 1
#   entrevista activa para perf-student. Tiempo observado: ~15 s.
```

Para iteración rápida durante el diseño del `.jmx` (sin esperar 15 s
cada vez):

```powershell
$env:PERF_QUESTIONS = "1000"
$env:PERF_CHUNKS = "10"
npm run seed:perf
Remove-Item Env:PERF_QUESTIONS, Env:PERF_CHUNKS
```

Detalle completo en
[`seed_perf.md`](seed_perf.md).

### 3.3 Levantar el backend en modo perf

En una terminal dedicada (deja la terminal abierta — el backend corre
en foreground):

```powershell
cd backend
npm run start:perf
```

Output esperado:

```
[start-perf] arrancando backend con .env.test:
  · PORT=3002
  · LLM_SANDBOX=true
  · THROTTLE_SHORT_LIMIT=100000
  · THROTTLE_LONG_LIMIT=300000
... Nest application successfully started
```

Verificación en otra terminal:

```powershell
curl http://127.0.0.1:3002/api/health
# → {"status":"ok","database":"connected","redis":"connected",...}
```

### 3.4 Ejecutar JMeter

Setear variables de sesión una sola vez (la primera vez):

```powershell
$env:JMETER_HOME = 'F:\apache-jmeter-5.6.3\apache-jmeter-5.6.3'
$env:JVM_ARGS = '-Xms256m -Xmx512m'
```

Modo CLI (corrida oficial, sin GUI — más rápido y reproducible):

```powershell
& "$env:JMETER_HOME\bin\jmeter.bat" -n `
  -t qa\04-pruebas-no-funcionales\rendimiento\planes\02-rnf02-search.jmx `
  -l qa\04-pruebas-no-funcionales\rendimiento\resultados\02-rnf02-search-carga.jtl `
  -e -o qa\04-pruebas-no-funcionales\rendimiento\resultados\02-rnf02-search-carga-html
```

Modo GUI (diseño y debug del `.jmx`, no se usa para corridas
oficiales):

```powershell
& "$env:JMETER_HOME\bin\jmeter.bat"
```

Flags:

- `-n` — non-GUI mode.
- `-t <plan.jmx>` — test plan a ejecutar.
- `-l <results.jtl>` — output crudo de samples (CSV).
- `-e -o <dir>` — generar reporte HTML automáticamente tras la corrida.

### 3.5 Tear down

```powershell
# (1) Detener backend perf:  Ctrl+C en la terminal donde corre `npm run start:perf`.

# (2) Mantener docker test arriba o bajarlo:
docker compose -f docker-compose.test.yml stop
# (no `down` — para preservar volumen `pgdata_test` entre corridas)
```

---

## 4. Scripts de soporte añadidos en este turno (5-PRE)

### `backend/test/perf/seed-perf.ts` (D-16)

Seed determinista de perf, parametrizable por `PERF_QUESTIONS` y
`PERF_CHUNKS`. Guardrail anti-dev-DB. Batch inserts para
performance. Documentado en
[`seed_perf.md`](seed_perf.md).

Script en `backend/package.json`: `npm run seed:perf`.

### `backend/test/perf/start-perf.ts`

Wrapper que carga `backend/.env.test` (sobrescribiendo) y spawnea
`nest start`. Necesario porque `ConfigModule.forRoot()` del SUT
carga `backend/.env` (dev URL) por defecto. Guardrail anti-dev-DB.

Script en `backend/package.json`: `npm run start:perf`.

---

## 5. Versiones y referencias

| Componente | Versión | Comando para verificar |
|---|---|---|
| Java | OpenJDK 17.0.18 (Temurin) | `java -version` |
| Node | v22.x (proyecto general) | `node --version` |
| Prisma CLI | 6.19.2 (pineado por NT-001) | `npx -y prisma@6.19.2 --version` |
| Docker | Docker Desktop | `docker --version` |
| JMeter | **Pendiente — instalar 5.6.x** | `jmeter --version` (post-instalación) |
| Apache JMeter Plugins Manager | Opcional | (post-instalación de JMeter) |

---

## 6. Próximo paso (Fase 5-A)

Una vez JMeter esté instalado:

1. Diseñar 4 planes `.jmx` en
   `qa/04-pruebas-no-funcionales/rendimiento/plans/`:
   - `00-smoke.jmx` — humo del `/api/health`.
   - `rnf-01-evaluate-now.jmx` — RNF-01 vía `evaluate-now` (síncrono).
   - `rnf-02-knowledge-search.jmx` — RNF-02 vía `/knowledge/search`.
   - `rnf-03-concurrency-50.jmx` — RNF-03 con 50 threads.
2. Diseñar 1 plan complementario para D-15:
   - `rnf-01-llm-real.jmx` — subset de 10-20 muestras con
     `LLM_SANDBOX=false` y `OPENAI_API_KEY` real.
3. Ejecutar y capturar reportes en
   `qa/04-pruebas-no-funcionales/rendimiento/reportes/`.
4. Análisis de seguridad (ya pre-configurado en Fase 2.5):
   `npm audit`, Semgrep, `eslint-plugin-security`.

Todo eso lo cubrirá el **Prompt 5-A** (siguiente).
