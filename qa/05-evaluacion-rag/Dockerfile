# Imagen reproducible para la evaluación RAG de Vinki (Fase 6).
#
# Construir:
#   docker build -t vinki-rag-eval:6pre qa/05-evaluacion-rag/
#
# Ejecutar (dry-run, sin key OpenAI real):
#   docker run --rm -v "$PWD:/workspace" vinki-rag-eval:6pre \
#     python qa/05-evaluacion-rag/evaluar_rag.py --dry-run
#
# Ejecutar la evaluación oficial (requiere autorización del docente):
#   docker run --rm \
#     -v "$PWD:/workspace" \
#     -e OPENAI_API_KEY \
#     vinki-rag-eval:6pre \
#     python qa/05-evaluacion-rag/evaluar_rag.py --live --backend-url http://host.docker.internal:3000

FROM python:3.11-slim

# Dependencias del sistema:
# - build-essential: por si alguna wheel requiere compilar (raro en slim, pero por seguridad)
# - git: Ragas/DeepEval a veces leen meta de paquetes vía git
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        git \
    && rm -rf /var/lib/apt/lists/*

# Working dir donde se montará el repo del proyecto
WORKDIR /workspace

# Instalación de dependencias Python pineadas.
# Las versiones pineadas evitan que un upgrade silencioso de Ragas
# cambie las métricas entre corridas (R-4 del plan maestro: no
# determinismo). Pin conservador con rango de minor compatible.
RUN pip install --no-cache-dir \
        "ragas>=0.2,<0.4" \
        "deepeval>=2.0,<3.0" \
        "openai>=1.50,<2.0" \
        "pandas>=2.2,<3.0" \
        "python-dotenv>=1.0,<2.0" \
        "datasets>=2.20,<4.0" \
        "tabulate>=0.9,<1.0"

# Verifica que las librerías importan sin error (build-time smoke test).
RUN python -c "import ragas, deepeval, openai, pandas, dotenv; \
    import ragas.metrics; \
    print('ragas', ragas.__version__); \
    print('deepeval', deepeval.__version__); \
    print('openai', openai.__version__); \
    print('pandas', pandas.__version__)"

# Entrypoint por defecto: shell. El usuario invoca el script vía
# docker run ... vinki-rag-eval:6pre python qa/05-evaluacion-rag/evaluar_rag.py
CMD ["/bin/bash"]
