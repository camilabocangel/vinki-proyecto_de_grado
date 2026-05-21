# 3.3.2 Pruebas

El proceso de verificación y validación de la plataforma Vinki se
estructuró siguiendo el modelo de pirámide de testing propuesto por
Cohn (2009), que organiza las pruebas en tres capas jerárquicas
según su granularidad y costo de ejecución. En la base se ubican las
pruebas unitarias, numerosas y rápidas, que validan unidades aisladas
del código; en el nivel intermedio se sitúan las pruebas de
integración, que verifican la interacción entre componentes contra
infraestructura real; y en la cima se encuentran las pruebas
end-to-end (E2E), pocas en cantidad pero capaces de validar flujos
completos desde la perspectiva del usuario. A estas tres capas se
sumaron, en el caso de Vinki, dos categorías complementarias: las
pruebas no funcionales (rendimiento y seguridad), exigidas por los
requerimientos no funcionales (RNF) de la plataforma, y una capa
específica de evaluación del componente RAG (Retrieval-Augmented
Generation) que demanda métricas estadísticas propias del campo de
los sistemas con inteligencia artificial.

El alcance del proceso cubrió los 42 Requerimientos Funcionales (RF)
y los 34 Requerimientos No Funcionales (RNF) declarados en la
documentación del sistema, así como las seis capacidades específicas
del subsistema RAG (IA-01 a IA-06) definidas en el plan maestro de
pruebas. La trazabilidad entre cada requerimiento y los casos de
prueba que lo verifican se mantiene en una matriz consolidada,
referenciada en el anexo metodológico del presente documento. La
estrategia adoptada distingue dos grandes categorías que se
desarrollan en las siguientes subsecciones: las pruebas funcionales,
orientadas a verificar que el sistema realice correctamente las
operaciones declaradas, y las pruebas no funcionales, orientadas a
verificar las propiedades transversales de rendimiento, seguridad y
calidad del componente de inteligencia artificial.

## Pruebas funcionales

Las pruebas funcionales de Vinki se distribuyeron en las tres capas
de la pirámide de Cohn, totalizando 653 casos de prueba ejecutables
de forma automatizada y reproducible. La [Tabla 1] resume la
distribución por capa, el resultado de la última ejecución y los
documentos de cierre asociados a cada fase.

**Tabla 1.** *Resumen consolidado de pruebas funcionales por capa.*

| Capa | Herramientas principales | Suites | Casos de prueba | Resultado |
|---|---|---|---|---|
| Unitarias (backend) | Jest, ts-jest, Supertest | 48 | 375 / 375 | 100 % verde |
| Unitarias (frontend) | Vitest, React Testing Library | 30 | 134 / 134 | 100 % verde |
| Integración (backend) | Jest, Supertest, PostgreSQL real, Redis real | 9 | 97 / 97 | 100 % verde |
| End-to-end | Playwright | 10 | 47 / 47 | 100 % verde (verificado en tres corridas consecutivas, 141 / 141) |
| **Acumulado** | | **97** | **653 / 653** | **0 fallos, 0 pruebas omitidas** |

El detalle completo de cada caso (identificador, descripción,
precondiciones y trazabilidad al requerimiento que verifica) se
encuentra en la matriz de trazabilidad incluida como anexo del
presente trabajo. Los documentos de cierre por fase, también
incluidos como referencias, sintetizan las decisiones técnicas
adoptadas durante la implementación de cada capa.

### Pruebas unitarias

Las pruebas unitarias verifican unidades aisladas de código —
funciones, métodos y componentes — sin depender de infraestructura
externa. En Vinki se emplearon dos pilas de herramientas según el
lenguaje y entorno de ejecución: para el backend en NestJS se
utilizó **Jest** con el transformador **ts-jest** y la librería
**Supertest** para pruebas que requieren simular peticiones HTTP en
modo aislado; para el frontend en React + Vite se empleó **Vitest**
junto con **React Testing Library**, que ofrece un modelo de
interacción centrado en el usuario en lugar de en la estructura
interna del DOM. En ambos casos se aplicó el patrón de doble
sustitución (mocks y stubs) para aislar las unidades bajo prueba de
sus dependencias: el cliente LLM, el cliente de base de datos
(Prisma) y los servicios externos se reemplazaron por dobles
controlados que permitieron ejercitar todos los caminos lógicos sin
incurrir en costos ni en variabilidad inherente al modelo de
lenguaje.

El criterio de aceptación para esta capa exigió un mínimo de 80 %
de cobertura sobre cuatro métricas: *statements* (sentencias
ejecutadas), *branches* (ramas condicionales evaluadas en ambas
direcciones), *functions* (funciones invocadas al menos una vez) y
*lines* (líneas de código alcanzadas). Las métricas se interpretan
de la siguiente manera. La cobertura de *statements* mide qué
fracción del total de sentencias del programa se ejecutó al menos
una vez durante las pruebas; la de *branches* evalúa qué tan
exhaustivamente se cubrieron las decisiones lógicas (cláusulas `if`,
operadores ternarios y similares) en sus dos posibles caminos; la
de *functions* corresponde a la proporción de funciones del código
fuente que fueron invocadas; y la de *lines* es similar a la de
*statements* pero contabilizada línea por línea. Las cuatro métricas
ofrecen ángulos distintos sobre la pregunta común de "qué tan
profundamente se ejerció el código durante las pruebas".

Sobre la suite del backend se ejecutaron 375 pruebas unitarias
distribuidas en 48 suites, con el resultado de 99.15 % de
*statements*, 92.98 % de *branches*, 98.06 % de *functions* y
99.22 % de *lines*, conforme se observa en la [Figura 3.1]. Las
cuatro métricas superan el umbral del 80 % con holgura, lo que
indica que el código del backend está ejercitado de manera profunda
y consistente.

