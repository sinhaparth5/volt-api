package app

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"volt-api/internal/database"
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

// App is the main application struct
type App struct {
	ctx        context.Context
	httpClient *http.Client
	db         *database.Database
}

// New creates a new App instance
func New() *App {
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

// Startup is called when the app starts
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx

	// Initialize database
	db, err := database.New()
	if err != nil {
		fmt.Printf("Warning: Could not initialize database: %v\n", err)
		return
	}
	a.db = db
}

// Shutdown is called when the app closes
func (a *App) Shutdown(ctx context.Context) {
	if a.db != nil {
		a.db.Close()
	}
}

// GetAppInfo returns application version and build info
func (a *App) GetAppInfo() AppInfo {
	return AppInfo{
		Version:   Version,
		BuildTime: BuildTime,
	}
}

// GetHistory returns recent request history
func (a *App) GetHistory(limit int, search string) []HistoryItem {
	if a.db == nil {
		return []HistoryItem{}
	}
	if limit <= 0 {
		limit = 50
	}

	items, err := a.db.GetHistory(limit, search)
	if err != nil {
		return []HistoryItem{}
	}

	// Convert database.HistoryItem to app.HistoryItem
	result := make([]HistoryItem, len(items))
	for i, item := range items {
		result[i] = HistoryItem{
			ID:         item.ID,
			Method:     item.Method,
			URL:        item.URL,
			Headers:    item.Headers,
			Body:       item.Body,
			StatusCode: item.StatusCode,
			TimingMs:   item.TimingMs,
			CreatedAt:  item.CreatedAt,
		}
	}
	return result
}

// LoadHistoryItem retrieves full details of a history item
func (a *App) LoadHistoryItem(id string) *HistoryItem {
	if a.db == nil {
		return nil
	}

	item, err := a.db.GetHistoryItem(id)
	if err != nil {
		return nil
	}

	return &HistoryItem{
		ID:         item.ID,
		Method:     item.Method,
		URL:        item.URL,
		Headers:    item.Headers,
		Body:       item.Body,
		StatusCode: item.StatusCode,
		TimingMs:   item.TimingMs,
		CreatedAt:  item.CreatedAt,
	}
}

// DeleteHistoryItem removes a single history entry
func (a *App) DeleteHistoryItem(id string) error {
	if a.db == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.db.DeleteHistoryItem(id)
}

