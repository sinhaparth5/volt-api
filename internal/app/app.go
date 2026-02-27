package app

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"volt-api/internal/database"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// Build-time variables (set via ldflags)
var (
	Version   = "dev"
	BuildTime = "unknown"
)

// Security limits
const (
	MaxRequestBodySize  = 10 * 1024 * 1024 // 10MB max request body
	MaxResponseBodySize = 50 * 1024 * 1024 // 50MB max response body
	DefaultTimeout      = 30 * time.Second
	MaxTimeout          = 5 * time.Minute
	StreamingThreshold  = 1 * 1024 * 1024  // 1MB: emit progress events above this size
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

// createCustomHTTPClient creates an HTTP client with request-specific settings (proxy, SSL, etc.)
func (a *App) createCustomHTTPClient(request HTTPRequest, timeout time.Duration) *http.Client {
	// Start with TLS config
	tlsConfig := &tls.Config{
		MinVersion: tls.VersionTLS12,
	}

	// Handle SSL verification skip
	if request.SkipSSLVerify {
		tlsConfig.InsecureSkipVerify = true
	}

	// Handle client certificates
	if request.ClientCertPath != "" && request.ClientKeyPath != "" {
		cert, err := tls.LoadX509KeyPair(request.ClientCertPath, request.ClientKeyPath)
		if err == nil {
			tlsConfig.Certificates = []tls.Certificate{cert}
		}
	}

	// Create transport
	transport := &http.Transport{
		TLSClientConfig: tlsConfig,
		DialContext: (&net.Dialer{
			Timeout:   10 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		MaxIdleConns:          100,
		MaxIdleConnsPerHost:   10,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   10 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
		ResponseHeaderTimeout: timeout,
		DisableCompression:    false,
	}

	// Handle proxy
	if request.ProxyURL != "" {
		proxyURL, err := url.Parse(request.ProxyURL)
		if err == nil {
			transport.Proxy = http.ProxyURL(proxyURL)
		}
	}

	// Determine max redirects
	maxRedirects := 10
	if request.MaxRedirects > 0 {
		maxRedirects = request.MaxRedirects
	}

	// Create client with redirect handling
	client := &http.Client{
		Timeout:   timeout,
		Transport: transport,
	}

	// Handle redirect settings
	if !request.FollowRedirects {
		client.CheckRedirect = func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		}
	} else {
		client.CheckRedirect = func(req *http.Request, via []*http.Request) error {
			if len(via) >= maxRedirects {
				return fmt.Errorf("stopped after %d redirects", maxRedirects)
			}
			return nil
		}
	}

	return client
}

// isBinaryContentType checks if the content type indicates binary data
func isBinaryContentType(contentType string) bool {
	ct := strings.ToLower(contentType)

	// Text types that should not be base64 encoded
	textTypes := []string{
		"text/",
		"application/json",
		"application/xml",
		"application/javascript",
		"application/x-www-form-urlencoded",
	}

	for _, t := range textTypes {
		if strings.Contains(ct, t) {
			return false
		}
	}

	// Binary types that should be base64 encoded
	binaryTypes := []string{
		"image/",
		"audio/",
		"video/",
		"application/octet-stream",
		"application/pdf",
		"application/zip",
		"application/gzip",
	}

	for _, t := range binaryTypes {
		if strings.Contains(ct, t) {
			return true
		}
	}

	// If content type is empty or unknown, check if it's printable
	return false
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

	// Create custom HTTP client with request-specific settings
	httpClient := a.createCustomHTTPClient(request, timeout)

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
	resp, err := httpClient.Do(req)
	if err != nil {
		return HTTPResponse{
			Error:    fmt.Sprintf("Request failed: %v", err),
			TimingMs: time.Since(startTime).Milliseconds(),
		}
	}
	defer resp.Body.Close()

	// Read response body, streaming progress events for large payloads
	bodyBytes, err := a.readResponseBody(resp)
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

	// Determine if response is binary and needs base64 encoding
	contentType := resp.Header.Get("Content-Type")
	var bodyStr string
	if isBinaryContentType(contentType) {
		bodyStr = base64.StdEncoding.EncodeToString(bodyBytes)
	} else {
		bodyStr = string(bodyBytes)
	}

	response := HTTPResponse{
		StatusCode:    resp.StatusCode,
		StatusText:    resp.Status,
		Headers:       responseHeaders,
		Body:          bodyStr,
		TimingMs:      time.Since(startTime).Milliseconds(),
		ContentLength: resp.ContentLength,
	}

	// Save to history asynchronously
	if a.db != nil {
		go a.db.SaveRequest(method, request.URL, request.Headers, request.Body, resp.StatusCode, response.TimingMs)
	}

	return response
}

// readResponseBody reads the response body in chunks, emitting response:progress
// events via the Wails runtime for payloads that exceed StreamingThreshold.
func (a *App) readResponseBody(resp *http.Response) ([]byte, error) {
	contentLength := resp.ContentLength // -1 when unknown (chunked transfer, etc.)
	isLarge := contentLength == -1 || contentLength > StreamingThreshold

	const chunkSize = 32 * 1024 // 32KB read buffer
	buf := make([]byte, chunkSize)
	var body bytes.Buffer
	var totalRead int64

	for {
		n, err := resp.Body.Read(buf)
		if n > 0 {
			body.Write(buf[:n])
			totalRead += int64(n)

			// Promote to streaming once we cross the threshold mid-stream
			if !isLarge && totalRead > StreamingThreshold {
				isLarge = true
			}

			if isLarge {
				runtime.EventsEmit(a.ctx, "response:progress", map[string]interface{}{
					"bytesRead": totalRead,
					"total":     contentLength,
				})
			}
		}
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, err
		}
		if totalRead > MaxResponseBodySize {
			return nil, fmt.Errorf("response too large (>%dMB)", MaxResponseBodySize/(1024*1024))
		}
	}

	return body.Bytes(), nil
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

// ExportCollection exports a collection using native file dialog
func (a *App) ExportCollection(id string) error {
	if a.db == nil {
		return fmt.Errorf("database not initialized")
	}

	export, err := a.db.ExportCollection(id)
	if err != nil {
		return err
	}

	data, err := json.MarshalIndent(export, "", "  ")
	if err != nil {
		return err
	}

	// Open native save dialog
	filepath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Export Collection",
		DefaultFilename: export.Name + ".collection.json",
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON Files", Pattern: "*.json"},
		},
	})
	if err != nil {
		return err
	}

	// User cancelled
	if filepath == "" {
		return nil
	}

	// Write file
	return os.WriteFile(filepath, data, 0644)
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

