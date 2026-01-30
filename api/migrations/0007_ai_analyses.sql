CREATE TABLE ai_analyses (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entry_id BIGINT NOT NULL REFERENCES diary_entries(id) ON DELETE CASCADE,
    calories NUMERIC(8, 2),
    protein_grams NUMERIC(8, 2),
    fat_grams NUMERIC(8, 2),
    carbs_grams NUMERIC(8, 2),
    fiber_grams NUMERIC(8, 2),
    sugar_grams NUMERIC(8, 2),
    sodium_mg NUMERIC(8, 2),
    description TEXT,
    confidence_score NUMERIC(3, 2),
    raw_response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_analyses_entry_id ON ai_analyses(entry_id);
