/// Build a public URL for an R2 object.
///
/// Returns the object key as-is when no public URL is configured.
pub fn build_r2_public_url(r2_public_url: &str, object_key: &str) -> String {
    if r2_public_url.is_empty() {
        object_key.to_string()
    } else {
        format!("{}/{}", r2_public_url.trim_end_matches('/'), object_key)
    }
}

/// Return the normalized R2 public URL prefix (with trailing slash).
pub fn r2_public_prefix(r2_public_url: &str) -> String {
    format!("{}/", r2_public_url.trim_end_matches('/'))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn build_url_with_trailing_slash() {
        assert_eq!(
            build_r2_public_url("https://cdn.example.com/", "photos/1/abc.jpg"),
            "https://cdn.example.com/photos/1/abc.jpg"
        );
    }

    #[test]
    fn build_url_without_trailing_slash() {
        assert_eq!(
            build_r2_public_url("https://cdn.example.com", "photos/1/abc.jpg"),
            "https://cdn.example.com/photos/1/abc.jpg"
        );
    }

    #[test]
    fn build_url_empty_base() {
        assert_eq!(
            build_r2_public_url("", "photos/1/abc.jpg"),
            "photos/1/abc.jpg"
        );
    }

    #[test]
    fn prefix_normalizes_trailing_slash() {
        assert_eq!(r2_public_prefix("https://cdn.example.com/"), "https://cdn.example.com/");
        assert_eq!(r2_public_prefix("https://cdn.example.com"), "https://cdn.example.com/");
    }
}
