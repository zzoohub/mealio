-- updated_at trigger function
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON diary_entries
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON entry_locations
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON entry_photos
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON user_nutrition
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Max 10 photos per entry trigger
CREATE OR REPLACE FUNCTION check_max_photos()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM entry_photos WHERE entry_id = NEW.entry_id) >= 10 THEN
        RAISE EXCEPTION 'Maximum 10 photos per entry' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_max_photos BEFORE INSERT ON entry_photos
    FOR EACH ROW EXECUTE FUNCTION check_max_photos();

-- Auto-create user_settings on user insert
CREATE OR REPLACE FUNCTION auto_create_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_settings (user_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_user_settings AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION auto_create_user_settings();
