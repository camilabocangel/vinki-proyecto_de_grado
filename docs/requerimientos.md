# Requerimientos del Sistema — Vinki

> **Sistema:** Plataforma web de simulación de entrevistas técnicas con IA.
> **Stack:** React + TypeScript + Vite (frontend), NestJS + Node.js (backend), PostgreSQL + pgvector (datos), módulo RAG.
> **Documento fuente:** Proyecto de grado, versión 15.

Este archivo es el insumo autoritativo de requerimientos para todas las fases de QA. No modificar sin actualizar también la matriz de trazabilidad.

---

## 1. Actores del sistema

- **Estudiante:** usuario principal, realiza simulaciones de entrevistas y consulta su progreso.
- **Reclutador:** consulta perfiles de estudiantes y reportes de desempeño.
- **Administrador:** gestiona catálogos del sistema (roles, lenguajes, frameworks, niveles, habilidades, preguntas).

---

## 2. Requerimientos Funcionales

### Módulo 1: Gestión de Usuarios y Autenticación

| ID | Requerimiento | Descripción | Validación con modelo de datos | Prioridad |
|---|---|---|---|---|
| RF-01 | Registro de usuario | El sistema debe permitir el registro de nuevos usuarios con nombre, email y contraseña. El email debe ser único en todo el sistema. | users.name, users.email (UNIQUE), users.password_hash | Alta |
| RF-02 | Autenticación segura | El sistema debe autenticar usuarios verificando email y contraseña hasheada, creando una sesión segura. | users.email, users.password_hash | Alta |
| RF-03 | Gestión de sesiones | El sistema debe mantener la sesión del usuario activa hasta que cierre sesión explícitamente. | users.id como identificador de sesión | Alta |
| RF-04 | Registro de fecha de creación | El sistema debe registrar automáticamente la fecha y hora de creación de cada cuenta. | users.created_at (DEFAULT NOW()) | Media |

### Módulo 2: Configuración de Entrevista

| ID | Requerimiento | Descripción | Validación con modelo de datos | Prioridad |
|---|---|---|---|---|
| RF-05 | Selección de rol técnico | El usuario debe seleccionar el rol para la entrevista (ej. Backend Engineer) de un catálogo predefinido. | roles (tabla maestra) | Alta |
| RF-06 | Selección de lenguaje | El usuario debe seleccionar el lenguaje de programación de un catálogo. | languages (tabla maestra) | Alta |
| RF-07 | Selección de framework | El usuario debe seleccionar el framework, con validación de que pertenezca al lenguaje elegido. | frameworks con relación a languages | Alta |
| RF-08 | Selección de nivel | El usuario debe seleccionar el nivel de dificultad (Junior, Mid, Senior) de un catálogo. | levels (tabla maestra) | Alta |
| RF-09 | Persistencia de configuración | El sistema debe guardar toda la configuración de la entrevista al iniciarla. | interviews (user_id, role_id, language_id, framework_id, chosen_level_id) | Alta |

### Módulo 3: Simulación de Entrevista

| ID | Requerimiento | Descripción | Validación con modelo de datos | Prioridad |
|---|---|---|---|---|
| RF-10 | Inicio de entrevista | El sistema debe registrar el momento exacto en que comienza cada entrevista. | interviews.started_at (DEFAULT NOW()) | Alta |
| RF-11 | Finalización de entrevista | El sistema debe registrar el momento exacto en que el usuario completa la entrevista. | interviews.finished_at (actualizable) | Alta |
| RF-12 | Selección inteligente de preguntas | El sistema debe seleccionar preguntas que coincidan con: lenguaje, framework, nivel y habilidades relevantes. | questions con filtros por language_id, framework_id, level_id, skill_id | Alta |
| RF-13 | Asignación de preguntas a entrevista | El sistema debe registrar qué preguntas se asignan a cada entrevista, preservando el orden. | interview_questions (interview_id, question_id, order_number) | Alta |
| RF-14 | Snapshot de pregunta | El sistema debe guardar una copia del texto de la pregunta al momento de asignarla. | interview_questions.question_text_snapshot | Media |
| RF-15 | Identificación de origen de pregunta | El sistema debe indicar si cada pregunta fue generada por IA o proviene de la base de datos. | interview_questions.generated_by_ai (boolean) | Media |
| RF-16 | Captura de respuesta en texto | El sistema debe permitir al estudiante escribir su respuesta en un campo de texto. | answers.answer_text | Alta |
| RF-17 | Captura de respuesta en audio | El sistema debe permitir al estudiante subir un archivo de audio con su respuesta. | answers.audio_url (VARCHAR(500)) | Media |
| RF-18 | Registro de tiempo de respuesta | El sistema debe registrar automáticamente cuándo se envió cada respuesta. | answers.answered_at (DEFAULT NOW()) | Media |

