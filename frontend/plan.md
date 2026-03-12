# Frontend Development Plan

## Objetivos
- Entregar una interfaz web intuitiva para simulaciones de entrevistas técnicas y visualización de feedback.
- Brindar herramientas de seguimiento para estudiantes y reclutadores con métricas claras.
- Garantizar performance, accesibilidad y compatibilidad multiplataforma (desktop/móvil).

## Stack y Fundamentos
- **Framework**: React + TypeScript (Vite) con SSR opcional.
- **Estado**: Zustand o Redux Toolkit para flujo de entrevistas y usuario.
- **UI**: sistema de diseño propio inspirado en identidad UPB (tipografía Serif+Sans, paleta cálida). Librerías de componentes ligeras (Radix UI) + utilidades Tailwind/CSS Modules.
- **Charts**: Recharts/Chart.js para métricas.
- **Testing**: Vitest + React Testing Library + Playwright para flujos críticos.

## Secciones Clave
1. **Onboarding & Auth**
   - Vistas de registro/login, manejo de JWT (cookies httpOnly) y roles.
   - Introducción guiada sobre la plataforma y selección de stack preferido.
2. **Dashboard Estudiante**
   - Resumen de habilidades, historial de entrevistas, CTA “Iniciar simulación”.
   - Tarjetas con KPIs (puntaje promedio, progreso semanal) y checklist de preparación.
3. **Flujo de Entrevista**
   - Wizard para elegir lenguaje/framework/nivel.
   - Interfaz en vivo con pregunta, timer, editor enriquecido, grabadora de audio y tracking de estado.
4. **Feedback & Reportes**
   - Vista detallada con calificaciones por métrica, recomendaciones IA, enlaces de estudio.
   - Timeline de respuestas y comparación histórica.
5. **Panel Reclutador/Tutor**
   - Listado filtrable de estudiantes, resumen de desempeño, descarga de reportes.
   - Vista de entrevista específica con notas y comentarios.

## Backlog Prioritario
1. Configurar proyecto (lint, husky, testing, rutas base, tema global).
2. Implementar capa de servicios/API client con tipado (OpenAPI).
3. Construir flujo de autenticación + estado persistente del usuario.
4. Desarrollar dashboard estudiante con datos mock y componentes reutilizables.
5. Implementar wizard de simulación e interfaz de entrevista (texto/audio, validaciones).
6. Crear pantalla de feedback con gráficos y recomendaciones.
7. Desarrollar panel para reclutadores (tablas, filtros, exportaciones).
8. Integrar notificaciones en tiempo real (WebSocket/polling) para resultados de IA.
9. Optimizar rendimiento (code splitting, Suspense), accesibilidad (WCAG 2.1 AA) y pruebas E2E.

## Entregables Iterativos
- Diseño responsivo validado (Figma handoff opcional) + componentes documentados (Storybook).
- Colección de casos de prueba (unitarios, integración, e2e) con cobertura mínima acordada.
- Arreglos Lighthouse (>90 en Performance/Accessibility/Best Practices/SEO para páginas críticas).
- Manual corto de uso para estudiantes y reclutadores.

## Riesgos y Mitigaciones
- **Complejidad UI**: adoptar Design System y tokens para mantener consistencia.
- **Latencia IA**: mostrar estados de carga claros y fallback a resultados previos.
- **Accesibilidad**: auditorías regulares con axe y pruebas con teclado/lector pantalla.
- **Sincronización Datos**: usar react-query/tanstack query para manejo de caché y revalidación automática.
