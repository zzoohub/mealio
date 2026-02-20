use bigdecimal::BigDecimal;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::str::FromStr;

use super::models::AiAnalysis;
use crate::features::photos::models::EntryPhoto;

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_PHOTO_BYTES: u64 = 20 * 1024 * 1024; // 20 MB
const MAX_PHOTOS_PER_ANALYSIS: usize = 5;

// =============================================================================
// GEMINI TYPES
// =============================================================================

#[derive(Debug, Serialize)]
struct GeminiRequest {
    contents: Vec<GeminiContent>,
    generation_config: GenerationConfig,
}

#[derive(Debug, Serialize)]
struct GeminiContent {
    parts: Vec<GeminiPart>,
}

#[derive(Debug, Serialize)]
#[serde(untagged)]
enum GeminiPart {
    Text {
        text: String,
    },
    InlineData {
        inline_data: InlineData,
    },
}

#[derive(Debug, Serialize)]
struct InlineData {
    mime_type: String,
    data: String,
}

#[derive(Debug, Serialize)]
struct GenerationConfig {
    response_mime_type: String,
    response_schema: serde_json::Value,
    temperature: f32,
}

#[derive(Debug, Deserialize)]
struct GeminiResponse {
    candidates: Option<Vec<GeminiCandidate>>,
}

#[derive(Debug, Deserialize)]
struct GeminiCandidate {
    content: GeminiCandidateContent,
}

#[derive(Debug, Deserialize)]
struct GeminiCandidateContent {
    parts: Vec<GeminiResponsePart>,
}

#[derive(Debug, Deserialize)]
struct GeminiResponsePart {
    text: Option<String>,
}

// =============================================================================
// ANALYSIS RESULT
// =============================================================================

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct AnalysisResult {
    calories: Option<f64>,
    protein: Option<f64>,
    fat: Option<f64>,
    carbs: Option<f64>,
    fiber: Option<f64>,
    sugar: Option<f64>,
    sodium: Option<f64>,
    description: Option<String>,
    confidence: Option<f64>,
    ingredients: Option<Vec<String>>,
    comment: Option<String>,
}

// =============================================================================
// PUBLIC API
// =============================================================================

pub async fn run_analysis(
    db: PgPool,
    http_client: reqwest::Client,
    api_key: String,
    model: String,
    r2_public_url: String,
    analysis_id: i64,
    entry_id: i64,
) {
    // Store only sanitized, user-safe error messages
    let user_error = match run_analysis_inner(&db, &http_client, &api_key, &model, &r2_public_url, analysis_id, entry_id).await {
        Ok(()) => return,
        Err(e) => {
            tracing::error!(analysis_id, entry_id, error = %e, "AI analysis failed");
            sanitize_error(&e.to_string())
        }
    };

    if let Err(db_err) = AiAnalysis::mark_failed(&db, analysis_id, &user_error).await {
        tracing::error!(analysis_id, error = %db_err, "failed to mark analysis as failed");
    }
}

async fn run_analysis_inner(
    db: &PgPool,
    http_client: &reqwest::Client,
    api_key: &str,
    model: &str,
    r2_public_url: &str,
    analysis_id: i64,
    entry_id: i64,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // 1. Mark as processing
    AiAnalysis::mark_processing(db, analysis_id).await?;

    // 2. Get photo URLs (capped)
    let photos = EntryPhoto::list_by_entry_id(db, entry_id).await?;
    if photos.is_empty() {
        return Err("no photos found for entry".into());
    }

    let photos = if photos.len() > MAX_PHOTOS_PER_ANALYSIS {
        tracing::warn!(entry_id, count = photos.len(), max = MAX_PHOTOS_PER_ANALYSIS, "capping photos for analysis");
        &photos[..MAX_PHOTOS_PER_ANALYSIS]
    } else {
        &photos
    };

    // 3. Download photos and encode as base64
    let mut image_parts = Vec::new();
    for photo in photos {
        // SSRF protection: validate URL against R2 public URL prefix
        validate_photo_url(&photo.url, r2_public_url)?;

        let response = http_client.get(&photo.url).send().await?;

        // Size cap: reject photos larger than MAX_PHOTO_BYTES
        if let Some(len) = response.content_length() {
            if len > MAX_PHOTO_BYTES {
                return Err("photo too large for analysis".into());
            }
        }

        let bytes = response.bytes().await?;
        if bytes.len() as u64 > MAX_PHOTO_BYTES {
            return Err("photo too large for analysis".into());
        }

        let b64 = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &bytes);

        let mime_type = guess_mime_type(&photo.url);
        image_parts.push(GeminiPart::InlineData {
            inline_data: InlineData {
                mime_type,
                data: b64,
            },
        });
    }

    // 4. Build Gemini request
    let mut parts = image_parts;
    parts.push(GeminiPart::Text {
        text: ANALYSIS_PROMPT.to_string(),
    });

    let request = GeminiRequest {
        contents: vec![GeminiContent { parts }],
        generation_config: GenerationConfig {
            response_mime_type: "application/json".to_string(),
            response_schema: response_schema(),
            temperature: 0.1,
        },
    };

    // 5. Call Gemini API (key in header, not URL)
    let url = format!("https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent");

    let resp = http_client
        .post(url)
        .header("x-goog-api-key", api_key)
        .json(&request)
        .send()
        .await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        tracing::error!(analysis_id, %status, body = %body, "Gemini API error");
        return Err(format!("Gemini API returned status {}", status.as_u16()).into());
    }

    let gemini_resp: GeminiResponse = resp.json().await?;

    // 6. Parse response
    let text = gemini_resp
        .candidates
        .as_ref()
        .and_then(|c| c.first())
        .and_then(|c| c.content.parts.first())
        .and_then(|p| p.text.as_ref())
        .ok_or("no text in Gemini response")?;

    let result: AnalysisResult = serde_json::from_str(text)?;
    let raw_response: serde_json::Value = serde_json::from_str(text)?;

    tracing::info!(
        analysis_id, entry_id,
        calories = ?result.calories,
        protein = ?result.protein,
        fat = ?result.fat,
        carbs = ?result.carbs,
        fiber = ?result.fiber,
        sugar = ?result.sugar,
        sodium = ?result.sodium,
        description = ?result.description,
        "Gemini analysis parsed"
    );

    // 7. Convert to BigDecimal and mark completed
    let calories = result.calories.map(|v| BigDecimal::from_str(&format!("{:.2}", v)).unwrap_or_default());
    let protein = result.protein.map(|v| BigDecimal::from_str(&format!("{:.2}", v)).unwrap_or_default());
    let fat = result.fat.map(|v| BigDecimal::from_str(&format!("{:.2}", v)).unwrap_or_default());
    let carbs = result.carbs.map(|v| BigDecimal::from_str(&format!("{:.2}", v)).unwrap_or_default());
    let fiber = result.fiber.map(|v| BigDecimal::from_str(&format!("{:.2}", v)).unwrap_or_default());
    let sugar = result.sugar.map(|v| BigDecimal::from_str(&format!("{:.2}", v)).unwrap_or_default());
    let sodium = result.sodium.map(|v| BigDecimal::from_str(&format!("{:.2}", v)).unwrap_or_default());
    let confidence = result.confidence.map(|v| BigDecimal::from_str(&format!("{:.2}", v)).unwrap_or_default());

    let rows = AiAnalysis::mark_completed(
        db,
        analysis_id,
        calories.as_ref(),
        protein.as_ref(),
        fat.as_ref(),
        carbs.as_ref(),
        fiber.as_ref(),
        sugar.as_ref(),
        sodium.as_ref(),
        result.description.as_deref(),
        confidence.as_ref(),
        Some(&raw_response),
    )
    .await?;

    tracing::info!(analysis_id, entry_id, rows_affected = rows, "AI analysis completed successfully");
    Ok(())
}

