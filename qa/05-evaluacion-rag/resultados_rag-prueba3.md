# Resultados RAG — Fase 6

|   id | cat   |   F (IA-01) |   AR (IA-02) |   CP (IA-03) |   CR (IA-04) |   AC (IA-05) |   Hall |   lat_ms |
|-----:|:------|------------:|-------------:|-------------:|-------------:|-------------:|-------:|---------:|
|    1 | in-   |           1 |         0.89 |            1 |         1    |         0.99 |    0.8 |     4473 |
|   11 | edg   |           1 |         0.71 |            1 |         0.67 |         0.74 |    0.8 |     5045 |
|   14 | out   |           0 |         0    |            0 |         0.67 |         0.45 |    1   |     2445 |

## Agregados

```json
{
  "by_category": {
    "in-domain": {
      "faithfulness": 1.0,
      "answer_relevancy": 0.8880966476694776,
      "context_precision": 0.9999999999,
      "context_recall": 1.0,
      "answer_correctness": 0.9862069788534404,
      "hallucination_score": 0.8,
      "latency_p95_ms": 4473.033788992325,
      "n_samples": 1
    },
    "edge-case": {
      "faithfulness": 1.0,
      "answer_relevancy": 0.7096931783421453,
      "context_precision": 0.99999999995,
      "context_recall": 0.6666666666666666,
      "answer_correctness": 0.7430268029375694,
      "hallucination_score": 0.8,
      "latency_p95_ms": 5044.616050989134,
      "n_samples": 1
    },
    "out-of-domain": {
      "faithfulness": 0.0,
      "answer_relevancy": 0.0,
      "context_precision": 0.0,
      "context_recall": 0.6666666666666666,
      "answer_correctness": 0.4514664950722739,
      "hallucination_score": 1.0,
      "latency_p95_ms": 2444.5991210086504,
      "n_samples": 1
    }
  },
  "global": {
    "faithfulness": 0.6666666666666666,
    "answer_relevancy": 0.5325966086705409,
    "context_precision": 0.6666666666166666,
    "context_recall": 0.7777777777777778,
    "answer_correctness": 0.7269000922877612,
    "hallucination_score": 0.8666666666666667,
    "latency_p50_ms": 4473.033788992325,
    "latency_p95_ms": 4987.457824789453,
    "latency_p99_ms": 5033.184405749198,
    "n_samples": 3
  },
  "verdict_in_domain": {
    "faithfulness": {
      "actual": 1.0,
      "threshold_min": 0.8,
      "meets": true
    },
    "answer_relevancy": {
      "actual": 0.8880966476694776,
      "threshold_min": 0.8,
      "meets": true
    },
    "context_precision": {
      "actual": 0.9999999999,
      "threshold_min": 0.7,
      "meets": true
    },
    "context_recall": {
      "actual": 1.0,
      "threshold_min": 0.7,
      "meets": true
    },
    "answer_correctness": {
      "actual": 0.9862069788534404,
      "threshold_min": 0.7,
      "meets": true
    },
    "hallucination_rate": {
      "actual": 0.8,
      "threshold_max": 0.1,
      "meets": false
    },
    "latency_p95_ms": {
      "actual": 4987.457824789453,
      "threshold_max": 5000,
      "meets": true
    }
  }
}
```
