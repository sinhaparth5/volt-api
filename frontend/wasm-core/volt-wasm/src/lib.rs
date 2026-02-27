use regex_lite::Regex;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

// Initialize panic hook for better error messages
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

// ============================================================================
// Variable Substitution (High Impact)
// ============================================================================

/// Substitutes {{variable}} patterns in a string with values from the provided map.
/// Returns the substituted string.
#[wasm_bindgen]
pub fn substitute_variables(text: &str, variables_json: &str) -> String {
    if text.is_empty() || !text.contains("{{") {
        return text.to_string();
    }

    let variables: HashMap<String, String> = match serde_json::from_str(variables_json) {
        Ok(v) => v,
        Err(_) => return text.to_string(),
    };

    if variables.is_empty() {
        return text.to_string();
    }

    let re = Regex::new(r"\{\{([^}]+)\}\}").unwrap();
    re.replace_all(text, |caps: &regex_lite::Captures| {
        let var_name = caps.get(1).unwrap().as_str().trim();
        variables
            .get(var_name)
            .cloned()
            .unwrap_or_else(|| caps.get(0).unwrap().as_str().to_string())
    })
    .to_string()
}

/// Batch substitute variables in multiple strings at once.
/// Returns JSON array of substituted strings.
#[wasm_bindgen]
pub fn substitute_variables_batch(texts_json: &str, variables_json: &str) -> String {
    let texts: Vec<String> = match serde_json::from_str(texts_json) {
        Ok(t) => t,
        Err(_) => return "[]".to_string(),
    };

    let variables: HashMap<String, String> = match serde_json::from_str(variables_json) {
        Ok(v) => v,
        Err(_) => return serde_json::to_string(&texts).unwrap_or_else(|_| "[]".to_string()),
    };

    if variables.is_empty() {
        return serde_json::to_string(&texts).unwrap_or_else(|_| "[]".to_string());
    }

    let re = Regex::new(r"\{\{([^}]+)\}\}").unwrap();
    let results: Vec<String> = texts
        .iter()
        .map(|text| {
            if !text.contains("{{") {
                return text.clone();
            }
            re.replace_all(text, |caps: &regex_lite::Captures| {
                let var_name = caps.get(1).unwrap().as_str().trim();
                variables
                    .get(var_name)
                    .cloned()
                    .unwrap_or_else(|| caps.get(0).unwrap().as_str().to_string())
            })
            .to_string()
        })
        .collect();

    serde_json::to_string(&results).unwrap_or_else(|_| "[]".to_string())
}

/// Find all variable names used in a string.
/// Returns JSON array of variable names.
#[wasm_bindgen]
pub fn find_variables(text: &str) -> String {
    if text.is_empty() || !text.contains("{{") {
        return "[]".to_string();
    }

    let re = Regex::new(r"\{\{([^}]+)\}\}").unwrap();
    let mut vars: Vec<String> = Vec::new();

    for caps in re.captures_iter(text) {
        let var_name = caps.get(1).unwrap().as_str().trim().to_string();
        if !vars.contains(&var_name) {
            vars.push(var_name);
        }
    }

    serde_json::to_string(&vars).unwrap_or_else(|_| "[]".to_string())
}

/// Check if a string contains any {{variable}} patterns.
#[wasm_bindgen]
pub fn has_variables(text: &str) -> bool {
    if text.is_empty() {
        return false;
    }
    let re = Regex::new(r"\{\{[^}]+\}\}").unwrap();
    re.is_match(text)
}

// ============================================================================
// JSON Processing (High Impact)
// ============================================================================

/// Extract a value from JSON using dot notation path (e.g., "data.users[0].name").
/// Returns the extracted value as a JSON string, or "undefined" if not found.
#[wasm_bindgen]
pub fn json_extract(json_str: &str, path: &str) -> String {
    let value: Value = match serde_json::from_str(json_str) {
        Ok(v) => v,
        Err(_) => return "undefined".to_string(),
    };

    match get_json_path(&value, path) {
        Some(v) => serde_json::to_string(&v).unwrap_or_else(|_| "undefined".to_string()),
        None => "undefined".to_string(),
    }
}

