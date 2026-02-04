# Volt-API Development Checklist

## Phase 1: Functional Client
- [x] Go backend HTTP client (`SendRequest` method)
- [x] Request/Response structs with JSON serialization
- [x] URL input with method selector (GET, POST, PUT, DELETE, PATCH)
- [x] Send button with loading state
- [x] Request body textarea for POST/PUT/PATCH
- [x] Response display with status code (color-coded)
- [x] Response timing display (ms)
- [x] Response size display (KB)
- [x] Collapsible response headers
- [x] JSON formatting for response body
- [x] Error handling and display
- [x] JetBrains Darcula theme styling
- [x] Custom scrollbars

## Phase 2: Persistence & History
- [x] SQLite database integration (Go side)
- [x] Create `requests` table schema
- [x] Save request on send (method, url, headers, body, timestamp)
- [x] Save response data (status, headers, body, timing)
- [x] `GetHistory()` Go method to fetch past requests
- [x] `DeleteHistoryItem(id)` Go method
- [x] `ClearHistory()` Go method
- [x] History sidebar component (React)
- [x] Display request list with method badge + URL
- [x] Click to load previous request into editor
- [x] Delete individual history items
- [x] Clear all history button
- [x] Search/filter history
- [x] Timestamp display (relative: "2 min ago")

## Phase 3: Collections & Organization
- [ ] Create collections (folders for requests)
- [ ] `CreateCollection(name)` Go method
- [ ] `GetCollections()` Go method
- [ ] `SaveRequestToCollection(collectionId, request)` Go method
- [ ] Collection tree view in sidebar
- [ ] Drag and drop requests into collections
- [ ] Rename/delete collections
- [ ] Export collection as JSON
- [ ] Import collection from JSON

## Phase 4: Request Builder Enhancements
- [ ] Headers editor (key-value pairs)
- [ ] Query params editor (key-value pairs)
- [ ] Auth tab (Basic, Bearer Token, API Key)
- [ ] Request body types (JSON, Form Data, Raw, Binary)
- [ ] Syntax highlighting for JSON body
- [ ] Pretty print / format JSON button
- [ ] Copy response to clipboard
- [ ] Response tabs (Body, Headers, Cookies)

## Phase 5: Environments & Variables
- [ ] Create environments (Dev, Staging, Prod)
- [ ] Environment variables (key-value)
- [ ] Variable syntax in URLs: `{{baseUrl}}/users`
- [ ] Variable syntax in headers: `Authorization: Bearer {{token}}`
- [ ] Environment selector dropdown
- [ ] Quick variable substitution preview
- [ ] Import/export environments

## Phase 6: Advanced Features
- [ ] Pre-request scripts (JavaScript)
- [ ] Post-response scripts (tests)
- [ ] Response assertions (status code, body contains)
- [ ] Chained requests (use response in next request)
- [ ] WebSocket support
- [ ] gRPC support
- [ ] GraphQL support with schema explorer

## Phase 7: Polish & UX
- [ ] Keyboard shortcuts (Ctrl+Enter to send)
- [ ] Request tabs (multiple requests open)
- [ ] Dark/Light theme toggle
- [ ] Resizable panels (sidebar, request/response)
- [ ] Response preview modes (Pretty, Raw, Preview)
- [ ] Binary response handling (images, files)
- [ ] Certificate/SSL settings
- [ ] Proxy configuration
- [ ] Request timeout configuration

## Tech Debt & Improvements
- [ ] Add unit tests for Go HTTP client
- [ ] Add React component tests
- [ ] Error boundaries in React
- [ ] Request cancellation (abort in-flight requests)
- [ ] Response streaming for large payloads
- [ ] Compress stored responses in SQLite
- [ ] Add app icon and branding

---

## Cross-Platform Builds

### Build Checklist
- [ ] Windows (amd64) - `.exe`
- [ ] Windows (arm64) - `.exe`
- [ ] macOS (Intel) - `.app`
- [ ] macOS (Apple Silicon) - `.app`
- [ ] Linux (amd64) - binary
- [ ] Linux (arm64) - binary
- [ ] Windows NSIS installer - `.exe` installer
- [ ] macOS DMG - `.dmg` disk image
- [ ] Linux AppImage - `.AppImage`
- [ ] Linux .deb package
- [ ] Linux .rpm package

### Build Commands

```bash
# Development
wails dev

# Build for current platform
wails build

# Build with optimizations (production)
wails build -clean -upx

# Windows builds (from any OS with cross-compile setup)
wails build -platform windows/amd64
wails build -platform windows/arm64
wails build -nsis                      # Creates Windows installer

# macOS builds (requires macOS or cross-compile toolchain)
wails build -platform darwin/amd64     # Intel Mac
wails build -platform darwin/arm64     # Apple Silicon (M1/M2/M3)

# Linux builds
wails build -platform linux/amd64
wails build -platform linux/arm64

# Build all platforms at once
wails build -platform windows/amd64,windows/arm64,darwin/amd64,darwin/arm64,linux/amd64
```

### Build Output Locations
```
build/bin/
├── volt-api.exe          # Windows
├── volt-api              # Linux
└── volt-api.app/         # macOS app bundle
```

### Prerequisites for Cross-Compilation

**Windows → Other:**
- Install Docker for Linux/macOS cross-compilation
- Or use GitHub Actions (recommended)

**macOS → Other:**
- `brew install mingw-w64` for Windows builds
- Linux builds need Docker or VM

**Linux → Other:**
- `apt install mingw-w64` for Windows builds
- macOS builds require osxcross toolchain

### GitHub Actions (Recommended)

Create `.github/workflows/build.yml` for automated multi-platform builds on every release.

### App Metadata (wails.json)
- [ ] Set app name
- [ ] Set app version
- [ ] Set app description
- [ ] Add app icon (1024x1024 PNG)
- [ ] Set bundle identifier (com.voltapi.app)
- [ ] Configure file associations

### Code Signing (Required for Trusted Installation)
See `docs/CODE_SIGNING.md` for detailed instructions.

**Windows (~$200-500/year):**
- [ ] Purchase Authenticode certificate (DigiCert, Sectigo, SSL.com)
- [ ] Complete identity verification
- [ ] Add certificate to GitHub Secrets
- [ ] Test signed build on fresh Windows machine

**macOS ($99/year):**
- [ ] Enroll in Apple Developer Program
- [ ] Create Developer ID Application certificate
- [ ] Generate app-specific password
- [ ] Add credentials to GitHub Secrets
- [ ] Test notarized build on fresh Mac

**Linux (Free):**
- [ ] Generate GPG signing key
- [ ] Sign releases with GPG
- [ ] Publish public key for verification

## Test URLs

```
GET  https://httpbin.org/get
POST https://httpbin.org/post
GET  https://httpbin.org/status/404
GET  https://jsonplaceholder.typicode.com/posts
GET  https://api.github.com/users/octocat
```
