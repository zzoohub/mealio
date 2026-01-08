#!/bin/bash

# Show the project structure
echo "🍽️  Mealio FastAPI Server - Project Structure"
echo "=============================================="
echo ""

tree -I '__pycache__|*.pyc|.git|.env|node_modules|venv|.venv|.uv' . || ls -la

echo ""
echo "📊 Project Statistics:"
echo "====================="

# Count Python files
py_files=$(find src -name "*.py" | wc -l)
echo "Python files: $py_files"

# Count lines of code
if command -v cloc &> /dev/null; then
    echo ""
    cloc src/ --exclude-dir=__pycache__
else
    total_lines=$(find src -name "*.py" -exec wc -l {} + | tail -1 | awk '{print $1}')
    echo "Total lines of code: $total_lines"
fi

echo ""
echo "📁 Key Directories:"
echo "=================="
echo "src/auth/          - Authentication domain (phone auth, JWT, sessions)"
echo "src/meals/         - Meal tracking domain (CRUD, photos, AI analysis)"
echo "src/social/        - Social features domain (posts, likes, follows)"
echo "src/users/         - User preferences domain (settings, goals)"
echo "src/core/          - Core utilities (uploads, middleware)"
echo "alembic/           - Database migrations"
echo "scripts/           - Development and deployment scripts"
echo ""
echo "🚀 To get started:"
echo "=================="
echo "1. Run: ./scripts/dev-setup.sh"
echo "2. Edit .env with your configuration"
echo "3. Run: uv run alembic upgrade head"
echo "4. Run: uv run uvicorn src.main:app --reload"
echo ""