Sobre la suite del frontend se ejecutaron 134 pruebas unitarias
distribuidas en 30 archivos, con el resultado consolidado de
83.46 % de *statements*, 82.32 % de *branches*, 62.31 % de
*functions* y 88.88 % de *lines* tras la aplicación de la Decisión
D-8 ([Figura 3.2]). La Decisión D-8 reclasificó ocho páginas del
frontend que superaban las 500 líneas de código — entre ellas las
pantallas del wizard de configuración de entrevista, la sesión de
entrevista, el dashboard del estudiante y la administración del
banco de preguntas — a la capa de pruebas end-to-end (Playwright).
La justificación de esta reclasificación reside precisamente en la
pirámide de testing: forzar cobertura unitaria sobre flujos que
orquestan navegación entre rutas, persistencia y llamadas reales al
backend multiplica el costo de mocks (cada flujo requiere stubs de
navegación, datos y APIs nativas del navegador no presentes en el
entorno jsdom), produce pruebas frágiles que se rompen por cambios
de copia o de estructura sin defectos reales, y duplica esfuerzo
con Playwright, que realiza la misma validación de forma más fiel
en su capa correspondiente. La cobertura por debajo del 80 % en la
métrica de *functions* (62.31 %) se debe principalmente al cableado
declarativo (`App.tsx`, `api/client.ts` y los handlers de layout),
donde declarar pruebas unitarias no añade valor sustantivo y donde
los flujos efectivos quedan cubiertos por la capa end-to-end. Esta
limitación está documentada formalmente y se considera aceptada
con observación por aplicación coherente de la pirámide.

En conjunto, la capa unitaria aportó 502 casos de prueba (375
backend más 134 frontend, con 3 *regression guards* adicionales por
el bug HE-01 documentado más adelante y 4 *regression guards*
adicionales por el bug HE-07, totalizando los 375 backend
reportados). Esta cifra está acorde con la posición que la pirámide
de Cohn (2009) reserva para esta capa, en la que se espera la mayor
parte del volumen de pruebas: ejecución rápida, bajo costo y alta
densidad de aserciones.

### Pruebas de integración

Entre la capa unitaria y la end-to-end se incorporó una capa de
pruebas de integración que verifica la interacción entre componentes
contra infraestructura real, sin recurrir a mocks. La motivación de
esta capa es triple: validar las garantías que el motor relacional
ofrece sobre los datos (claves foráneas, restricciones de unicidad,
restricciones tipo CHECK y eliminación en cascada), verificar la
autorización por propiedad de los datos a nivel HTTP — concepto que
las pruebas unitarias no pueden cubrir adecuadamente porque
sustituyen al middleware de autenticación —, y validar la rigurosidad
de la validación de DTOs (Data Transfer Objects) en el borde de la
API. Estas tres preocupaciones quedan típicamente fuera del alcance
de la capa unitaria y serían costosas de validar exhaustivamente en
la capa end-to-end, por lo que su ubicación natural es el nivel
intermedio.

Se emplearon **Jest** como framework de pruebas y **Supertest** como
cliente HTTP para emitir peticiones contra una instancia real del
backend, conectada a una base de datos **PostgreSQL 15 con la
extensión pgvector** y a un servidor **Redis 7** independientes de
los entornos de desarrollo y producción. La base de datos de
integración se aísla mediante un esquema dedicado (`vinki_test`,
puerto 5434) y se reinicia entre suites con sentencias `TRUNCATE
CASCADE` en orden inverso a las dependencias de claves foráneas para
garantizar la idempotencia entre ejecuciones.

La suite de integración alcanzó **97 casos de prueba distribuidos en
9 suites**, organizadas en tres grupos: integridad de datos
(44 pruebas), API end-to-end (37 pruebas) y validación de DTOs
(16 pruebas, incluyendo casos *cross-user* adicionados durante la
Fase 5-B). La capa de integridad verifica empíricamente las 7
restricciones tipo CHECK añadidas mediante la Decisión D-1 sobre las
tablas `answer_evaluations`, `user_skill_scores` e
`interview_questions`, las cinco políticas de eliminación en cascada
sobre las relaciones entre `interviews`, `interview_questions`,
`answers` y `answer_evaluations`, y las restricciones de unicidad
sobre los campos de identificación del usuario. La capa de API
end-to-end ejecuta los recorridos completos de creación de
entrevista, envío de respuesta y obtención del reporte, validando
que el flujo asíncrono del worker de BullMQ procesa correctamente
los trabajos de evaluación y que el estado `evaluationStatus`
transiciona de `processing` a `completed` cuando el procesamiento
concluye. La capa de validación de DTOs verifica que el
`ValidationPipe` global rechaza con código HTTP 400 todo *payload*
malformado antes de que la lógica del servicio se ejecute, con un
total de 11 casos representativos de los DTOs de registro,
entrevistas y respuestas.

La capa de integración resultó decisiva para verificar los RNF de
integridad de datos: los RNF-09 a RNF-20 se mapean uno a uno con
casos de prueba específicos en esta capa, conforme se sintetiza en
la matriz de trazabilidad (anexo). Adicionalmente, durante la Fase
5-B se incorporaron 5 pruebas cross-user específicas para el bug
HE-07 (apartado de seguridad más adelante), elevando el total de la
capa de los 92 originales a 97.

### Pruebas end-to-end (E2E)

La capa end-to-end se implementó con **Playwright**, framework
elegido por su soporte nativo de múltiples motores de navegador
(Chromium, Firefox, WebKit), su modelo de espera automática que
elimina la categoría de fallos por *race conditions* habituales en
herramientas anteriores, y su capacidad de orquestar la pila
completa de servicios mediante la directiva `webServer`, que levanta
backend y frontend coordinadamente al inicio de la suite. Estas
características diferencian a Playwright de alternativas como
Cypress (que históricamente requirió configuración adicional para
testing multi-pestaña y multi-origen) y resultaron alineadas con la
naturaleza de Vinki como aplicación distribuida (frontend Vite,
backend NestJS, base de datos, Redis y cola de trabajos).

La suite final consta de **47 casos de prueba distribuidos en 9
suites** identificadas como TC-E-00 a TC-E-08, que cubren los ocho
flujos críticos del estudiante reclasificados por la Decisión D-8 y
un grupo cero de pruebas transversales de autenticación. Cada suite
ejecuta el flujo correspondiente en un navegador real (Chromium
headless), con la pila completa de servicios levantada y un seed
determinista que establece el estado inicial de la base de datos.
La cobertura funcional alcanza **27 Requerimientos Funcionales y 4
Requerimientos No Funcionales** (RNF-07 sobre autorización por
propiedad, RNF-26 sobre internacionalización, RNF-27 sobre
visualización de métricas y RNF-28 sobre exportación de reportes).
El resultado de la última ejecución es de 47 / 47 casos en verde,
verificado con el modificador `--repeat-each=3` que ejecuta cada
caso tres veces consecutivas para detectar inestabilidad, alcanzando
141 / 141 ejecuciones exitosas y descartando cualquier *flakiness*.
La [Figura 3.3] muestra el reporte HTML generado por Playwright tras
la ejecución completa.

