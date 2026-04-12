use std::time::Duration;

// =============================================================================
// DATABASE
// =============================================================================

pub const DB_MAX_CONNECTIONS: u32 = 10;
pub const DB_ACQUIRE_TIMEOUT: Duration = Duration::from_secs(3);

// =============================================================================
// HTTP
// =============================================================================

pub const HTTP_CLIENT_TIMEOUT: Duration = Duration::from_secs(60);
pub const REQUEST_TIMEOUT: Duration = Duration::from_secs(30);

// =============================================================================
// AUTH / JWKS
// =============================================================================

pub const JWKS_CACHE_TTL: Duration = Duration::from_secs(3600);

// =============================================================================
// RATE LIMITING
// =============================================================================

/// Auth endpoints: 10 requests/minute (1 token every 6s, burst of 10)
pub const RATE_LIMIT_AUTH_PER_SECOND: u64 = 6;
pub const RATE_LIMIT_AUTH_BURST: u32 = 10;

/// Global: 60 requests/minute (1 token/s, burst of 60)
pub const RATE_LIMIT_GLOBAL_PER_SECOND: u64 = 1;
pub const RATE_LIMIT_GLOBAL_BURST: u32 = 60;

// =============================================================================
// PAGINATION
// =============================================================================

pub const DEFAULT_PAGE_SIZE: i64 = 20;
pub const MAX_PAGE_SIZE: i64 = 100;

// =============================================================================
// INGREDIENTS
// =============================================================================

pub const MAX_INGREDIENTS_PER_SYNC: usize = 100;

// =============================================================================
// AI ANALYSIS RECOVERY
// =============================================================================

/// Mark analyses stuck longer than this (in minutes) as failed on startup
pub const STUCK_ANALYSIS_THRESHOLD_MINUTES: i32 = 5;
