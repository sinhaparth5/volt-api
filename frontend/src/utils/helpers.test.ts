import { describe, it, expect } from 'vitest';
import {
  parseQueryParams,
  getBaseUrl,
  buildUrlWithParams,
  authToHeaders,
  keyValuePairsToHeaders,
  formatJSON,
  getStatusColor,
  getMethodColor,
  formDataToUrlEncoded,
  getContentTypeHeader,
  substituteVariables,
  substituteHeaderVariables,
  findVariables,
  hasVariables,
  previewSubstitution,
  KeyValuePair,
  AuthSettings,
} from './helpers';

describe('parseQueryParams', () => {
  it('parses query params from URL', () => {
    const params = parseQueryParams('https://api.example.com/users?name=john&age=30');
    expect(params).toHaveLength(2);
    expect(params[0].key).toBe('name');
    expect(params[0].value).toBe('john');
    expect(params[1].key).toBe('age');
    expect(params[1].value).toBe('30');
  });

  it('returns empty pair for URL without params', () => {
    const params = parseQueryParams('https://api.example.com/users');
    expect(params).toHaveLength(1);
    expect(params[0].key).toBe('');
    expect(params[0].value).toBe('');
  });

  it('returns empty pair for invalid URL', () => {
    const params = parseQueryParams('not-a-url');
    expect(params).toHaveLength(1);
    expect(params[0].key).toBe('');
  });
});

describe('getBaseUrl', () => {
  it('strips query params from URL', () => {
    expect(getBaseUrl('https://api.example.com/users?name=john'))
      .toBe('https://api.example.com/users');
  });

  it('handles URL without query params', () => {
    expect(getBaseUrl('https://api.example.com/users'))
      .toBe('https://api.example.com/users');
  });

  it('handles invalid URL by stripping query string manually', () => {
    expect(getBaseUrl('example.com/users?foo=bar'))
      .toBe('example.com/users');
  });
});

describe('buildUrlWithParams', () => {
  it('builds URL with enabled params', () => {
    const params: KeyValuePair[] = [
      { id: '1', key: 'name', value: 'john', enabled: true },
      { id: '2', key: 'age', value: '30', enabled: true },
    ];
    const url = buildUrlWithParams('https://api.example.com/users', params);
    expect(url).toBe('https://api.example.com/users?name=john&age=30');
  });

  it('excludes disabled params', () => {
    const params: KeyValuePair[] = [
      { id: '1', key: 'name', value: 'john', enabled: true },
      { id: '2', key: 'age', value: '30', enabled: false },
    ];
    const url = buildUrlWithParams('https://api.example.com/users', params);
    expect(url).toBe('https://api.example.com/users?name=john');
  });

  it('excludes params with empty keys', () => {
    const params: KeyValuePair[] = [
      { id: '1', key: '', value: 'john', enabled: true },
      { id: '2', key: 'age', value: '30', enabled: true },
    ];
    const url = buildUrlWithParams('https://api.example.com/users', params);
    expect(url).toBe('https://api.example.com/users?age=30');
  });

  it('returns base URL when no valid params', () => {
    const params: KeyValuePair[] = [
      { id: '1', key: '', value: '', enabled: true },
    ];
    const url = buildUrlWithParams('https://api.example.com/users', params);
    expect(url).toBe('https://api.example.com/users');
  });
});

describe('authToHeaders', () => {
  it('generates Basic auth header', () => {
    const auth: AuthSettings = {
      type: 'basic',
      username: 'user',
      password: 'pass',
    };
    const headers = authToHeaders(auth);
    expect(headers.Authorization).toBe('Basic dXNlcjpwYXNz');
  });

  it('generates Bearer token header', () => {
    const auth: AuthSettings = {
      type: 'bearer',
      token: 'my-token-123',
    };
    const headers = authToHeaders(auth);
    expect(headers.Authorization).toBe('Bearer my-token-123');
  });

  it('generates API key header', () => {
    const auth: AuthSettings = {
      type: 'apikey',
      apiKeyName: 'X-API-Key',
      apiKeyValue: 'secret-key',
      apiKeyLocation: 'header',
    };
    const headers = authToHeaders(auth);
    expect(headers['X-API-Key']).toBe('secret-key');
  });

  it('returns empty object for none auth', () => {
    const auth: AuthSettings = { type: 'none' };
    expect(authToHeaders(auth)).toEqual({});
  });
});

describe('keyValuePairsToHeaders', () => {
  it('converts enabled pairs to headers object', () => {
    const pairs: KeyValuePair[] = [
      { id: '1', key: 'Content-Type', value: 'application/json', enabled: true },
      { id: '2', key: 'Accept', value: 'application/json', enabled: true },
    ];
    const headers = keyValuePairsToHeaders(pairs);
    expect(headers).toEqual({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    });
  });

  it('excludes disabled pairs', () => {
    const pairs: KeyValuePair[] = [
      { id: '1', key: 'Content-Type', value: 'application/json', enabled: true },
      { id: '2', key: 'Accept', value: 'application/json', enabled: false },
    ];
    const headers = keyValuePairsToHeaders(pairs);
    expect(headers).toEqual({ 'Content-Type': 'application/json' });
  });
});

describe('formatJSON', () => {
  it('formats valid JSON', () => {
    const input = '{"name":"john","age":30}';
    const expected = '{\n  "name": "john",\n  "age": 30\n}';
    expect(formatJSON(input)).toBe(expected);
  });

  it('returns original string for invalid JSON', () => {
    const input = 'not json';
    expect(formatJSON(input)).toBe(input);
  });
});

