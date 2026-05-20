# ARCHIVADO — Setup de k6 (propuesta descartada)

> **ARCHIVADO** — Propuesta inicial descartada por **Decisión D-9**
> (instrucción del tutor: usar **Apache JMeter** en lugar de k6).
> Mantenido como referencia histórica únicamente; **NO ejecutar**.
>
> Ver: [`qa/01-plan-maestro/decisiones_qa.md` § D-9](../../01-plan-maestro/decisiones_qa.md).
> El setup oficial de Apache JMeter se preparará al iniciar la Fase 5.
>
> El script `scripts/smoke.js` también queda archivado por la misma
> razón (no eliminar; referencia histórica).

---

# Setup de k6 — Pruebas de rendimiento (PROPUESTA ORIGINAL, DESCARTADA)

> Herramienta seleccionada en el plan maestro (§4) para validar RNF-01 a
> RNF-03 y RNF-30 (apoyo).
> k6 es un binario nativo, NO se instala vía npm.

## Instalación

### Windows (Chocolatey)
```powershell
choco install k6
```

### Windows (instalador oficial)
Descargar el `.msi` desde https://k6.io/docs/getting-started/installation/ y
ejecutarlo.

### macOS
```bash
brew install k6
```

### Linux (Debian/Ubuntu)
```bash
sudo gpg -k
sudo gpg --no-default-keyring \
  --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Linux (Fedora/RHEL)
```bash
sudo dnf install https://dl.k6.io/rpm/repo.rpm
sudo dnf install k6
```

### Verificar instalación
```bash
k6 version
```
Debe mostrar `k6 v0.x.x` (la versión exacta varía según el gestor; cualquier
release ≥ 0.50 es compatible con los scripts).

## Ejecutar el smoke

Requisitos:
1. **Backend corriendo** en `http://localhost:3000` (o sobreescribir con
   `BASE_URL`).
   - Si usas Docker: `docker compose up -d backend` (queda en el puerto
     `3001` del host; ajusta `BASE_URL=http://localhost:3001`).
   - Si usas npm: `npm --prefix backend run start:dev` (puerto 3000).

Comando:
```bash
k6 run qa/04-pruebas-no-funcionales/rendimiento/scripts/smoke.js
```

Con backend en otro puerto:
```bash
k6 run -e BASE_URL=http://localhost:3001 \
  qa/04-pruebas-no-funcionales/rendimiento/scripts/smoke.js
```

## Resultado esperado del smoke

- 1 VU durante 10 s.
- Endpoint: `GET /api/health`.
- Checks: `status 200` = 100 %, `response time < 500 ms` = 100 %.
- Thresholds: `http_req_duration p(95) < 2000 ms`, `http_req_failed rate < 1 %`.

## Convenciones para nuevos scripts

```
qa/04-pruebas-no-funcionales/rendimiento/
├── scripts/    # Un .js por escenario (smoke, load, stress, soak corto, RAG).
├── data/       # Payloads y datasets sintéticos.
└── reportes/   # Salida JSON/HTML generada por k6.
```

Reglas:

1. Cada script declara sus propios `thresholds` derivados del RNF que cubre.
2. Los scripts toman la URL base de `__ENV.BASE_URL` con `localhost:3000` por
   defecto.
3. Los datasets sintéticos van en `data/`, versionados.
4. Las salidas (JSON con `--summary-export`, HTML con extensión community)
   van en `reportes/`.

## Estado al cerrar la Fase 1

- **Estructura**: creada.
- **Smoke script**: creado.
- **Ejecución del smoke**: **pendiente de instalación local de k6**. El
  agente de QA NO ha ejecutado k6 porque el binario no está disponible en
  el entorno; se requiere instalación manual con uno de los comandos
  anteriores.

## Resultado de la primera ejecución manual

> Completar al ejecutar el smoke por primera vez.

```text
[Pegar aquí el output de `k6 run ...`]
```
