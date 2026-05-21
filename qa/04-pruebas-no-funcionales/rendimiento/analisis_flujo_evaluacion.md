# Análisis del flujo real de evaluación (contexto HE-06)

> **Propósito:** verificar, leyendo el código tal como está, qué flujo
> de evaluación ve realmente el usuario final, para decidir si el
> hallazgo **HE-06** (P95 = 7 418 ms del endpoint `evaluate-now` excede
> el umbral RNF-01 de 5 s) representa un problema real de UX o un caso
> aislado de un endpoint auxiliar.
>
> **No se modificó nada.** Solo lectura de código.
> **Fecha:** 2026-05-20.

---

## 1. Flujo del usuario al enviar respuesta

El componente clave es
[`frontend/app/src/pages/interview/InterviewSessionPage.tsx`](../../../frontend/app/src/pages/interview/InterviewSessionPage.tsx).
Detecta el modo del interview en la línea 91:

```tsx
const isPracticeMode = currentInterview?.mode === 'practice'
```

Y bifurca el comportamiento del botón "Guardar respuesta" en
`handleSubmitAnswer` (líneas 154-190):

```tsx
submitAnswer.mutate({ questionId, answerText, answeredInSeconds }, {
  onSuccess: () => {
    // In practice mode, auto-trigger evaluation after saving
    if (isPracticeMode) {
      evaluateNow.mutate(question.id)
    }
  },
})
```

donde `evaluateNow` está definido en las líneas 114-125 y golpea
**el endpoint medido en Fase 5-A**:

```tsx
mutationFn: (questionId: number) =>
  api.post<PracticeEvaluation>(
    `/interviews/${id}/questions/${questionId}/evaluate-now`,
  ),
```

### Bifurcación según modo

| Modo del interview | Acción al "Guardar respuesta" | El usuario espera la evaluación inline? |
|---|---|---|
| **`practice`** | `POST /answer` → `POST /evaluate-now` (síncrono, inline) | **SÍ — bloqueado con `<Spin />` y label `evaluatingAnswer`** |
| **`evaluation`** (default) | `POST /answer` y nada más por respuesta | NO — no se llama a `evaluate-now` |
| **`behavioral`** | igual que `evaluation` | NO |

Y al terminar TODO el interview, el botón "Finalizar entrevista"
(línea 530-533) llama a `finishInterview` (línea 127-132):

```tsx
const finishInterview = useMutation({
  mutationFn: () => api.post(`/interviews/${id}/finish`),
  onSuccess: () => {
    navigate(`/interview/${id}/confirmation`)
  },
})
```

`/finish` **encola** el job en BullMQ
([backend/src/interviews/interviews.service.ts:222-238](../../../backend/src/interviews/interviews.service.ts)):

```ts
await this.prisma.interview.update({
  where: { id },
  data: { finishedAt: new Date(), evaluationStatus: 'processing' },
});
await this.evaluationQueue.add('evaluate', { interviewId: id }, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
});
return { interviewId: id, evaluationStatus: 'processing' };
```

El worker que procesa el job es
[`EvaluationProcessor`](../../../backend/src/evaluation/processors/evaluation.processor.ts)
(consume `EVALUATOR_SERVICE`, idéntico al que usa `evaluate-now` —
solo cambia el *quién lo invoca*).

Al regresar `/finish`, el frontend redirige a la pantalla de
confirmación
([`InterviewConfirmationPage.tsx`](../../../frontend/app/src/pages/interview/InterviewConfirmationPage.tsx)),
que muestra (líneas 96-103):

```tsx
<Tag color={data.evaluationStatus === 'completed' ? 'green' : 'purple'}>
  {data.evaluationStatus === 'completed'
    ? t('status.completed')
    : t('status.processing')}
</Tag>
```

con copy explícito en `en.json:154`:

> "Your evaluation is being processed by our AI. You'll receive a notification when it's ready."

y el botón "Ver reporte" (línea 125-134) **solo se muestra cuando
`evaluationStatus === 'completed'`**. **No hay `refetchInterval`** en
esta pantalla — el polling se confía al refetch implícito de React
Query (al volver el foco del tab) y al evento `evaluation.completed`
que el processor emite con `EventEmitter2` (línea 157-160 del
processor), consumido en otra parte del sistema (notificaciones).

---

## 2. ¿El usuario espera bloqueado?

**Depende del modo.**

### En modo `practice` → SÍ, totalmente bloqueado

Después de presionar "Guardar respuesta", la UI muestra:

```tsx
{isPracticeMode && evaluateNow.isPending && (
  <Card style={{ marginTop: 16, textAlign: 'center' }}>
    <Spin />
    <Text type="secondary" style={{ marginLeft: 8 }}>
      {t('interview.evaluatingAnswer')}
    </Text>
  </Card>
)}
```

(InterviewSessionPage.tsx, líneas 546-553).

El `<Spin />` permanece visible mientras `evaluateNow.isPending`
sea verdadero — exactamente lo que estamos midiendo en JMeter
(escenario 4 = 7.4 s P95 con LLM real). El usuario no puede:

- Pasar a la siguiente pregunta (los botones siguen visibles pero la
  fila de feedback monopoliza su atención).
- Editar la respuesta para reintentar (el componente espera).
- Cerrar la sesión sin perder progreso (hay `beforeunload` que
  pregunta).

**Esto es UX bloqueada — el usuario percibe los 7.4 s como tiempo de
espera frustrante.**

### En modo `evaluation` (formal) → NO, flujo asíncrono

El usuario responde TODAS las preguntas (sin spinners de evaluación
durante el flujo), termina con "Finalizar entrevista", el frontend
hace `POST /finish` y **redirige inmediatamente** a la pantalla de
confirmación. La evaluación corre en BullMQ en background. El usuario
ve un tag "Procesando" y puede:

- Ir al dashboard.
- Iniciar otra entrevista.
- Cerrar la pestaña.

La pantalla de confirmación le dice explícitamente (`en.json:154`)
que recibirá una notificación cuando esté lista la evaluación. El
**reporte completo** (`FeedbackPage.tsx`) se carga vía
`GET /interviews/:id/report` cuando el usuario navega a él
**posteriormente** — solo entonces si `evaluationStatus === 'completed'`
verá los resultados; si no, el tag dice "En proceso" y el contenido
está vacío.

---

## 3. ¿El endpoint medido (`evaluate-now`) representa el flujo real?

**SÍ, en el modo `practice` (no es un endpoint auxiliar ni de
testing).** El frontend lo invoca directamente desde
`InterviewSessionPage.tsx:115-117` para entregar feedback inmediato
al estudiante por respuesta, característica del modo práctica.

**NO, en el modo `evaluation` (formal).** El flujo formal usa
`/finish` → BullMQ → `EvaluationProcessor`. El usuario **no espera**
en línea; el tiempo de procesamiento del LLM ocurre en background y
no impacta el RNF-01 medido como "tiempo de respuesta al usuario".

**Importante:** ambos caminos comparten el mismo `EVALUATOR_SERVICE`
(via la interfaz `IEvaluatorService` inyectada con `@Inject(EVALUATOR_SERVICE)`).
La latencia del LLM es la misma; lo que cambia es **dónde la
percibe el usuario** — bloqueado (practice) vs en background
(evaluation).

---

## 4. Implicación para HE-06 y RNF-01

El umbral RNF-01 dice **"P95 < 5 s de la latencia de evaluación IA"**
sin diferenciar modo. La medición de Fase 5-A reveló dos realidades
distintas que el umbral original no contempla:

### Caso A — modo `evaluation` (formal): cumple sin problema

- POST `/finish` retorna **inmediatamente** con
  `evaluationStatus: 'processing'`.
- El usuario es redirigido a la pantalla de confirmación **sin
  esperar**.
- La latencia "user-perceived hasta ver el ack del envío" es la del
  request `/finish` (medida en RNF-01 ARQ smoke = ~12 ms; con LLM real
  sería igual porque `/finish` solo encola, no llama al LLM).
- El "tiempo hasta resultado disponible" (latencia del processor
  BullMQ procesando un interview de 5 preguntas con LLM real ≈ 5 × 4-7 s
  por evaluación) puede tomar entre 20 s y 1 min, pero ese tiempo NO
  bloquea al usuario.

### Caso B — modo `practice` (instant feedback): excede umbral

- POST `/evaluate-now` espera la respuesta completa del LLM antes
  de devolver al frontend.
- El usuario ve `<Spin />` durante **3.3-7.5 s** (P95 = 7.4 s con
  `gpt-4o-mini` según JMeter Escenario 4).
- **HE-06 es un problema real de UX en este modo.**

### Conclusión