/// Extract multiple values from JSON at once.
/// paths_json is a JSON array of paths.
/// Returns JSON object mapping paths to extracted values.
#[wasm_bindgen]
pub fn json_extract_batch(json_str: &str, paths_json: &str) -> String {
    let value: Value = match serde_json::from_str(json_str) {
        Ok(v) => v,
        Err(_) => return "{}".to_string(),
    };

    let paths: Vec<String> = match serde_json::from_str(paths_json) {
        Ok(p) => p,
        Err(_) => return "{}".to_string(),
    };

    let mut results: HashMap<String, Value> = HashMap::new();
    for path in paths {
        if let Some(v) = get_json_path(&value, &path) {
            results.insert(path, v.clone());
        }
    }

    serde_json::to_string(&results).unwrap_or_else(|_| "{}".to_string())
}

/// Format/pretty-print JSON string.
#[wasm_bindgen]
pub fn json_format(json_str: &str) -> String {
    match serde_json::from_str::<Value>(json_str) {
        Ok(value) => serde_json::to_string_pretty(&value).unwrap_or_else(|_| json_str.to_string()),
        Err(_) => json_str.to_string(),
    }
}

/// Minify JSON (remove whitespace).
#[wasm_bindgen]
pub fn json_minify(json_str: &str) -> String {
    match serde_json::from_str::<Value>(json_str) {
        Ok(value) => serde_json::to_string(&value).unwrap_or_else(|_| json_str.to_string()),
        Err(_) => json_str.to_string(),
    }
}

/// Validate if a string is valid JSON.
#[wasm_bindgen]
pub fn json_validate(json_str: &str) -> bool {
    serde_json::from_str::<Value>(json_str).is_ok()
}

/// Get JSON size info (for large response handling).
#[wasm_bindgen]
pub fn json_info(json_str: &str) -> String {
    let value: Value = match serde_json::from_str(json_str) {
        Ok(v) => v,
        Err(_) => {
            return serde_json::to_string(&serde_json::json!({
                "valid": false,
                "size": json_str.len()
            }))
            .unwrap();
        }
    };

    let info = serde_json::json!({
        "valid": true,
        "size": json_str.len(),
        "type": get_value_type(&value),
        "depth": get_json_depth(&value),
        "keys": if let Value::Object(map) = &value { map.len() } else { 0 },
        "length": if let Value::Array(arr) = &value { arr.len() } else { 0 }
    });

    serde_json::to_string(&info).unwrap_or_else(|_| "{}".to_string())
}

fn get_value_type(value: &Value) -> &'static str {
    match value {
        Value::Null => "null",
        Value::Bool(_) => "boolean",
        Value::Number(_) => "number",
        Value::String(_) => "string",
        Value::Array(_) => "array",
        Value::Object(_) => "object",
    }
}

fn get_json_depth(value: &Value) -> usize {
    match value {
        Value::Array(arr) => 1 + arr.iter().map(get_json_depth).max().unwrap_or(0),
        Value::Object(map) => 1 + map.values().map(get_json_depth).max().unwrap_or(0),
        _ => 0,
    }
}

fn get_json_path<'a>(value: &'a Value, path: &str) -> Option<&'a Value> {
    if path.is_empty() {
        return Some(value);
    }

    let mut current = value;
    let parts: Vec<&str> = path.split('.').collect();

    for part in parts {
        // Check for array index: key[0]
        let array_re = Regex::new(r"^(.+)\[(\d+)\]$").unwrap();
        if let Some(caps) = array_re.captures(part) {
            let key = caps.get(1).unwrap().as_str();
            let index: usize = caps.get(2).unwrap().as_str().parse().ok()?;

            current = current.get(key)?;
            current = current.get(index)?;
        } else {
            current = current.get(part)?;
        }
    }

    Some(current)
}

// ============================================================================
// Assertion Evaluation (High Impact)
// ============================================================================

#[derive(Deserialize)]
struct Assertion {
    id: String,
    #[serde(rename = "type")]
    assertion_type: String,
    property: String,
    operator: String,
    expected: String,
    enabled: bool,
}

#[derive(Serialize)]
struct AssertionResult {
    #[serde(rename = "assertionId")]
    assertion_id: String,
    passed: bool,
    actual: String,
    message: String,
}

