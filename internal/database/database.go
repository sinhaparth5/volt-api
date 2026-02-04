package database

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
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
	`

	_, err := db.Exec(schema)
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

// SaveRequest saves a request and response to history
func (d *Database) SaveRequest(method, url string, headers map[string]string, body string, statusCode int, timingMs int64) (string, error) {
	d.mu.Lock()
	defer d.mu.Unlock()

	id := uuid.New().String()
	createdAt := time.Now().Unix()

	headersJSON, err := json.Marshal(headers)
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