Resulta significativo destacar que la propia suite end-to-end
**detectó un defecto real de seguridad de severidad ALTA** durante
su ejecución, defecto que se desarrolla en detalle en el apartado de
seguridad. Este hecho constituye evidencia empírica del valor de la
pirámide de Cohn (2009): las pruebas end-to-end, aun siendo pocas en
número, alcanzan a observar interacciones entre componentes que las
capas inferiores no pueden cubrir, y por ese motivo justifican su
costo de ejecución y mantenimiento.

## Pruebas no funcionales

Las pruebas no funcionales verificaron las propiedades transversales
del sistema definidas en los RNF: latencia, capacidad de
concurrencia, integridad criptográfica, autorización, configuración
de seguridad en el borde HTTP y calidad del componente de
inteligencia artificial. Su ejecución requirió herramientas
especializadas distintas de las empleadas para las pruebas
funcionales, dado que cada propiedad demanda un instrumento de
medición específico. Las tres subsecciones siguientes presentan las
pruebas de rendimiento, las pruebas de seguridad y la evaluación
específica del componente RAG.

### Pruebas de rendimiento

Las pruebas de rendimiento se implementaron con **Apache JMeter
5.6.3**, herramienta adoptada por instrucción explícita del tutor
académico mediante la Decisión D-9, en sustitución de una propuesta
inicial de la herramienta k6 que quedó archivada. JMeter es un
estándar maduro de la industria y resulta plenamente capaz de medir
latencia mediante los percentiles P50, P95 y P99, *throughput*, tasa
de error y comportamiento bajo concurrencia con un número arbitrario
de usuarios virtuales.

La estrategia de medición adoptó un enfoque dual, formalizado en la
Decisión D-15. Esta dualidad responde a una observación
metodológicamente importante: los servicios mock del modelo de
lenguaje y de embeddings responden de forma prácticamente
instantánea, por lo que las mediciones con la variable de entorno
`LLM_SANDBOX=true` reflejan únicamente el sobrecosto arquitectónico
del backend — la suma de la canalización de NestJS, el motor de
validación, los *guards* de autorización, las consultas a la base de
datos y el acceso a Redis y BullMQ — pero no la latencia real del
proveedor LLM externo. En consecuencia, se planificaron dos modos
complementarios: el primero, denominado "arquitectónico", ejecuta
JMeter con el LLM mockeado y mide la latencia atribuible al sistema
sin el componente externo; el segundo, denominado "real",
ejecuta un subconjunto reducido de muestras con `LLM_SANDBOX=false`
y la clave de OpenAI activa para obtener una medición end-to-end
representativa, sin saturar al proveedor ni encarecer las pruebas.

Sobre el primer endpoint en alcance, denominado en el sistema
`evaluate-now` y asociado al RNF-01 (latencia de la evaluación de
inteligencia artificial), las mediciones arquitectónicas se
ejecutaron en tres perfiles incrementales de carga: humo con un
usuario, carga con veinte usuarios y estrés con cincuenta usuarios
concurrentes durante cinco minutos. Los resultados, consolidados en
la [Tabla 2], muestran percentiles 95 de 15 milisegundos en humo,
135 milisegundos en carga y 361 milisegundos en estrés, con tasa de
error nula en los tres casos. El percentil 95 a cincuenta usuarios
concurrentes (361 ms) se encuentra un orden de magnitud por debajo
del umbral del RNF-01 (5 000 ms), lo que indica que la arquitectura
del backend tiene margen muy holgado para absorber la latencia del
modelo de lenguaje externo.

**Tabla 2.** *Resultados del RNF-01 arquitectónico (mock LLM activo).*

| Perfil | Usuarios | Muestras | P50 (ms) | P95 (ms) | P99 (ms) | Throughput | Error |
|---|---|---|---|---|---|---|---|
| Humo | 1 | 4 796 | 12 | 15 | 18 | 80 req/s | 0.00 % |
| Carga | 20 | 36 183 | 100 | 135 | 184.99 | 201 req/s | 0.00 % |
| Estrés | 50 | 58 579 | 249 | 361 | 442 | 195 req/s | 0.00 % |

La medición complementaria del RNF-01 con el modelo de lenguaje real
(`gpt-4o-mini` de OpenAI) se ejecutó sobre 20 muestras a baja
concurrencia, conforme exige la Decisión D-15. El resultado fue un
percentil 50 de 4 415 milisegundos y un **percentil 95 de 7 418
milisegundos**, valor que excede el umbral de 5 segundos
originalmente establecido en el RNF-01. Este resultado motivó un
análisis detallado del flujo real de evaluación, registrado como
Decisión D-17. El análisis demostró que el SUT atraviesa dos rutas
distintas según el modo de entrevista: el flujo principal del
estudiante (modo `evaluation`) procesa la evaluación de manera
asíncrona vía la cola BullMQ — el endpoint `POST /finish` solo
encola el trabajo y devuelve la confirmación con latencia
aproximada de 12 milisegundos —, mientras que el modo `practice`
(funcionalidad opcional de retroalimentación inmediata) invoca el
endpoint síncrono `evaluate-now` y mantiene al usuario esperando
con un indicador visual hasta recibir la respuesta. En el flujo
principal, donde el RNF-01 se aplica en sentido productivo, el
sistema cumple el umbral con amplitud; en el modo opcional, la
latencia superior es consecuencia directa del tiempo de inferencia
del proveedor LLM externo, factor ajeno al control de diseño del
sistema. Esta interpretación reclasifica el hallazgo de
incumplimiento como una observación acotada y propone formalmente
diferenciar el RNF-01 en dos sub-umbrales — uno para el acuse de
envío inmediato (menor a 500 milisegundos, ampliamente cumplido) y
otro para el feedback inmediato del modo `practice` (menor a 8
segundos, compatible con los modelos económicos modernos) —, propuesta
que queda registrada para revisión académica.