// =============================================================================
// HELPERS
// =============================================================================

fn validate_photo_url(url: &str, r2_public_url: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    if r2_public_url.is_empty() {
        return Err("R2 public URL not configured".into());
    }

    let normalized_prefix = r2_public_url.trim_end_matches('/');
    if !url.starts_with(normalized_prefix) {
        tracing::warn!(url, "photo URL does not match R2 public URL prefix");
        return Err("photo URL not in allowed storage domain".into());
    }

    Ok(())
}

fn sanitize_error(error: &str) -> String {
    // Map internal errors to user-safe messages
    if error.contains("photo too large") {
        "Photo too large for analysis".to_string()
    } else if error.contains("no photos") {
        "No photos found for this entry".to_string()
    } else if error.contains("Gemini API returned status") {
        "AI service temporarily unavailable".to_string()
    } else if error.contains("not in allowed storage domain") {
        "Invalid photo URL".to_string()
    } else {
        "Analysis failed, please try again".to_string()
    }
}

fn guess_mime_type(url: &str) -> String {
    let lower = url.to_lowercase();
    if lower.ends_with(".png") {
        "image/png".to_string()
    } else if lower.ends_with(".webp") {
        "image/webp".to_string()
    } else if lower.ends_with(".heic") {
        "image/heic".to_string()
    } else {
        "image/jpeg".to_string()
    }
}

fn response_schema() -> serde_json::Value {
    serde_json::json!({
        "type": "OBJECT",
        "properties": {
            "calories": { "type": "NUMBER", "description": "Total estimated calories (kcal)" },
            "protein": { "type": "NUMBER", "description": "Protein in grams" },
            "fat": { "type": "NUMBER", "description": "Fat in grams" },
            "carbs": { "type": "NUMBER", "description": "Carbohydrates in grams" },
            "fiber": { "type": "NUMBER", "description": "Fiber in grams" },
            "sugar": { "type": "NUMBER", "description": "Sugar in grams" },
            "sodium": { "type": "NUMBER", "description": "Sodium in milligrams" },
            "description": { "type": "STRING", "description": "Brief description of the meal" },
            "confidence": { "type": "NUMBER", "description": "Confidence score 0.0-1.0" },
            "ingredients": {
                "type": "ARRAY",
                "items": { "type": "STRING" },
                "description": "List of detected ingredients"
            },
            "comment": { "type": "STRING", "description": "A short witty one-liner comment about the meal in the same language as the meal's cultural origin (Korean food → Korean, Western food → English, etc.)" }
        },
        "required": ["calories", "protein", "fat", "carbs", "description", "confidence", "ingredients", "comment"]
    })
}

const ANALYSIS_PROMPT: &str = r#"Analyze this meal photo and estimate its nutritional content. Provide:
1. Estimated calories (kcal), protein (g), fat (g), carbs (g), fiber (g), sugar (g), sodium (mg)
2. A brief description of what the meal is
3. A confidence score from 0.0 to 1.0
4. A list of detected ingredients
5. A short witty one-liner comment about the meal (in the same language as the meal's cultural origin - Korean food in Korean, Japanese food in Japanese, Western food in English, etc.)

Be as accurate as possible with the nutrition estimates based on typical portion sizes visible in the photo."#;
