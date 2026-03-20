# Feature Specification: Vinki — Plataforma de Simulación de Entrevistas Técnicas

**Feature Branch**: `001-build-new-project`  
**Created**: 2026-03-19  
**Status**: In Progress — Phases 1-6 implemented  
**Input**: User description: "Construye el nuevo proyecto"

## Clarifications

### Session 2026-03-19

- Q: ¿Cuándo se dispara el pipeline de evaluación IA — al enviar cada respuesta o al cerrar la entrevista? → A: Al cerrar/finalizar la entrevista (evaluación en batch al final)
- Q: ¿Las rúbricas de puntuación (0–5) para las cinco métricas serán definidas por el equipo o delegadas al LLM? → A: El equipo define los criterios por nivel para cada métrica; el prompt del LLM los incluye explícitamente
- Q: ¿Qué mecanismo de notificación en tiempo real usará la plataforma para comunicar al frontend que la evaluación está lista? → A: SSE (Server-Sent Events) — unidireccional servidor→cliente
- Q: ¿Puede un reclutador ver los datos de cualquier estudiante, o solo los de una cohorte asignada? → A: Acceso global — el reclutador ve todos los estudiantes registrados en la plataforma
- Q: ¿Cómo se procesará el audio antes de pasarlo al pipeline de evaluación IA? → A: No se procesa — el audio se almacena en S3 como registro complementario sin evaluación; el pipeline IA evalúa únicamente la respuesta escrita (v1)

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Estudiante realiza simulación de entrevista técnica (Priority: P1)

Un estudiante de ingeniería de UPB quiere practicar para entrevistas laborales.
Se registra en Vinki, elige un rol (p. ej. Backend Engineer), selecciona el
lenguaje (Python), framework (Django) y nivel (Mid), y comienza una sesión de
simulación. El sistema le presenta preguntas técnicas relevantes una por una.
El estudiante responde cada pregunta en texto o grabando su voz. Al finalizar,
la plataforma procesa la evaluación en segundo plano y le confirma que los
resultados pronto estarán disponibles.

**Why this priority**: Es la propuesta de valor central. Sin la simulación de
entrevistas ninguna otra funcionalidad tiene sentido.

**Independent Test**: Un estudiante puede registrarse, configurar y completar una
sesión de 5 preguntas enviando respuestas en texto. Al terminar ve una pantalla
de confirmación. Esto es un MVP completo que demuestra el flujo de valor.

**Acceptance Scenarios**:

1. **Given** un usuario no registrado, **When** completa el formulario de
   registro con nombre, email y contraseña válidos, **Then** obtiene acceso
   a la plataforma con el rol de estudiante.
2. **Given** un estudiante autenticado, **When** selecciona rol, lenguaje,
   framework y nivel y confirma el inicio, **Then** el sistema presenta la
   primera pregunta técnica pertinente a esa combinación.
3. **Given** la pantalla de entrevista activa, **When** el estudiante escribe
   su respuesta y presiona "Enviar", **Then** la respuesta es guardada, se
   muestra la siguiente pregunta y el progreso (N/5) se actualiza.
4. **Given** la pantalla de entrevista activa, **When** el estudiante usa la
   grabadora de voz y envía el audio, **Then** el audio queda vinculado a la
   pregunta y el flujo avanza igual que con texto.
5. **Given** la última respuesta enviada, **When** el estudiante confirma
   finalizar, **Then** la sesión queda cerrada, se muestra confirmación y la
   evaluación por IA se inicia en segundo plano.
6. **Given** un estudiante a medio flujo que pierde conectividad, **When**
   vuelve a abrir la sesión, **Then** encuentra la entrevista en el mismo estado
   y puede continuar sin perder respuestas ya enviadas.

---

### User Story 2 - Estudiante recibe feedback detallado y ve su progreso (Priority: P2)