Sobre el endpoint asociado al RNF-02 (búsqueda semántica con hasta
10 000 preguntas), las mediciones arrojaron un percentil 95 de 7
milisegundos en el perfil de humo y 90 milisegundos en el perfil de
carga con veinte usuarios concurrentes y la base de datos cargada
con 10 000 preguntas y 50 *chunks* de conocimiento. Ambos valores
se encuentran ampliamente por debajo del umbral RNF-02 de 500
milisegundos, con holgura aproximada de 5.5 veces. El perfil de
estrés con cincuenta usuarios quedó parcialmente ejecutado, alcanzando
los treinta usuarios concurrentes con 13 839 muestras válidas
y un percentil 95 de 70 milisegundos antes de que la máquina virtual
de Java agotara su memoria asignada — limitación documentada como
restricción del entorno de ejecución y no como característica del
sistema bajo prueba. La validación del comportamiento a cincuenta
usuarios concurrentes queda cubierta por el perfil estrés del RNF-01
arquitectónico, que sostuvo cincuenta usuarios durante cinco minutos
sin errores. La capacidad de cincuenta usuarios concurrentes
estipulada en el RNF-03 queda así demostrada por extensión, sin
necesidad de ejecutar el escenario dedicado.

Cabe declarar honestamente que las pruebas de rendimiento se
ejecutaron en un entorno de desarrollo con 8 GB de memoria RAM, no
en infraestructura productiva dedicada. Esta limitación es
consustancial al alcance académico del proyecto y se documenta de
forma explícita: los planes JMeter, el seed dedicado para
rendimiento y la infraestructura completa quedan disponibles en el
repositorio para reejecución en hardware con mayor memoria, lo que
permitiría completar formalmente los dos perfiles diferidos.

### Pruebas de seguridad

Las pruebas de seguridad se ejecutaron en cuatro frentes
complementarios: auditoría automática de dependencias, análisis
estático del código fuente, revisión manual de los controles RNF
correspondientes a la categoría de seguridad y verificación de
controles transversales en el borde HTTP. Esta combinación responde
a la naturaleza heterogénea de las vulnerabilidades de seguridad,
que requieren tanto herramientas automatizadas como inspección
humana experta para alcanzar cobertura significativa.

La auditoría de dependencias se ejecutó con la herramienta
`npm audit`, que consulta la base de datos pública de
vulnerabilidades del registro de paquetes Node y reporta las
coincidencias encontradas en el árbol de dependencias del proyecto.
El estado inicial reportó 34 vulnerabilidades activas distribuidas
entre el espacio de trabajo del backend (23 vulnerabilidades, una
de severidad crítica en el paquete `handlebars` por inyección de
JavaScript vía confusión de tipos en el AST, 12 de severidad alta y
10 de severidad moderada) y el espacio de trabajo del frontend (11
vulnerabilidades, ninguna crítica, 5 altas y 6 moderadas). Tras la
aplicación de `npm audit fix` sin la opción `--force` — que limita
el remedio a cambios compatibles con las dependencias semánticas
declaradas — el backend cerró la totalidad de las vulnerabilidades
(cierre del 100 %, con 0 vulnerabilidades activas) y el frontend
quedó con dos vulnerabilidades moderadas residuales: ambas
corresponden al paquete `dompurify` que llega como dependencia
transitiva del editor de código `monaco-editor`, sin parche
disponible en el ecosistema *upstream* al momento de la corrida. La
verificación con `npm audit fix --force --dry-run` confirmó que no
existe versión segura del árbol disponible para la combinación
actual de `monaco-editor`. Esta limitación queda documentada
explícitamente como vulnerabilidad residual conocida, con
recomendación de reevaluar cuando el proveedor del editor publique
una versión basada en una rama segura de `dompurify`. La reducción
total alcanzada por el proceso de auditoría fue del 94 % (de 34 a 2
vulnerabilidades).

El análisis estático se ejecutó mediante el complemento
`eslint-plugin-security` sobre ambos espacios de trabajo. La
ejecución reportó 92 advertencias entre los dos proyectos
(54 en backend y 38 en frontend), distribuidas principalmente entre
dos reglas: `detect-object-injection`, que se activa cuando el código
accede a una propiedad de un objeto mediante una clave dinámica, y
`detect-non-literal-fs-filename`, que se activa cuando se invoca a
una función del sistema de ficheros con un argumento variable. El
triaje manual de las 92 advertencias confirmó que la totalidad
corresponde a falsos positivos sobre código interno del propio
sistema: accesos a propiedades cuyas claves provienen de objetos
constantes del propio programa, y rutas de ficheros construidas
con la función `path.resolve` a partir del directorio del módulo,
sin involucrar entrada del usuario. No se detectó ninguna
vulnerabilidad real por esta vía. Adicionalmente, se planificó la
ejecución de la herramienta **Semgrep** con reglas alineadas al
OWASP Top 10 [CITA: OWASP Top 10 2021]; la ejecución local resultó
inviable debido a una incompatibilidad del entorno Python del
sistema con las dependencias compiladas de Semgrep, limitación que
quedó documentada con alternativas viables (ejecución vía contenedor
Docker, vía subsistema Linux para Windows o en una etapa de
integración continua) para iteraciones futuras del proyecto.

La revisión manual de los controles correspondientes a los
Requerimientos No Funcionales RNF-05 a RNF-08 confirmó el
cumplimiento de cada uno. El RNF-05 (hash de contraseñas) se verificó
mediante inspección directa del servicio de autenticación, que
emplea el algoritmo bcrypt con factor de coste 10, comparación de
tiempo constante en la verificación y exclusión sistemática del hash
en todas las respuestas y registros de la API. El RNF-06 (cifrado en
tránsito) se validó a nivel de configuración productiva mediante la
plantilla `docker-compose.prod.yml` con terminación TLS, las cookies
marcadas con la bandera `secure` cuando la variable `NODE_ENV` toma
el valor `production`, y los encabezados HTTP Strict Transport
Security configurados por defecto en el middleware Helmet. El RNF-07
(autorización por propiedad) recibió la revisión más exhaustiva: se
auditaron sistemáticamente 27 endpoints autenticados del sistema
para verificar que cada uno valida la pertenencia del recurso al
usuario invocante antes de devolverlo o modificarlo, y se compararon
las implementaciones con el patrón canónico observado en el servicio
de entrevistas. Esta revisión sistemática detectó la segunda
vulnerabilidad de severidad media del proyecto, documentada en el
apartado de gestión de defectos. El RNF-08 (protección de las URL
de audio) se verificó como cumplido por diseño: el sistema
transcribe el audio en línea y no persiste el binario, por lo que
el campo `audio_url` contiene un valor literal placeholder sin
representar una URL accesible — no existe vector de exposición. Si
en una versión futura del sistema se activara el almacenamiento
real en un servicio de objetos como Amazon S3, sería necesario
incorporar URL firmadas con expiración, requisito que queda
explícitamente declarado.

