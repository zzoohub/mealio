use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

#[derive(Debug, Serialize, sqlx::FromRow, utoipa::ToSchema)]
pub struct Ingredient {
    pub id: i64,
    pub name: String,
    pub category: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct CreateIngredientRequest {
    pub name: String,
    pub category: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct IngredientSearchParams {
    pub q: Option<String>,
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

#[derive(Debug, Serialize, sqlx::FromRow, utoipa::ToSchema)]
pub struct EntryIngredient {
    pub id: i64,
    pub entry_id: i64,
    pub ingredient_id: i64,
    pub amount: Option<String>,
    pub unit: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, sqlx::FromRow, utoipa::ToSchema)]
pub struct EntryIngredientWithName {
    pub id: i64,
    pub entry_id: i64,
    pub ingredient_id: i64,
    pub ingredient_name: String,
    pub amount: Option<String>,
    pub unit: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct LinkIngredientRequest {
    pub ingredient_id: i64,
    pub amount: Option<String>,
    pub unit: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct SyncIngredientsRequest {
    pub ingredients: Vec<LinkIngredientRequest>,
}

impl Ingredient {
    pub async fn search(db: &PgPool, params: &IngredientSearchParams) -> Result<(Vec<Self>, i64), sqlx::Error> {
        let page = params.page.unwrap_or(1).max(1);
        let per_page = params.per_page.unwrap_or(20).clamp(1, 100);
        let offset = (page - 1) * per_page;

        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM ingredients
             WHERE ($1::text IS NULL OR name % $1 OR name ILIKE '%' || $1 || '%')",
        )
        .bind(&params.q)
        .fetch_one(db)
        .await?;

        let ingredients = sqlx::query_as::<_, Ingredient>(
            "SELECT id, name, category, created_at FROM ingredients
             WHERE ($1::text IS NULL OR name % $1 OR name ILIKE '%' || $1 || '%')
             ORDER BY CASE WHEN $1::text IS NOT NULL THEN similarity(name, $1) END DESC NULLS LAST, name
             LIMIT $2 OFFSET $3",
        )
        .bind(&params.q)
        .bind(per_page)
        .bind(offset)
        .fetch_all(db)
        .await?;

        Ok((ingredients, count.0))
    }

    pub async fn create(db: &PgPool, name: &str, category: Option<&str>) -> Result<Self, sqlx::Error> {
        sqlx::query_as::<_, Ingredient>(
            "INSERT INTO ingredients (name, category)
             VALUES ($1, $2)
             RETURNING id, name, category, created_at",
        )
        .bind(name)
        .bind(category)
        .fetch_one(db)
        .await
    }
}

impl EntryIngredient {
    pub async fn list_by_entry_id(db: &PgPool, entry_id: i64) -> Result<Vec<EntryIngredientWithName>, sqlx::Error> {
        sqlx::query_as::<_, EntryIngredientWithName>(
            "SELECT ei.id, ei.entry_id, ei.ingredient_id, i.name as ingredient_name, ei.amount, ei.unit, ei.created_at
             FROM entry_ingredients ei
             JOIN ingredients i ON i.id = ei.ingredient_id
             WHERE ei.entry_id = $1
             ORDER BY ei.created_at",
        )
        .bind(entry_id)
        .fetch_all(db)
        .await
    }

    pub async fn link(
        db: &PgPool,
        entry_id: i64,
        ingredient_id: i64,
        amount: Option<&str>,
        unit: Option<&str>,
    ) -> Result<Self, sqlx::Error> {
        sqlx::query_as::<_, EntryIngredient>(
            "INSERT INTO entry_ingredients (entry_id, ingredient_id, amount, unit)
             VALUES ($1, $2, $3, $4)
             RETURNING id, entry_id, ingredient_id, amount, unit, created_at",
        )
        .bind(entry_id)
        .bind(ingredient_id)
        .bind(amount)
        .bind(unit)
        .fetch_one(db)
        .await
    }

    pub async fn sync(
        db: &PgPool,
        entry_id: i64,
        ingredients: &[LinkIngredientRequest],
    ) -> Result<Vec<EntryIngredientWithName>, sqlx::Error> {
        let mut tx = db.begin().await?;

        sqlx::query("DELETE FROM entry_ingredients WHERE entry_id = $1")
            .bind(entry_id)
            .execute(&mut *tx)
            .await?;

        for ing in ingredients {
            sqlx::query(
                "INSERT INTO entry_ingredients (entry_id, ingredient_id, amount, unit) VALUES ($1, $2, $3, $4)",
            )
            .bind(entry_id)
            .bind(ing.ingredient_id)
            .bind(&ing.amount)
            .bind(&ing.unit)
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;

        Self::list_by_entry_id(db, entry_id).await
    }

    pub async fn unlink(db: &PgPool, entry_id: i64, ingredient_id: i64) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM entry_ingredients WHERE entry_id = $1 AND ingredient_id = $2")
            .bind(entry_id)
            .bind(ingredient_id)
            .execute(db)
            .await?;
        Ok(())
    }
}
