package app

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// newTestApp creates an App instance suitable for testing
func newTestApp() *App {
	app := New()
	app.ctx = context.Background()
	return app
}

func TestIsBinaryContentType(t *testing.T) {
	tests := []struct {
		contentType string
		want        bool
	}{
		// Text types - should NOT be binary
		{"text/plain", false},
		{"text/html", false},
		{"text/css", false},
		{"application/json", false},
		{"application/json; charset=utf-8", false},
		{"application/xml", false},
		{"application/javascript", false},
		{"application/x-www-form-urlencoded", false},

		// Binary types - should be binary
		{"image/png", true},
		{"image/jpeg", true},
		{"image/gif", true},
		{"image/webp", true},
		{"audio/mpeg", true},
		{"video/mp4", true},
		{"application/octet-stream", true},
		{"application/pdf", true},
		{"application/zip", true},
		{"application/gzip", true},

		// Edge cases
		{"", false},
		{"unknown/type", false},
		{"IMAGE/PNG", true}, // case insensitive
	}

	for _, tt := range tests {
		t.Run(tt.contentType, func(t *testing.T) {
			got := isBinaryContentType(tt.contentType)
			if got != tt.want {
				t.Errorf("isBinaryContentType(%q) = %v, want %v", tt.contentType, got, tt.want)
			}
		})
	}
}

func TestSendRequest_ValidatesURL(t *testing.T) {
	app := newTestApp()

	tests := []struct {
		name    string
		url     string
		wantErr bool
	}{
		{"empty URL", "", true},
		{"invalid scheme", "ftp://example.com", true},
		{"no scheme", "example.com", true},
		{"http URL", "http://example.com", false},
		{"https URL", "https://example.com", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := app.SendRequest(HTTPRequest{
				Method: "GET",
				URL:    tt.url,
			})

			hasError := resp.Error != ""
			if hasError != tt.wantErr {
				t.Errorf("SendRequest URL=%q error=%q, wantErr=%v", tt.url, resp.Error, tt.wantErr)
			}
		})
	}
}

func TestSendRequest_ValidatesMethod(t *testing.T) {
	app := newTestApp()

	tests := []struct {
		method  string
		wantErr bool
	}{
		{"GET", false},
		{"POST", false},
		{"PUT", false},
		{"DELETE", false},
		{"PATCH", false},
		{"HEAD", false},
		{"OPTIONS", false},
		{"get", false}, // lowercase should work
		{"INVALID", true},
		{"", false}, // empty defaults to GET
	}

	// Use a test server to avoid actual network calls
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	for _, tt := range tests {
		t.Run(tt.method, func(t *testing.T) {
			resp := app.SendRequest(HTTPRequest{
				Method: tt.method,
				URL:    server.URL,
			})

			hasError := resp.Error != ""
			if hasError != tt.wantErr {
				t.Errorf("SendRequest method=%q error=%q, wantErr=%v", tt.method, resp.Error, tt.wantErr)
			}
		})
	}
}