Los controles transversales en el borde HTTP se verificaron uno a
uno. El middleware **Helmet** se aplica globalmente con
configuración por defecto, lo que activa los encabezados
*Content-Security-Policy*, *Strict-Transport-Security*, *X-Frame-Options*,
*X-Content-Type-Options* y *Referrer-Policy*. La política CORS
(*Cross-Origin Resource Sharing*) se configura con origen restringido
al frontend declarado en la variable de entorno — nunca con comodín
`*` — y con la bandera `credentials: true` para permitir cookies
*httpOnly*, combinación que es la única configuración segura cuando
la autenticación se basa en cookies. El `ValidationPipe` global de
NestJS se configura con las opciones `whitelist: true`,
`forbidNonWhitelisted: true` y `transform: true`, lo que provoca el
rechazo automático de cualquier *payload* con propiedades no
declaradas en el DTO. El filtro de excepciones global construye la
respuesta de error con tres campos solamente — código de estado,
mensaje y categoría —, sin exponer trazas de pila ni información
interna del servidor. El módulo de *rate limiting* (`ThrottlerModule`)
se aplica de forma global como `APP_GUARD` con límites configurables
por variable de entorno (Decisión D-14). Finalmente, una búsqueda
exhaustiva del código fuente mediante expresiones regulares dirigidas
a patrones típicos de secretos en plano (claves de OpenAI, claves de
Google, declaraciones del tipo `password=` o `secret=`, declaraciones
de `JWT_SECRET`) arrojó cero coincidencias.

**Detección y corrección de dos vulnerabilidades de Broken Access
Control.** La pieza más relevante del proceso de seguridad consiste
en que el propio proceso de QA detectó y corrigió, antes del
despliegue, dos vulnerabilidades de la categoría OWASP A01:2021 —
Broken Access Control [CITA: OWASP Top 10 2021], que es la categoría
con mayor prevalencia en aplicaciones web modernas. La primera
vulnerabilidad, identificada como **HE-01**, fue una fuga de datos
entre inquilinos en la capa de caché del backend: el interceptor de
caché del sistema construía su clave omitiendo el identificador del
usuario autenticado, lo que provocaba que las respuestas
personalizadas de cinco endpoints decorados con `@Cacheable` —
panel de control del estudiante, percentiles, predicción de
carrera, ajuste a perfil profesional y aprendizaje por transferencia —
se sirvieran indiferenciadamente a usuarios distintos cuando la
clave de URL coincidía. La suite de pruebas end-to-end detectó la
vulnerabilidad de forma indirecta a través del caso TC-E-05-003,
que validaba el estado vacío del panel de control para un usuario
recién registrado: el caso fallaba intermitentemente con datos
inesperados, lo que motivó un diagnóstico empírico que culminó en
la identificación de la causa raíz. Tras la autorización explícita
del tutor académico, la corrección consistió en una modificación de
una sola línea sobre el método `buildCacheKey()` para incorporar el
identificador del usuario en la construcción de la clave. La
verificación de la corrección se realizó a cuatro niveles: 11 de
11 pruebas unitarias del interceptor en verde, 375 de 375 pruebas
del backend en verde, 97 de 97 pruebas de integración en verde y
141 de 141 ejecuciones de la suite end-to-end en verde tras tres
corridas consecutivas. Se incorporaron además tres *regression
guards* unitarios específicos que fijan el contrato de la clave de
caché a nivel del componente más bajo, de modo que cualquier futura
regresión que omitiera el identificador del usuario rompería estas
pruebas antes de alcanzar el resto del sistema.

La segunda vulnerabilidad, identificada como **HE-07**, fue una
falla de Broken Object Level Authorization (BOLA) en los endpoints
asociados a las plantillas de entrevista. La revisión manual
sistemática del RNF-07 ejecutada en la Fase 5-B, motivada
explícitamente por el antecedente del HE-01, detectó que dos
endpoints del controlador de plantillas omitían la verificación de
propiedad del recurso: el endpoint `GET /api/interviews/templates/:id`
y el endpoint `POST /api/interviews/templates/:id/start`. Como
consecuencia, cualquier usuario autenticado — incluido un estudiante
sin permisos administrativos — podía leer el contenido completo de
cualquier plantilla privada de cualquier reclutador mediante una
simple enumeración de identificadores secuenciales, e iniciar
entrevistas basadas en plantillas ajenas. El contraste interno del
propio servicio resultó decisivo para confirmar que se trataba de
una omisión y no de un diseño deliberado: el método `listTemplates`
del mismo servicio sí filtraba correctamente por las condiciones de
`isPublic` o `createdById`, mientras que `getTemplate` y
`startFromTemplate` no lo hacían. La corrección replicó la lógica
de autorización ya existente en `listTemplates` sobre los dos
métodos afectados y sobre la firma del método `createTemplate` que
los invoca internamente. La verificación siguió el mismo patrón de
cuatro niveles que la corrección de HE-01: 29 de 29 pruebas
unitarias del módulo de plantillas en verde (con cinco nuevos
*regression guards* específicos para HE-07), 375 de 375 pruebas del
backend completo en verde, 97 de 97 pruebas de integración en verde
(con cinco nuevos casos *cross-user* específicos del bug) y la
suite end-to-end inalterada en 47 de 47. La asimetría deliberada
entre la corrección inmediata de HE-01 y HE-07 frente al
diferimiento del bug HE-05 (apartado de gestión de defectos)
refleja la práctica estándar de la industria: los bugs de
autorización con corrección viable sin cambio de experiencia de
usuario se corrigen, mientras que los defectos de calidad de datos
en funcionalidades secundarias con corrección que requiere cambios
de interfaz se difieren al *backlog* de mejoras post-MVP.