### Módulo 4: Evaluación y Retroalimentación

| ID | Requerimiento | Descripción | Validación con modelo de datos | Prioridad |
|---|---|---|---|---|
| RF-19 | Evaluación de corrección técnica | El sistema debe evaluar la precisión técnica de la respuesta en escala de 0 a 5. | answer_evaluations.technical_correctness (float) | Alta |
| RF-20 | Evaluación de claridad | El sistema debe evaluar la claridad de la explicación en escala de 0 a 5. | answer_evaluations.clarity_of_explanation (float) | Alta |
| RF-21 | Evaluación de comunicación | El sistema debe evaluar la habilidad de comunicación en escala de 0 a 5. | answer_evaluations.communication (float) | Alta |
| RF-22 | Evaluación de confianza | El sistema debe evaluar el nivel de confianza demostrado en escala de 0 a 5. | answer_evaluations.confidence (float) | Alta |
| RF-23 | Evaluación de resolución de problemas | El sistema debe evaluar la capacidad de resolución de problemas en escala de 0 a 5. | answer_evaluations.problem_solving (float) | Alta |
| RF-24 | Detección de nivel demostrado | El sistema debe inferir y registrar el nivel real que demostró el estudiante en su respuesta. | answer_evaluations.detected_level_id (relación a levels) | Media |
| RF-25 | Retroalimentación textual | El sistema debe generar retroalimentación personalizada con fortalezas y áreas de mejora. | answer_evaluations.feedback_text (text) | Alta |
| RF-26 | Registro de evaluación | El sistema debe registrar cuándo se realizó cada evaluación. | answer_evaluations.evaluated_at (DEFAULT NOW()) | Media |
| RF-27 | Cálculo de scores por habilidad | El sistema debe mantener un puntaje agregado (0-100) por habilidad para cada usuario. | user_skill_scores (user_id, skill_id, score, last_updated) | Alta |
| RF-28 | Actualización de scores | El sistema debe actualizar la fecha de última modificación cuando se recalcula un score. | user_skill_scores.last_updated (DEFAULT NOW()) | Media |

### Módulo 5: Búsqueda Semántica y RAG

| ID | Requerimiento | Descripción | Validación con modelo de datos | Prioridad |
|---|---|---|---|---|
| RF-29 | Almacenamiento de embeddings | El sistema debe generar y almacenar vectores de embedding para cada pregunta en la base de datos. | questions.embedding (tipo vector) | Media |
| RF-30 | Búsqueda por similitud semántica | El sistema debe implementar búsqueda de preguntas similares usando vectores de embedding. | Consultas vectoriales en questions.embedding | Media |
| RF-31 | Recuperación de contexto para IA | Durante la evaluación, el sistema debe recuperar documentos técnicos relevantes mediante búsqueda semántica. | Proceso RAG con questions.embedding | Alta |

### Módulo 6: Visualización y Reportes

