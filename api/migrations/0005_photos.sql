CREATE TABLE entry_photos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entry_id BIGINT NOT NULL REFERENCES diary_entries(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    caption TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_entry_photos_entry_id ON entry_photos(entry_id);

-- Only one primary photo per entry
CREATE UNIQUE INDEX idx_entry_photos_primary
    ON entry_photos(entry_id)
    WHERE is_primary = true;
