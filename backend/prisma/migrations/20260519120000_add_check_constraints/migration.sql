-- Migración: restricciones CHECK de integridad de datos
-- Origen: Decisión QA #1 (qa/01-plan-maestro/decisiones_qa.md)
-- Requerimientos cubiertos: RNF-18, RNF-19, RNF-20 (docs/requerimientos.md)
--
-- Prisma no soporta restricciones CHECK de forma declarativa en el schema,
-- por lo que se aplican mediante esta migración SQL manual.
-- En PostgreSQL una restricción CHECK se satisface cuando la expresión
-- evalúa a TRUE o a NULL (desconocido); las columnas anulables siguen
-- admitiendo NULL sin necesidad de cláusulas adicionales.

-- RNF-18: las cinco dimensiones de evaluación deben estar en el rango [0, 5].
ALTER TABLE "answer_evaluations"
    ADD CONSTRAINT "chk_answer_evaluations_technical_correctness_range"
        CHECK ("technical_correctness" >= 0 AND "technical_correctness" <= 5),
    ADD CONSTRAINT "chk_answer_evaluations_clarity_of_explanation_range"
        CHECK ("clarity_of_explanation" >= 0 AND "clarity_of_explanation" <= 5),
    ADD CONSTRAINT "chk_answer_evaluations_communication_range"
        CHECK ("communication" >= 0 AND "communication" <= 5),
    ADD CONSTRAINT "chk_answer_evaluations_confidence_range"
        CHECK ("confidence" >= 0 AND "confidence" <= 5),
    ADD CONSTRAINT "chk_answer_evaluations_problem_solving_range"
        CHECK ("problem_solving" >= 0 AND "problem_solving" <= 5);

-- RNF-19: el puntaje agregado por habilidad debe estar en el rango [0, 100].
ALTER TABLE "user_skill_scores"
    ADD CONSTRAINT "chk_user_skill_scores_score_range"
        CHECK ("score" >= 0 AND "score" <= 100);

-- RNF-20: el número de orden de una pregunta dentro de una entrevista debe ser positivo.
ALTER TABLE "interview_questions"
    ADD CONSTRAINT "chk_interview_questions_order_number_positive"
        CHECK ("order_number" > 0);
