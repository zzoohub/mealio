#!/bin/bash

# Mealio Server Development Setup Script
set -e

echo "🍽️  Setting up Mealio FastAPI Server for development..."

# Check if UV is installed
if ! command -v uv &> /dev/null; then
    echo "📦 Installing UV package manager..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    source $HOME/.cargo/env
fi

# Install dependencies
echo "📚 Installing Python dependencies..."
uv sync

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "⚙️  Creating environment file..."
    cp .env.example .env
    echo "✏️  Please edit .env with your configuration!"
fi

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "⚠️  PostgreSQL is not running. Please start PostgreSQL and create the database:"
    echo "   createdb mealio"
    echo "   psql -d mealio -c \"CREATE EXTENSION IF NOT EXISTS 'uuid-ossp';\""
    echo "   psql -d mealio -c \"CREATE EXTENSION IF NOT EXISTS 'postgis';\""
    echo "   psql -d mealio -c \"CREATE EXTENSION IF NOT EXISTS 'pg_trgm';\""
fi

# Check if Redis is running
if ! redis-cli ping > /dev/null 2>&1; then
    echo "⚠️  Redis is not running. Please start Redis:"
    echo "   redis-server"
fi

echo ""
echo "🎉 Setup complete! Next steps:"
echo "1. Edit .env with your database and service configuration"
echo "2. Run database migrations: uv run alembic upgrade head"
echo "3. Start the development server: uv run uvicorn src.main:app --reload"
echo ""
echo "📖 API Documentation will be available at:"
echo "   http://localhost:8000/docs"
echo ""
echo "🐳 Or run with Docker Compose:"
echo "   docker-compose up -d"
echo ""
