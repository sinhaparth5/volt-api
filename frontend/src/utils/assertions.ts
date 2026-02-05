import { generateId } from "./helpers";

// Assertion types
export type AssertionType =
  | "status"
  | "responseTime"
  | "bodyContains"
  | "bodyJson"
  | "headerExists"
  | "headerEquals";

export type AssertionOperator =
  | "equals"
  | "notEquals"
  | "contains"
  | "notContains"
  | "lessThan"
  | "greaterThan"
  | "exists"
  | "notExists"
  | "matches";

export interface Assertion {
  id: string;
  type: AssertionType;
  property: string;  // For JSON path or header name
  operator: AssertionOperator;
  expected: string;
  enabled: boolean;
}

export interface AssertionResult {
  assertionId: string;
  passed: boolean;
  actual: string;
  message: string;
}

export interface ResponseData {
  statusCode: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  timingMs: number;
}

// Create a new empty assertion
export const createEmptyAssertion = (): Assertion => ({
  id: generateId(),
  type: "status",
  property: "",
  operator: "equals",
  expected: "200",
  enabled: true,
});

// Get display name for assertion type
export const getAssertionTypeName = (type: AssertionType): string => {
  switch (type) {
    case "status": return "Status Code";
    case "responseTime": return "Response Time";
    case "bodyContains": return "Body Contains";
    case "bodyJson": return "JSON Value";
    case "headerExists": return "Header Exists";
    case "headerEquals": return "Header Value";
    default: return type;
  }
};

// Get available operators for assertion type
export const getOperatorsForType = (type: AssertionType): AssertionOperator[] => {
  switch (type) {
    case "status":
      return ["equals", "notEquals", "lessThan", "greaterThan"];
    case "responseTime":
      return ["lessThan", "greaterThan"];
    case "bodyContains":
      return ["contains", "notContains", "matches"];
    case "bodyJson":
      return ["equals", "notEquals", "contains", "exists", "notExists"];
    case "headerExists":
      return ["exists", "notExists"];
    case "headerEquals":
      return ["equals", "notEquals", "contains"];
    default:
      return ["equals"];
  }
};

// Get display name for operator
export const getOperatorName = (operator: AssertionOperator): string => {
  switch (operator) {
    case "equals": return "equals";
    case "notEquals": return "not equals";
    case "contains": return "contains";
    case "notContains": return "not contains";
    case "lessThan": return "less than";
    case "greaterThan": return "greater than";
    case "exists": return "exists";
    case "notExists": return "not exists";
    case "matches": return "matches regex";
    default: return operator;
  }
};

// Get JSON value by path (simple dot notation)
const getJsonValue = (obj: unknown, path: string): unknown => {
  if (!path) return obj;

  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;

    // Handle array index
    const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      current = (current as Record<string, unknown>)[key];
      if (Array.isArray(current)) {
        current = current[parseInt(index, 10)];
      } else {
        return undefined;
      }
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }

  return current;
};