#[derive(Deserialize)]
struct ResponseData {
    #[serde(rename = "statusCode")]
    status_code: i32,
    headers: HashMap<String, String>,
    body: String,
    #[serde(rename = "timingMs")]
    timing_ms: i64,
}

/// Run all assertions against response data.
/// assertions_json: JSON array of assertion objects
/// response_json: JSON object with statusCode, headers, body, timingMs
/// Returns JSON array of assertion results.
#[wasm_bindgen]
pub fn run_assertions(assertions_json: &str, response_json: &str) -> String {
    let assertions: Vec<Assertion> = match serde_json::from_str(assertions_json) {
        Ok(a) => a,
        Err(_) => return "[]".to_string(),
    };

    let response: ResponseData = match serde_json::from_str(response_json) {
        Ok(r) => r,
        Err(_) => return "[]".to_string(),
    };

    // Parse body JSON once for all assertions
    let body_json: Option<Value> = serde_json::from_str(&response.body).ok();

    let results: Vec<AssertionResult> = assertions
        .iter()
        .map(|a| run_single_assertion(a, &response, &body_json))
        .collect();

    serde_json::to_string(&results).unwrap_or_else(|_| "[]".to_string())
}

fn run_single_assertion(
    assertion: &Assertion,
    response: &ResponseData,
    body_json: &Option<Value>,
) -> AssertionResult {
    if !assertion.enabled {
        return AssertionResult {
            assertion_id: assertion.id.clone(),
            passed: true,
            actual: String::new(),
            message: "Skipped (disabled)".to_string(),
        };
    }

    match assertion.assertion_type.as_str() {
        "status" => run_status_assertion(assertion, response.status_code),
        "responseTime" => run_response_time_assertion(assertion, response.timing_ms),
        "bodyContains" => run_body_contains_assertion(assertion, &response.body),
        "bodyJson" => run_body_json_assertion(assertion, body_json),
        "headerExists" => run_header_exists_assertion(assertion, &response.headers),
        "headerEquals" => run_header_equals_assertion(assertion, &response.headers),
        _ => AssertionResult {
            assertion_id: assertion.id.clone(),
            passed: false,
            actual: String::new(),
            message: format!("Unknown assertion type: {}", assertion.assertion_type),
        },
    }
}

fn run_status_assertion(assertion: &Assertion, status_code: i32) -> AssertionResult {
    let expected: i32 = assertion.expected.parse().unwrap_or(0);
    let actual = status_code.to_string();

    let (passed, message) = match assertion.operator.as_str() {
        "equals" => (
            status_code == expected,
            if status_code == expected {
                format!("Status code is {}", status_code)
            } else {
                format!("Expected {}, got {}", expected, status_code)
            },
        ),
        "notEquals" => (
            status_code != expected,
            if status_code != expected {
                format!("Status code is not {}", expected)
            } else {
                format!("Expected not {}, got {}", expected, status_code)
            },
        ),
        "lessThan" => (
            status_code < expected,
            if status_code < expected {
                format!("Status code {} < {}", status_code, expected)
            } else {
                format!("Expected < {}, got {}", expected, status_code)
            },
        ),
        "greaterThan" => (
            status_code > expected,
            if status_code > expected {
                format!("Status code {} > {}", status_code, expected)
            } else {
                format!("Expected > {}, got {}", expected, status_code)
            },
        ),
        _ => (false, format!("Unknown operator: {}", assertion.operator)),
    };

    AssertionResult {
        assertion_id: assertion.id.clone(),
        passed,
        actual,
        message,
    }
}

fn run_response_time_assertion(assertion: &Assertion, timing_ms: i64) -> AssertionResult {
    let expected: i64 = assertion.expected.parse().unwrap_or(0);
    let actual = format!("{}ms", timing_ms);

    let (passed, message) = match assertion.operator.as_str() {
        "lessThan" => (
            timing_ms < expected,
            if timing_ms < expected {
                format!("Response time {}ms < {}ms", timing_ms, expected)
            } else {
                format!("Expected < {}ms, got {}ms", expected, timing_ms)
            },
        ),
        "greaterThan" => (
            timing_ms > expected,
            if timing_ms > expected {
                format!("Response time {}ms > {}ms", timing_ms, expected)
            } else {
                format!("Expected > {}ms, got {}ms", expected, timing_ms)
            },
        ),
        _ => (false, format!("Unknown operator: {}", assertion.operator)),
    };

    AssertionResult {
        assertion_id: assertion.id.clone(),
        passed,
        actual,
        message,
    }
}

