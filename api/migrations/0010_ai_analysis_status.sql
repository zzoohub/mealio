ALTER TABLE ai_analyses
  ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  ADD COLUMN error_message TEXT;

CREATE INDEX idx_ai_analyses_status ON ai_analyses(status)
  WHERE status IN ('pending', 'processing');
