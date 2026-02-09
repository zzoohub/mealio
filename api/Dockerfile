FROM rust:1.92-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y pkg-config libssl-dev curl && rm -rf /var/lib/apt/lists/*
COPY Cargo.toml Cargo.lock ./
COPY src src
COPY migrations migrations
COPY .sqlx .sqlx
ENV SQLX_OFFLINE=true
RUN cargo build --release

FROM debian:trixie-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/* \
    && useradd -m -u 1001 appuser
WORKDIR /app
COPY --from=builder --chown=appuser:appuser /app/target/release/mealio-api /usr/local/bin/app
COPY --from=builder --chown=appuser:appuser /app/migrations ./migrations
USER appuser
ENV PORT=8080
EXPOSE 8080
CMD ["app"]
