# Vinki Frontend

App React + Vite diseñada para el simulador de entrevistas técnicas de Vinki. Incluye stack base con Ant Design, tokens temáticos, Storybook y pruebas listas para usarse.

## Scripts principales

- `npm run dev` – servidor de desarrollo en `http://localhost:5173`.
- `npm run build` / `npm run preview` – compilación de producción.
- `npm run lint` – ESLint + reglas a11y/prettier.
- `npm run format` / `npm run format:fix` – verificación/aplicación de Prettier.
- `npm run test:unit` – Vitest + React Testing Library.
- `npm run test:e2e` – Playwright contra la UI real.
- `npm run storybook` / `npm run storybook:build` – documentación visual de componentes.
- `npm run check` – combo rápido para CI (lint + format + unit + listado e2e).

## Estructura relevante

- `src/styles/*` – tokens, reseteos y estilos globales alineados a la identidad UPB/Vinki.
- `src/theme/tokens.ts` – definición centralizada de paleta y tipografías que se inyecta a Ant Design.
- `src/lib/axe.ts` – habilita auditorías de accesibilidad en modo desarrollo usando `@axe-core/react`.
- `tests/e2e` – suites Playwright (corren contra el servidor Vite).
- `.storybook` – configuración con addons de accessibility, docs y links.

## Flujo de calidad

1. `lint-staged` + Husky (hook `pre-commit`) ejecutan ESLint/Prettier sobre cambios de `frontend/app`. Ejecuta `git config core.hooksPath .husky` una sola vez para habilitarlos tras clonar.
2. `npm run check` se usa en CI local o remoto para validar linting, formato y pruebas.
3. Playwright instala Chromium mediante `npx playwright install chromium` (ya ejecutado y documentado en lockfile).

## Estándares de UI

- Ant Design 6 como kit de componentes, + ConfigProvider con tokens custom.
- Tema inspirado en la UPB: tipografías Playfair Display + Space Grotesk, gradientes cálidos y cards elevadas.
- Accesibilidad básica habilitada (axe en desarrollo + addon a11y en Storybook).

> Para agregar módulos adicionales (dashboard, flujo de entrevista, etc.) crea rutas/páginas bajo `src/modules` reutilizando el tema definido aquí.