describe('getStatusColor', () => {
  it('returns green for 2xx', () => {
    expect(getStatusColor(200)).toBe('text-ctp-green');
    expect(getStatusColor(201)).toBe('text-ctp-green');
    expect(getStatusColor(299)).toBe('text-ctp-green');
  });

  it('returns yellow for 3xx', () => {
    expect(getStatusColor(301)).toBe('text-ctp-yellow');
    expect(getStatusColor(302)).toBe('text-ctp-yellow');
  });

  it('returns peach for 4xx', () => {
    expect(getStatusColor(400)).toBe('text-ctp-peach');
    expect(getStatusColor(404)).toBe('text-ctp-peach');
  });

  it('returns red for 5xx', () => {
    expect(getStatusColor(500)).toBe('text-ctp-red');
    expect(getStatusColor(503)).toBe('text-ctp-red');
  });
});

describe('getMethodColor', () => {
  it('returns correct color for each method', () => {
    expect(getMethodColor('GET')).toBe('text-ctp-green');
    expect(getMethodColor('POST')).toBe('text-ctp-blue');
    expect(getMethodColor('PUT')).toBe('text-ctp-peach');
    expect(getMethodColor('DELETE')).toBe('text-ctp-red');
    expect(getMethodColor('PATCH')).toBe('text-ctp-mauve');
    expect(getMethodColor('UNKNOWN')).toBe('text-ctp-text');
  });
});

describe('formDataToUrlEncoded', () => {
  it('encodes form data pairs', () => {
    const pairs: KeyValuePair[] = [
      { id: '1', key: 'name', value: 'john doe', enabled: true },
      { id: '2', key: 'email', value: 'john@example.com', enabled: true },
    ];
    expect(formDataToUrlEncoded(pairs)).toBe('name=john%20doe&email=john%40example.com');
  });

  it('excludes disabled pairs', () => {
    const pairs: KeyValuePair[] = [
      { id: '1', key: 'name', value: 'john', enabled: true },
      { id: '2', key: 'email', value: 'john@example.com', enabled: false },
    ];
    expect(formDataToUrlEncoded(pairs)).toBe('name=john');
  });
});

describe('getContentTypeHeader', () => {
  it('returns correct content type for each body type', () => {
    expect(getContentTypeHeader('json')).toEqual({ 'Content-Type': 'application/json' });
    expect(getContentTypeHeader('form-data')).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded' });
    expect(getContentTypeHeader('raw')).toEqual({ 'Content-Type': 'text/plain' });
    expect(getContentTypeHeader('none')).toEqual({});
  });
});

describe('Variable Substitution', () => {
  describe('substituteVariables', () => {
    it('substitutes variables in string', () => {
      const text = 'https://{{baseUrl}}/users/{{userId}}';
      const vars = { baseUrl: 'api.example.com', userId: '123' };
      expect(substituteVariables(text, vars)).toBe('https://api.example.com/users/123');
    });

    it('leaves unresolved variables intact', () => {
      const text = 'https://{{baseUrl}}/users/{{userId}}';
      const vars = { baseUrl: 'api.example.com' };
      expect(substituteVariables(text, vars)).toBe('https://api.example.com/users/{{userId}}');
    });

    it('handles empty variables object', () => {
      const text = 'https://{{baseUrl}}/users';
      expect(substituteVariables(text, {})).toBe(text);
    });

    it('handles text without variables', () => {
      const text = 'https://api.example.com/users';
      expect(substituteVariables(text, { baseUrl: 'test' })).toBe(text);
    });
  });

  describe('substituteHeaderVariables', () => {
    it('substitutes variables in header values', () => {
      const headers = { Authorization: 'Bearer {{token}}' };
      const vars = { token: 'abc123' };
      expect(substituteHeaderVariables(headers, vars))
        .toEqual({ Authorization: 'Bearer abc123' });
    });

    it('substitutes variables in header keys', () => {
      const headers = { '{{headerName}}': 'value' };
      const vars = { headerName: 'X-Custom' };
      expect(substituteHeaderVariables(headers, vars))
        .toEqual({ 'X-Custom': 'value' });
    });
  });

  describe('findVariables', () => {
    it('finds all unique variables in text', () => {
      const text = '{{baseUrl}}/users/{{userId}}?token={{token}}&user={{userId}}';
      expect(findVariables(text)).toEqual(['baseUrl', 'userId', 'token']);
    });

    it('returns empty array for text without variables', () => {
      expect(findVariables('https://api.example.com')).toEqual([]);
    });

    it('handles empty string', () => {
      expect(findVariables('')).toEqual([]);
    });
  });

  describe('hasVariables', () => {
    it('returns true when text has variables', () => {
      expect(hasVariables('{{baseUrl}}/users')).toBe(true);
    });

    it('returns false when text has no variables', () => {
      expect(hasVariables('https://api.example.com')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(hasVariables('')).toBe(false);
    });
  });

  describe('previewSubstitution', () => {
    it('returns substituted text and resolved status', () => {
      const result = previewSubstitution(
        'https://{{baseUrl}}/users',
        { baseUrl: 'api.example.com' }
      );
      expect(result.original).toBe('https://{{baseUrl}}/users');
      expect(result.substituted).toBe('https://api.example.com/users');
      expect(result.hasUnresolved).toBe(false);
    });

    it('indicates unresolved variables', () => {
      const result = previewSubstitution(
        'https://{{baseUrl}}/{{path}}',
        { baseUrl: 'api.example.com' }
      );
      expect(result.hasUnresolved).toBe(true);
    });
  });
});
