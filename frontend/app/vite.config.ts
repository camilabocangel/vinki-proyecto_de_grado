/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    host: true,
    watch: {
      usePolling: true,
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    // Pool: threads es más estable en Windows que forks (los workers fork no
    // arrancan dentro del timeout cuando jsdom + jest-dom + RTL hacen un
    // setup pesado). En Linux/macOS los threads también funcionan correctamente.
    pool: 'threads',
    // Timeouts amplios: en suite global con muchos archivos, jsdom + RTL
    // + antd + i18next acumulan setup, y `userEvent.type` es de por sí
    // lento. Los tests de pages auth/interview que tipean en formularios
    // tocan 8–10 s aislados; en suite global pueden necesitar más margen.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage/unit',
      reporter: ['text', 'lcov', 'html', 'json-summary'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests/**',
        'src/test/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
        '**/*.d.ts',
        '**/*.stories.{ts,tsx}',
        'src/i18n/**',
        'src/assets/**',
        'src/stories/**',
        'src/theme/**',
        'src/api/generated.ts',
        // ---- Diferidos (D-5 / D-7) — features fuera de los 42 RF declarados.
        // Ver qa/01-plan-maestro/diferidos_qa.md para la justificación
        // detallada de cada exclusión.
        'src/pages/admin/AdminAnalyticsPage.tsx', // D-7 (analytics no en RF)
        'src/pages/challenges/**', // D-7 (gamificación)
        'src/pages/dashboard/AchievementsPage.tsx', // D-7 (gamificación)
        'src/pages/dashboard/CareerInsightsPage.tsx', // D-7 (career prediction)
        'src/pages/dashboard/StudyPlanPage.tsx', // no en RF
        'src/pages/feedback/SharedReportPage.tsx', // D-7 (shared report)
        'src/pages/recruiter/**', // no en RF (perfil recruiter sin RF declarado)
        'src/pages/home/HomePage.tsx', // landing pública sin RF directo
        'src/components/GlobalSearch.tsx', // command-palette, no en RF
        'src/components/ThemeProvider.tsx', // theming, no en RF
        'src/hooks/useRateLimit.ts', // no en RF
        'src/hooks/useSSE.ts', // SSE → notifications (D-7)
        'src/lib/axe.ts', // dev-only accessibility helper
        // ---- Reclasificados a E2E (Decisión D-8) — archivos >500 LOC que
        // orquestan flujos completos de usuario. Se validan en Playwright
        // (Fase 4). Los specs *.test.tsx existentes NO se eliminan: siguen
        // ejecutándose como red de seguridad de render inicial. Solo el
        // código fuente deja de contar para la cobertura unitaria.
        'src/pages/interview/InterviewWizardPage.tsx', // Reclasificado a E2E por D-8 → TC-E-01
        'src/pages/interview/InterviewSessionPage.tsx', // Reclasificado a E2E por D-8 → TC-E-02
        'src/pages/feedback/FeedbackPage.tsx', // Reclasificado a E2E por D-8 → TC-E-03
        'src/pages/feedback/FeedbackHistoryPage.tsx', // Reclasificado a E2E por D-8 → TC-E-04
        'src/pages/dashboard/DashboardPage.tsx', // Reclasificado a E2E por D-8 → TC-E-05
        'src/pages/profile/ProfilePage.tsx', // Reclasificado a E2E por D-8 → TC-E-06
        'src/pages/knowledge/KnowledgeBasePage.tsx', // Reclasificado a E2E por D-8 → TC-E-07
        'src/pages/admin/AdminQuestionsPage.tsx', // Reclasificado a E2E por D-8 → TC-E-08
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
})
