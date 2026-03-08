set dotenv-load := false

default:
    @just --list

# ─── Git ────────────────────────────────────────────────────────────

log:
    git log --graph --oneline --all --decorate --color -20

push type="chore" msg="":
    #!/usr/bin/env sh
    if [ -n "{{ msg }}" ]; then
        msg="{{ msg }}"
    else
        case "{{ type }}" in
            feat)     msg="feat: add new features and enhancements" ;;
            fix)      msg="fix: resolve bugs and minor issues" ;;
            docs)     msg="docs: update documentation and comments" ;;
            refactor) msg="refactor: clean up and improve code structure" ;;
            test)     msg="test: add and update test coverage" ;;
            ui)       msg="ui: update styles and visual changes" ;;
            *)        msg="chore: apply general updates and improvements" ;;
        esac
    fi
    git add . && git commit -m "$msg" && git push origin main

# ─── Mobile (React Native / Expo) ────────────────────────────────────────────

mobile-install:
    cd mobile && bun install

mobile-dev:
    cd mobile && bun start

mobile-ios:
    cd mobile && bun run ios

mobile-android:
    cd mobile && bun run android

mobile-lint:
    cd mobile && bun run lint

mobile-test *args:
    cd mobile && npx jest --no-cache {{ args }}

mobile-test-watch *args:
    cd mobile && npx jest --no-cache --watch {{ args }}

# ─── API (Rust / Axum) ───────────────────────────────────────────────────────

api-dev:
    cd api && cargo run

api-build:
    cd api && cargo build --release

api-test *args:
    cd api && cargo test {{ args }}

api-lint:
    cd api && cargo clippy -- -D warnings

api-fmt:
    cd api && cargo fmt

api-fmt-check:
    cd api && cargo fmt -- --check

api-sqlx-prepare:
    cd api && cargo sqlx prepare

# ─── Infra (Pulumi) ──────────────────────────────────────────────────────────

infra-install:
    cd infra && bun install

infra-preview:
    cd infra && pulumi preview

infra-up:
    cd infra && pulumi up

# ─── Quality ──────────────────────────────────────────────────────────────────

mobile-check: mobile-lint mobile-test

api-check: api-fmt-check api-lint api-test

# ─── Clean ────────────────────────────────────────────────────────────────────

mobile-clean:
    rm -rf mobile/node_modules/.cache

api-clean:
    cd api && cargo clean
