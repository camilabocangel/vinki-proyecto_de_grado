"""
Script de evaluación del pipeline RAG de Vinki — Fase 6.

USO:
    # Dry-run (sin llamadas reales al LLM ni al backend):
    python evaluar_rag.py --dry-run

    # Corrida oficial (requiere autorización del docente para usar la key):
    python evaluar_rag.py --live --backend-url http://host.docker.internal:3000

CONTRATO:
    - Carga `dataset_evaluacion.json` (15 preguntas curadas + ground truth).
    - Por cada pregunta:
        1. Recupera los chunks del corpus de Vinki vía POST /api/knowledge/search
           (mismo endpoint que usa la UI del recruiter — pipeline REAL del SUT).
        2. Genera una respuesta usando gpt-4o-mini con un prompt template
           documentado, reproduciendo el patrón del RagQuestionGeneratorService
           pero orientado a Q→A (Vinki MVP genera preguntas; este script las
           responde para alimentar Ragas con el formato estándar Q/A/Contexts/GT).
        3. Mide latencia de end-to-end (retrieval + generación).
    - Pasa (question, answer, retrieved_contexts, ground_truth) a Ragas y
      DeepEval para calcular las 6 métricas IA-01..IA-06 + Hallucination Rate.
    - Exporta:
        * resultados_rag.json  — detalle por pregunta + agregados
        * resultados_rag.md    — tabla legible para el informe

SEGURIDAD:
    - La key OpenAI se lee de backend/.env (NO se hardcodea).
    - En modo dry-run NO se hace ninguna llamada al LLM ni al backend.
    - En modo live, una sola corrida ≈ $0.02-0.20 USD (ver setup_entorno_rag.md).

LIMITACIONES DOCUMENTADAS:
    - El SUT actual NO tiene un endpoint público de "responder pregunta vía
      RAG" — su RAG está orientado a GENERAR preguntas (RagQuestionGenerator).
      Para alimentar Ragas con el formato Q/A/Contexts/GT estándar, este
      script reconstruye el paso final (LLM con contexto) usando OpenAI
      directamente y un prompt template documentado. El retrieval sí se
      delega 100% al SUT vía /api/knowledge/search.
    - Esto se declara honestamente en el reporte como decisión D-19
      (propuesta — pendiente de validar con el tutor).

ARGUMENTOS CLI:
    --dry-run            No llama al LLM ni al backend. Valida que el script
                         carga, importa Ragas, y procesa el dataset.
    --live               Modo oficial: hace las llamadas reales.
    --backend-url URL    URL del backend Vinki en modo perf:real
                         (default: http://127.0.0.1:3000 desde host;
                          http://host.docker.internal:3000 desde Docker).
    --judge-model NAME   Modelo del juez Ragas (default: gpt-4o-mini).
    --answerer-model NAME Modelo que responde las preguntas (default:
                          gpt-4o-mini, mismo que usa Vinki).
    --output-dir PATH    Carpeta de salida (default: qa/05-evaluacion-rag/).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from statistics import mean, median
from typing import Any

# pylint: disable=wrong-import-position
try:
    import pandas as pd
    from dotenv import load_dotenv
except ImportError as e:
    print(
        f"[evaluar_rag] dependencia faltante: {e}. "
        "Ejecuta este script dentro del contenedor vinki-rag-eval:6pre "
        "(ver Dockerfile en qa/05-evaluacion-rag/).",
        file=sys.stderr,
    )
    sys.exit(1)


# ─────────────────────────────────────────────────────────────────
# Configuración
# ─────────────────────────────────────────────────────────────────

# Ruta del script y del repo (cuando se ejecuta dentro del contenedor con
# el repo montado en /workspace, el script vive en
# /workspace/qa/05-evaluacion-rag/evaluar_rag.py).
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent  # qa/05-... → qa → repo
DATASET_PATH = SCRIPT_DIR / "dataset_evaluacion.json"
DEFAULT_OUTPUT_DIR = SCRIPT_DIR

# Prompt template para responder a partir de contextos (reproduce el patrón
# de RagQuestionGeneratorService pero orientado a Q→A).
# Documentado en metricas_rag.md y bug_seguridad ninguno aquí — es prompt
# de evaluación, no del SUT.
ANSWER_SYSTEM_PROMPT = (
    "Eres un experto en entrevistas técnicas de Backend. "
    "Responde la pregunta del usuario basándote EXCLUSIVAMENTE en el "
    "contenido técnico proporcionado en el contexto. "
    "Si el contexto no contiene información suficiente para responder, "
    "indica explícitamente que no tienes información en el material "
    "disponible — NO inventes datos ni respondas con conocimiento general. "
    "Sé conciso y técnicamente preciso."
)

ANSWER_USER_TEMPLATE = (
    "Contexto técnico recuperado:\n\n"
    "{context}\n\n"
    "---\n\n"
    "Pregunta: {question}\n\n"
    "Responde basándote ÚNICAMENTE en el contexto anterior."
)

# Umbrales del plan maestro § 5.5
THRESHOLDS = {
    "faithfulness": 0.80,        # IA-01
    "answer_relevancy": 0.80,    # IA-02
    "context_precision": 0.70,   # IA-03
    "context_recall": 0.70,      # IA-04 (propuesto Fase 6)
    "answer_correctness": 0.70,  # IA-05 (propuesto Fase 6)
    "hallucination_rate_max": 0.10,  # DeepEval (≤ 10 %)
    "latency_p95_ms_max": 5000,  # IA-06 / RNF-01
}


@dataclass
class EvalSample:
    """Una entrada del dataset enriquecida con la respuesta y contextos."""

    id: int
    category: str
    question: str
    ground_truth: str
    ground_truth_context: str
    expected_doc_title: str | None
    # Llenado al ejecutar:
    answer: str = ""
    retrieved_contexts: list[str] | None = None
    latency_ms: float | None = None
    metrics: dict[str, float] | None = None


# ─────────────────────────────────────────────────────────────────
# Carga del dataset
# ─────────────────────────────────────────────────────────────────


def load_dataset() -> list[EvalSample]:
    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"No encontré {DATASET_PATH}")
    with DATASET_PATH.open(encoding="utf-8") as f:
        raw = json.load(f)
    return [
        EvalSample(
            id=item["id"],
            category=item["category"],
            question=item["question"],
            ground_truth=item["ground_truth"],
            ground_truth_context=item["ground_truth_context"],
            expected_doc_title=item.get("expected_doc_title"),
        )
        for item in raw
    ]


# ─────────────────────────────────────────────────────────────────
# Llamadas al backend Vinki (retrieval real) + OpenAI (generación)
# ─────────────────────────────────────────────────────────────────


def call_retrieval(backend_url: str, query: str, limit: int = 5) -> list[str]:
    """POST /api/knowledge/search del SUT — devuelve list[str] de contenidos.

    Requiere autenticación de recruiter/admin. El script asume que el caller
    inyectó la cookie de sesión vía env BACKEND_COOKIE (formato: '
    access_token=...; refresh_token=...').
    """
    import requests  # noqa: PLC0415 — import diferido para soporte dry-run

    cookie = os.environ.get("BACKEND_COOKIE", "")
    if not cookie:
        raise RuntimeError(
            "BACKEND_COOKIE no definido. Para corrida live, primero hacer "
            "login y exportar la cookie. Ver setup_entorno_rag.md § 4."
        )
    resp = requests.post(
        f"{backend_url}/api/knowledge/search",
        json={"query": query, "limit": limit},
        headers={"Cookie": cookie, "Content-Type": "application/json"},
        timeout=30,
    )
    resp.raise_for_status()
    body = resp.json()
    # /api/knowledge/search devuelve { results: [{ content, distance, documentTitle }, ...] }
    return [r["content"] for r in body.get("results", [])]


def call_generation(
    openai_client: Any,
    model: str,
    question: str,
    contexts: list[str],
) -> str:
    """Llama a gpt-4o-mini con el prompt template Q→A documentado."""
    context_text = "\n\n---\n\n".join(contexts) if contexts else "(sin contexto recuperado)"
    user_prompt = ANSWER_USER_TEMPLATE.format(
        context=context_text,
        question=question,
    )
    resp = openai_client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": ANSWER_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,   # baja para reproducibilidad (R-4)
        max_tokens=500,
    )
    return resp.choices[0].message.content or ""


# ─────────────────────────────────────────────────────────────────
# Ragas — cálculo de métricas
# ─────────────────────────────────────────────────────────────────


def evaluate_with_ragas(
    samples: list[EvalSample],
    judge_model: str,
) -> list[dict[str, float]]:
    """Pasa los samples por las 5 métricas Ragas y devuelve list de dicts."""
    # Imports diferidos: en dry-run no queremos importar Ragas si no se va
    # a usar (más rápido, evita el coste del init).
    from datasets import Dataset  # noqa: PLC0415
    from ragas import evaluate  # noqa: PLC0415
    from ragas.metrics import (  # noqa: PLC0415
        answer_correctness,
        answer_relevancy,
        context_precision,
        context_recall,
        faithfulness,
    )
    from ragas.llms import LangchainLLMWrapper  # noqa: PLC0415
    from ragas.embeddings import LangchainEmbeddingsWrapper  # noqa: PLC0415
    from langchain_openai import ChatOpenAI, OpenAIEmbeddings  # noqa: PLC0415

    # Wrappers de Ragas para usar nuestros modelos económicos (gpt-4o-mini
    # como juez, text-embedding-3-small como embedder de Ragas — coincide
    # con el del SUT, lo cual es coherente).
    judge_llm = LangchainLLMWrapper(
        ChatOpenAI(model=judge_model, temperature=0.0),
    )
    judge_emb = LangchainEmbeddingsWrapper(
        OpenAIEmbeddings(model="text-embedding-3-small"),
    )

    dataset = Dataset.from_dict(
        {
            "question": [s.question for s in samples],
            "answer": [s.answer for s in samples],
            "contexts": [s.retrieved_contexts or [] for s in samples],
            "ground_truth": [s.ground_truth for s in samples],
        }
    )

    result = evaluate(
        dataset,
        metrics=[
            faithfulness,
            answer_relevancy,
            context_precision,
            context_recall,
            answer_correctness,
        ],
        llm=judge_llm,
        embeddings=judge_emb,
    )

    # Ragas devuelve un EvaluationResult; lo convertimos a list[dict] por sample.
    df = result.to_pandas()
    metric_cols = [
        "faithfulness",
        "answer_relevancy",
        "context_precision",
        "context_recall",
        "answer_correctness",
    ]
    return [
        {col: float(df.iloc[i][col]) if col in df.columns else float("nan") for col in metric_cols}
        for i in range(len(samples))
    ]


def evaluate_with_deepeval(
    samples: list[EvalSample],
    judge_model: str,
) -> list[float]:
    """DeepEval HallucinationMetric para verificación cruzada de IA-01.

    Devuelve list[float] de scores en [0,1] donde 1 = totalmente alucinado.
    (Inverso de Faithfulness de Ragas.)
    """
    from deepeval.metrics import HallucinationMetric  # noqa: PLC0415
    from deepeval.test_case import LLMTestCase  # noqa: PLC0415

    # DeepEval lee el modelo desde env DEEPEVAL_MODEL o se pasa explícito;
    # para mantener costo bajo, configuramos gpt-4o-mini.
    metric = HallucinationMetric(threshold=0.5, model=judge_model)

    scores: list[float] = []
    for s in samples:
        test_case = LLMTestCase(
            input=s.question,
            actual_output=s.answer,
            context=s.retrieved_contexts or [],
        )
        metric.measure(test_case)
        scores.append(float(metric.score))
    return scores


# ─────────────────────────────────────────────────────────────────
# Agregación + reporte
# ─────────────────────────────────────────────────────────────────


def aggregate(samples: list[EvalSample]) -> dict[str, Any]:
    """Calcula media por métrica, P95 de latencia, error/threshold."""
    out: dict[str, Any] = {"by_category": {}, "global": {}}

    def avg(values: list[float]) -> float | None:
        clean = [v for v in values if v == v]  # filtra NaN
        return mean(clean) if clean else None

    def percentile(values: list[float], p: float) -> float | None:
        if not values:
            return None
        s = sorted(values)
        k = (len(s) - 1) * p
        f, c = int(k), min(int(k) + 1, len(s) - 1)
        return s[f] + (s[c] - s[f]) * (k - f)

    metric_names = [
        "faithfulness",
        "answer_relevancy",
        "context_precision",
        "context_recall",
        "answer_correctness",
        "hallucination_score",
    ]

    # Global
    for m in metric_names:
        vals = [s.metrics[m] for s in samples if s.metrics and m in s.metrics]
        out["global"][m] = avg(vals)
    latencies = [s.latency_ms for s in samples if s.latency_ms is not None]
    out["global"]["latency_p50_ms"] = percentile(latencies, 0.50)
    out["global"]["latency_p95_ms"] = percentile(latencies, 0.95)
    out["global"]["latency_p99_ms"] = percentile(latencies, 0.99)
    out["global"]["n_samples"] = len(samples)

    # Por categoría
    for cat in ("in-domain", "edge-case", "out-of-domain"):
        subset = [s for s in samples if s.category == cat]
        per_cat = {}
        for m in metric_names:
            vals = [s.metrics[m] for s in subset if s.metrics and m in s.metrics]
            per_cat[m] = avg(vals)
        cat_lat = [s.latency_ms for s in subset if s.latency_ms is not None]
        per_cat["latency_p95_ms"] = percentile(cat_lat, 0.95)
        per_cat["n_samples"] = len(subset)
        out["by_category"][cat] = per_cat

    # Veredicto vs thresholds (sobre in-domain — criterio principal)
    in_domain_metrics = out["by_category"]["in-domain"]
    verdict = {}
    for k, threshold in THRESHOLDS.items():
        if k == "hallucination_rate_max":
            actual = in_domain_metrics.get("hallucination_score")
            verdict["hallucination_rate"] = {
                "actual": actual,
                "threshold_max": threshold,
                "meets": actual is not None and actual <= threshold,
            }
        elif k == "latency_p95_ms_max":
            actual = out["global"]["latency_p95_ms"]
            verdict["latency_p95_ms"] = {
                "actual": actual,
                "threshold_max": threshold,
                "meets": actual is not None and actual < threshold,
            }
        else:
            actual = in_domain_metrics.get(k)
            verdict[k] = {
                "actual": actual,
                "threshold_min": threshold,
                "meets": actual is not None and actual >= threshold,
            }
    out["verdict_in_domain"] = verdict
    return out


def write_outputs(
    samples: list[EvalSample],
    aggregates: dict[str, Any],
    output_dir: Path,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    # JSON detallado
    json_path = output_dir / "resultados_rag.json"
    payload = {
        "samples": [
            {
                "id": s.id,
                "category": s.category,
                "question": s.question,
                "ground_truth": s.ground_truth,
                "answer": s.answer,
                "retrieved_contexts": s.retrieved_contexts,
                "latency_ms": s.latency_ms,
                "metrics": s.metrics,
            }
            for s in samples
        ],
        "aggregates": aggregates,
    }
    json_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"[evaluar_rag] resultados JSON → {json_path}")

    # Tabla markdown
    md_path = output_dir / "resultados_rag.md"
    rows = []
    for s in samples:
        m = s.metrics or {}
        rows.append(
            {
                "id": s.id,
                "cat": s.category[:3],
                "F (IA-01)": f"{m.get('faithfulness', float('nan')):.2f}",
                "AR (IA-02)": f"{m.get('answer_relevancy', float('nan')):.2f}",
                "CP (IA-03)": f"{m.get('context_precision', float('nan')):.2f}",
                "CR (IA-04)": f"{m.get('context_recall', float('nan')):.2f}",
                "AC (IA-05)": f"{m.get('answer_correctness', float('nan')):.2f}",
                "Hall": f"{m.get('hallucination_score', float('nan')):.2f}",
                "lat_ms": f"{s.latency_ms or 0:.0f}",
            }
        )
    df = pd.DataFrame(rows)
    md_path.write_text(
        "# Resultados RAG — Fase 6\n\n"
        + df.to_markdown(index=False)
        + "\n\n## Agregados\n\n```json\n"
        + json.dumps(aggregates, indent=2, ensure_ascii=False)
        + "\n```\n",
        encoding="utf-8",
    )
    print(f"[evaluar_rag] resultados tabla → {md_path}")


# ─────────────────────────────────────────────────────────────────
# Modo dry-run — valida el script sin llamar al LLM ni al backend
# ─────────────────────────────────────────────────────────────────


def dry_run(samples: list[EvalSample]) -> None:
    print(f"[dry-run] dataset cargado: {len(samples)} preguntas")
    by_cat: dict[str, int] = {}
    for s in samples:
        by_cat[s.category] = by_cat.get(s.category, 0) + 1
    print(f"[dry-run] distribución: {by_cat}")
    # Simular llenado de answer + contexts + metrics SIN llamar al LLM
    for s in samples:
        s.retrieved_contexts = [f"[DRY-RUN] mock chunk para id {s.id}"]
        s.answer = f"[DRY-RUN] respuesta mock para id {s.id}"
        s.latency_ms = 1234.5
        s.metrics = {
            "faithfulness": 0.0,
            "answer_relevancy": 0.0,
            "context_precision": 0.0,
            "context_recall": 0.0,
            "answer_correctness": 0.0,
            "hallucination_score": 0.0,
        }
    aggs = aggregate(samples)
    print(f"[dry-run] agregados calculados ✓")
    print(f"[dry-run] keys globales: {list(aggs['global'].keys())}")
    print(f"[dry-run] keys verdict: {list(aggs['verdict_in_domain'].keys())}")
    print("[dry-run] OK — script válido, listo para corrida live.")


# ─────────────────────────────────────────────────────────────────
# Modo live
# ─────────────────────────────────────────────────────────────────


def live_run(
    samples: list[EvalSample],
    backend_url: str,
    judge_model: str,
    answerer_model: str,
    output_dir: Path,
) -> None:
    # Carga key real desde backend/.env
    env_path = REPO_ROOT / "backend" / ".env"
    if not env_path.exists():
        # Cuando se ejecuta dentro del contenedor con repo montado en /workspace
        env_path = Path("/workspace/backend/.env")
    load_dotenv(dotenv_path=env_path, override=False)
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key or not api_key.startswith("sk-") or len(api_key) < 30:
        raise RuntimeError(
            "OPENAI_API_KEY no es real (debe empezar con 'sk-' y len >= 30). "
            "Verifica backend/.env."
        )
    redacted = api_key[:8] + "..."
    print(f"[evaluar_rag] key OpenAI cargada: {redacted} (redacted)")
    print(f"[evaluar_rag] judge model: {judge_model}")
    print(f"[evaluar_rag] answerer model: {answerer_model}")
    print(f"[evaluar_rag] backend URL: {backend_url}")

    from openai import OpenAI  # noqa: PLC0415

    client = OpenAI(api_key=api_key)

    for i, s in enumerate(samples, 1):
        t0 = time.perf_counter()
        try:
            ctx = call_retrieval(backend_url, s.question, limit=5)
            answer = call_generation(client, answerer_model, s.question, ctx)
            t1 = time.perf_counter()
            s.retrieved_contexts = ctx
            s.answer = answer
            s.latency_ms = (t1 - t0) * 1000
            print(f"  [{i}/{len(samples)}] id={s.id:>2} {s.category[:3]} lat={s.latency_ms:.0f}ms")
        except Exception as exc:
            print(f"  [{i}/{len(samples)}] id={s.id:>2} ERROR: {exc}")
            s.retrieved_contexts = []
            s.answer = ""
            s.latency_ms = None

    # Métricas Ragas
    print("[evaluar_rag] calculando métricas Ragas...")
    ragas_results = evaluate_with_ragas(samples, judge_model)
    for s, r in zip(samples, ragas_results):
        s.metrics = dict(r)

    # DeepEval Hallucination
    print("[evaluar_rag] calculando DeepEval HallucinationMetric...")
    hall_scores = evaluate_with_deepeval(samples, judge_model)
    for s, h in zip(samples, hall_scores):
        if s.metrics is None:
            s.metrics = {}
        s.metrics["hallucination_score"] = h

    aggs = aggregate(samples)
    write_outputs(samples, aggs, output_dir)
    print("[evaluar_rag] OK — Fase 6 completada.")


# ─────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluación RAG de Vinki (Fase 6)")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true", help="Sin llamadas reales")
    mode.add_argument("--live", action="store_true", help="Llamadas reales al LLM y backend")
    parser.add_argument("--backend-url", default="http://127.0.0.1:3000")
    parser.add_argument("--judge-model", default="gpt-4o-mini")
    parser.add_argument("--answerer-model", default="gpt-4o-mini")
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR))
    args = parser.parse_args()

    samples = load_dataset()
    output_dir = Path(args.output_dir)

    if args.dry_run:
        dry_run(samples)
        return 0
    live_run(
        samples,
        backend_url=args.backend_url,
        judge_model=args.judge_model,
        answerer_model=args.answerer_model,
        output_dir=output_dir,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
