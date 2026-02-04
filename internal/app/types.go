package app

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
