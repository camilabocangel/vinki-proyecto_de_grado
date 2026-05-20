# Setup de Semgrep — Análisis estático de seguridad

> Herramienta seleccionada en el plan maestro (§4) para complementar a
> `eslint-plugin-security` con un análisis estático más exhaustivo (reglas
> de OWASP, secretos hardcodeados, malas prácticas comunes).
> Semgrep es un binario nativo (Python). NO se instala vía npm.

## Instalación

### macOS
```bash
brew install semgrep
```

### Linux
```bash
python3 -m pip install --user semgrep
# o, alternativamente:
curl -sSL https://semgrep.dev/install.sh | sh
```

### Windows
Semgrep no tiene paquete nativo para Windows. Opciones:
1. **WSL2** (recomendado): instalar como en Linux dentro de Ubuntu/WSL.
2. **Docker** (sin WSL):
   ```powershell
   docker run --rm -v ${PWD}:/src returntocorp/semgrep semgrep --config auto /src
   ```
3. **Container en CI**: ver `.github/workflows/ci.yml` (job dedicado).

### Verificar instalación
```bash
semgrep --version
```

## Ejecutar el smoke

Desde la raíz del repositorio:
```bash
semgrep --config auto . \
  --json \
  --output qa/04-pruebas-no-funcionales/seguridad/semgrep_smoke.json
```

Equivalente legible (texto plano):
```bash
semgrep --config auto . \
  --output qa/04-pruebas-no-funcionales/seguridad/semgrep_smoke.txt
```

`--config auto` selecciona automáticamente las reglas del registry de
Semgrep según los lenguajes detectados (TypeScript, JavaScript, SQL, Docker).

### Filtros recomendados

- Solo severidad alta:
  ```bash
  semgrep --config auto --severity ERROR .
  ```
- Excluir migraciones (no editables y ruido alto):
  ```bash
  semgrep --config auto --exclude 'backend/prisma/migrations/**' .
  ```
- Excluir tests:
  ```bash
  semgrep --config auto --exclude '**/*.spec.ts' --exclude '**/*.test.tsx' .
  ```

## Estado al cerrar la Fase 1

- **Documentación de instalación**: completa.
- **Comando de smoke**: documentado.
- **Ejecución del smoke**: **pendiente de instalación local de Semgrep**.
  El agente de QA NO ha ejecutado Semgrep porque el binario no está
  disponible en el entorno Windows actual.

## Resultado de la primera ejecución manual

> Completar al ejecutar Semgrep por primera vez.

```text
[Pegar aquí el resumen de `semgrep --config auto .`]
```

## Política de severidad

| Severidad Semgrep | Acción |
|---|---|
| ERROR | Bloquea el merge. Debe corregirse o justificarse en PR. |
| WARNING | No bloquea. Se revisa en cada PR; acumulables se atacan en backlog. |
| INFO | Informativo. Se registra para tendencia. |

En CI (Fase posterior, no incluida en la Fase 1):
```bash
semgrep --config auto --error --severity ERROR .
```
`--error` hace que un ERROR retorne exit code distinto de 0.
