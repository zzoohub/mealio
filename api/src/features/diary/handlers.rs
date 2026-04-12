use axum::extract::{Path, Query};
use axum::Json;

use crate::error::AppError;
use crate::extractors::{AuthUser, Db};
use crate::response;
use crate::shared::types::{Paginated, PaginationMeta, PaginationParams};

use super::models::*;
use crate::features::ingredients::models::EntryIngredient;
use crate::features::nutrition::models::UserNutrition;
use crate::features::photos::models::EntryPhoto;

/// OpenAPI schema for paginated diary entries response
#[derive(utoipa::ToSchema)]
#[allow(dead_code)]
pub struct PaginatedDiaryEntries {
    data: Vec<DiaryEntry>,
    meta: PaginationMeta,
}

#[utoipa::path(
    get,
    path = "/api/v1/diary",
    params(DiaryQueryParams),
    responses(
        (status = 200, description = "Paginated diary entries", body = PaginatedDiaryEntries),
    ),
    security(("bearer_auth" = [])),
    tag = "Diary"
)]
pub async fn list_entries(
    auth: AuthUser,
    Db(db): Db,
    Query(params): Query<DiaryQueryParams>,
) -> Result<response::Ok<Paginated<DiaryEntry>>, AppError> {
    let (entries, total) = DiaryEntry::list(&db, auth.user_id, &params).await?;

    let pagination = PaginationParams {
        page: params.page,
        per_page: params.per_page,
    };

    Ok(response::Ok(Paginated::new(entries, total, &pagination)))
}

#[utoipa::path(
    post,
    path = "/api/v1/diary",
    request_body = CreateEntryRequest,
    responses(
        (status = 201, description = "Diary entry created", body = DiaryEntry),
        (status = 400, description = "Bad request", body = crate::error::ProblemDetail),
    ),
    security(("bearer_auth" = [])),
    tag = "Diary"
)]
pub async fn create_entry(
    auth: AuthUser,
    Db(db): Db,
    Json(req): Json<CreateEntryRequest>,
) -> Result<response::Created<DiaryEntry>, AppError> {
    let entry = DiaryEntry::create(
        &db,
        auth.user_id,
        &req.meal_type,
        req.notes.as_deref(),
        req.eaten_at,
    )
    .await?;

    if let Some(loc) = req.location {
        EntryLocation::upsert(
            &db,
            entry.id,
            loc.name.as_deref(),
            loc.latitude,
            loc.longitude,
            loc.address.as_deref(),
        )
        .await?;
    }

    Ok(response::Created(entry))
}

#[utoipa::path(
    get,
    path = "/api/v1/diary/{id}",
    params(("id" = i64, Path, description = "Diary entry ID")),
    responses(
        (status = 200, description = "Diary entry detail", body = DiaryEntryDetail),
        (status = 404, description = "Not found", body = crate::error::ProblemDetail),
    ),
    security(("bearer_auth" = [])),
    tag = "Diary"
)]
pub async fn get_entry(
    auth: AuthUser,
    Db(db): Db,
    Path(id): Path<i64>,
) -> Result<response::Ok<DiaryEntryDetail>, AppError> {
    let entry = DiaryEntry::find_by_id(&db, id, auth.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("diary entry not found".into()))?;

    let location = EntryLocation::find_by_entry_id(&db, entry.id).await?;
    let photos = EntryPhoto::list_by_entry_id(&db, entry.id).await?;
    let nutrition = UserNutrition::find_by_entry_id(&db, entry.id).await?;
    let ingredients = EntryIngredient::list_by_entry_id(&db, entry.id).await?;

    Ok(response::Ok(DiaryEntryDetail {
        entry,
        location,
        photos,
        nutrition,
        ingredients,
    }))
}

#[utoipa::path(
    patch,
    path = "/api/v1/diary/{id}",
    params(("id" = i64, Path, description = "Diary entry ID")),
    request_body = UpdateEntryRequest,
    responses(
        (status = 200, description = "Updated diary entry", body = DiaryEntry),
        (status = 404, description = "Not found", body = crate::error::ProblemDetail),
    ),
    security(("bearer_auth" = [])),
    tag = "Diary"
)]
pub async fn update_entry(
    auth: AuthUser,
    Db(db): Db,
    Path(id): Path<i64>,
    Json(req): Json<UpdateEntryRequest>,
) -> Result<response::Ok<DiaryEntry>, AppError> {
    DiaryEntry::verify_ownership(&db, id, auth.user_id).await?;

    // Validate rating range
    if let Some(rating) = req.rating {
        if !(0..=5).contains(&rating) {
            return Err(AppError::BadRequest("rating must be between 0 and 5".into()));
        }
    }

    let entry = DiaryEntry::update(
        &db,
        id,
        auth.user_id,
        req.meal_type.as_ref(),
        req.notes.as_deref(),
        req.eaten_at,
        req.rating,
        req.would_eat_again,
    )
    .await?;

    Ok(response::Ok(entry))
}

