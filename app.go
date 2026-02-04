package main

import (
	"context"
	"crypto/tls"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Build-time variables (set via ldflags)
var (
	Version   = "dev"
	BuildTime = "unknown"
)

// Security limits
const (
	MaxRequestBodySize  = 10 * 1024 * 1024  // 10MB max request body
	MaxResponseBodySize = 50 * 1024 * 1024  // 50MB max response body
	DefaultTimeout      = 30 * time.Second
	MaxTimeout          = 5 * time.Minute
)

// HTTPRequest represents the request from the frontend
type HTTPRequest struct {
	Method  string            `json:"method"`
	URL     string            `json:"url"`
	Headers map[string]string `json:"headers"`
	Body    string            `json:"body"`
	Timeout int               `json:"timeout"` // timeout in seconds, 0 = default
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

// AppInfo contains application metadata
type AppInfo struct {
	Version   string `json:"version"`
	BuildTime string `json:"buildTime"`
}

// App struct
type App struct {
	ctx        context.Context
	httpClient *http.Client
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		httpClient: createSecureHTTPClient(),
	}
}

// createSecureHTTPClient creates an HTTP client with security best practices
func createSecureHTTPClient() *http.Client {
	return &http.Client{
		Timeout: DefaultTimeout,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				MinVersion: tls.VersionTLS12,
				CipherSuites: []uint16{
					tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
					tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
					tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
					tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
					tls.TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305,
					tls.TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305,
				},
			},
			DialContext: (&net.Dialer{
				Timeout:   10 * time.Second,
				KeepAlive: 30 * time.Second,
			}).DialContext,
			MaxIdleConns:          100,
			MaxIdleConnsPerHost:   10,
			IdleConnTimeout:       90 * time.Second,
			TLSHandshakeTimeout:   10 * time.Second,
			ExpectContinueTimeout: 1 * time.Second,
			ResponseHeaderTimeout: 30 * time.Second,
			DisableCompression:    false,
		},
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 10 {
				return fmt.Errorf("stopped after 10 redirects")
			}
			return nil
		},
	}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// GetAppInfo returns application version and build info
func (a *App) GetAppInfo() AppInfo {
	return AppInfo{
		Version:   Version,
		BuildTime: BuildTime,
	}
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

	// Parse and validate URL
	parsedURL, err := url.Parse(request.URL)
	if err != nil {
		return HTTPResponse{Error: fmt.Sprintf("Invalid URL: %v", err)}
	}

	// Ensure scheme is http or https
	if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
		return HTTPResponse{Error: "URL must start with http:// or https://"}
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

	// Validate request body size
	if len(request.Body) > MaxRequestBodySize {
		return HTTPResponse{Error: fmt.Sprintf("Request body too large (max %d MB)", MaxRequestBodySize/1024/1024)}
	}

	// Create request body reader
	var bodyReader io.Reader
	if request.Body != "" {
		bodyReader = strings.NewReader(request.Body)
	}

	// Determine timeout
	timeout := DefaultTimeout
	if request.Timeout > 0 {
		timeout = time.Duration(request.Timeout) * time.Second
		if timeout > MaxTimeout {
			timeout = MaxTimeout
		}
	}

	// Create context with timeout
	ctx, cancel := context.WithTimeout(a.ctx, timeout)
	defer cancel()

	// Create HTTP request
	req, err := http.NewRequestWithContext(ctx, method, request.URL, bodyReader)
	if err != nil {
		return HTTPResponse{Error: fmt.Sprintf("Failed to create request: %v", err)}
	}

	// Add headers
	for key, value := range request.Headers {
		// Skip potentially dangerous headers
		lowerKey := strings.ToLower(key)
		if lowerKey == "host" {
			continue // Let Go set this automatically
		}
		req.Header.Set(key, value)
	}

	// Set default User-Agent if not provided
	if req.Header.Get("User-Agent") == "" {
		req.Header.Set("User-Agent", fmt.Sprintf("Volt-API/%s", Version))
	}

	// Send request
	resp, err := a.httpClient.Do(req)
	if err != nil {
		return HTTPResponse{
			Error:    fmt.Sprintf("Request failed: %v", err),
			TimingMs: time.Since(startTime).Milliseconds(),
		}
	}
	defer resp.Body.Close()

	// Read response body with size limit
	limitedReader := io.LimitReader(resp.Body, MaxResponseBodySize)
	bodyBytes, err := io.ReadAll(limitedReader)
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