func TestSendRequest_Success(t *testing.T) {
	app := newTestApp()

	// Create test server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify headers
		if r.Header.Get("X-Custom-Header") != "test-value" {
			t.Error("Custom header not received")
		}
		if r.Header.Get("User-Agent") == "" {
			t.Error("User-Agent header missing")
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"message":"hello"}`))
	}))
	defer server.Close()

	resp := app.SendRequest(HTTPRequest{
		Method: "GET",
		URL:    server.URL,
		Headers: map[string]string{
			"X-Custom-Header": "test-value",
		},
	})

	if resp.Error != "" {
		t.Fatalf("Unexpected error: %s", resp.Error)
	}
	if resp.StatusCode != 200 {
		t.Errorf("StatusCode = %d, want 200", resp.StatusCode)
	}
	if resp.Body != `{"message":"hello"}` {
		t.Errorf("Body = %q, want %q", resp.Body, `{"message":"hello"}`)
	}
	if resp.TimingMs < 0 {
		t.Error("TimingMs should not be negative")
	}
}

func TestSendRequest_POST(t *testing.T) {
	app := newTestApp()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			t.Errorf("Method = %s, want POST", r.Method)
		}
		if r.Header.Get("Content-Type") != "application/json" {
			t.Errorf("Content-Type = %s, want application/json", r.Header.Get("Content-Type"))
		}

		w.WriteHeader(http.StatusCreated)
		w.Write([]byte(`{"id":1}`))
	}))
	defer server.Close()

	resp := app.SendRequest(HTTPRequest{
		Method: "POST",
		URL:    server.URL,
		Headers: map[string]string{
			"Content-Type": "application/json",
		},
		Body: `{"name":"test"}`,
	})

	if resp.Error != "" {
		t.Fatalf("Unexpected error: %s", resp.Error)
	}
	if resp.StatusCode != 201 {
		t.Errorf("StatusCode = %d, want 201", resp.StatusCode)
	}
}

func TestSendRequest_Timeout(t *testing.T) {
	app := newTestApp()

	// Server that delays response
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(3 * time.Second)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	resp := app.SendRequest(HTTPRequest{
		Method:  "GET",
		URL:     server.URL,
		Timeout: 1, // 1 second timeout
	})

	if resp.Error == "" {
		t.Error("Expected timeout error")
	}
}

func TestSendRequest_StatusCodes(t *testing.T) {
	app := newTestApp()

	codes := []int{200, 201, 204, 301, 400, 401, 403, 404, 500, 502, 503}

	for _, code := range codes {
		t.Run(http.StatusText(code), func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(code)
			}))
			defer server.Close()

			resp := app.SendRequest(HTTPRequest{
				Method: "GET",
				URL:    server.URL,
			})

			if resp.StatusCode != code {
				t.Errorf("StatusCode = %d, want %d", resp.StatusCode, code)
			}
		})
	}
}

func TestSendRequest_BinaryResponse(t *testing.T) {
	app := newTestApp()

	// Simulated PNG header bytes
	pngData := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/png")
		w.WriteHeader(http.StatusOK)
		w.Write(pngData)
	}))
	defer server.Close()

	resp := app.SendRequest(HTTPRequest{
		Method: "GET",
		URL:    server.URL,
	})

	if resp.Error != "" {
		t.Fatalf("Unexpected error: %s", resp.Error)
	}

	// Binary content should be base64 encoded
	// Base64 of pngData is "iVBORw0KGgo="
	if resp.Body == "" {
		t.Error("Body should not be empty for binary response")
	}
}

func TestSendRequest_FollowRedirects(t *testing.T) {
	app := newTestApp()

	finalServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("final"))
	}))
	defer finalServer.Close()

	redirectServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, finalServer.URL, http.StatusFound)
	}))
	defer redirectServer.Close()

	// Test following redirects (default)
	resp := app.SendRequest(HTTPRequest{
		Method:          "GET",
		URL:             redirectServer.URL,
		FollowRedirects: true,
	})

	if resp.StatusCode != 200 {
		t.Errorf("Expected 200 after redirect, got %d", resp.StatusCode)
	}
	if resp.Body != "final" {
		t.Errorf("Expected 'final' body, got %q", resp.Body)
	}

	// Test not following redirects
	resp = app.SendRequest(HTTPRequest{
		Method:          "GET",
		URL:             redirectServer.URL,
		FollowRedirects: false,
	})

	if resp.StatusCode != 302 {
		t.Errorf("Expected 302 without following redirect, got %d", resp.StatusCode)
	}
}

func TestCreateCustomHTTPClient(t *testing.T) {
	app := newTestApp()

	// Test with default settings
	client := app.createCustomHTTPClient(HTTPRequest{}, 30*time.Second)
	if client == nil {
		t.Error("Client should not be nil")
	}
	if client.Timeout != 30*time.Second {
		t.Errorf("Timeout = %v, want 30s", client.Timeout)
	}

	// Test with SSL skip verify
	client = app.createCustomHTTPClient(HTTPRequest{
		SkipSSLVerify: true,
	}, 30*time.Second)
	if client == nil {
		t.Error("Client should not be nil with SkipSSLVerify")
	}

	// Test with proxy
	client = app.createCustomHTTPClient(HTTPRequest{
		ProxyURL: "http://localhost:8080",
	}, 30*time.Second)
	if client == nil {
		t.Error("Client should not be nil with proxy")
	}
}