Luego de que la IA procesa su entrevista, el estudiante recibe una notificación.
Abre la vista de feedback y ve puntuaciones individuales (corrección técnica,
claridad, comunicación, confianza, resolución de problemas) para cada respuesta,
junto con comentarios escritos generados por el modelo. También consulta un
dashboard personal que muestra su evolución histórica por habilidad y entrevista.

**Why this priority**: El feedback es el motor de aprendizaje. Sin él el
estudiante no puede mejorar, y la plataforma pierde valor pedagógico frente a
alternativas simples.

**Independent Test**: Dado un set de evaluaciones ya procesadas en base de datos,
el estudiante puede abrir la vista de feedback de una entrevista y ver las cinco
métricas con texto explicativo para cada respuesta, sin necesidad del resto del
dashboard.

**Acceptance Scenarios**:

1. **Given** una evaluación completada por el sistema, **When** el estudiante
   abre el reporte de esa entrevista, **Then** ve las 5 puntuaciones (0–5) y
   el texto de feedback del modelo para cada respuesta.
2. **Given** el dashboard personal, **When** el estudiante lo visita, **Then**
   ve un resumen de sus últimas entrevistas, su puntaje promedio global y la
   tendencia de sus habilidades clave.
3. **Given** múltiples entrevistas históricas, **When** el estudiante consulta
   el histórico, **Then** puede comparar resultados entre sesiones por métrica
   y skill.
4. **Given** evaluación en proceso, **When** el estudiante tiene la aplicación
   abierta, **Then** recibe una notificación en tiempo real al completarse sin
   necesidad de recargar la página.
5. **Given** el reporte de una entrevista, **When** el estudiante hace clic en
   "Exportar", **Then** descarga un PDF o CSV con el resumen completo.

---

### User Story 3 - Reclutador / tutor consulta desempeño de estudiantes (Priority: P3)

Un reclutador de una empresa partner o un tutor de UPB necesita evaluar el
avance de un grupo de candidatos. Accede al panel de reclutador, ve una tabla
filtrable de estudiantes con sus métricas de desempeño, puede hacer clic en un
perfil individual y descarga reportes para compartir.

**Why this priority**: Extiende la utilidad institucional de la plataforma. Es
el segundo actor principal del sistema (junto al estudiante) y es clave para el
proyecto académico.

**Independent Test**: Un usuario con rol recruiter puede acceder al panel de
estudiantes, aplicar filtros por nivel y lenguaje, y ver el puntaje promedio de
cada estudiante, sin necesitar acceso a las demás vistas.

**Acceptance Scenarios**:

1. **Given** un usuario con rol recruiter autenticado, **When** accede al
   panel principal, **Then** ve una tabla paginada con todos los estudiantes,
   sus lenguajes/niveles y puntaje agregado.
2. **Given** la tabla de estudiantes, **When** el reclutador aplica filtros
   (nivel, lenguaje, rango de fechas), **Then** la tabla se actualiza mostrando
   solo los perfiles que coinciden.
3. **Given** un perfil de estudiante, **When** el reclutador lo selecciona,
   **Then** ve el detalle de entrevistas pasadas, habilidades y puede agregar
   notas internas privadas.
4. **Given** uno o más perfiles seleccionados, **When** el reclutador
   selecciona "Descargar reporte", **Then** obtiene un archivo PDF/CSV con el
   resumen consolidado.

---

### User Story 4 - Administrador gestiona el catálogo de preguntas (Priority: P4)

Un administrador necesita mantener actualizado el banco de preguntas técnicas.
Puede crear, editar y eliminar preguntas categorizadas por lenguaje, framework,
nivel y habilidad. También puede importar conjuntos de preguntas masivamente y
buscar preguntas por contenido o categoría.

**Why this priority**: El catálogo de preguntas es la materia prima de cada
simulación. Un administrador puede gestionar contenido sin modificar código.

**Independent Test**: Un usuario con rol admin puede crear una nueva pregunta
con todos sus atributos y verificar que aparece disponible en la categoría
correcta para una nueva simulación.

