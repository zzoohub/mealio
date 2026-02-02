use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

impl PaginationParams {
    pub fn offset(&self) -> i64 {
        (self.page() - 1) * self.limit()
    }

    pub fn limit(&self) -> i64 {
        self.per_page.unwrap_or(20).clamp(1, 100)
    }

    pub fn page(&self) -> i64 {
        self.page.unwrap_or(1).max(1)
    }
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct PaginationMeta {
    pub page: i64,
    pub per_page: i64,
    pub total: i64,
    pub total_pages: i64,
}

#[derive(Debug, Serialize)]
pub struct Paginated<T: Serialize> {
    pub data: Vec<T>,
    pub meta: PaginationMeta,
}

impl<T: Serialize> Paginated<T> {
    pub fn new(data: Vec<T>, total: i64, params: &PaginationParams) -> Self {
        let per_page = params.limit();
        let total_pages = (total + per_page - 1) / per_page;
        Self {
            data,
            meta: PaginationMeta {
                page: params.page(),
                per_page,
                total,
                total_pages,
            },
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct DateRangeParams {
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq, utoipa::ToSchema)]
#[sqlx(type_name = "meal_type", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum MealType {
    Breakfast,
    Lunch,
    Dinner,
    Snack,
    Dessert,
    Drink,
    Other,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pagination_params_defaults() {
        let params = PaginationParams {
            page: None,
            per_page: None,
        };

        assert_eq!(params.page(), 1);
        assert_eq!(params.limit(), 20);
        assert_eq!(params.offset(), 0);
    }

    #[test]
    fn test_pagination_params_custom_values() {
        let params = PaginationParams {
            page: Some(3),
            per_page: Some(50),
        };

        assert_eq!(params.page(), 3);
        assert_eq!(params.limit(), 50);
        assert_eq!(params.offset(), 100); // (3 - 1) * 50
    }

    #[test]
    fn test_pagination_params_limit_clamping() {
        let too_low = PaginationParams {
            page: None,
            per_page: Some(0),
        };
        assert_eq!(too_low.limit(), 1);

        let too_high = PaginationParams {
            page: None,
            per_page: Some(150),
        };
        assert_eq!(too_high.limit(), 100);

        let negative = PaginationParams {
            page: None,
            per_page: Some(-10),
        };
        assert_eq!(negative.limit(), 1);
    }

    #[test]
    fn test_pagination_params_page_minimum() {
        let zero_page = PaginationParams {
            page: Some(0),
            per_page: None,
        };
        assert_eq!(zero_page.page(), 1);

        let negative_page = PaginationParams {
            page: Some(-5),
            per_page: None,
        };
        assert_eq!(negative_page.page(), 1);
    }

    #[test]
    fn test_pagination_params_offset_calculation() {
        let test_cases = vec![
            (1, 20, 0),
            (2, 20, 20),
            (3, 50, 100),
            (10, 10, 90),
        ];

        for (page, per_page, expected_offset) in test_cases {
            let params = PaginationParams {
                page: Some(page),
                per_page: Some(per_page),
            };
            assert_eq!(
                params.offset(),
                expected_offset,
                "Failed for page={}, per_page={}",
                page,
                per_page
            );
        }
    }

    #[test]
    fn test_paginated_new() {
        let data = vec![1, 2, 3, 4, 5];
        let params = PaginationParams {
            page: Some(2),
            per_page: Some(10),
        };

        let paginated = Paginated::new(data.clone(), 45, &params);

        assert_eq!(paginated.data, data);
        assert_eq!(paginated.meta.page, 2);
        assert_eq!(paginated.meta.per_page, 10);
        assert_eq!(paginated.meta.total, 45);
        assert_eq!(paginated.meta.total_pages, 5); // (45 + 10 - 1) / 10
    }

    #[test]
    fn test_paginated_total_pages_calculation() {
        let params = PaginationParams {
            page: Some(1),
            per_page: Some(10),
        };

        let test_cases = vec![
            (0, 0),   // No items
            (1, 1),   // One item
            (10, 1),  // Exactly one page
            (11, 2),  // Just over one page
            (20, 2),  // Exactly two pages
            (25, 3),  // Partial third page
            (100, 10), // Exactly ten pages
        ];

        for (total, expected_pages) in test_cases {
            let paginated = Paginated::new(Vec::<i32>::new(), total, &params);
            assert_eq!(
                paginated.meta.total_pages, expected_pages,
                "Failed for total={}",
                total
            );
        }
    }

    #[test]
    fn test_paginated_empty_data() {
        let params = PaginationParams {
            page: None,
            per_page: None,
        };

        let paginated = Paginated::new(Vec::<String>::new(), 0, &params);

        assert!(paginated.data.is_empty());
        assert_eq!(paginated.meta.total, 0);
        assert_eq!(paginated.meta.total_pages, 0);
    }
}
