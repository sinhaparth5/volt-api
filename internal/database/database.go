package database

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	_ "modernc.org/sqlite"
)

// HistoryItem represents a saved request in history
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

// CollectionExport represents a collection with its requests for export/import
type CollectionExport struct {
	Name     string         `json:"name"`
	Requests []SavedRequest `json:"requests"`
}

// Database handles SQLite operations for request history
type Database struct {
	db *sql.DB
	mu sync.RWMutex // Protect concurrent access

	// Prepared statements for better performance
	stmtInsert    *sql.Stmt
	stmtGetAll    *sql.Stmt
	stmtGetByID   *sql.Stmt
	stmtDelete    *sql.Stmt
	stmtDeleteAll *sql.Stmt
}

// getDataDir returns the appropriate data directory for the current OS
func getDataDir() (string, error) {
	var baseDir string

	switch runtime.GOOS {
	case "windows":
		baseDir = os.Getenv("APPDATA")
		if baseDir == "" {
			baseDir = filepath.Join(os.Getenv("USERPROFILE"), "AppData", "Roaming")
		}
	case "darwin":
		homeDir, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		baseDir = filepath.Join(homeDir, "Library", "Application Support")
	default: // Linux and others
		baseDir = os.Getenv("XDG_DATA_HOME")
		if baseDir == "" {
			homeDir, err := os.UserHomeDir()
			if err != nil {
				return "", err
			}
			baseDir = filepath.Join(homeDir, ".local", "share")
		}
	}

	dataDir := filepath.Join(baseDir, "volt-api")

	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create data directory: %w", err)
	}

	return dataDir, nil
}

// New creates and initializes the SQLite database with optimizations
func New() (*Database, error) {
	dataDir, err := getDataDir()
	if err != nil {
		return nil, err
	}

	dbPath := filepath.Join(dataDir, "history.db")

	// Open with optimized settings
	db, err := sql.Open("sqlite", dbPath+"?_journal_mode=WAL&_synchronous=NORMAL&_cache_size=10000")
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Connection pool settings for better performance
	db.SetMaxOpenConns(1) // SQLite works best with single connection
	db.SetMaxIdleConns(1)
	db.SetConnMaxLifetime(time.Hour)

	// Create tables
	if err := createTables(db); err != nil {
		db.Close()
		return nil, err
	}

	d := &Database{db: db}

	// Prepare statements for better performance
	if err := d.prepareStatements(); err != nil {
		db.Close()
		return nil, err
	}

	return d, nil
}

func createTables(db *sql.DB) error {
	schema := `
		CREATE TABLE IF NOT EXISTS history (
			id TEXT PRIMARY KEY,
			method TEXT NOT NULL,
			url TEXT NOT NULL,
			headers TEXT,
			body TEXT,
			status_code INTEGER,
			timing_ms INTEGER,
			created_at INTEGER NOT NULL
		);

		CREATE INDEX IF NOT EXISTS idx_history_created_at ON history(created_at DESC);

		CREATE TABLE IF NOT EXISTS collections (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);

		CREATE INDEX IF NOT EXISTS idx_collections_name ON collections(name);

		CREATE TABLE IF NOT EXISTS saved_requests (
			id TEXT PRIMARY KEY,
			collection_id TEXT NOT NULL,
			name TEXT NOT NULL,
			method TEXT NOT NULL,
			url TEXT NOT NULL,
			headers TEXT,
			body TEXT,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
		);

		CREATE INDEX IF NOT EXISTS idx_saved_requests_collection ON saved_requests(collection_id);
	`

	// Enable foreign keys
	_, err := db.Exec("PRAGMA foreign_keys = ON")
	if err != nil {
		return fmt.Errorf("failed to enable foreign keys: %w", err)
	}

	_, err = db.Exec(schema)
	if err != nil {
		return fmt.Errorf("failed to create tables: %w", err)
	}

	return nil
}