**Acceptance Scenarios**:

1. **Given** un admin autenticado, **When** crea una pregunta con texto,
   tipo, lenguaje, framework, nivel y skill, **Then** la pregunta queda
   disponible en el banco y puede ser asignada en simulaciones futuras.
2. **Given** el panel de catálogo, **When** el admin busca por texto o filtra
   por categoría, **Then** ve solo las preguntas que coinciden.
3. **Given** un archivo CSV/JSON con preguntas, **When** el admin lo importa,
   **Then** las preguntas válidas se crean en bloque y se reportan errores de
   las inválidas sin detener el proceso.

---

### Edge Cases

- ¿Qué ocurre si la IA falla o supera el tiempo de espera durante la evaluación?
  → La respuesta queda registrada y marcada como "pendiente de evaluación"; el
  sistema reintenta automáticamente hasta 3 veces; el estudiante es notificado si
  finalmente no puede procesarse.
- ¿Qué pasa si no hay preguntas disponibles para la combinación lenguaje / framework / nivel seleccionada?
  → El sistema muestra un aviso al estudiante antes de comenzar y le sugiere
  combinaciones alternativas disponibles.
- ¿Qué ocurre si la grabación de audio falla en el dispositivo del usuario?
  → La interfaz degrada gracefully al modo de respuesta en texto sin interrumpir
  la sesión.
- ¿Un estudiante puede abandonar y retomar una entrevista?
  → Sí, el estado se conserva. Una entrevista sin `finished_at` se considera
  en curso y puede reanudarse.
- ¿Qué sucede si el estudiante no ha completado ninguna entrevista cuando abre el dashboard?
  → Ve un estado vacío amigable con un CTA directo a "Iniciar simulación".

## Requirements _(mandatory)_

### Functional Requirements

**Autenticación y Usuarios**

- **FR-001**: El sistema DEBE permitir que cualquier persona se registre con nombre, email válido y contraseña (mínimo 8 caracteres).
- **FR-002**: El sistema DEBE autenticar a los usuarios mediante email y contraseña, emitiendo tokens de sesión seguros.
- **FR-003**: El sistema DEBE soportar tres roles con la siguiente matriz de permisos:
  - `student`: accede únicamente a sus propias entrevistas, respuestas, evaluaciones y dashboard personal. No puede ver datos de otros usuarios.
  - `recruiter`: acceso de **solo lectura** a los perfiles públicos y métricas de **todos** los estudiantes registrados. Puede agregar notas internas propias. No puede iniciar simulaciones ni acceder al catálogo de preguntas.
  - `admin`: acceso completo al catálogo de preguntas (CRUD) y gestión de contenido. No tiene acceso privilegiado a datos personales de estudiantes más allá del rol recruiter.
- **FR-004**: Los usuarios DEBEN poder cerrar sesión e invalidar su sesión activa.

**Configuración e Inicio de Entrevista**

- **FR-005**: Un estudiante autenticado DEBE poder iniciar una simulación eligiendo rol, lenguaje de programación, framework y nivel de experiencia.
- **FR-006**: El sistema DEBE seleccionar automáticamente un conjunto de preguntas pertinentes a la configuración elegida, priorizando diversidad de habilidades y relevancia semántica.
- **FR-007**: El sistema DEBE mostrar una advertencia si no hay suficientes preguntas para la combinación solicitada y sugerir alternativas.

**Flujo de Entrevista**

- **FR-008**: El sistema DEBE presentar las preguntas de una en una, mostrando el número de progreso (ej. "Pregunta 3 de 5") y un temporizador opcional.
- **FR-009**: Un estudiante DEBE poder responder cada pregunta en texto libre o mediante grabación de audio. El audio se almacena en S3 como registro complementario para el estudiante; **la evaluación IA opera exclusivamente sobre la respuesta escrita**. No existe transcripción automática en v1 (decisión de alcance explícita).
- **FR-010**: El sistema DEBE guardar cada respuesta de forma persistente en cuanto se envía, permitiendo reanudar la sesión si se interrumpe.
- **FR-011**: Una vez enviada la última respuesta y confirmado el cierre, el sistema DEBE marcar la entrevista como finalizada y encolar **en ese momento** un único job de evaluación que procese todas las respuestas de la sesión en batch.

