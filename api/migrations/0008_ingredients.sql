CREATE TABLE ingredients (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ingredients_name_trgm ON ingredients USING gin (name gin_trgm_ops);

CREATE TABLE entry_ingredients (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entry_id BIGINT NOT NULL REFERENCES diary_entries(id) ON DELETE CASCADE,
    ingredient_id BIGINT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    amount TEXT,
    unit TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (entry_id, ingredient_id)
);

CREATE INDEX idx_entry_ingredients_entry_id ON entry_ingredients(entry_id);
CREATE INDEX idx_entry_ingredients_ingredient_id ON entry_ingredients(ingredient_id);
