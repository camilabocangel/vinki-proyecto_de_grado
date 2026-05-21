# Resultados RAG — Fase 6

|   id | cat   |   F (IA-01) |   AR (IA-02) |   CP (IA-03) |   CR (IA-04) |   AC (IA-05) |   Hall |   lat_ms |
|-----:|:------|------------:|-------------:|-------------:|-------------:|-------------:|-------:|---------:|
|    1 | in-   |        1    |         0.89 |            1 |         1    |         0.99 |    0.8 |     3690 |
|    2 | in-   |        1    |         0.96 |            1 |         1    |         0.78 |    0.8 |     1595 |
|    3 | in-   |        1    |         0.82 |            1 |         1    |         0.52 |    1   |     1649 |
|    4 | in-   |        0.67 |         0.89 |            1 |         1    |         0.7  |    0.8 |     2550 |
|    5 | in-   |        1    |         0.79 |            1 |         1    |         0.96 |    0.8 |     3705 |
|    6 | in-   |        0.67 |         0    |            1 |         1    |         0.88 |    0.8 |     3125 |
|    7 | in-   |        1    |         0.78 |            1 |         1    |         0.7  |    0.8 |     2685 |
|    8 | in-   |        1    |         0.87 |            1 |         1    |         0.95 |    0.8 |     5899 |
|    9 | in-   |        1    |         0.84 |            1 |         1    |         0.98 |    0.8 |    67565 |
|   10 | in-   |        1    |         0.82 |            1 |         1    |         0.82 |    0.8 |     2531 |
|   11 | edg   |        1    |         0.71 |            1 |         0.67 |         0.8  |    0.8 |     3809 |
|   12 | edg   |        0.67 |         0.85 |            1 |         1    |         0.51 |    0.8 |     3627 |
|   13 | edg   |        0.8  |         0.77 |            1 |         0.5  |         0.85 |    1   |     4510 |
|   14 | out   |        1    |         0    |            0 |         0.67 |         0.08 |    1   |     1608 |
|   15 | out   |        0    |         0    |            0 |         1    |         0.17 |    1   |     1566 |

## Agregados

```json
{
  "by_category": {
    "in-domain": {
      "faithfulness": 0.9333333333333333,
      "answer_relevancy": 0.7666077280671194,
      "context_precision": 0.999999999905,
      "context_recall": 1.0,
      "answer_correctness": 0.8283263579431329,
      "hallucination_score": 0.8200000000000001,
      "latency_p95_ms": 39815.5724030504,
      "n_samples": 10
    },
    "edge-case": {
      "faithfulness": 0.8222222222222222,
      "answer_relevancy": 0.7773385508326877,
      "context_precision": 0.99999999995,
      "context_recall": 0.7222222222222222,
      "answer_correctness": 0.7192583910181796,
      "hallucination_score": 0.8666666666666667,
      "latency_p95_ms": 4439.61082851165,
      "n_samples": 3
    },
    "out-of-domain": {
      "faithfulness": 0.5,
      "answer_relevancy": 0.0,
      "context_precision": 0.0,
      "context_recall": 0.8333333333333333,
      "answer_correctness": 0.12078645880791035,
      "hallucination_score": 1.0,
      "latency_p95_ms": 1605.6238620556542,
      "n_samples": 2
    }
  },
  "global": {
    "faithfulness": 0.8533333333333333,
    "answer_relevancy": 0.6665395288779505,
    "context_precision": 0.8666666665933334,
    "context_recall": 0.9222222222222222,
    "answer_correctness": 0.7121741113401125,
    "hallucination_score": 0.8533333333333334,
    "latency_p50_ms": 3124.8936529882485,
    "latency_p95_ms": 24399.008155301206,
    "latency_p99_ms": 58932.11207025943,
    "n_samples": 15
  },
  "verdict_in_domain": {
    "faithfulness": {
      "actual": 0.9333333333333333,
      "threshold_min": 0.8,
      "meets": true
    },
    "answer_relevancy": {
      "actual": 0.7666077280671194,
      "threshold_min": 0.8,
      "meets": false
    },
    "context_precision": {
      "actual": 0.999999999905,
      "threshold_min": 0.7,
      "meets": true
    },
    "context_recall": {
      "actual": 1.0,
      "threshold_min": 0.7,
      "meets": true
    },
    "answer_correctness": {
      "actual": 0.8283263579431329,
      "threshold_min": 0.7,
      "meets": true
    },
    "hallucination_rate": {
      "actual": 0.8200000000000001,
      "threshold_max": 0.1,
      "meets": false
    },
    "latency_p95_ms": {
      "actual": 24399.008155301206,
      "threshold_max": 5000,
      "meets": false
    }
  }
}
```