// ClearHistory removes all history entries
func (a *App) ClearHistory() error {
	if a.db == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.db.ClearHistory()
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
		lowerKey := strings.ToLower(key)
		if lowerKey == "host" {
			continue
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

	response := HTTPResponse{
		StatusCode:    resp.StatusCode,
		StatusText:    resp.Status,
		Headers:       responseHeaders,
		Body:          string(bodyBytes),
		TimingMs:      time.Since(startTime).Milliseconds(),
		ContentLength: resp.ContentLength,
	}

	// Save to history asynchronously
	if a.db != nil {
		go a.db.SaveRequest(method, request.URL, request.Headers, request.Body, resp.StatusCode, response.TimingMs)
	}

	return response
}

// ============================================================================
// Collections Methods
// ============================================================================

// CreateCollection creates a new collection
func (a *App) CreateCollection(name string) *Collection {
	if a.db == nil {
		return nil
	}

	id, err := a.db.CreateCollection(name)
	if err != nil {
		return nil
	}

	now := time.Now().Unix()
	return &Collection{
		ID:        id,
		Name:      name,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// GetCollections returns all collections
func (a *App) GetCollections() []Collection {
	if a.db == nil {
		return []Collection{}
	}

	items, err := a.db.GetCollections()
	if err != nil {
		return []Collection{}
	}

	result := make([]Collection, len(items))
	for i, item := range items {
		result[i] = Collection{
			ID:        item.ID,
			Name:      item.Name,
			CreatedAt: item.CreatedAt,
			UpdatedAt: item.UpdatedAt,
		}
	}
	return result
}

// RenameCollection updates a collection's name
func (a *App) RenameCollection(id, name string) error {
	if a.db == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.db.RenameCollection(id, name)
}

// DeleteCollection removes a collection and all its saved requests
func (a *App) DeleteCollection(id string) error {
	if a.db == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.db.DeleteCollection(id)
}

// ============================================================================
// Saved Requests Methods
// ============================================================================

// SaveRequestToCollection saves a request to a collection
func (a *App) SaveRequestToCollection(collectionID string, input SaveRequestInput) *SavedRequest {
	if a.db == nil {
		return nil
	}

	id, err := a.db.SaveRequestToCollection(collectionID, input.Name, input.Method, input.URL, input.Headers, input.Body)
	if err != nil {
		return nil
	}

	now := time.Now().Unix()
	return &SavedRequest{
		ID:           id,
		CollectionID: collectionID,
		Name:         input.Name,
		Method:       input.Method,
		URL:          input.URL,
		Headers:      input.Headers,
		Body:         input.Body,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
}

// GetCollectionRequests returns all requests in a collection
func (a *App) GetCollectionRequests(collectionID string) []SavedRequest {
	if a.db == nil {
		return []SavedRequest{}
	}

	items, err := a.db.GetCollectionRequests(collectionID)
	if err != nil {
		return []SavedRequest{}
	}

	result := make([]SavedRequest, len(items))
	for i, item := range items {
		result[i] = SavedRequest{
			ID:           item.ID,
			CollectionID: item.CollectionID,
			Name:         item.Name,
			Method:       item.Method,
			URL:          item.URL,
			Headers:      item.Headers,
			Body:         item.Body,
			CreatedAt:    item.CreatedAt,
			UpdatedAt:    item.UpdatedAt,
		}
	}
	return result
}

// LoadSavedRequest retrieves full details of a saved request
func (a *App) LoadSavedRequest(id string) *SavedRequest {
	if a.db == nil {
		return nil
	}

	item, err := a.db.GetSavedRequest(id)
	if err != nil {
		return nil
	}

	return &SavedRequest{
		ID:           item.ID,
		CollectionID: item.CollectionID,
		Name:         item.Name,
		Method:       item.Method,
		URL:          item.URL,
		Headers:      item.Headers,
		Body:         item.Body,
		CreatedAt:    item.CreatedAt,
		UpdatedAt:    item.UpdatedAt,
	}
}

// UpdateSavedRequest updates a saved request
func (a *App) UpdateSavedRequest(id string, input SaveRequestInput) error {
	if a.db == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.db.UpdateSavedRequest(id, input.Name, input.Method, input.URL, input.Headers, input.Body)
}

// MoveSavedRequest moves a saved request to a different collection
func (a *App) MoveSavedRequest(id, newCollectionID string) error {
	if a.db == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.db.MoveSavedRequest(id, newCollectionID)
}

// DeleteSavedRequest removes a saved request
func (a *App) DeleteSavedRequest(id string) error {
	if a.db == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.db.DeleteSavedRequest(id)
}

// ============================================================================
// Export/Import Methods
// ============================================================================

// ExportCollection exports a collection as JSON string
func (a *App) ExportCollection(id string) string {
	if a.db == nil {
		return ""
	}

	export, err := a.db.ExportCollection(id)
	if err != nil {
		return ""
	}

	data, err := json.MarshalIndent(export, "", "  ")
	if err != nil {
		return ""
	}

	return string(data)
}

// ImportCollection imports a collection from JSON string
func (a *App) ImportCollection(jsonData string) *Collection {
	if a.db == nil {
		return nil
	}

	var export database.CollectionExport
	if err := json.Unmarshal([]byte(jsonData), &export); err != nil {
		return nil
	}

	id, err := a.db.ImportCollection(&export)
	if err != nil {
		return nil
	}

	now := time.Now().Unix()
	return &Collection{
		ID:        id,
		Name:      export.Name,
		CreatedAt: now,
		UpdatedAt: now,
	}
}
