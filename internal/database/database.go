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

		CREATE TABLE IF NOT EXISTS environments (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL UNIQUE,
			is_active INTEGER NOT NULL DEFAULT 0,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS environment_variables (
			id TEXT PRIMARY KEY,
			environment_id TEXT NOT NULL,
			key TEXT NOT NULL,
			value TEXT NOT NULL,
			enabled INTEGER NOT NULL DEFAULT 1,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE,
			UNIQUE(environment_id, key)
		);

		CREATE INDEX IF NOT EXISTS idx_env_vars_environment ON environment_variables(environment_id);
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

// ============================================================================
// Environment Methods
// ============================================================================

// CreateEnvironment creates a new environment
func (d *Database) CreateEnvironment(name string) (string, error) {
	d.mu.Lock()
	defer d.mu.Unlock()

	id := uuid.New().String()
	now := time.Now().Unix()

	_, err := d.db.Exec(
		"INSERT INTO environments (id, name, is_active, created_at, updated_at) VALUES (?, ?, 0, ?, ?)",
		id, name, now, now,
	)
	if err != nil {
		return "", fmt.Errorf("failed to create environment: %w", err)
	}

	return id, nil
}

// GetEnvironments returns all environments
func (d *Database) GetEnvironments() ([]Environment, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	rows, err := d.db.Query("SELECT id, name, is_active, created_at, updated_at FROM environments ORDER BY name ASC")
	if err != nil {
		return nil, fmt.Errorf("failed to query environments: %w", err)
	}
	defer rows.Close()

	envs := make([]Environment, 0)
	for rows.Next() {
		var e Environment
		var isActive int
		if err := rows.Scan(&e.ID, &e.Name, &isActive, &e.CreatedAt, &e.UpdatedAt); err != nil {
			continue
		}
		e.IsActive = isActive == 1
		envs = append(envs, e)
	}

	return envs, nil
}

// GetEnvironment returns a single environment by ID
func (d *Database) GetEnvironment(id string) (*Environment, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	var e Environment
	var isActive int
	err := d.db.QueryRow("SELECT id, name, is_active, created_at, updated_at FROM environments WHERE id = ?", id).
		Scan(&e.ID, &e.Name, &isActive, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to get environment: %w", err)
	}
	e.IsActive = isActive == 1

	return &e, nil
}

// GetActiveEnvironment returns the currently active environment
func (d *Database) GetActiveEnvironment() (*Environment, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	var e Environment
	var isActive int
	err := d.db.QueryRow("SELECT id, name, is_active, created_at, updated_at FROM environments WHERE is_active = 1").
		Scan(&e.ID, &e.Name, &isActive, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // No active environment
		}
		return nil, fmt.Errorf("failed to get active environment: %w", err)
	}
	e.IsActive = true

	return &e, nil
}

// SetActiveEnvironment sets an environment as active (only one can be active at a time)
func (d *Database) SetActiveEnvironment(id string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	// Deactivate all environments first
	_, err := d.db.Exec("UPDATE environments SET is_active = 0")
	if err != nil {
		return fmt.Errorf("failed to deactivate environments: %w", err)
	}

	// Activate the selected environment (if id is not empty)
	if id != "" {
		now := time.Now().Unix()
		_, err = d.db.Exec("UPDATE environments SET is_active = 1, updated_at = ? WHERE id = ?", now, id)
		if err != nil {
			return fmt.Errorf("failed to activate environment: %w", err)
		}
	}

	return nil
}

// RenameEnvironment updates an environment's name
func (d *Database) RenameEnvironment(id, name string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	now := time.Now().Unix()
	_, err := d.db.Exec("UPDATE environments SET name = ?, updated_at = ? WHERE id = ?", name, now, id)
	if err != nil {
		return fmt.Errorf("failed to rename environment: %w", err)
	}
	return nil
}

// DeleteEnvironment removes an environment and all its variables (via CASCADE)
func (d *Database) DeleteEnvironment(id string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.db.Exec("DELETE FROM environments WHERE id = ?", id)
	if err != nil {
		return fmt.Errorf("failed to delete environment: %w", err)
	}
	return nil
}