**Evaluación por IA**

- **FR-012**: El sistema DEBE evaluar las respuestas de forma asincrónica **en batch al cierre de la entrevista** mediante un pipeline de IA (búsqueda semántica + modelo de lenguaje). No se generan evaluaciones parciales mientras la entrevista está en curso.
- **FR-013**: La evaluación DEBE producir cinco puntuaciones numéricas (0–5) para cada respuesta: corrección técnica, claridad de explicación, comunicación, confianza y resolución de problemas. Cada puntuación DEBE derivarse de rúbricas definidas por el equipo (ver FR-013a) e incluidas en el prompt del modelo.
- **FR-013a**: El equipo DEBE definir y mantener una rúbrica por métrica que describa los criterios para los niveles 0, 1–2, 3–4 y 5. Estas rúbricas se incluirán en el prompt de evaluación como instrucciones explícitas; el LLM no decide los criterios libremente. Las rúbricas iniciales se documentarán como artefacto del plan de implementación.
- **FR-014**: La evaluación DEBE incluir un texto de retroalimentación en lenguaje natural de al menos un párrafo por respuesta, explicando las puntuaciones según las rúbricas aplicadas y recomendando acciones de mejora concretas.
- **FR-015**: El sistema DEBE reintentar automáticamente una evaluación fallida hasta 3 veces antes de marcarla como no procesada.
- **FR-016**: El estudiante DEBE recibir una notificación en tiempo real vía **SSE (Server-Sent Events)** cuando su evaluación esté disponible. El cliente se subscribe al canal SSE de su usuario tras cerrar la entrevista. Si el estudiante no está conectado en el momento de finalización, la notificación DEBE estar disponible al siguiente acceso al dashboard (marcador de evaluación pendiente de revisar).

**Feedback y Dashboard del Estudiante**

- **FR-017**: Un estudiante DEBE poder ver el reporte completo de cualquier entrevista finalizada, con puntuaciones y feedback por respuesta.
- **FR-018**: El dashboard del estudiante DEBE mostrar un resumen de sus últimas entrevistas, puntaje promedio y tendencias por habilidad.
- **FR-019**: El estudiante DEBE poder comparar su desempeño entre entrevistas históricas.
- **FR-020**: El estudiante DEBE poder exportar el reporte de una entrevista en PDF o CSV.

**Panel de Reclutador / Tutor**

- **FR-021**: Un reclutador autenticado DEBE ver una lista paginada y filtrable de **todos los estudiantes registrados** en la plataforma, junto con sus métricas de desempeño agregadas. El acceso es global (sin restricción por cohorte en v1).
- **FR-022**: Un reclutador DEBE poder acceder al perfil detallado de cualquier estudiante, incluyendo historial de entrevistas y habilidades.
- **FR-023**: Un reclutador DEBE poder agregar notas internas privadas sobre un estudiante o entrevista específica.
- **FR-024**: Un reclutador DEBE poder descargar reportes de uno o varios estudiantes en PDF/CSV.

**Catálogo de Preguntas (Admin)**

- **FR-025**: Un administrador DEBE poder crear, editar y eliminar preguntas con atributos: texto, tipo, lenguaje, framework, nivel y habilidad.
- **FR-026**: Un administrador DEBE poder importar preguntas en lote desde CSV/JSON, con reporte de errores sin detener el proceso.
- **FR-027**: Un administrador DEBE poder buscar preguntas por texto libre o filtrarlas por categoría.

**Puntajes Acumulados**