func (d *Database) prepareStatements() error {
	var err error

	d.stmtInsert, err = d.db.Prepare(`
		INSERT INTO history (id, method, url, headers, body, status_code, timing_ms, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`)
	if err != nil {
		return err
	}

	d.stmtGetAll, err = d.db.Prepare(`
		SELECT id, method, url, headers, body, status_code, timing_ms, created_at
		FROM history
		ORDER BY created_at DESC
		LIMIT ?
	`)
	if err != nil {
		return err
	}

	d.stmtGetByID, err = d.db.Prepare(`
		SELECT id, method, url, headers, body, status_code, timing_ms, created_at
		FROM history
		WHERE id = ?
	`)
	if err != nil {
		return err
	}

	d.stmtDelete, err = d.db.Prepare(`DELETE FROM history WHERE id = ?`)
	if err != nil {
		return err
	}

	d.stmtDeleteAll, err = d.db.Prepare(`DELETE FROM history`)
	if err != nil {
		return err
	}

	return nil
}

// Close closes the database connection
func (d *Database) Close() error {
	d.mu.Lock()
	defer d.mu.Unlock()

	if d.stmtInsert != nil {
		d.stmtInsert.Close()
	}
	if d.stmtGetAll != nil {
		d.stmtGetAll.Close()
	}
	if d.stmtGetByID != nil {
		d.stmtGetByID.Close()
	}
	if d.stmtDelete != nil {
		d.stmtDelete.Close()
	}
	if d.stmtDeleteAll != nil {
		d.stmtDeleteAll.Close()
	}

	if d.db != nil {
		return d.db.Close()
	}
	return nil
}

// sensitiveHeaders lists headers that should not be stored in history
var sensitiveHeaders = map[string]bool{
	"authorization":       true,
	"cookie":              true,
	"set-cookie":          true,
	"x-api-key":           true,
	"x-auth-token":        true,
	"x-access-token":      true,
	"api-key":             true,
	"bearer":              true,
	"proxy-authorization": true,
}

// filterSensitiveHeaders removes sensitive headers before storing
func filterSensitiveHeaders(headers map[string]string) map[string]string {
	if headers == nil {
		return nil
	}
	filtered := make(map[string]string, len(headers))
	for k, v := range headers {
		// Check lowercase version of header name
		if !sensitiveHeaders[strings.ToLower(k)] {
			filtered[k] = v
		}
	}
	return filtered
}

// SaveRequest saves a request and response to history
func (d *Database) SaveRequest(method, url string, headers map[string]string, body string, statusCode int, timingMs int64) (string, error) {
	d.mu.Lock()
	defer d.mu.Unlock()

	id := uuid.New().String()
	createdAt := time.Now().Unix()

	// Filter out sensitive headers before saving
	safeHeaders := filterSensitiveHeaders(headers)
	headersJSON, err := json.Marshal(safeHeaders)
	if err != nil {
		headersJSON = []byte("{}")
	}

	_, err = d.stmtInsert.Exec(id, method, url, string(headersJSON), body, statusCode, timingMs, createdAt)
	if err != nil {
		return "", fmt.Errorf("failed to save request: %w", err)
	}

	return id, nil
}

// GetHistory retrieves request history with optional search filter
func (d *Database) GetHistory(limit int, search string) ([]HistoryItem, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	var rows *sql.Rows
	var err error

	if search != "" {
		// Use dynamic query for search
		query := `
			SELECT id, method, url, headers, body, status_code, timing_ms, created_at
			FROM history
			WHERE url LIKE ? OR method LIKE ?
			ORDER BY created_at DESC
			LIMIT ?
		`
		searchPattern := "%" + search + "%"
		rows, err = d.db.Query(query, searchPattern, searchPattern, limit)
	} else {
		rows, err = d.stmtGetAll.Query(limit)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to query history: %w", err)
	}
	defer rows.Close()

	items := make([]HistoryItem, 0, limit)
	for rows.Next() {
		var item HistoryItem
		var headersJSON string

		err := rows.Scan(&item.ID, &item.Method, &item.URL, &headersJSON, &item.Body, &item.StatusCode, &item.TimingMs, &item.CreatedAt)
		if err != nil {
			continue
		}

		if headersJSON != "" {
			json.Unmarshal([]byte(headersJSON), &item.Headers)
		}
		if item.Headers == nil {
			item.Headers = make(map[string]string)
		}

		items = append(items, item)
	}

	return items, nil
}

