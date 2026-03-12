-- PostgreSQL schema and seed data generated from docs/dbDiagram.txt
-- Run with: psql -f docs/db.sql

BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;

-- === Schema ================================================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS languages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS frameworks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    language_id INT NOT NULL REFERENCES languages(id)
);

CREATE TABLE IF NOT EXISTS levels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS skills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    question_text TEXT NOT NULL,
    type VARCHAR(80) NOT NULL,
    source VARCHAR(120),
    language_id INT NOT NULL REFERENCES languages(id),
    framework_id INT REFERENCES frameworks(id),
    level_id INT NOT NULL REFERENCES levels(id),
    skill_id INT NOT NULL REFERENCES skills(id),
    embedding vector(3),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interviews (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    role_id INT NOT NULL REFERENCES roles(id),
    language_id INT REFERENCES languages(id),
    framework_id INT REFERENCES frameworks(id),
    chosen_level_id INT NOT NULL REFERENCES levels(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS interview_questions (
    id SERIAL PRIMARY KEY,
    interview_id INT NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    question_id INT NOT NULL REFERENCES questions(id),
    question_text_snapshot TEXT NOT NULL,
    order_number INT NOT NULL CHECK (order_number > 0),
    generated_by_ai BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS answers (
    id SERIAL PRIMARY KEY,
    interview_question_id INT NOT NULL REFERENCES interview_questions(id) ON DELETE CASCADE,
    answer_text TEXT,
    audio_url VARCHAR(500),
    answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS answer_evaluations (
    id SERIAL PRIMARY KEY,
    answer_id INT NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
    technical_correctness REAL CHECK (technical_correctness BETWEEN 0 AND 5),
    clarity_of_explanation REAL CHECK (clarity_of_explanation BETWEEN 0 AND 5),
    communication REAL CHECK (communication BETWEEN 0 AND 5),
    confidence REAL CHECK (confidence BETWEEN 0 AND 5),
    problem_solving REAL CHECK (problem_solving BETWEEN 0 AND 5),
    detected_level_id INT REFERENCES levels(id),
    feedback_text TEXT,
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_skill_scores (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id INT NOT NULL REFERENCES skills(id),
    score REAL NOT NULL CHECK (score BETWEEN 0 AND 100),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_frameworks_language_id ON frameworks(language_id);
CREATE INDEX IF NOT EXISTS idx_questions_language_id ON questions(language_id);
CREATE INDEX IF NOT EXISTS idx_questions_framework_id ON questions(framework_id);
CREATE INDEX IF NOT EXISTS idx_questions_level_id ON questions(level_id);
CREATE INDEX IF NOT EXISTS idx_questions_skill_id ON questions(skill_id);
CREATE INDEX IF NOT EXISTS idx_interviews_user_id ON interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_questions_interview_id ON interview_questions(interview_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(interview_question_id);
CREATE INDEX IF NOT EXISTS idx_answer_eval_answer_id ON answer_evaluations(answer_id);
CREATE INDEX IF NOT EXISTS idx_user_skill_scores_user ON user_skill_scores(user_id);

-- === Seed data =============================================================

TRUNCATE TABLE
    answer_evaluations,
    answers,
    interview_questions,
    interviews,
    questions,
    user_skill_scores,
    frameworks,
    skills,
    levels,
    languages,
    roles,
    users
RESTART IDENTITY CASCADE;

INSERT INTO roles (name) VALUES
    ('Backend Engineer'),
    ('Fullstack Engineer');

INSERT INTO languages (name) VALUES
    ('JavaScript'),
    ('Python');

INSERT INTO frameworks (name, language_id) VALUES
    ('Node.js', 1),
    ('React', 1),
    ('Django', 2);

INSERT INTO levels (name) VALUES
    ('Junior'),
    ('Mid'),
    ('Senior');

INSERT INTO skills (name) VALUES
    ('Algorithms'),
    ('System Design'),
    ('Communication');

INSERT INTO users (name, email, password_hash) VALUES
    ('Ana García', 'ana@example.com', 'hashed_pw_ana'),
    ('Luis Pérez', 'luis@example.com', 'hashed_pw_luis');

INSERT INTO questions (question_text, type, source, language_id, framework_id, level_id, skill_id, embedding)
VALUES
    ('Explica cómo funciona el event loop en Node.js.', 'open', 'curated', 1, 1, 2, 1, '[0.10, 0.20, 0.30]'),
    ('¿Cómo escalarías una API REST construida con Django?', 'open', 'community', 2, 3, 3, 2, '[0.30, 0.20, 0.10]'),
    ('Da un ejemplo de retroalimentación efectiva durante una entrevista técnica.', 'behavioral', 'internal', 1, 2, 1, 3, '[0.15, 0.25, 0.35]');

INSERT INTO interviews (user_id, role_id, language_id, framework_id, chosen_level_id, started_at, finished_at)
VALUES
    (1, 1, 1, 1, 2, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '45 minutes'),
    (2, 2, 2, 3, 3, NOW() - INTERVAL '1 day', NULL);

INSERT INTO interview_questions (interview_id, question_id, question_text_snapshot, order_number, generated_by_ai)
VALUES
    (1, 1, 'Explica cómo funciona el event loop en Node.js.', 1, TRUE),
    (1, 3, 'Da un ejemplo de retroalimentación efectiva durante una entrevista técnica.', 2, FALSE),
    (2, 2, '¿Cómo escalarías una API REST construida con Django?', 1, TRUE);

INSERT INTO answers (interview_question_id, answer_text, audio_url, answered_at)
VALUES
    (1, 'El event loop procesa las colas de callbacks y maneja operaciones no bloqueantes.', 'https://cdn.example.com/audio/answer1.mp3', NOW() - INTERVAL '2 days'),
    (2, 'Comenzaría destacando observaciones específicas y sugerencias accionables.', NULL, NOW() - INTERVAL '2 days' + INTERVAL '5 minutes'),
    (3, 'Usaría auto-escalado, caching y separación de servicios en Django.', 'https://cdn.example.com/audio/answer3.mp3', NOW() - INTERVAL '1 day');

INSERT INTO answer_evaluations (answer_id, technical_correctness, clarity_of_explanation, communication, confidence, problem_solving, detected_level_id, feedback_text)
VALUES
    (1, 4.5, 4.0, 4.2, 4.1, 4.3, 2, 'Muy buen entendimiento del modelo asíncrono.'),
    (2, 0.0, 4.8, 4.9, 4.7, 4.5, 1, 'Excelente ejemplo de feedback claro.'),
    (3, 4.2, 3.9, 3.8, 4.0, 4.4, 3, 'Presenta una buena estrategia de escalabilidad.');

INSERT INTO user_skill_scores (user_id, skill_id, score)
VALUES
    (1, 1, 78.5),
    (1, 3, 88.0),
    (2, 2, 91.3);

COMMIT;