- **FR-028**: El sistema DEBE actualizar el puntaje de habilidad acumulado (`user_skill_scores`) de un estudiante al completarse la evaluación de cada entrevista.

### Key Entities

- **User**: Persona registrada en la plataforma. Tiene nombre, email, contraseña y un rol (`student`, `recruiter`, `admin`). Un estudiante tiene asociados puntajes de habilidad y un historial de entrevistas.
- **Interview**: Sesión de simulación vinculada a un estudiante y configurada con rol, lenguaje, framework y nivel. Tiene una hora de inicio y, al completarse, una hora de finalización.
- **Question**: Pregunta técnica del banco, clasificada por lenguaje, framework, nivel y habilidad. Incluye una representación semántica (embedding) que permite búsqueda de similitud.
- **InterviewQuestion**: Registro del snapshot de la pregunta dentro de una entrevista concreta, con su número de orden y si fue generada por IA.
- **Answer**: Respuesta del estudiante a una pregunta de entrevista. Puede ser texto libre o enlace a archivo de audio.
- **AnswerEvaluation**: Evaluación IA de una respuesta con las 5 métricas, el nivel detectado y el texto de feedback.
- **UserSkillScore**: Puntaje agregado de un estudiante para una habilidad concreta (0–100), actualizado tras cada evaluación completada.
- **Role / Language / Framework / Level / Skill**: Catálogos de referencia que clasifican las entrevistas y preguntas.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Un estudiante puede completar el ciclo completo (registro → configuración → 5 preguntas → cierre) en menos de 15 minutos.
- **SC-002**: El 95 % de las evaluaciones IA se completan y están disponibles para el estudiante en menos de 60 segundos desde el cierre de la entrevista.
- **SC-003**: Todas las páginas críticas (login, dashboard, entrevista, feedback) obtienen puntaje ≥ 90 en Lighthouse (Performance, Accessibility, Best Practices, SEO).
- **SC-004**: El sistema soporta 50 entrevistas simultáneas activas sin degradación perceptible para los usuarios.
- **SC-005**: Los puntajes de habilidad acumulados del estudiante se actualizan y son visibles en su dashboard en un plazo máximo de 2 minutos tras completarse la evaluación.
- **SC-006**: El 100 % de las respuestas evaluradas incluyen las 5 métricas numéricas y al menos un párrafo de feedback en lenguaje natural.
- **SC-007**: Ninguna página pública presenta violaciones WCAG 2.1 AA de nivel crítico o serio.
- **SC-008**: Los endpoints no relacionados con IA responden en menos de 200 ms (p95) bajo carga nominal.

## Assumptions

- Las sesiones de simulación tienen exactamente 5 preguntas por defecto (configurable por el equipo en futuras iteraciones).
- La plataforma opera íntegramente en español en su primera versión.
- La integración SSO con UPB queda fuera del alcance de v1; la autenticación es nativa por email/contraseña.
- Los archivos de audio se almacenan en un servicio S3-compatible como registro complementario únicamente. **El pipeline de evaluación IA evalúa solo la respuesta escrita**; no existe transcripción automática audio→texto en v1. Esta decisión reduce dependencias externas y mantiene el alcance del proyecto de grado manejable. La transcripción automática se considera para v2.
- El catálogo de preguntas se pre-carga con los seeds definidos en `docs/db.sql`; el administrador puede ampliar el banco desde el panel.
- Los reclutadores no pueden iniciar simulaciones; solo ven y exportan datos de estudiantes.

## Dependencies

- Proveedor LLM externo (OpenAI / Azure OpenAI) con disponibilidad ≥ 99 % o modo sandbox configurable.
- PostgreSQL 15 con extensión `pgvector` instalada.
- Servicio de almacenamiento S3-compatible para archivos de audio (registro complementario; no requerido para el pipeline de evaluación IA).
- Servicio de colas (Redis) para procesamiento asincrónico de evaluaciones.
