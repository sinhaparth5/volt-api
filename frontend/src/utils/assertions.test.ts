import { describe, it, expect } from 'vitest';
import {
  runAssertion,
  runAssertions,
  getAssertionsSummary,
  getAssertionTypeName,
  getOperatorsForType,
  getOperatorName,
  Assertion,
  ResponseData,
} from './assertions';

const createAssertion = (overrides: Partial<Assertion> = {}): Assertion => ({
  id: 'test-1',
  type: 'status',
  property: '',
  operator: 'equals',
  expected: '200',
  enabled: true,
  ...overrides,
});

const createResponse = (overrides: Partial<ResponseData> = {}): ResponseData => ({
  statusCode: 200,
  statusText: 'OK',
  headers: { 'Content-Type': 'application/json' },
  body: '{"message":"success","count":5}',
  timingMs: 100,
  ...overrides,
});

describe('Status Code Assertions', () => {
  it('passes when status equals expected', () => {
    const assertion = createAssertion({ type: 'status', operator: 'equals', expected: '200' });
    const response = createResponse({ statusCode: 200 });
    const result = runAssertion(assertion, response);
    expect(result.passed).toBe(true);
    expect(result.actual).toBe('200');
  });

  it('fails when status does not equal expected', () => {
    const assertion = createAssertion({ type: 'status', operator: 'equals', expected: '200' });
    const response = createResponse({ statusCode: 404 });
    const result = runAssertion(assertion, response);
    expect(result.passed).toBe(false);
    expect(result.message).toContain('Expected 200, got 404');
  });

  it('checks notEquals operator', () => {
    const assertion = createAssertion({ type: 'status', operator: 'notEquals', expected: '500' });
    const response = createResponse({ statusCode: 200 });
    const result = runAssertion(assertion, response);
    expect(result.passed).toBe(true);
  });

  it('checks lessThan operator', () => {
    const assertion = createAssertion({ type: 'status', operator: 'lessThan', expected: '400' });
    const response = createResponse({ statusCode: 200 });
    const result = runAssertion(assertion, response);
    expect(result.passed).toBe(true);
  });

  it('checks greaterThan operator', () => {
    const assertion = createAssertion({ type: 'status', operator: 'greaterThan', expected: '100' });
    const response = createResponse({ statusCode: 200 });
    const result = runAssertion(assertion, response);
    expect(result.passed).toBe(true);
  });
});

describe('Response Time Assertions', () => {
  it('passes when response time is less than expected', () => {
    const assertion = createAssertion({ type: 'responseTime', operator: 'lessThan', expected: '500' });
    const response = createResponse({ timingMs: 100 });
    const result = runAssertion(assertion, response);
    expect(result.passed).toBe(true);
    expect(result.actual).toBe('100ms');
  });

  it('fails when response time exceeds expected', () => {
    const assertion = createAssertion({ type: 'responseTime', operator: 'lessThan', expected: '50' });
    const response = createResponse({ timingMs: 100 });
    const result = runAssertion(assertion, response);
    expect(result.passed).toBe(false);
  });

  it('checks greaterThan operator', () => {
    const assertion = createAssertion({ type: 'responseTime', operator: 'greaterThan', expected: '50' });
    const response = createResponse({ timingMs: 100 });
    const result = runAssertion(assertion, response);
    expect(result.passed).toBe(true);
  });
});

describe('Body Contains Assertions', () => {
  it('passes when body contains expected string', () => {
    const assertion = createAssertion({ type: 'bodyContains', operator: 'contains', expected: 'success' });
    const response = createResponse({ body: '{"message":"success"}' });
    const result = runAssertion(assertion, response);
    expect(result.passed).toBe(true);
  });

  it('fails when body does not contain expected string', () => {
    const assertion = createAssertion({ type: 'bodyContains', operator: 'contains', expected: 'error' });
    const response = createResponse({ body: '{"message":"success"}' });
    const result = runAssertion(assertion, response);
    expect(result.passed).toBe(false);
  });

  it('checks notContains operator', () => {
    const assertion = createAssertion({ type: 'bodyContains', operator: 'notContains', expected: 'error' });
    const response = createResponse({ body: '{"message":"success"}' });
    const result = runAssertion(assertion, response);
    expect(result.passed).toBe(true);
  });

  it('checks regex match operator', () => {
    const assertion = createAssertion({ type: 'bodyContains', operator: 'matches', expected: '"count":\\s*\\d+' });
    const response = createResponse({ body: '{"count": 5}' });
    const result = runAssertion(assertion, response);
    expect(result.passed).toBe(true);
  });

  it('handles invalid regex gracefully', () => {
    const assertion = createAssertion({ type: 'bodyContains', operator: 'matches', expected: '[invalid(' });
    const response = createResponse({ body: 'test' });
    const result = runAssertion(assertion, response);
    expect(result.passed).toBe(false);
    expect(result.message).toContain('Invalid regex');
  });
});