// Run a single assertion against response data
export const runAssertion = (assertion: Assertion, response: ResponseData): AssertionResult => {
  const result: AssertionResult = {
    assertionId: assertion.id,
    passed: false,
    actual: "",
    message: "",
  };

  if (!assertion.enabled) {
    result.passed = true;
    result.message = "Skipped (disabled)";
    return result;
  }

  try {
    switch (assertion.type) {
      case "status": {
        const actual = response.statusCode;
        result.actual = String(actual);
        const expected = parseInt(assertion.expected, 10);

        switch (assertion.operator) {
          case "equals":
            result.passed = actual === expected;
            result.message = result.passed
              ? `Status code is ${actual}`
              : `Expected ${expected}, got ${actual}`;
            break;
          case "notEquals":
            result.passed = actual !== expected;
            result.message = result.passed
              ? `Status code is not ${expected}`
              : `Expected not ${expected}, got ${actual}`;
            break;
          case "lessThan":
            result.passed = actual < expected;
            result.message = result.passed
              ? `Status code ${actual} < ${expected}`
              : `Expected < ${expected}, got ${actual}`;
            break;
          case "greaterThan":
            result.passed = actual > expected;
            result.message = result.passed
              ? `Status code ${actual} > ${expected}`
              : `Expected > ${expected}, got ${actual}`;
            break;
        }
        break;
      }

      case "responseTime": {
        const actual = response.timingMs;
        result.actual = `${actual}ms`;
        const expected = parseInt(assertion.expected, 10);

        switch (assertion.operator) {
          case "lessThan":
            result.passed = actual < expected;
            result.message = result.passed
              ? `Response time ${actual}ms < ${expected}ms`
              : `Expected < ${expected}ms, got ${actual}ms`;
            break;
          case "greaterThan":
            result.passed = actual > expected;
            result.message = result.passed
              ? `Response time ${actual}ms > ${expected}ms`
              : `Expected > ${expected}ms, got ${actual}ms`;
            break;
        }
        break;
      }

      case "bodyContains": {
        const body = response.body;
        result.actual = body.length > 100 ? body.substring(0, 100) + "..." : body;

        switch (assertion.operator) {
          case "contains":
            result.passed = body.includes(assertion.expected);
            result.message = result.passed
              ? `Body contains "${assertion.expected}"`
              : `Body does not contain "${assertion.expected}"`;
            break;
          case "notContains":
            result.passed = !body.includes(assertion.expected);
            result.message = result.passed
              ? `Body does not contain "${assertion.expected}"`
              : `Body contains "${assertion.expected}"`;
            break;
          case "matches":
            try {
              const regex = new RegExp(assertion.expected);
              result.passed = regex.test(body);
              result.message = result.passed
                ? `Body matches pattern "${assertion.expected}"`
                : `Body does not match pattern "${assertion.expected}"`;
            } catch {
              result.passed = false;
              result.message = `Invalid regex pattern: ${assertion.expected}`;
            }
            break;
        }
        break;
      }

      case "bodyJson": {
        try {
          const json = JSON.parse(response.body);
          const value = getJsonValue(json, assertion.property);
          result.actual = value === undefined ? "undefined" : JSON.stringify(value);

          switch (assertion.operator) {
            case "exists":
              result.passed = value !== undefined;
              result.message = result.passed
                ? `Property "${assertion.property}" exists`
                : `Property "${assertion.property}" does not exist`;
              break;
            case "notExists":
              result.passed = value === undefined;
              result.message = result.passed
                ? `Property "${assertion.property}" does not exist`
                : `Property "${assertion.property}" exists`;
              break;
            case "equals":
              const expectedValue = JSON.parse(assertion.expected);
              result.passed = JSON.stringify(value) === JSON.stringify(expectedValue);
              result.message = result.passed
                ? `${assertion.property} equals ${assertion.expected}`
                : `Expected ${assertion.expected}, got ${result.actual}`;
              break;
            case "notEquals":
              const notExpectedValue = JSON.parse(assertion.expected);
              result.passed = JSON.stringify(value) !== JSON.stringify(notExpectedValue);
              result.message = result.passed
                ? `${assertion.property} does not equal ${assertion.expected}`
                : `Expected not ${assertion.expected}, got ${result.actual}`;
              break;
            case "contains":
              result.passed = String(value).includes(assertion.expected);
              result.message = result.passed
                ? `${assertion.property} contains "${assertion.expected}"`
                : `${assertion.property} does not contain "${assertion.expected}"`;
              break;
          }
        } catch {
          result.passed = false;
          result.message = "Response body is not valid JSON";
          result.actual = "Invalid JSON";
        }
        break;
      }

      case "headerExists": {
        const headerName = assertion.property.toLowerCase();
        const headerKeys = Object.keys(response.headers).map(k => k.toLowerCase());
        const exists = headerKeys.includes(headerName);
        result.actual = exists ? "exists" : "not found";

        switch (assertion.operator) {
          case "exists":
            result.passed = exists;
            result.message = result.passed
              ? `Header "${assertion.property}" exists`
              : `Header "${assertion.property}" not found`;
            break;
          case "notExists":
            result.passed = !exists;
            result.message = result.passed
              ? `Header "${assertion.property}" does not exist`
              : `Header "${assertion.property}" exists`;
            break;
        }
        break;
      }

      case "headerEquals": {
        const headerName = assertion.property.toLowerCase();
        const headerEntry = Object.entries(response.headers).find(
          ([k]) => k.toLowerCase() === headerName
        );
        const headerValue = headerEntry ? headerEntry[1] : undefined;
        result.actual = headerValue ?? "not found";

        if (headerValue === undefined) {
          result.passed = false;
          result.message = `Header "${assertion.property}" not found`;
        } else {
          switch (assertion.operator) {
            case "equals":
              result.passed = headerValue === assertion.expected;
              result.message = result.passed
                ? `Header "${assertion.property}" equals "${assertion.expected}"`
                : `Expected "${assertion.expected}", got "${headerValue}"`;
              break;
            case "notEquals":
              result.passed = headerValue !== assertion.expected;
              result.message = result.passed
                ? `Header "${assertion.property}" does not equal "${assertion.expected}"`
                : `Expected not "${assertion.expected}", got "${headerValue}"`;
              break;
            case "contains":
              result.passed = headerValue.includes(assertion.expected);
              result.message = result.passed
                ? `Header "${assertion.property}" contains "${assertion.expected}"`
                : `Header does not contain "${assertion.expected}"`;
              break;
          }
        }
        break;
      }
    }
  } catch (err) {
    result.passed = false;
    result.message = `Error: ${err}`;
  }

  return result;
};

// Run all assertions against response data
export const runAssertions = (assertions: Assertion[], response: ResponseData): AssertionResult[] => {
  return assertions.map(assertion => runAssertion(assertion, response));
};

// Get summary of assertion results
export const getAssertionsSummary = (results: AssertionResult[]): { passed: number; failed: number; total: number } => {
  const passed = results.filter(r => r.passed).length;
  return {
    passed,
    failed: results.length - passed,
    total: results.length,
  };
};
