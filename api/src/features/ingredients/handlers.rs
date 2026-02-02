use axum::extract::{Path, Query};
use axum::Json;

use crate::error::AppError;
use crate::extractors::{AuthUser, Db};
use crate::features::diary::models::DiaryEntry;
use crate::response;
use crate::shared::types::{Paginated, PaginationMeta, PaginationParams};

use super::models::*;

/// Paginated ingredients response
#[derive(utoipa::ToSchema)]
#[allow(dead_code)]
pub struct PaginatedIngredients {
    data: Vec<Ingredient>,
    meta: PaginationMeta,
}

// Master ingredients

#[utoipa::path(
    get,
    path = "/api/v1/ingredients",
    params(IngredientSearchParams),
    responses(
        (status = 200, description = "Paginated ingredients", body = PaginatedIngredients),
    ),
    security(("bearer_auth" = [])),
    tag = "Ingredients"
)]
pub async fn search_ingredients(
    _auth: AuthUser,
    Db(db): Db,
    Query(params): Query<IngredientSearchParams>,
) -> Result<response::Ok<Paginated<Ingredient>>, AppError> {
    let (ingredients, total) = Ingredient::search(&db, &params).await?;

    let pagination = PaginationParams {
        page: params.page,
        per_page: params.per_page,
    };

    Ok(response::Ok(Paginated::new(ingredients, total, &pagination)))
}

#[utoipa::path(
    post,
    path = "/api/v1/ingredients",
    request_body = CreateIngredientRequest,
    responses(
        (status = 201, description = "Ingredient created", body = Ingredient),
    ),
    security(("bearer_auth" = [])),
    tag = "Ingredients"
)]
pub async fn create_ingredient(
    _auth: AuthUser,
    Db(db): Db,
    Json(req): Json<CreateIngredientRequest>,
) -> Result<response::Created<Ingredient>, AppError> {
    let ingredient = Ingredient::create(&db, &req.name, req.category.as_deref()).await?;
    Ok(response::Created(ingredient))
}

// Entry ingredients

#[utoipa::path(
    get,
    path = "/api/v1/diary/{entry_id}/ingredients",
    params(("entry_id" = i64, Path, description = "Diary entry ID")),
    responses(
        (status = 200, description = "Entry ingredients", body = Vec<EntryIngredientWithName>),
    ),
    security(("bearer_auth" = [])),
    tag = "Entry Ingredients"
)]
pub async fn list_entry_ingredients(
    auth: AuthUser,
    Db(db): Db,
    Path(entry_id): Path<i64>,
) -> Result<response::Ok<Vec<EntryIngredientWithName>>, AppError> {
    DiaryEntry::verify_ownership(&db, entry_id, auth.user_id).await?;
    let ingredients = EntryIngredient::list_by_entry_id(&db, entry_id).await?;
    Ok(response::Ok(ingredients))
}

#[utoipa::path(
    post,
    path = "/api/v1/diary/{entry_id}/ingredients",
    params(("entry_id" = i64, Path, description = "Diary entry ID")),
    request_body = LinkIngredientRequest,
    responses(
        (status = 201, description = "Ingredient linked", body = EntryIngredient),
    ),
    security(("bearer_auth" = [])),
    tag = "Entry Ingredients"
)]
pub async fn link_ingredient(
    auth: AuthUser,
    Db(db): Db,
    Path(entry_id): Path<i64>,
    Json(req): Json<LinkIngredientRequest>,
) -> Result<response::Created<EntryIngredient>, AppError> {
    DiaryEntry::verify_ownership(&db, entry_id, auth.user_id).await?;
    let entry_ingredient =
        EntryIngredient::link(&db, entry_id, req.ingredient_id, req.amount.as_deref(), req.unit.as_deref()).await?;
    Ok(response::Created(entry_ingredient))
}

#[utoipa::path(
    put,
    path = "/api/v1/diary/{entry_id}/ingredients",
    params(("entry_id" = i64, Path, description = "Diary entry ID")),
    request_body = SyncIngredientsRequest,
    responses(
        (status = 200, description = "Ingredients synced", body = Vec<EntryIngredientWithName>),
    ),
    security(("bearer_auth" = [])),
    tag = "Entry Ingredients"
)]
pub async fn sync_ingredients(
    auth: AuthUser,
    Db(db): Db,
    Path(entry_id): Path<i64>,
    Json(req): Json<SyncIngredientsRequest>,
) -> Result<response::Ok<Vec<EntryIngredientWithName>>, AppError> {
    DiaryEntry::verify_ownership(&db, entry_id, auth.user_id).await?;
    let ingredients = EntryIngredient::sync(&db, entry_id, &req.ingredients).await?;
    Ok(response::Ok(ingredients))
}

#[utoipa::path(
    delete,
    path = "/api/v1/diary/{entry_id}/ingredients/{ingredient_id}",
    params(
        ("entry_id" = i64, Path, description = "Diary entry ID"),
        ("ingredient_id" = i64, Path, description = "Ingredient ID"),
    ),
    responses(
        (status = 204, description = "Ingredient unlinked"),
    ),
    security(("bearer_auth" = [])),
    tag = "Entry Ingredients"
)]
pub async fn unlink_ingredient(
    auth: AuthUser,
    Db(db): Db,
    Path((entry_id, ingredient_id)): Path<(i64, i64)>,
) -> Result<response::NoContent, AppError> {
    DiaryEntry::verify_ownership(&db, entry_id, auth.user_id).await?;
    EntryIngredient::unlink(&db, entry_id, ingredient_id).await?;
    Ok(response::NoContent)
}
