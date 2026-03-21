-- Create HNSW index for semantic search on questions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_embedding_hnsw
ON questions USING hnsw (embedding vector_cosine_ops)
WITH (m = 8, ef_construction = 128);
