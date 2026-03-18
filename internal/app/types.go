package app

type HTTPRequest struct {
	Method          string            `json:"method"`
	URL             string            `json:"url"`
	Headers         map[string]string `json:"headers"`
	Body            string            `json:"body"`
	Timeout         int               `json:"timeout"`
	ProxyURL        string            `json:"proxyUrl"`
	SkipSSLVerify   bool              `json:"skipSslVerify"`
	ClientCertPath  string            `json:"clientCertPath"`
	ClientKeyPath   string            `json:"clientKeyPath"`
	FollowRedirects bool              `json:"followRedirects"`
	MaxRedirects    int               `json:"maxRedirects"`
}

type HTTPResponse struct {
	StatusCode    int               `json:"statusCode"`
	StatusText    string            `json:"statusText"`
	Headers       map[string]string `json:"headers"`
	Body          string            `json:"body"`
	TimingMs      int64             `json:"timingMs"`
	ContentLength int64             `json:"contentLength"`
	Error         string            `json:"error,omitempty"`
}

type AppInfo struct {
	Version   string `json:"version"`
	BuildTime string `json:"buildTime"`
}

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

type Collection struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	CreatedAt int64  `json:"createdAt"`
	UpdatedAt int64  `json:"updatedAt"`
}

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

type SaveRequestInput struct {
	Name    string            `json:"name"`
	Method  string            `json:"method"`
	URL     string            `json:"url"`
	Headers map[string]string `json:"headers"`
	Body    string            `json:"body"`
}

type CollectionExport struct {
	Name     string         `json:"name"`
	Requests []SavedRequest `json:"requests"`
}

type Environment struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	IsActive  bool   `json:"isActive"`
	CreatedAt int64  `json:"createdAt"`
	UpdatedAt int64  `json:"updatedAt"`
}

type EnvironmentVariable struct {
	ID            string `json:"id"`
	EnvironmentID string `json:"environmentId"`
	Key           string `json:"key"`
	Value         string `json:"value"`
	Enabled       bool   `json:"enabled"`
	CreatedAt     int64  `json:"createdAt"`
	UpdatedAt     int64  `json:"updatedAt"`
}

type EnvironmentExport struct {
	Name      string                `json:"name"`
	Variables []EnvironmentVariable `json:"variables"`
}

type Assertion struct {
	ID       string `json:"id"`
	Type     string `json:"type"`
	Property string `json:"property"`
	Operator string `json:"operator"`
	Expected string `json:"expected"`
	Enabled  bool   `json:"enabled"`
}

type AssertionResult struct {
	AssertionID string `json:"assertionId"`
	Passed      bool   `json:"passed"`
	Actual      string `json:"actual"`
	Message     string `json:"message"`
}
