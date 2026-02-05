package app

// HTTPRequest represents the request from the frontend
type HTTPRequest struct {
	Method            string            `json:"method"`
	URL               string            `json:"url"`
	Headers           map[string]string `json:"headers"`
	Body              string            `json:"body"`
	Timeout           int               `json:"timeout"`           // timeout in seconds, 0 = default
	ProxyURL          string            `json:"proxyUrl"`          // proxy URL (e.g., http://localhost:8080)
	SkipSSLVerify     bool              `json:"skipSslVerify"`     // skip SSL certificate verification
	ClientCertPath    string            `json:"clientCertPath"`    // path to client certificate
	ClientKeyPath     string            `json:"clientKeyPath"`     // path to client key
	FollowRedirects   bool              `json:"followRedirects"`   // follow HTTP redirects (default true)
	MaxRedirects      int               `json:"maxRedirects"`      // max redirects to follow (default 10)
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

// HistoryItem represents a saved request in history (re-exported from database)
type HistoryItem struct {
	ID         string            `json:"id"`
	Method     string            `json:"method"`
	URL        string            `json:"url"`
	Headers    map[string]string `json:"headers"`
	Body       string            `json:"body"`
	StatusCode int               `json:"statusCode"`
	TimingMs   int64             `json:"timingMs"`
	CreatedAt  int64             `json:"createdAt"`
}

// Collection represents a folder for organizing saved requests
type Collection struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	CreatedAt int64  `json:"createdAt"`
	UpdatedAt int64  `json:"updatedAt"`
}

// SavedRequest represents a request saved to a collection
type SavedRequest struct {
	ID           string            `json:"id"`
	CollectionID string            `json:"collectionId"`
	Name         string            `json:"name"`
	Method       string            `json:"method"`
	URL          string            `json:"url"`
	Headers      map[string]string `json:"headers"`
	Body         string            `json:"body"`
	CreatedAt    int64             `json:"createdAt"`
	UpdatedAt    int64             `json:"updatedAt"`
}

// SaveRequestInput is the input for saving a request to a collection
type SaveRequestInput struct {
	Name    string            `json:"name"`
	Method  string            `json:"method"`
	URL     string            `json:"url"`
	Headers map[string]string `json:"headers"`
	Body    string            `json:"body"`
}

// CollectionExport represents a collection with its requests for export/import
type CollectionExport struct {
	Name     string         `json:"name"`
	Requests []SavedRequest `json:"requests"`
}

// Environment represents a named environment (e.g., Dev, Staging, Prod)
type Environment struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	IsActive  bool   `json:"isActive"`
	CreatedAt int64  `json:"createdAt"`
	UpdatedAt int64  `json:"updatedAt"`
}

// EnvironmentVariable represents a variable within an environment
type EnvironmentVariable struct {
	ID            string `json:"id"`
	EnvironmentID string `json:"environmentId"`
	Key           string `json:"key"`
	Value         string `json:"value"`
	Enabled       bool   `json:"enabled"`
	CreatedAt     int64  `json:"createdAt"`
	UpdatedAt     int64  `json:"updatedAt"`
}

// EnvironmentExport represents an environment with its variables for export/import
type EnvironmentExport struct {
	Name      string                `json:"name"`
	Variables []EnvironmentVariable `json:"variables"`
}

// Assertion represents a test assertion for a response
type Assertion struct {
	ID       string `json:"id"`
	Type     string `json:"type"`     // "status", "responseTime", "bodyContains", "bodyJson", "headerExists", "headerEquals"
	Property string `json:"property"` // For JSON path or header name
	Operator string `json:"operator"` // "equals", "notEquals", "contains", "lessThan", "greaterThan", "exists", "matches"
	Expected string `json:"expected"` // Expected value
	Enabled  bool   `json:"enabled"`
}

// AssertionResult represents the result of running an assertion
type AssertionResult struct {
	AssertionID string `json:"assertionId"`
	Passed      bool   `json:"passed"`
	Actual      string `json:"actual"`
	Message     string `json:"message"`
}
