# Frontend Specs & Checklist

## 1. Setup & Infra
- [x] Inicializar proyecto Vite + React + TypeScript con ESLint, Prettier y Husky.
- [x] Configurar Vitest + React Testing Library + Playwright.
- [x] Definir tema global (tipografías UPB, paleta cálida) y tokens en CSS/Tailwind.
- [x] Montar Storybook/Docs para componentes base.
- [x] Integrar herramientas de accesibilidad (axe, lint a11y) y CI básico.

## 2. Servicios y Estado
- [ ] Generar cliente API tipado desde OpenAPI (tsoa/openapi-typescript).
- [ ] Implementar hook para autenticación con manejo de JWT en cookies httpOnly.
- [ ] Configurar state manager (Zustand/Redux Toolkit) para usuario, entrevistas y UI global.
- [ ] Integrar react-query/tanstack query para fetching, caching y revalidación.
- [ ] Crear capa de notificaciones/toasts centralizada.

## 3. Onboarding & Autenticación
- [ ] Diseñar pantallas de login/registro con validaciones y flujos de roles.
- [ ] Implementar selección inicial de stack/preferencias y guardar en perfil.
- [ ] Añadir tutorial/guided tour (coach marks) para primer uso.
- [ ] Manejar recuperación de sesión y estado persistente tras refresh.

## 4. Dashboard Estudiante
- [ ] Construir layout responsivo con tarjetas de KPIs (puntaje promedio, últimas entrevistas, progreso semanal).
- [ ] Mostrar historial resumido con filtros rápidos y CTA “Iniciar simulación”.
- [ ] Incluir checklist dinámico de preparación (dependiente de skill gaps).
- [ ] Incorporar widgets de recursos recomendados (links, cursos, artículos).

## 5. Flujo de Entrevista
- [ ] Crear wizard de configuración (lenguaje, framework, nivel, skill objetivo).
- [ ] Implementar pantalla en vivo con pregunta, timer, editor enriquecido y grabadora de audio.
- [ ] Gestionar estados (waiting IA, grabando, enviado) y control de errores/desconexiones.
- [ ] Mostrar progreso (barra, número de preguntas) y permitir pausa/abandono seguro.
- [ ] Enviar respuestas y archivos mediante API client, con reintentos y feedback visual.

## 6. Feedback & Reportes
- [ ] Diseñar vista detallada de cada respuesta con calificaciones por métrica (gráficos radiales/barras).
- [ ] Listar feedback textual del LLM y acciones recomendadas.
- [ ] Incluir timeline/tabla histórica con comparación por entrevista y skill.
- [ ] Permitir exportar resumen en PDF/CSV y compartir enlace privado.
- [ ] Mostrar estados mientras se procesa la evaluación (sockets/polling) y actualizaciones en vivo.

## 7. Panel Reclutador/Tutor
- [ ] Crear tabla de estudiantes con filtros (stack, nivel, puntaje, fecha).
- [ ] Agregar detalle de estudiante con últimas entrevistas, notas y comentarios internos.
- [ ] Implementar descarga/exportación de reportes agregados.
- [ ] Añadir capacidades de anotaciones/observaciones por entrevista.

## 8. Tiempo Real & Notificaciones
- [ ] Implementar WebSocket o SSE para recibir estados de entrevistas/evaluaciones.
- [ ] Mostrar banners/toasts cuando una evaluación concluya o haya errores.
- [ ] Registrar eventos de usuario (tracking) para analítica básica.

## 9. Performance, Accesibilidad y QA
- [ ] Configurar code splitting por rutas y lazy loading de vistas pesadas.
- [ ] Añadir skeletons/placeholders y animaciones suaves.
- [ ] Ejecutar auditorías Lighthouse (>90 en PWA básicas) y axe para WCAG 2.1 AA.
- [ ] Cubrir componentes críticos con pruebas unitarias/integración y flujos clave con Playwright.
- [ ] Documentar manual de uso (estudiante y reclutador) y publicar en Storybook o Docs.
