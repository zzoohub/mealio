CREATE TABLE diary_entries (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meal_type meal_type NOT NULL,
    notes TEXT,
    rating SMALLINT,
    would_eat_again BOOLEAN,
    eaten_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_diary_entries_rating CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5))
);

CREATE INDEX idx_diary_entries_user_id ON diary_entries(user_id);
CREATE INDEX idx_diary_entries_eaten_at ON diary_entries(user_id, eaten_at);
CREATE INDEX idx_diary_entries_meal_type ON diary_entries(user_id, meal_type);

CREATE TABLE entry_locations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entry_id BIGINT NOT NULL UNIQUE REFERENCES diary_entries(id) ON DELETE CASCADE,
    name TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