// GetHistoryItem retrieves a single history item by ID
func (d *Database) GetHistoryItem(id string) (*HistoryItem, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	var item HistoryItem
	var headersJSON string

	err := d.stmtGetByID.QueryRow(id).Scan(&item.ID, &item.Method, &item.URL, &headersJSON, &item.Body, &item.StatusCode, &item.TimingMs, &item.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to get history item: %w", err)
	}

	if headersJSON != "" {
		json.Unmarshal([]byte(headersJSON), &item.Headers)
	}
	if item.Headers == nil {
		item.Headers = make(map[string]string)
	}

	return &item, nil
}

// DeleteHistoryItem removes a single history entry
func (d *Database) DeleteHistoryItem(id string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.stmtDelete.Exec(id)
	if err != nil {
		return fmt.Errorf("failed to delete history item: %w", err)
	}
	return nil
}

// ClearHistory removes all history entries
func (d *Database) ClearHistory() error {
	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.stmtDeleteAll.Exec()
	if err != nil {
		return fmt.Errorf("failed to clear history: %w", err)
	}
	return nil
}

// ============================================================================
// Collections Methods
// ============================================================================

// CreateCollection creates a new collection and returns its ID
func (d *Database) CreateCollection(name string) (string, error) {
	d.mu.Lock()
	defer d.mu.Unlock()

	id := uuid.New().String()
	now := time.Now().Unix()

	_, err := d.db.Exec(
		"INSERT INTO collections (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
		id, name, now, now,
	)
	if err != nil {
		return "", fmt.Errorf("failed to create collection: %w", err)
	}

	return id, nil
}

// GetCollections returns all collections
func (d *Database) GetCollections() ([]Collection, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	rows, err := d.db.Query("SELECT id, name, created_at, updated_at FROM collections ORDER BY name ASC")
	if err != nil {
		return nil, fmt.Errorf("failed to query collections: %w", err)
	}
	defer rows.Close()

	collections := make([]Collection, 0)
	for rows.Next() {
		var c Collection
		if err := rows.Scan(&c.ID, &c.Name, &c.CreatedAt, &c.UpdatedAt); err != nil {
			continue
		}
		collections = append(collections, c)
	}

	return collections, nil
}

// GetCollection returns a single collection by ID
func (d *Database) GetCollection(id string) (*Collection, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	var c Collection
	err := d.db.QueryRow("SELECT id, name, created_at, updated_at FROM collections WHERE id = ?", id).
		Scan(&c.ID, &c.Name, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to get collection: %w", err)
	}

	return &c, nil
}

// RenameCollection updates a collection's name
func (d *Database) RenameCollection(id, name string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	now := time.Now().Unix()
	_, err := d.db.Exec("UPDATE collections SET name = ?, updated_at = ? WHERE id = ?", name, now, id)
	if err != nil {
		return fmt.Errorf("failed to rename collection: %w", err)
	}
	return nil
}

// DeleteCollection removes a collection and all its saved requests (via CASCADE)
func (d *Database) DeleteCollection(id string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.db.Exec("DELETE FROM collections WHERE id = ?", id)
	if err != nil {
		return fmt.Errorf("failed to delete collection: %w", err)
	}
	return nil
}

// ============================================================================
// Saved Requests Methods
// ============================================================================

// SaveRequestToCollection saves a request to a collection
func (d *Database) SaveRequestToCollection(collectionID, name, method, url string, headers map[string]string, body string) (string, error) {
	d.mu.Lock()
	defer d.mu.Unlock()

	id := uuid.New().String()
	now := time.Now().Unix()

	headersJSON, err := json.Marshal(headers)
	if err != nil {
		headersJSON = []byte("{}")
	}

	_, err = d.db.Exec(
		"INSERT INTO saved_requests (id, collection_id, name, method, url, headers, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
		id, collectionID, name, method, url, string(headersJSON), body, now, now,
	)
	if err != nil {
		return "", fmt.Errorf("failed to save request: %w", err)
	}

	return id, nil
}

