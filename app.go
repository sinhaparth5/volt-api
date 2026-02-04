package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// HTTPRequest represents the request from the frontend
type HTTPRequest struct {
	Method  string            `json:"method"`
	URL     string            `json:"url"`
	Headers map[string]string `json:"headers"`
	Body    string            `json:"body"`
}

// HTTPResponse represents the response to the frontend
type HTTPResponse struct {
	StatusCode    int               `json:"statusCode"`
	StatusText    string            `json:"statusText"`
	Headers       map[string]string `json:"headers"`
	Body          string            `json:"body"`
	TimingMs      int64             `json:"timingMs"`
	ContentLength int64             `json:"contentLength"`
	Error         string            `json:"error,omitempty"`
}

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

// SendRequest makes an HTTP request and returns the response
func (a *App) SendRequest(request HTTPRequest) HTTPResponse {
	startTime := time.Now()

	// Validate URL
	if request.URL == "" {
		return HTTPResponse{Error: "URL is required"}
	}

	// Validate method
	validMethods := map[string]bool{
		"GET": true, "POST": true, "PUT": true,
		"DELETE": true, "PATCH": true, "HEAD": true, "OPTIONS": true,
	}
	method := strings.ToUpper(request.Method)
	if method == "" {
		method = "GET"
	}
	if !validMethods[method] {
		return HTTPResponse{Error: "Invalid HTTP method"}
	}

	// Create request body reader
	var bodyReader io.Reader
	if request.Body != "" {
		bodyReader = strings.NewReader(request.Body)
	}

	// Create HTTP request
	req, err := http.NewRequest(method, request.URL, bodyReader)
	if err != nil {
		return HTTPResponse{Error: fmt.Sprintf("Failed to create request: %v", err)}
	}

	// Add headers
	for key, value := range request.Headers {
		req.Header.Set(key, value)
	}

	// Set default User-Agent if not provided
	if req.Header.Get("User-Agent") == "" {
		req.Header.Set("User-Agent", "Volt-API/1.0")
	}

	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Send request
	resp, err := client.Do(req)
	if err != nil {
		return HTTPResponse{
			Error:    fmt.Sprintf("Request failed: %v", err),
			TimingMs: time.Since(startTime).Milliseconds(),
		}
	}
	defer resp.Body.Close()

	// Read response body
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return HTTPResponse{
			StatusCode: resp.StatusCode,
			StatusText: resp.Status,
			Error:      fmt.Sprintf("Failed to read response body: %v", err),
			TimingMs:   time.Since(startTime).Milliseconds(),
		}
	}

	// Convert response headers to map
	responseHeaders := make(map[string]string)
	for key, values := range resp.Header {
		responseHeaders[key] = strings.Join(values, ", ")
	}

	return HTTPResponse{
		StatusCode:    resp.StatusCode,
		StatusText:    resp.Status,
		Headers:       responseHeaders,
		Body:          string(bodyBytes),
		TimingMs:      time.Since(startTime).Milliseconds(),
		ContentLength: resp.ContentLength,
	}
}