fn run_body_contains_assertion(assertion: &Assertion, body: &str) -> AssertionResult {
    let actual = if body.len() > 100 {
        format!("{}...", &body[..100])
    } else {
        body.to_string()
    };

    let (passed, message) = match assertion.operator.as_str() {
        "contains" => (
            body.contains(&assertion.expected),
            if body.contains(&assertion.expected) {
                format!("Body contains \"{}\"", assertion.expected)
            } else {
                format!("Body does not contain \"{}\"", assertion.expected)
            },
        ),
        "notContains" => (
            !body.contains(&assertion.expected),
            if !body.contains(&assertion.expected) {
                format!("Body does not contain \"{}\"", assertion.expected)
            } else {
                format!("Body contains \"{}\"", assertion.expected)
            },
        ),
        "matches" => match Regex::new(&assertion.expected) {
            Ok(re) => (
                re.is_match(body),
                if re.is_match(body) {
                    format!("Body matches pattern \"{}\"", assertion.expected)
                } else {
                    format!("Body does not match pattern \"{}\"", assertion.expected)
                },
            ),
            Err(_) => (
                false,
                format!("Invalid regex pattern: {}", assertion.expected),
            ),
        },
        _ => (false, format!("Unknown operator: {}", assertion.operator)),
    };

    AssertionResult {
        assertion_id: assertion.id.clone(),
        passed,
        actual,
        message,
    }
}

fn run_body_json_assertion(assertion: &Assertion, body_json: &Option<Value>) -> AssertionResult {
    let body_json = match body_json {
        Some(v) => v,
        None => {
            return AssertionResult {
                assertion_id: assertion.id.clone(),
                passed: false,
                actual: "Invalid JSON".to_string(),
                message: "Response body is not valid JSON".to_string(),
            };
        }
    };

    let value = get_json_path(body_json, &assertion.property);
    let actual = match value {
        Some(v) => serde_json::to_string(v).unwrap_or_else(|_| "undefined".to_string()),
        None => "undefined".to_string(),
    };

    let (passed, message) = match assertion.operator.as_str() {
        "exists" => (
            value.is_some(),
            if value.is_some() {
                format!("Property \"{}\" exists", assertion.property)
            } else {
                format!("Property \"{}\" does not exist", assertion.property)
            },
        ),
        "notExists" => (
            value.is_none(),
            if value.is_none() {
                format!("Property \"{}\" does not exist", assertion.property)
            } else {
                format!("Property \"{}\" exists", assertion.property)
            },
        ),
        "equals" => {
            let expected: Value = serde_json::from_str(&assertion.expected).unwrap_or(Value::Null);
            let eq = value.is_some_and(|v| v == &expected);
            (
                eq,
                if eq {
                    format!("{} equals {}", assertion.property, assertion.expected)
                } else {
                    format!("Expected {}, got {}", assertion.expected, actual)
                },
            )
        }
        "notEquals" => {
            let expected: Value = serde_json::from_str(&assertion.expected).unwrap_or(Value::Null);
            let neq = value.is_none_or(|v| v != &expected);
            (
                neq,
                if neq {
                    format!(
                        "{} does not equal {}",
                        assertion.property, assertion.expected
                    )
                } else {
                    format!("Expected not {}, got {}", assertion.expected, actual)
                },
            )
        }
        "contains" => {
            let contains = value.is_some_and(|v| v.to_string().contains(&assertion.expected));
            (
                contains,
                if contains {
                    format!(
                        "{} contains \"{}\"",
                        assertion.property, assertion.expected
                    )
                } else {
                    format!(
                        "{} does not contain \"{}\"",
                        assertion.property, assertion.expected
                    )
                },
            )
        }
        _ => (false, format!("Unknown operator: {}", assertion.operator)),
    };

    AssertionResult {
        assertion_id: assertion.id.clone(),
        passed,
        actual,
        message,
    }
}

