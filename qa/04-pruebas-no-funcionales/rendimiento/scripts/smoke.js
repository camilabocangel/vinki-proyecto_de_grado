// ============================================================
// ARCHIVADO — Propuesta inicial descartada por Decisión D-9
// (instrucción del tutor: usar Apache JMeter en lugar de k6).
// NO EJECUTAR. Mantenido como referencia histórica.
// Setup oficial JMeter pendiente para Fase 5.
// Ver: qa/01-plan-maestro/decisiones_qa.md § D-9
// ============================================================
//
// Smoke de k6 — humo del endpoint de health del backend.
//
// Objetivo (propuesta original): confirmar que el binario k6 está
// disponible, que el backend responde y que el pipeline de pruebas
// de rendimiento queda listo para las suites reales (RNF-01 a RNF-03
// en la Fase 6 del plan maestro).
//
// Ejecución (propuesta original — NO EJECUTAR tras D-9):
//   k6 run qa/04-pruebas-no-funcionales/rendimiento/scripts/smoke.js
//
// Variables de entorno:
//   BASE_URL  — URL base del backend (default http://localhost:3000).
//               En staging: k6 run -e BASE_URL=https://staging.vinki.dev ...

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  duration: '10s',
  thresholds: {
    // Smoke conservador: el umbral fino (P95 < 5 s para evaluación IA,
    // P95 < 500 ms para búsqueda vectorial) se aplica en los scripts
    // específicos de cada escenario, no aquí.
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  const res = http.get(`${baseUrl}/api/health`);

  check(res, {
    'status 200': (r) => r.status === 200,
    'response time < 500 ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
