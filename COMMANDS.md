# Volt-API Development Commands

Quick reference for all build, test, and development commands.

## Prerequisites

```bash
# Check all tools are installed
go version          # Go 1.21+
wails version       # Wails v2
rustc --version     # Rust 1.85+ (for edition 2024)
wasm-pack --version # wasm-pack 0.13+
node --version      # Node.js 18+
npm --version       # npm 9+
```

---

## Quick Start (Development)

```bash
# 1. Build WASM module (only needed once or after Rust changes)
cd frontend/wasm-core/volt-wasm && wasm-pack build --target web --release && cp -r pkg/* ../../src/wasm/

# 2. Start development server (hot reload for Go + React)
wails dev
```

---

## WASM (Rust) Commands

Location: `frontend/wasm-core/volt-wasm/`

```bash
cd frontend/wasm-core/volt-wasm

# Run Rust unit tests
cargo test

# Build WASM for web (release mode, optimized)
wasm-pack build --target web --release

# Build WASM for web (debug mode, faster compile)
wasm-pack build --target web

# Copy built WASM to frontend src
cp -r pkg/* ../../src/wasm/

# Full rebuild and copy (one-liner)
wasm-pack build --target web --release && cp -r pkg/* ../../src/wasm/

# Check for compile errors without building
cargo check

# Format Rust code
cargo fmt

# Lint Rust code
cargo clippy
```

---

## Go Backend Commands

Location: Project root `/`

```bash
# Run Go tests (HTTP client tests)
go test ./internal/app/... -v

# Run database tests
go test ./internal/database/... -v

# Run all Go tests
go test ./... -v

# Run tests with coverage
go test ./... -cover

# Build Go binary (without Wails)
go build -o volt-api .

# Check for compile errors
go build ./...

# Format Go code
go fmt ./...

# Lint Go code (if golangci-lint installed)
golangci-lint run

# Update Go dependencies
go mod tidy

# Download dependencies
go mod download
```

---

## Frontend (React/TypeScript) Commands

Location: `frontend/`

```bash
cd frontend

# Install dependencies
npm install

# Run development server (standalone, no Go backend)
npm run dev

# Build for production
npm run build

# Run TypeScript type checking
npx tsc --noEmit

# Run unit tests
npm run test

# Run unit tests once (no watch mode)
npm run test:run

# Preview production build
npm run preview
```

---

## Wails Commands

Location: Project root `/`

```bash
# Start development mode (hot reload for both Go and React)
wails dev

# Build for current platform (production)
wails build

# Build with optimizations
wails build -clean

# Build for specific platforms
wails build -platform windows/amd64    # Windows 64-bit
wails build -platform windows/arm64    # Windows ARM
wails build -platform darwin/amd64     # macOS Intel
wails build -platform darwin/arm64     # macOS Apple Silicon
wails build -platform linux/amd64      # Linux 64-bit
wails build -platform linux/arm64      # Linux ARM

# Build Windows installer (NSIS)
wails build -nsis

# Generate Go/TypeScript bindings (after changing Go structs)
wails generate module

# Show Wails doctor (check environment)
wails doctor
```

---

## Full Build Workflow

### Development (daily workflow)

```bash
# Terminal 1: Start Wails dev server
wails dev

# Terminal 2 (if editing Rust): Rebuild WASM
cd frontend/wasm-core/volt-wasm
wasm-pack build --target web --release && cp -r pkg/* ../../src/wasm/
```

### Before Commit

```bash
# 1. Run all tests
go test ./... -v
cd frontend && npm run test:run && cd ..

# 2. Type check frontend
cd frontend && npx tsc --noEmit && cd ..

# 3. Format code
go fmt ./...
cd frontend/wasm-core/volt-wasm && cargo fmt && cd ../../..
```

### Production Build

```bash
# 1. Rebuild WASM (release mode)
cd frontend/wasm-core/volt-wasm
wasm-pack build --target web --release
cp -r pkg/* ../../src/wasm/
cd ../../..

# 2. Build Wails app
wails build -clean

# Output: build/bin/volt-api (or .exe on Windows)
```

---

## Useful Aliases

Add to your shell config (`~/.bashrc` or `~/.zshrc`):

```bash
# Volt-API shortcuts
alias volt-dev="wails dev"
alias volt-build="wails build -clean"
alias volt-test="go test ./... -v && cd frontend && npm run test:run && cd .."
alias volt-wasm="cd frontend/wasm-core/volt-wasm && wasm-pack build --target web --release && cp -r pkg/* ../../src/wasm/ && cd ../../.."
```

---

## Troubleshooting

### WASM not loading
```bash
# Rebuild and copy WASM
cd frontend/wasm-core/volt-wasm
wasm-pack build --target web --release
cp -r pkg/* ../../src/wasm/
```

### Go bindings out of sync
```bash
# Regenerate TypeScript bindings
wails generate module
```

### Frontend dependencies issues
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Wails build fails
```bash
# Check environment
wails doctor

# Clean and rebuild
wails build -clean
```

---

## File Locations

| Component | Location |
|-----------|----------|
| Go backend | `/internal/app/`, `/internal/database/` |
| Go entry point | `/main.go` |
| React frontend | `/frontend/src/` |
| WASM source | `/frontend/wasm-core/volt-wasm/src/` |
| WASM output | `/frontend/src/wasm/` |
| Wails config | `/wails.json` |
| Build output | `/build/bin/` |