### Evaluación del componente RAG

El componente de Retrieval-Augmented Generation (RAG) de Vinki
exigió una evaluación específica con métricas estadísticas propias
del campo de los sistemas con inteligencia artificial, en
complemento a las pruebas tradicionales descritas en los apartados
anteriores. La motivación reside en la naturaleza no determinista
del modelo de lenguaje: para una misma entrada, el modelo puede
producir salidas distintas en ejecuciones sucesivas, lo que vuelve
inaplicable el criterio binario de "pasa" o "no pasa" característico
de las pruebas tradicionales. En su lugar, se adoptaron métricas
agregadas sobre un conjunto curado de preguntas, evaluadas con dos
herramientas reconocidas en la industria: **Ragas** [CITA: Ragas —
Es et al., Exploding Gradients] y **DeepEval** [CITA: DeepEval —
Confident AI]. Ragas aporta métricas estándar de la disciplina —
*Faithfulness*, *Answer Relevancy*, *Context Precision*, *Context
Recall* y *Answer Correctness* —, mientras que DeepEval permite
verificaciones cruzadas con jueces distintos y aserciones
adicionales sobre las salidas del modelo.

La caracterización del *pipeline* RAG de Vinki se sintetizó en una
hoja técnica dedicada: la ingestión utiliza un *chunker* que divide
el contenido en fragmentos de aproximadamente 800 *tokens* con
superposición de 100 *tokens* respetando la estructura de párrafos;
los *embeddings* se generan con el modelo `text-embedding-3-small`
de OpenAI con dimensión 1536; el almacenamiento aprovecha la
extensión `pgvector` de PostgreSQL con búsqueda por distancia
coseno y filtros opcionales por lenguaje y framework; la
recuperación devuelve los cinco fragmentos más cercanos al vector
de consulta; y la generación de la respuesta emplea el modelo
`gpt-4o-mini` con un *prompt template* documentado que instruye al
modelo a responder exclusivamente con base en el contexto
recuperado y a abstenerse si el contexto no contiene la
información requerida.

La metodología del conjunto de evaluación recibió especial atención
para evitar el sesgo circular de auto-evaluación. El plan maestro
recomendaba un conjunto de 25 a 30 preguntas; el alcance de Fase 6
adoptó 15 preguntas para hacer el ejercicio manejable sin perder
significado estadístico, distribuidas en tres categorías: diez
preguntas in-domain cuya respuesta se encuentra claramente en uno
de los cinco documentos del corpus, tres preguntas de borde
(*edge-case*) que requieren combinar dos documentos o admiten
múltiples respuestas válidas, y dos preguntas fuera de dominio
(*out-of-domain*) deliberadamente alejadas del corpus para
verificar la capacidad de abstención del sistema. El criterio
metodológico central fue que el *ground truth* — la respuesta de
referencia contra la cual se compara la salida del sistema — debía
ser redactado por un humano a partir del contenido literal del
corpus, nunca generado por el mismo modelo que se evalúa, ya que
ello introduciría un sesgo circular en el que el modelo terminaría
midiendo similitud consigo mismo en lugar de calidad real. Para
trazabilidad, cada entrada del conjunto incluye el documento fuente,
la cita literal del corpus que respalda la respuesta y la categoría
correspondiente.

Las seis capacidades del componente RAG declaradas en el plan
maestro se mapearon a métricas concretas. La capacidad **IA-01**
(*Faithfulness*) mide qué fracción de las afirmaciones contenidas
en la respuesta del sistema están respaldadas por al menos un
fragmento del contexto recuperado; la capacidad **IA-02** (*Answer
Relevancy*) mide si la respuesta efectivamente responde a la
pregunta planteada; la capacidad **IA-03** (*Context Precision*)
mide qué fracción de los fragmentos recuperados son relevantes para
responder; la capacidad **IA-04** (*Context Recall*) mide si los
fragmentos relevantes del corpus fueron efectivamente recuperados;
la capacidad **IA-05** (*Answer Correctness*) mide la coincidencia
de la respuesta con el *ground truth* de referencia; y la capacidad
**IA-06** (latencia del *pipeline*) se mide directamente mediante
cronómetro de alta resolución. Los umbrales declarados en el plan
maestro son 0.80 para IA-01 e IA-02, 0.70 para IA-03 a IA-05, una
tasa de alucinación inferior al 10 % y un percentil 95 de latencia
menor a 5 segundos.

La ejecución de la evaluación se realizó tras la autorización
explícita del tutor académico mediante la Decisión D-19, con un
presupuesto máximo aprobado de 0.30 dólares estadounidenses para
cubrir el consumo de tokens del modelo de lenguaje y los jueces
estadísticos. La corrida real consumió **0.028 dólares** (~9 % del
presupuesto autorizado), procesando las 15 preguntas en
aproximadamente 5 minutos y medio. Los resultados, consolidados en
la [Tabla 3] y la [Figura 3.8], muestran cinco de las siete métricas
en cumplimiento del umbral y dos en zona de observación con causa
técnica documentable.

**Tabla 3.** *Resultados de la evaluación RAG sobre el subconjunto
in-domain (N=10), que constituye el criterio principal.*

| Capacidad | Métrica | Umbral | Resultado | Estado |
|---|---|---|---|---|
| IA-01 | Faithfulness | ≥ 0.80 | 0.933 | Cumple |
| IA-02 | Answer Relevancy | ≥ 0.80 | 0.767 | Observación |
| IA-03 | Context Precision | ≥ 0.70 | 1.000 | Cumple |
| IA-04 | Context Recall | ≥ 0.70 | 1.000 | Cumple |
| IA-05 | Answer Correctness | ≥ 0.70 | 0.828 | Cumple |
| — | Tasa de alucinación (1 − Faithfulness) | ≤ 10 % | 6.7 % | Cumple |
| IA-06 | Latencia P95 del pipeline | < 5 000 ms | 5 900 ms (excluyendo un valor atípico) / 24 399 ms (con el valor atípico incluido) | Observación |