describe('JSON Body Assertions', () => {
  it('checks JSON property exists', () => {
    const assertion = createAssertion({ type: 'bodyJson', operator: 'exists', property: 'message' });
    const response = createResponse({ body: '{"message":"success"}' });
    const result = runAssertion(assertion, response);
    expect(result.passed).toBe(true);
  });

  it('checks JSON property does not exist', () => {
    const assertion = createAssertion({ type: 'bodyJson', operator: 'notExists', property: 'error' });
    const response = createResponse({ body: '{"message":"success"}' });
    const result = runAssertion(assertion, response);
    expect(result.passed).toBe(true);
  });

  it('checks JSON property equals value', () => {
    const assertion = createAssertion({ type: 'bodyJson', operator: 'equals', property: 'count', expected: '5' });
    const response = createResponse({ body: '{"count":5}' });
    const result = runAssertion(assertion, response);
    expect(result.passed).toBe(true);
  });

  it('checks nested JSON property', () => {
    const assertion = createAssertion({ type: 'bodyJson', operator: 'equals', property: 'data.name', expected: '"john"' });
    const response = createResponse({ body: '{"data":{"name":"john"}}' });
    const result = runAssertion(assertion, response);
    expect(result.passed).toBe(true);
  });

  it('checks JSON array index', () => {
    const assertion = createAssertion({ type: 'bodyJson', operator: 'equals', property: 'items[0]', expected: '"first"' });
    const response = createResponse({ body: '{"items":["first","second"]}' });
    const result = runAssertion(assertion, response);
    expect(result.passed).toBe(true);
  });

  it('handles invalid JSON gracefully', () => {
    const assertion = createAssertion({ type: 'bodyJson', operator: 'exists', property: 'message' });
    const response = createResponse({ body: 'not json' });
    const result = runAssertion(assertion, response);
    expect(result.passed).toBe(false);
    expect(result.message).toContain('not valid JSON');
  });
});

describe('Header Assertions', () => {
  it('checks header exists', () => {
    const assertion = createAssertion({ type: 'headerExists', operator: 'exists', property: 'Content-Type' });
    const response = createResponse({ headers: { 'Content-Type': 'application/json' } });
    const result = runAssertion(assertion, response);
    expect(result.passed).toBe(true);
  });

  it('checks header does not exist', () => {
    const assertion = createAssertion({ type: 'headerExists', operator: 'notExists', property: 'X-Custom' });
    const response = createResponse({ headers: { 'Content-Type': 'application/json' } });
    const result = runAssertion(assertion, response);
    expect(result.passed).toBe(true);
  });

  it('checks header equals value (case insensitive key)', () => {
    const assertion = createAssertion({ type: 'headerEquals', operator: 'equals', property: 'content-type', expected: 'application/json' });
    const response = createResponse({ headers: { 'Content-Type': 'application/json' } });
    const result = runAssertion(assertion, response);
    expect(result.passed).toBe(true);
  });

  it('checks header contains value', () => {
    const assertion = createAssertion({ type: 'headerEquals', operator: 'contains', property: 'Content-Type', expected: 'json' });
    const response = createResponse({ headers: { 'Content-Type': 'application/json' } });
    const result = runAssertion(assertion, response);
    expect(result.passed).toBe(true);
  });

  it('fails when header not found', () => {
    const assertion = createAssertion({ type: 'headerEquals', operator: 'equals', property: 'X-Missing', expected: 'value' });
    const response = createResponse({ headers: {} });
    const result = runAssertion(assertion, response);
    expect(result.passed).toBe(false);
    expect(result.message).toContain('not found');
  });
});

describe('Disabled Assertions', () => {
  it('skips disabled assertions', () => {
    const assertion = createAssertion({ enabled: false });
    const response = createResponse();
    const result = runAssertion(assertion, response);
    expect(result.passed).toBe(true);
    expect(result.message).toBe('Skipped (disabled)');
  });
});

describe('runAssertions', () => {
  it('runs multiple assertions', () => {
    const assertions = [
      createAssertion({ id: '1', type: 'status', operator: 'equals', expected: '200' }),
      createAssertion({ id: '2', type: 'bodyContains', operator: 'contains', expected: 'success' }),
    ];
    const response = createResponse({ body: '{"message":"success"}' });
    const results = runAssertions(assertions, response);
    expect(results).toHaveLength(2);
    expect(results[0].passed).toBe(true);
    expect(results[1].passed).toBe(true);
  });
});

describe('getAssertionsSummary', () => {
  it('calculates correct summary', () => {
    const results = [
      { assertionId: '1', passed: true, actual: '', message: '' },
      { assertionId: '2', passed: false, actual: '', message: '' },
      { assertionId: '3', passed: true, actual: '', message: '' },
    ];
    const summary = getAssertionsSummary(results);
    expect(summary.passed).toBe(2);
    expect(summary.failed).toBe(1);
    expect(summary.total).toBe(3);
  });
});

describe('Helper Functions', () => {
  it('getAssertionTypeName returns display names', () => {
    expect(getAssertionTypeName('status')).toBe('Status Code');
    expect(getAssertionTypeName('responseTime')).toBe('Response Time');
    expect(getAssertionTypeName('bodyContains')).toBe('Body Contains');
    expect(getAssertionTypeName('bodyJson')).toBe('JSON Value');
    expect(getAssertionTypeName('headerExists')).toBe('Header Exists');
    expect(getAssertionTypeName('headerEquals')).toBe('Header Value');
  });

  it('getOperatorsForType returns correct operators', () => {
    expect(getOperatorsForType('status')).toContain('equals');
    expect(getOperatorsForType('status')).toContain('lessThan');
    expect(getOperatorsForType('responseTime')).toContain('lessThan');
    expect(getOperatorsForType('bodyContains')).toContain('matches');
    expect(getOperatorsForType('headerExists')).toContain('exists');
  });

  it('getOperatorName returns display names', () => {
    expect(getOperatorName('equals')).toBe('equals');
    expect(getOperatorName('notEquals')).toBe('not equals');
    expect(getOperatorName('lessThan')).toBe('less than');
    expect(getOperatorName('matches')).toBe('matches regex');
  });
});