// ============================================================================
// Environment Methods
// ============================================================================

// CreateEnvironment creates a new environment
func (a *App) CreateEnvironment(name string) *Environment {
	if a.db == nil {
		return nil
	}

	id, err := a.db.CreateEnvironment(name)
	if err != nil {
		return nil
	}

	now := time.Now().Unix()
	return &Environment{
		ID:        id,
		Name:      name,
		IsActive:  false,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// GetEnvironments returns all environments
func (a *App) GetEnvironments() []Environment {
	if a.db == nil {
		return []Environment{}
	}

	items, err := a.db.GetEnvironments()
	if err != nil {
		return []Environment{}
	}

	result := make([]Environment, len(items))
	for i, item := range items {
		result[i] = Environment{
			ID:        item.ID,
			Name:      item.Name,
			IsActive:  item.IsActive,
			CreatedAt: item.CreatedAt,
			UpdatedAt: item.UpdatedAt,
		}
	}
	return result
}

// GetActiveEnvironment returns the currently active environment
func (a *App) GetActiveEnvironment() *Environment {
	if a.db == nil {
		return nil
	}

	item, err := a.db.GetActiveEnvironment()
	if err != nil || item == nil {
		return nil
	}

	return &Environment{
		ID:        item.ID,
		Name:      item.Name,
		IsActive:  item.IsActive,
		CreatedAt: item.CreatedAt,
		UpdatedAt: item.UpdatedAt,
	}
}

// SetActiveEnvironment sets an environment as active
func (a *App) SetActiveEnvironment(id string) error {
	if a.db == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.db.SetActiveEnvironment(id)
}

// RenameEnvironment updates an environment's name
func (a *App) RenameEnvironment(id, name string) error {
	if a.db == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.db.RenameEnvironment(id, name)
}

// DeleteEnvironment removes an environment and all its variables
func (a *App) DeleteEnvironment(id string) error {
	if a.db == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.db.DeleteEnvironment(id)
}

// ============================================================================
// Environment Variables Methods
// ============================================================================

// SetEnvironmentVariable creates or updates a variable
func (a *App) SetEnvironmentVariable(environmentID, key, value string, enabled bool) string {
	if a.db == nil {
		return ""
	}

	id, err := a.db.SetEnvironmentVariable(environmentID, key, value, enabled)
	if err != nil {
		return ""
	}
	return id
}

// GetEnvironmentVariables returns all variables for an environment
func (a *App) GetEnvironmentVariables(environmentID string) []EnvironmentVariable {
	if a.db == nil {
		return []EnvironmentVariable{}
	}

	items, err := a.db.GetEnvironmentVariables(environmentID)
	if err != nil {
		return []EnvironmentVariable{}
	}

	result := make([]EnvironmentVariable, len(items))
	for i, item := range items {
		result[i] = EnvironmentVariable{
			ID:            item.ID,
			EnvironmentID: item.EnvironmentID,
			Key:           item.Key,
			Value:         item.Value,
			Enabled:       item.Enabled,
			CreatedAt:     item.CreatedAt,
			UpdatedAt:     item.UpdatedAt,
		}
	}
	return result
}

// GetActiveVariables returns all enabled variables for the active environment
func (a *App) GetActiveVariables() map[string]string {
	if a.db == nil {
		return map[string]string{}
	}

	vars, err := a.db.GetActiveEnvironmentVariables()
	if err != nil {
		return map[string]string{}
	}
	return vars
}

// DeleteEnvironmentVariable removes a variable
func (a *App) DeleteEnvironmentVariable(id string) error {
	if a.db == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.db.DeleteEnvironmentVariable(id)
}

// ============================================================================
// Environment Export/Import Methods
// ============================================================================

// ExportEnvironment exports an environment using native file dialog
func (a *App) ExportEnvironment(id string) error {
	if a.db == nil {
		return fmt.Errorf("database not initialized")
	}

	export, err := a.db.ExportEnvironment(id)
	if err != nil {
		return err
	}

	data, err := json.MarshalIndent(export, "", "  ")
	if err != nil {
		return err
	}

	// Open native save dialog
	filepath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Export Environment",
		DefaultFilename: export.Name + ".env.json",
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON Files", Pattern: "*.json"},
		},
	})
	if err != nil {
		return err
	}

	// User cancelled
	if filepath == "" {
		return nil
	}

	// Write file
	return os.WriteFile(filepath, data, 0644)
}

// ImportEnvironment imports an environment from JSON string
func (a *App) ImportEnvironment(jsonData string) *Environment {
	if a.db == nil {
		return nil
	}

	var export database.EnvironmentExport
	if err := json.Unmarshal([]byte(jsonData), &export); err != nil {
		return nil
	}

	id, err := a.db.ImportEnvironment(&export)
	if err != nil {
		return nil
	}

	now := time.Now().Unix()
	return &Environment{
		ID:        id,
		Name:      export.Name,
		IsActive:  false,
		CreatedAt: now,
		UpdatedAt: now,
	}
}