El hallazgo positivo más relevante de la evaluación corresponde al
comportamiento del sistema frente a las preguntas fuera de dominio.
En las dos preguntas *out-of-domain* del conjunto — una sobre una
receta de cocina y otra sobre una versión específica de Kubernetes,
ambas alejadas del corpus técnico de Vinki — el sistema respondió
literalmente: "*No tengo información en el material disponible
sobre*...", sin inventar datos ni recurrir al conocimiento general
del modelo base. Esta abstención honesta constituye el
comportamiento ideal para un sistema educativo: un estudiante que
formule una pregunta no cubierta por el material curado del
reclutador recibirá una respuesta veraz que reconoce la limitación,
en lugar de una respuesta inventada que pudiera inducir a error.
Las métricas estándar de Ragas no están diseñadas para evaluar
correctamente este caso — penalizan la abstención al considerarla
respuesta no relevante —, por lo que la validación del
comportamiento *out-of-domain* se realiza cualitativamente mediante
inspección manual de las respuestas, conforme se documenta en el
reporte detallado de Fase 6.

La observación sobre **Answer Relevancy** corresponde a un valor
0.03 puntos por debajo del umbral, dentro del margen de
incertidumbre estadística asociado a un conjunto de N=10. La causa
identificada es que el sistema tiende a producir respuestas
ligeramente más extensas que el *ground truth*, incorporando
información adicional relevante del contexto recuperado pero que no
forma parte estricta de la respuesta esperada. Esta extensión es
deseable en un sistema educativo — aporta más contexto al estudiante
—, por lo que el déficit métrico se clasifica como un compromiso de
diseño y no como un defecto del sistema. La observación sobre la
**latencia P95** se ve fuertemente afectada por un único valor
atípico de 67 segundos en una de las 15 preguntas, causado
probablemente por una limitación transitoria de cuota del proveedor;
al excluir ese valor atípico, el percentil 95 desciende a 5 900
milisegundos, valor consistente con la observación previamente
documentada sobre la latencia del modelo `gpt-4o-mini`.

Las limitaciones de la evaluación se declaran de forma honesta: el
tamaño del conjunto (N=15) implica intervalos de confianza amplios
en comparación con el ideal de 25 a 30 sugerido por el plan
maestro; el modelo evaluado y el juez estadístico coinciden
(`gpt-4o-mini`), lo que introduce un sesgo de auto-evaluación
documentado y mitigable en iteraciones futuras mediante el uso de
un juez distinto (`gpt-4o`); y el corpus actual consta de cinco
documentos relativamente compactos, lo que limita la
discriminación de las métricas de precisión y recuperación de
contexto.

## Gestión de defectos detectados

El proceso de aseguramiento de la calidad detectó nueve defectos en
total durante el ciclo de vida del proyecto, registrados como
HE-01 a HE-09. La [Tabla 4] sintetiza el conjunto con su tipo,
severidad, estado actual de gestión y los requerimientos afectados.

**Tabla 4.** *Hallazgos detectados durante el proceso de QA.*

| ID | Tipo | Severidad | Estado | Requerimiento(s) |
|---|---|---|---|---|
| HE-01 | Seguridad — fuga de datos entre inquilinos en caché | Alta | Corregido | RNF-07 |
| HE-02 | Accesibilidad — ausencia de `aria-label` en menú de cierre de sesión | Baja | Documentado en backlog | RNF-29 |
| HE-03 | Internacionalización — textos sin localizar en módulo de conocimiento | Baja | Documentado en backlog | RNF-26 |
| HE-04 | Internacionalización — textos sin localizar en perfil de usuario | Baja | Documentado en backlog | RNF-26 |
| HE-05 | Lógica de negocio — campo `skill_id` contaminado en generación administrativa de preguntas con IA | Media-alta | Diferido formalmente (Decisión D-13) | RF-12, RF-27, RF-42 |
| HE-06 | Rendimiento UX — latencia superior a 5 segundos en feedback inmediato del modo `practice` | Baja-media | Acotado por Decisión D-17 | RNF-01 (sub-umbral) |
| HE-07 | Seguridad — Broken Object Level Authorization en endpoints de plantillas | Media | Corregido (Decisión D-18) | RNF-07 |
| HE-08 | Métrica — Answer Relevancy 0.03 puntos bajo umbral por respuestas extendidas | Baja / no defecto | Documentado como compromiso de diseño | IA-02 |
| HE-09 | Métrica — divergencia semántica entre `DeepEval.HallucinationMetric` y la definición de tasa de alucinación del plan maestro | Baja | Mitigado mediante uso de Ragas Faithfulness como métrica oficial | IA-01 |

El criterio de gestión aplicado distingue tres caminos según la
severidad y naturaleza del defecto. Los defectos de seguridad o
autorización con corrección viable y sin requerir cambios de
experiencia de usuario se corrigen de inmediato con autorización
explícita del tutor: este criterio aplicó a HE-01 y HE-07, ambos
corregidos con verificación a cuatro niveles y *regression guards*
específicos. Los defectos de calidad de datos en funcionalidades
secundarias cuya corrección requiere cambios de interfaz se
difieren formalmente al *backlog* post-MVP con la corrección técnica
ya especificada para su implementación futura: este criterio
aplicó a HE-05 mediante la Decisión D-13, dado que su corrección
implica añadir un selector obligatorio de habilidad a la pantalla de
generación administrativa de preguntas con IA. Los defectos de
baja severidad asociados a mejoras de experiencia de usuario,
accesibilidad o internacionalización se documentan en un plan de
mejoras priorizado, apto como anexo del informe: este criterio
aplicó a HE-02, HE-03 y HE-04. Las observaciones surgidas de la
evaluación RAG (HE-06, HE-08, HE-09) corresponden a interpretaciones
métricas o limitaciones de las herramientas y se documentan como
tales, sin requerir intervención sobre el sistema.

La asimetría de gestión entre HE-01, HE-07 y HE-05 — los tres con
severidad intermedia o alta y los dos primeros corregidos mientras
el tercero se difiere — no es arbitraria sino metodológicamente
fundamentada. Refleja la práctica profesional de gestión de
defectos por severidad, impacto en el flujo crítico del usuario y
viabilidad de la corrección sin afectar otros aspectos del producto.
Esta gestión deliberada constituye, por sí misma, una evidencia del
proceso de aseguramiento de la calidad: no todo defecto se arregla
inmediatamente, pero todo defecto se documenta, se clasifica y se
asigna un destino explícito.

