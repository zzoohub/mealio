ALTER TABLE diary_entries
    ADD COLUMN rating SMALLINT,
    ADD COLUMN would_eat_again BOOLEAN;

ALTER TABLE diary_entries
    ADD CONSTRAINT chk_diary_entries_rating CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5));