// ============================================================================
// Environment Variables Methods
// ============================================================================

// SetEnvironmentVariable creates or updates a variable in an environment
func (d *Database) SetEnvironmentVariable(environmentID, key, value string, enabled bool) (string, error) {
	d.mu.Lock()
	defer d.mu.Unlock()

	now := time.Now().Unix()
	enabledInt := 0
	if enabled {
		enabledInt = 1
	}

	// Try to update first
	result, err := d.db.Exec(
		"UPDATE environment_variables SET value = ?, enabled = ?, updated_at = ? WHERE environment_id = ? AND key = ?",
		value, enabledInt, now, environmentID, key,
	)
	if err != nil {
		return "", fmt.Errorf("failed to update variable: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected > 0 {
		// Variable was updated, get its ID
		var id string
		err := d.db.QueryRow("SELECT id FROM environment_variables WHERE environment_id = ? AND key = ?", environmentID, key).Scan(&id)
		if err != nil {
			return "", err
		}
		return id, nil
	}

	// Insert new variable
	id := uuid.New().String()
	_, err = d.db.Exec(
		"INSERT INTO environment_variables (id, environment_id, key, value, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
		id, environmentID, key, value, enabledInt, now, now,
	)
	if err != nil {
		return "", fmt.Errorf("failed to create variable: %w", err)
	}

	return id, nil
}

// GetEnvironmentVariables returns all variables for an environment
func (d *Database) GetEnvironmentVariables(environmentID string) ([]EnvironmentVariable, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	rows, err := d.db.Query(
		"SELECT id, environment_id, key, value, enabled, created_at, updated_at FROM environment_variables WHERE environment_id = ? ORDER BY key ASC",
		environmentID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to query variables: %w", err)
	}
	defer rows.Close()

	vars := make([]EnvironmentVariable, 0)
	for rows.Next() {
		var v EnvironmentVariable
		var enabled int
		if err := rows.Scan(&v.ID, &v.EnvironmentID, &v.Key, &v.Value, &enabled, &v.CreatedAt, &v.UpdatedAt); err != nil {
			continue
		}
		v.Enabled = enabled == 1
		vars = append(vars, v)
	}

	return vars, nil
}

// GetActiveEnvironmentVariables returns all enabled variables for the active environment as a map
func (d *Database) GetActiveEnvironmentVariables() (map[string]string, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	rows, err := d.db.Query(`
		SELECT ev.key, ev.value
		FROM environment_variables ev
		JOIN environments e ON ev.environment_id = e.id
		WHERE e.is_active = 1 AND ev.enabled = 1
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query active variables: %w", err)
	}
	defer rows.Close()

	vars := make(map[string]string)
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			continue
		}
		vars[key] = value
	}

	return vars, nil
}

// DeleteEnvironmentVariable removes a variable
func (d *Database) DeleteEnvironmentVariable(id string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.db.Exec("DELETE FROM environment_variables WHERE id = ?", id)
	if err != nil {
		return fmt.Errorf("failed to delete variable: %w", err)
	}
	return nil
}

// ============================================================================
// Environment Export/Import Methods
// ============================================================================

// ExportEnvironment exports an environment with all its variables
func (d *Database) ExportEnvironment(id string) (*EnvironmentExport, error) {
	env, err := d.GetEnvironment(id)
	if err != nil {
		return nil, err
	}

	vars, err := d.GetEnvironmentVariables(id)
	if err != nil {
		return nil, err
	}

	return &EnvironmentExport{
		Name:      env.Name,
		Variables: vars,
	}, nil
}

// ImportEnvironment imports an environment from export data
func (d *Database) ImportEnvironment(data *EnvironmentExport) (string, error) {
	// Create the environment
	envID, err := d.CreateEnvironment(data.Name)
	if err != nil {
		return "", err
	}

	// Import all variables
	for _, v := range data.Variables {
		_, err := d.SetEnvironmentVariable(envID, v.Key, v.Value, v.Enabled)
		if err != nil {
			// Continue even if one variable fails
			continue
		}
	}

	return envID, nil
}