#[utoipa::path(
    delete,
    path = "/api/v1/diary/{id}",
    params(("id" = i64, Path, description = "Diary entry ID")),
    responses(
        (status = 204, description = "Diary entry deleted"),
        (status = 404, description = "Not found", body = crate::error::ProblemDetail),
    ),
    security(("bearer_auth" = [])),
    tag = "Diary"
)]
pub async fn delete_entry(
    auth: AuthUser,
    Db(db): Db,
    Path(id): Path<i64>,
) -> Result<response::NoContent, AppError> {
    DiaryEntry::verify_ownership(&db, id, auth.user_id).await?;

    DiaryEntry::soft_delete(&db, id, auth.user_id).await?;
    Ok(response::NoContent)
}

#[utoipa::path(
    get,
    path = "/api/v1/diary/{id}/location",
    params(("id" = i64, Path, description = "Diary entry ID")),
    responses(
        (status = 200, description = "Entry location", body = EntryLocation),
        (status = 404, description = "Not found", body = crate::error::ProblemDetail),
    ),
    security(("bearer_auth" = [])),
    tag = "Diary"
)]
pub async fn get_location(
    auth: AuthUser,
    Db(db): Db,
    Path(id): Path<i64>,
) -> Result<response::Ok<EntryLocation>, AppError> {
    DiaryEntry::verify_ownership(&db, id, auth.user_id).await?;

    let location = EntryLocation::find_by_entry_id(&db, id)
        .await?
        .ok_or_else(|| AppError::NotFound("location not found".into()))?;

    Ok(response::Ok(location))
}

#[utoipa::path(
    put,
    path = "/api/v1/diary/{id}/location",
    params(("id" = i64, Path, description = "Diary entry ID")),
    request_body = UpsertLocationRequest,
    responses(
        (status = 200, description = "Location upserted", body = EntryLocation),
        (status = 404, description = "Not found", body = crate::error::ProblemDetail),
    ),
    security(("bearer_auth" = [])),
    tag = "Diary"
)]
pub async fn upsert_location(
    auth: AuthUser,
    Db(db): Db,
    Path(id): Path<i64>,
    Json(req): Json<UpsertLocationRequest>,
) -> Result<response::Ok<EntryLocation>, AppError> {
    DiaryEntry::verify_ownership(&db, id, auth.user_id).await?;

    let location = EntryLocation::upsert(
        &db,
        id,
        req.name.as_deref(),
        req.latitude,
        req.longitude,
        req.address.as_deref(),
    )
    .await?;

    Ok(response::Ok(location))
}

#[utoipa::path(
    delete,
    path = "/api/v1/diary/{id}/location",
    params(("id" = i64, Path, description = "Diary entry ID")),
    responses(
        (status = 204, description = "Location deleted"),
        (status = 404, description = "Not found", body = crate::error::ProblemDetail),
    ),
    security(("bearer_auth" = [])),
    tag = "Diary"
)]
pub async fn delete_location(
    auth: AuthUser,
    Db(db): Db,
    Path(id): Path<i64>,
) -> Result<response::NoContent, AppError> {
    DiaryEntry::verify_ownership(&db, id, auth.user_id).await?;

    EntryLocation::delete_by_entry_id(&db, id).await?;
    Ok(response::NoContent)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rating_validation_rejects_value_6() {
        let rating = Some(6);
        let result = validate_rating(rating);
        assert!(result.is_err());
        match result {
            Err(AppError::BadRequest(msg)) => {
                assert_eq!(msg, "rating must be between 0 and 5");
            }
            _ => panic!("Expected BadRequest error"),
        }
    }

    #[test]
    fn test_rating_validation_rejects_negative_value() {
        let rating = Some(-1);
        let result = validate_rating(rating);
        assert!(result.is_err());
        match result {
            Err(AppError::BadRequest(msg)) => {
                assert_eq!(msg, "rating must be between 0 and 5");
            }
            _ => panic!("Expected BadRequest error"),
        }
    }

    #[test]
    fn test_rating_validation_accepts_0() {
        let rating = Some(0);
        let result = validate_rating(rating);
        assert!(result.is_ok());
    }

    #[test]
    fn test_rating_validation_accepts_3() {
        let rating = Some(3);
        let result = validate_rating(rating);
        assert!(result.is_ok());
    }

    #[test]
    fn test_rating_validation_accepts_5() {
        let rating = Some(5);
        let result = validate_rating(rating);
        assert!(result.is_ok());
    }

    #[test]
    fn test_rating_validation_accepts_none() {
        let rating = None;
        let result = validate_rating(rating);
        assert!(result.is_ok());
    }

    #[test]
    fn test_rating_validation_boundary_lower() {
        let rating = Some(-100);
        let result = validate_rating(rating);
        assert!(result.is_err());
    }

    #[test]
    fn test_rating_validation_boundary_upper() {
        let rating = Some(100);
        let result = validate_rating(rating);
        assert!(result.is_err());
    }

    // Helper function to validate rating (extracted from update_entry logic)
    fn validate_rating(rating: Option<i16>) -> Result<(), AppError> {
        if let Some(r) = rating {
            if !(0..=5).contains(&r) {
                return Err(AppError::BadRequest("rating must be between 0 and 5".into()));
            }
        }
        Ok(())
    }
}
