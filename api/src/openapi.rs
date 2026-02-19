use utoipa::openapi::security::{Http, HttpAuthScheme, SecurityScheme};
use utoipa::{Modify, OpenApi};

#[derive(OpenApi)]
#[openapi(
    info(
        title = "Mealio API",
        version = "1.0.0",
        description = "Meal tracking application API",
    ),
    paths(
        // Auth
        crate::features::auth::handlers::sign_in,
        crate::features::auth::handlers::refresh,
        crate::features::auth::handlers::revoke,
        // Users
        crate::features::users::handlers::get_me,
        crate::features::users::handlers::update_me,
        crate::features::users::handlers::delete_me,
        crate::features::users::handlers::get_settings,
        crate::features::users::handlers::update_settings,
        // Diary
        crate::features::diary::handlers::list_entries,
        crate::features::diary::handlers::create_entry,
        crate::features::diary::handlers::get_entry,
        crate::features::diary::handlers::update_entry,
        crate::features::diary::handlers::delete_entry,
        crate::features::diary::handlers::get_location,
        crate::features::diary::handlers::upsert_location,
        crate::features::diary::handlers::delete_location,
        // Photos
        crate::features::photos::handlers::list_photos,
        crate::features::photos::handlers::create_photo,
        crate::features::photos::handlers::update_photo,
        crate::features::photos::handlers::delete_photo,
        crate::features::photos::handlers::set_primary_photo,
        // Ingredients
        crate::features::ingredients::handlers::search_ingredients,
        crate::features::ingredients::handlers::create_ingredient,
        crate::features::ingredients::handlers::list_entry_ingredients,
        crate::features::ingredients::handlers::link_ingredient,
        crate::features::ingredients::handlers::sync_ingredients,
        crate::features::ingredients::handlers::unlink_ingredient,
        // Nutrition
        crate::features::nutrition::handlers::get_nutrition,
        crate::features::nutrition::handlers::upsert_nutrition,
        crate::features::nutrition::handlers::delete_nutrition,
        // AI Analysis
        crate::features::ai_analyses::handlers::get_analysis,
        crate::features::ai_analyses::handlers::trigger_analysis,
        // Statistics
        crate::features::statistics::handlers::nutrition_stats,
        crate::features::statistics::handlers::meal_type_stats,
        crate::features::statistics::handlers::top_ingredients,
        crate::features::statistics::handlers::overview,
        // Uploads
        crate::features::uploads::handlers::presign,
    ),
    components(
        schemas(
            crate::error::ProblemDetail,
            crate::shared::types::PaginationMeta,
            crate::shared::types::MealType,
            // Auth
            crate::features::auth::models::SignInRequest,
            crate::features::auth::models::AuthResponse,
            crate::features::auth::models::UserInfo,
            crate::features::auth::models::RefreshRequest,
            crate::features::auth::models::RefreshResponse,
            crate::features::auth::models::RevokeRequest,
            // Users
            crate::features::users::models::User,
            crate::features::users::models::UpdateUserRequest,
            crate::features::users::models::UserSettings,
            crate::features::users::models::UpdateSettingsRequest,
            // Diary
            crate::features::diary::models::DiaryEntry,
            crate::features::diary::models::DiaryEntryDetail,
            crate::features::diary::models::CreateEntryRequest,
            crate::features::diary::models::CreateLocationInput,
            crate::features::diary::models::UpdateEntryRequest,
            crate::features::diary::models::EntryLocation,
            crate::features::diary::models::UpsertLocationRequest,
            crate::features::diary::handlers::PaginatedDiaryEntries,
            // Photos
            crate::features::photos::models::EntryPhoto,
            crate::features::photos::models::CreatePhotoRequest,
            crate::features::photos::models::UpdatePhotoRequest,
            // Ingredients
            crate::features::ingredients::models::Ingredient,
            crate::features::ingredients::models::CreateIngredientRequest,
            crate::features::ingredients::models::EntryIngredient,
            crate::features::ingredients::models::EntryIngredientWithName,
            crate::features::ingredients::models::LinkIngredientRequest,
            crate::features::ingredients::models::SyncIngredientsRequest,
            crate::features::ingredients::handlers::PaginatedIngredients,
            // Nutrition
            crate::features::nutrition::models::UserNutrition,
            crate::features::nutrition::models::UpsertNutritionRequest,
            // AI Analysis
            crate::features::ai_analyses::models::AiAnalysis,
            crate::features::ai_analyses::models::CreateAnalysisRequest,
            // Statistics
            crate::features::statistics::handlers::NutritionStats,
            crate::features::statistics::handlers::MealTypeCount,
            crate::features::statistics::handlers::TopIngredient,
            crate::features::statistics::handlers::Overview,
            // Uploads
            crate::features::uploads::models::PresignRequest,
            crate::features::uploads::models::PresignResponse,
        ),
    ),
    modifiers(&SecurityAddon),
    tags(
        (name = "Auth", description = "Authentication endpoints"),
        (name = "Users", description = "User profile and settings"),
        (name = "Diary", description = "Meal diary entries and locations"),
        (name = "Photos", description = "Entry photos"),
        (name = "Ingredients", description = "Master ingredients catalog"),
        (name = "Entry Ingredients", description = "Diary entry ingredient links"),
        (name = "Nutrition", description = "User nutrition data"),
        (name = "AI Analysis", description = "AI-generated nutrition analysis via Gemini 2.0 Flash"),
        (name = "Statistics", description = "Statistics and analytics"),
        (name = "Uploads", description = "File upload presigned URLs"),
    ),
)]
pub struct ApiDoc;

struct SecurityAddon;

impl Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        if let Some(components) = openapi.components.as_mut() {
            let mut http = Http::new(HttpAuthScheme::Bearer);
            http.bearer_format = Some("JWT".to_string());
            components.add_security_scheme("bearer_auth", SecurityScheme::Http(http));
        }
    }
}