| ID | Requerimiento | Descripción | Validación con modelo de datos | Prioridad |
|---|---|---|---|---|
| RF-32 | Historial de entrevistas | El sistema debe mostrar al usuario todas sus entrevistas pasadas, indicando estado (completada/en progreso). | interviews con filtro por user_id | Media |
| RF-33 | Detalle de entrevista | El sistema debe mostrar el detalle completo de una entrevista: preguntas, respuestas y evaluaciones. | Join de interviews → interview_questions → answers → answer_evaluations | Media |
| RF-34 | Dashboard de habilidades | El sistema debe mostrar la evolución de los scores por habilidad con gráficos. | user_skill_scores agrupado por skill_id | Media |
| RF-35 | Visualización de evaluaciones | El sistema debe presentar las 5 dimensiones de evaluación de forma visual (gráfico de radar o barras). | answer_evaluations con las 5 dimensiones | Media |
| RF-36 | Exportación de resultados | El sistema debe permitir exportar el portafolio completo o resultados de entrevistas específicas (PDF/Compartir). | Todos los datos del usuario | Baja |

### Módulo 7: Administración de Catálogos

| ID | Requerimiento | Descripción | Validación con modelo de datos | Prioridad |
|---|---|---|---|---|
| RF-37 | Gestión de roles | El sistema debe permitir administrar el catálogo de roles técnicos. | CRUD en tabla roles | Baja |
| RF-38 | Gestión de lenguajes | El sistema debe permitir administrar el catálogo de lenguajes de programación. | CRUD en tabla languages | Baja |
| RF-39 | Gestión de frameworks | El sistema debe permitir administrar el catálogo de frameworks, asociándolos a un lenguaje. | CRUD en tabla frameworks con relación a languages | Baja |
| RF-40 | Gestión de niveles | El sistema debe permitir administrar el catálogo de niveles (Junior, Mid, Senior). | CRUD en tabla levels | Baja |
| RF-41 | Gestión de habilidades | El sistema debe permitir administrar el catálogo de habilidades evaluables. | CRUD en tabla skills | Baja |
| RF-42 | Gestión de preguntas | El sistema debe permitir administrar el banco de preguntas con todos sus metadatos. | CRUD en tabla questions con todas sus relaciones | Baja |

---

## 3. Requerimientos No Funcionales

### Rendimiento y Escalabilidad

| ID | Requerimiento | Descripción | Métrica |
|---|---|---|---|
| RNF-01 | Tiempo de respuesta de IA | El tiempo entre envío de respuesta y recepción de evaluación no debe exceder 5 segundos en el 95% de los casos. | < 5 segundos (percentil 95) |
| RNF-02 | Búsqueda semántica | Las consultas de similitud vectorial deben ejecutarse en menos de 500ms para hasta 10.000 preguntas. | < 500 ms |
| RNF-03 | Concurrencia | El sistema debe soportar al menos 50 entrevistas simultáneas. | 50 usuarios concurrentes |
| RNF-04 | Escalabilidad horizontal | La arquitectura debe permitir escalar frontend y backend independientemente. | Separación de capas |

### Seguridad

| ID | Requerimiento | Descripción | Validación |
|---|---|---|---|
| RNF-05 | Hash de contraseñas | Las contraseñas deben almacenarse usando algoritmo seguro (bcrypt/argon2). | users.password_hash |
| RNF-06 | HTTPS | Toda la comunicación debe estar cifrada con TLS/HTTPS. | Protocolo seguro |
| RNF-07 | Autorización por propiedad | Los usuarios solo pueden acceder a sus propios datos (entrevistas, respuestas, evaluaciones). | Validación de user_id en consultas |
| RNF-08 | Protección de URLs de audio | Las URLs de audio deben ser seguras y de acceso controlado. | answers.audio_url con tokens |

### Integridad y Consistencia de Datos