fn run_header_exists_assertion(
    assertion: &Assertion,
    headers: &HashMap<String, String>,
) -> AssertionResult {
    let header_name = assertion.property.to_lowercase();
    let exists = headers.keys().any(|k| k.to_lowercase() == header_name);
    let actual = if exists { "exists" } else { "not found" }.to_string();

    let (passed, message) = match assertion.operator.as_str() {
        "exists" => (
            exists,
            if exists {
                format!("Header \"{}\" exists", assertion.property)
            } else {
                format!("Header \"{}\" not found", assertion.property)
            },
        ),
        "notExists" => (
            !exists,
            if !exists {
                format!("Header \"{}\" does not exist", assertion.property)
            } else {
                format!("Header \"{}\" exists", assertion.property)
            },
        ),
        _ => (false, format!("Unknown operator: {}", assertion.operator)),
    };

    AssertionResult {
        assertion_id: assertion.id.clone(),
        passed,
        actual,
        message,
    }
}

fn run_header_equals_assertion(
    assertion: &Assertion,
    headers: &HashMap<String, String>,
) -> AssertionResult {
    let header_name = assertion.property.to_lowercase();
    let header_value = headers
        .iter()
        .find(|(k, _)| k.to_lowercase() == header_name)
        .map(|(_, v)| v.clone());

    let actual = header_value
        .clone()
        .unwrap_or_else(|| "not found".to_string());

    let (passed, message) = match &header_value {
        None => (false, format!("Header \"{}\" not found", assertion.property)),
        Some(value) => match assertion.operator.as_str() {
            "equals" => (
                value == &assertion.expected,
                if value == &assertion.expected {
                    format!(
                        "Header \"{}\" equals \"{}\"",
                        assertion.property, assertion.expected
                    )
                } else {
                    format!("Expected \"{}\", got \"{}\"", assertion.expected, value)
                },
            ),
            "notEquals" => (
                value != &assertion.expected,
                if value != &assertion.expected {
                    format!(
                        "Header \"{}\" does not equal \"{}\"",
                        assertion.property, assertion.expected
                    )
                } else {
                    format!("Expected not \"{}\", got \"{}\"", assertion.expected, value)
                },
            ),
            "contains" => (
                value.contains(&assertion.expected),
                if value.contains(&assertion.expected) {
                    format!(
                        "Header \"{}\" contains \"{}\"",
                        assertion.property, assertion.expected
                    )
                } else {
                    format!("Header does not contain \"{}\"", assertion.expected)
                },
            ),
            _ => (false, format!("Unknown operator: {}", assertion.operator)),
        },
    };

    AssertionResult {
        assertion_id: assertion.id.clone(),
        passed,
        actual,
        message,
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_substitute_variables() {
        let text = "https://{{baseUrl}}/users/{{userId}}";
        let vars = r#"{"baseUrl":"api.example.com","userId":"123"}"#;
        let result = substitute_variables(text, vars);
        assert_eq!(result, "https://api.example.com/users/123");
    }

    #[test]
    fn test_substitute_variables_missing() {
        let text = "https://{{baseUrl}}/{{missing}}";
        let vars = r#"{"baseUrl":"api.example.com"}"#;
        let result = substitute_variables(text, vars);
        assert_eq!(result, "https://api.example.com/{{missing}}");
    }

    #[test]
    fn test_find_variables() {
        let text = "{{baseUrl}}/users/{{userId}}?token={{token}}";
        let result = find_variables(text);
        let vars: Vec<String> = serde_json::from_str(&result).unwrap();
        assert_eq!(vars, vec!["baseUrl", "userId", "token"]);
    }

    #[test]
    fn test_json_extract() {
        let json = r#"{"data":{"users":[{"name":"John"}]}}"#;
        let result = json_extract(json, "data.users[0].name");
        assert_eq!(result, "\"John\"");
    }

    #[test]
    fn test_json_format() {
        let json = r#"{"name":"John","age":30}"#;
        let result = json_format(json);
        assert!(result.contains('\n'));
        assert!(result.contains("  "));
    }

    #[test]
    fn test_json_validate() {
        assert!(json_validate(r#"{"valid": true}"#));
        assert!(!json_validate("not json"));
    }

    #[test]
    fn test_has_variables() {
        assert!(has_variables("{{test}}"));
        assert!(!has_variables("no variables"));
    }
}