// GetCollectionRequests returns all requests in a collection
func (d *Database) GetCollectionRequests(collectionID string) ([]SavedRequest, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	rows, err := d.db.Query(
		"SELECT id, collection_id, name, method, url, headers, body, created_at, updated_at FROM saved_requests WHERE collection_id = ? ORDER BY name ASC",
		collectionID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to query saved requests: %w", err)
	}
	defer rows.Close()

	requests := make([]SavedRequest, 0)
	for rows.Next() {
		var r SavedRequest
		var headersJSON string
		if err := rows.Scan(&r.ID, &r.CollectionID, &r.Name, &r.Method, &r.URL, &headersJSON, &r.Body, &r.CreatedAt, &r.UpdatedAt); err != nil {
			continue
		}
		if headersJSON != "" {
			json.Unmarshal([]byte(headersJSON), &r.Headers)
		}
		if r.Headers == nil {
			r.Headers = make(map[string]string)
		}
		requests = append(requests, r)
	}

	return requests, nil
}

// GetSavedRequest returns a single saved request by ID
func (d *Database) GetSavedRequest(id string) (*SavedRequest, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	var r SavedRequest
	var headersJSON string
	err := d.db.QueryRow(
		"SELECT id, collection_id, name, method, url, headers, body, created_at, updated_at FROM saved_requests WHERE id = ?",
		id,
	).Scan(&r.ID, &r.CollectionID, &r.Name, &r.Method, &r.URL, &headersJSON, &r.Body, &r.CreatedAt, &r.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to get saved request: %w", err)
	}

	if headersJSON != "" {
		json.Unmarshal([]byte(headersJSON), &r.Headers)
	}
	if r.Headers == nil {
		r.Headers = make(map[string]string)
	}

	return &r, nil
}

// UpdateSavedRequest updates a saved request
func (d *Database) UpdateSavedRequest(id, name, method, url string, headers map[string]string, body string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	now := time.Now().Unix()
	headersJSON, err := json.Marshal(headers)
	if err != nil {
		headersJSON = []byte("{}")
	}

	_, err = d.db.Exec(
		"UPDATE saved_requests SET name = ?, method = ?, url = ?, headers = ?, body = ?, updated_at = ? WHERE id = ?",
		name, method, url, string(headersJSON), body, now, id,
	)
	if err != nil {
		return fmt.Errorf("failed to update saved request: %w", err)
	}
	return nil
}

// MoveSavedRequest moves a saved request to a different collection
func (d *Database) MoveSavedRequest(id, newCollectionID string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	now := time.Now().Unix()
	_, err := d.db.Exec("UPDATE saved_requests SET collection_id = ?, updated_at = ? WHERE id = ?", newCollectionID, now, id)
	if err != nil {
		return fmt.Errorf("failed to move saved request: %w", err)
	}
	return nil
}

// DeleteSavedRequest removes a saved request
func (d *Database) DeleteSavedRequest(id string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.db.Exec("DELETE FROM saved_requests WHERE id = ?", id)
	if err != nil {
		return fmt.Errorf("failed to delete saved request: %w", err)
	}
	return nil
}

// ============================================================================
// Export/Import Methods
// ============================================================================

// ExportCollection exports a collection with all its requests
func (d *Database) ExportCollection(id string) (*CollectionExport, error) {
	collection, err := d.GetCollection(id)
	if err != nil {
		return nil, err
	}

	requests, err := d.GetCollectionRequests(id)
	if err != nil {
		return nil, err
	}

	return &CollectionExport{
		Name:     collection.Name,
		Requests: requests,
	}, nil
}

// ImportCollection imports a collection from export data
func (d *Database) ImportCollection(data *CollectionExport) (string, error) {
	// Create the collection
	collectionID, err := d.CreateCollection(data.Name)
	if err != nil {
		return "", err
	}

	// Import all requests
	for _, req := range data.Requests {
		_, err := d.SaveRequestToCollection(collectionID, req.Name, req.Method, req.URL, req.Headers, req.Body)
		if err != nil {
			// Continue even if one request fails
			continue
		}
	}

	return collectionID, nil
}