## Conclusión

El proceso de aseguramiento de la calidad de la plataforma Vinki
ejecutó **653 casos de prueba automatizados** distribuidos en cuatro
capas conforme a la pirámide de testing de Cohn (2009): 502 pruebas
unitarias en backend y frontend, 97 pruebas de integración contra
infraestructura real, 47 pruebas end-to-end con Playwright y los
casos de prueba específicos de rendimiento, seguridad y evaluación
del componente de inteligencia artificial. La totalidad de las
suites se ejecutó con 100 % de éxito en su última corrida
verificada, sin pruebas pendientes ni omitidas, y la suite end-to-end
se validó adicionalmente con tres ejecuciones consecutivas para
descartar inestabilidad.

La cobertura de código del backend superó con holgura el umbral del
80 % en las cuatro métricas (99.15 % de *statements*, 92.98 % de
*branches*, 98.06 % de *functions* y 99.22 % de *lines*), mientras
que la del frontend alcanzó tres de cuatro métricas sobre el umbral
tras la reclasificación formal de las páginas grandes a la capa
end-to-end (Decisión D-8). Las pruebas de integración validaron
doce Requerimientos No Funcionales de integridad de datos (RNF-09 a
RNF-20) y los controles de autorización por propiedad (RNF-07). Las
pruebas de rendimiento confirmaron que la arquitectura del backend
cumple el umbral del RNF-01 con un percentil 95 de 361 milisegundos
a 50 usuarios concurrentes — un orden de magnitud por debajo del
límite de 5 segundos — y el umbral del RNF-02 con un percentil 95
de 90 milisegundos a 20 usuarios concurrentes sobre 10 000
preguntas. Las pruebas de seguridad redujeron el número de
vulnerabilidades de dependencias del 34 inicial a 2 residuales
documentadas, mantuvieron en cero los secretos detectados en el
código fuente y verificaron individualmente los cuatro
Requerimientos No Funcionales de seguridad (RNF-05 a RNF-08). La
evaluación del componente RAG cumplió cinco de siete métricas
sobre el subconjunto in-domain y demostró que el sistema se abstiene
honestamente ante preguntas fuera de dominio.

La pieza más significativa del proceso reside en que la propia
infraestructura de pruebas detectó y corrigió, antes del despliegue,
**dos vulnerabilidades reales de Broken Access Control** [CITA:
OWASP Top 10 2021], la categoría con mayor prevalencia en
aplicaciones web modernas. La primera vulnerabilidad (HE-01) fue
detectada por la suite end-to-end, demostrando empíricamente el
valor que aporta la capa superior de la pirámide; la segunda
vulnerabilidad (HE-07) fue detectada por la revisión manual
sistemática del RNF-07 ejecutada en la Fase 5-B, motivada
explícitamente por la lección aprendida del primer hallazgo. Ambas
correcciones se verificaron a cuatro niveles con cero regresiones y
quedaron protegidas por *regression guards* específicos a nivel
unitario y de integración. Esta evidencia objetiva constituye la
justificación material del proceso de aseguramiento de la calidad:
sin él, ambos defectos habrían alcanzado producción.

La metodología completa, las diecinueve decisiones formales que
adaptaron el plan maestro al contexto específico de Vinki (D-1 a
D-19) y la totalidad de los artefactos generados durante el proceso
quedan documentados en los anexos del presente trabajo, disponibles
para inspección, reproducibilidad y auditoría académica.

---

## Anexos referenciados

El presente capítulo referencia los siguientes documentos que se
encuentran en el repositorio del proyecto y que constituyen los
anexos metodológicos y de evidencia detallada:

- Plan maestro de pruebas: `qa/01-plan-maestro/plan_maestro_pruebas.md`
- Matriz de trazabilidad RF/RNF/IA: `qa/01-plan-maestro/matriz_trazabilidad.md`
- Registro de las 19 decisiones formales: `qa/01-plan-maestro/decisiones_qa.md`
- Catálogo de código fuera de alcance: `qa/01-plan-maestro/diferidos_qa.md`
- Bitácora técnica NT-001 a NT-031: `qa/00-inventario/notas_tecnicas.md`
- Reporte ejecutivo del bug HE-01: `qa/03-pruebas-e2e/bug_seguridad_HE01.md`
- Reporte ejecutivo del bug HE-07: `qa/04-pruebas-no-funcionales/seguridad/bug_seguridad_HE07.md`
- Reporte de pruebas de rendimiento (Fase 5-A): `qa/04-pruebas-no-funcionales/rendimiento/reporte_rendimiento.md`
- Reporte de pruebas de seguridad (Fase 5-B): `qa/04-pruebas-no-funcionales/seguridad/reporte_seguridad.md`
- Reporte de evaluación del componente RAG (Fase 6): `qa/05-evaluacion-rag/reporte_evaluacion_rag.md`
- Plan de mejoras futuras (defectos diferidos): `qa/03-pruebas-e2e/plan_mejoras_futuras.md`

## Referencias citadas en el capítulo

Cohn, M. (2009). *Succeeding with Agile: Software Development Using
Scrum*. Addison-Wesley Professional.

> **Marcadores de citación pendientes de completar por el autor del
> informe (referencias no verificadas en este borrador):**
>
> - `[CITA: OWASP Top 10 2021]` — referenciar la publicación oficial
>   del Open Worldwide Application Security Project del año 2021,
>   en particular la categoría A01:2021 Broken Access Control.
> - `[CITA: Ragas — Es et al., Exploding Gradients]` — referenciar
>   la publicación o documentación oficial del framework Ragas para
>   evaluación de sistemas RAG.
> - `[CITA: DeepEval — Confident AI]` — referenciar la documentación
>   oficial del framework DeepEval.
>
> Estos tres marcadores se dejaron explícitos en el borrador en
> lugar de inventar referencias bibliográficas que no estuvieran
> verificadas. El autor del informe debe completar las referencias
> consultando las fuentes oficiales antes de la entrega.