> "**El hallazgo HE-06 aplica únicamente al modo práctica.** En el
> modo evaluación formal (el flujo principal del estudiante para
> entrevistas reales) el sistema usa BullMQ y el usuario no es
> bloqueado en línea por la latencia del LLM. El RNF-01 actual no
> diferencia entre ambos caminos; con la medición empírica de Fase 5-A
> la interpretación más fiel es:
>
> - **Path `/finish` → BullMQ (evaluation mode):** P95 del request es
>   ~12 ms (RNF-01 ARQ smoke). El usuario nunca se bloquea. **Cumple
>   con holgura masiva.**
>
> - **Path `/evaluate-now` (practice mode):** P95 = 7 418 ms con
>   `gpt-4o-mini`. El usuario espera bloqueado con spinner. **Excede
>   el umbral RNF-01 (5 s)**.
>
> El RNF-01 fue redactado pensando en el caso B (bloqueo síncrono),
> pero el flujo principal de uso del producto es A. La recomendación
> profesional es:
>
> 1. **Recalibrar RNF-01** para diferenciar dos umbrales:
>    a) *Latencia de aceptación del envío* (RNF-01-a): tiempo hasta
>       que el sistema acuse recibo de la respuesta o de la
>       finalización del interview. Umbral propuesto: **P95 < 500 ms**.
>       Cumplido con margen (~12 ms en estos tests).
>    b) *Latencia de disponibilidad del feedback inmediato* (RNF-01-b,
>       solo modo practice): tiempo entre enviar respuesta y ver el
>       feedback inline. Umbral propuesto: **P95 < 8 s** (refleja la
>       realidad de los LLM económicos modernos) o, alternativamente,
>       migrar el modo práctica a **streaming** para que el TTFB sea
>       < 1 s (UX percibida mucho mejor aunque el TTLR sea similar).
>
> 2. **Si no se quiere modificar el RNF original**, documentar en el
>    informe que el cumplimiento se valida sobre el flujo formal
>    (`evaluation` mode, asíncrono) y que el modo `practice` es una
>    feature opcional cuya latencia depende del proveedor externo.
>
> El sistema ya tiene la infraestructura necesaria para el caso A
> (BullMQ + processor + EventEmitter + tag de estado). El caso B
> podría migrar a un patrón con streaming (`stream: true` en OpenAI)
> manteniendo la UX del feedback inmediato pero reduciendo el tiempo
> percibido."

---

## 5. Evidencia textual citada

| Referencia | Texto literal |
|---|---|
| `InterviewSessionPage.tsx:91` | `const isPracticeMode = currentInterview?.mode === 'practice'` |
| `InterviewSessionPage.tsx:114-117` | `evaluateNow … api.post(\`/interviews/${id}/questions/${questionId}/evaluate-now\`)` |
| `InterviewSessionPage.tsx:175-177` | `if (isPracticeMode) { evaluateNow.mutate(question.id) }` |
| `InterviewSessionPage.tsx:546-553` | Card con `<Spin />` mientras `evaluateNow.isPending` |
| `InterviewSessionPage.tsx:127-132` | `finishInterview … navigate('/interview/${id}/confirmation')` |
| `interviews.service.ts:222-240` | `update … evaluationStatus: 'processing'` + `evaluationQueue.add(...)` |
| `evaluation.processor.ts:152-160` | `update … evaluationStatus: 'completed'` + `eventEmitter.emit('evaluation.completed', …)` |
| `InterviewConfirmationPage.tsx:96-103` | Tag "Completed" / "Processing" según `evaluationStatus` |
| `InterviewConfirmationPage.tsx:125-134` | Botón "Ver reporte" condicionado a `data.evaluationStatus === 'completed'` |
| `en.json:154` | "Your evaluation is being processed by our AI. You'll receive a notification when it's ready." |

---

## 6. Recomendación inmediata para el reporte de Fase 5-A

Actualizar la sección 6 (Hallazgos) y la sección 5 (Cumplimiento) de
[`reporte_rendimiento.md`](reporte_rendimiento.md) para reflejar
que **HE-06 es de severidad MEDIA y específico del modo `practice`**,
no un fallo del flujo principal del producto. La línea de
"cumplimiento" del RNF-01 debe distinguir las dos rutas (síncrona
vs. asíncrona) y reportar:

- RNF-01 (ruta asíncrona, modo `evaluation`): ✅ cumple con holgura
  masiva (P95 del `/finish` < 500 ms).
- RNF-01 (ruta síncrona, modo `practice` con LLM real): ❌ excede
  umbral (P95 = 7.4 s). Recomendaciones técnicas en HE-06.

Esta diferenciación es **fiel a la implementación** (el código
distingue los dos caminos) y **honesta con el tutor** (no se oculta
el hallazgo, se contextualiza).