| ID | Requerimiento | Descripción | Validación con modelo de datos |
|---|---|---|---|
| RNF-09 | Integridad referencial — framework/lenguaje | Todo framework debe pertenecer a un lenguaje existente. | frameworks.language_id → languages.id |
| RNF-10 | Integridad referencial — preguntas | Toda pregunta debe tener lenguaje, nivel y habilidad válidos. Framework es opcional. | Relaciones de questions |
| RNF-11 | Integridad referencial — entrevistas | Toda entrevista debe tener usuario, rol y nivel válidos. Lenguaje y framework son opcionales. | Relaciones de interviews |
| RNF-12 | Cascada en eliminación de entrevistas | Al eliminar una entrevista, deben eliminarse sus preguntas asociadas. | interview_questions con ON DELETE CASCADE |
| RNF-13 | Cascada en eliminación de preguntas de entrevista | Al eliminar una pregunta de entrevista, deben eliminarse sus respuestas. | answers con ON DELETE CASCADE |
| RNF-14 | Cascada en eliminación de respuestas | Al eliminar una respuesta, debe eliminarse su evaluación. | answer_evaluations con ON DELETE CASCADE |
| RNF-15 | Unicidad de email | No pueden existir dos usuarios con el mismo email. | users.email UNIQUE |
| RNF-16 | Unicidad de nombres en catálogos | Los nombres en tablas catálogo deben ser únicos. | roles.name, languages.name, levels.name, skills.name UNIQUE |
| RNF-17 | Unicidad de score por usuario-habilidad | Cada usuario puede tener solo un score por habilidad. | user_skill_scores con UNIQUE(user_id, skill_id) |
| RNF-18 | Validación de rangos — evaluaciones | Las evaluaciones deben estar entre 0 y 5. | CHECK en columnas de answer_evaluations |
| RNF-19 | Validación de rangos — scores | Los scores de habilidad deben estar entre 0 y 100. | CHECK en user_skill_scores.score |
| RNF-20 | Orden de preguntas | El número de orden en una entrevista debe ser positivo. | CHECK en interview_questions.order_number > 0 |

### Disponibilidad y Mantenibilidad

| ID | Requerimiento | Descripción | Métrica/Validación |
|---|---|---|---|
| RNF-21 | Disponibilidad | El sistema debe tener 99,5% de disponibilidad en horario de mayor uso (8am-10pm). | 99,5% uptime |
| RNF-22 | Backups automáticos | Deben realizarse backups diarios de la base de datos. | Daily backups |
| RNF-23 | Documentación de API | La API REST debe estar documentada con OpenAPI/Swagger. | Documentación actualizada |
| RNF-24 | Logging de errores | El sistema debe registrar errores y eventos críticos. | Sistema de logs |
| RNF-25 | Índices de base de datos | Deben existir índices en todas las claves foráneas para optimizar consultas. | Índices en todas las FK |

### Usabilidad y Experiencia de Usuario

| ID | Requerimiento | Descripción | Prioridad |
|---|---|---|---|
| RNF-26 | Flujo intuitivo | La interfaz debe guiar al usuario naturalmente: configuración → entrevista → resultados. | Alta |
| RNF-27 | Indicador de progreso | Durante la entrevista, mostrar progreso (ej. Pregunta 3 de 10). | Media |
| RNF-28 | Visualización de evaluaciones | Las 5 dimensiones deben mostrarse con gráficos claros (radar, barras). | Alta |
| RNF-29 | Responsive design | La plataforma debe ser funcional en móviles, tablets y desktop. | Media |
| RNF-30 | Tiempo de carga | Las páginas principales deben cargar en menos de 2 segundos. | < 2 segundos |

### Requerimientos Tecnológicos

| ID | Requerimiento | Descripción | Validación |
|---|---|---|---|
| RNF-31 | Frontend | Implementar con React y TypeScript, empaquetado con Vite 6 y desplegado mediante contenedor Docker. | Stack definido |
| RNF-32 | Backend | Implementar con Node.js y NestJS, con arquitectura modular por feature. | Stack definido |
| RNF-33 | Base de datos | Usar PostgreSQL con extensión pgvector para embeddings. | PostgreSQL + vector |
| RNF-34 | Compatibilidad de LLM | Arquitectura debe permitir cambiar de proveedor de IA sin reescrituras mayores. | Abstracción de IA |
