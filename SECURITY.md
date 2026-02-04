# Volt-API Security Configuration

## Build Security Checklist

### Binary Protection
- [ ] Enable code obfuscation (garble)
- [ ] Strip debug symbols
- [ ] UPX compression (smaller + harder to reverse)
- [ ] Disable CGO where possible
- [ ] Build with `-trimpath` flag

### Code Signing
- [ ] Windows: Sign with Authenticode certificate
- [ ] macOS: Sign with Apple Developer certificate
- [ ] macOS: Notarize app with Apple
- [ ] Linux: GPG sign releases

### Runtime Security
- [ ] Disable DevTools in production builds
- [ ] Content Security Policy (CSP) headers
- [ ] Hardened runtime (macOS)
- [ ] ASLR enabled (default on modern OS)
- [ ] DEP/NX enabled (default on modern OS)

---

## Build Commands

### Development (Debug)
```bash
wails build
```

### Production (Secure)
```bash
# Full security build
wails build \
  -clean \
  -trimpath \
  -ldflags="-s -w" \
  -tags production

# With obfuscation (requires garble)
# go install mvdan.cc/garble@latest
wails build \
  -clean \
  -trimpath \
  -ldflags="-s -w" \
  -obfuscated \
  -garbleargs="-literals -tiny -seed=random"

# With UPX compression (smaller binary)
# apt install upx / brew install upx
wails build -clean -upx -upxflags="--best"
```

### Build Flags Explained
| Flag | Purpose |
|------|---------|
| `-clean` | Clean build, no cache |
| `-trimpath` | Remove file paths from binary (privacy) |
| `-ldflags="-s -w"` | Strip symbol table and debug info |
| `-obfuscated` | Obfuscate Go code with garble |
| `-upx` | Compress binary with UPX |
| `-tags production` | Enable production build tags |

---

## Application Security

### HTTP Client Hardening (app.go)

```go
// Secure HTTP client configuration
client := &http.Client{
    Timeout: 30 * time.Second,
    Transport: &http.Transport{
        TLSClientConfig: &tls.Config{
            MinVersion: tls.VersionTLS12,
            // Disable insecure cipher suites
            CipherSuites: []uint16{
                tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
                tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
                tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
                tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
            },
        },
        DisableCompression: false,
        MaxIdleConns:       100,
        IdleConnTimeout:    90 * time.Second,
    },
}
```

### Input Validation
- Sanitize URLs before requests
- Validate HTTP methods
- Limit request/response body sizes
- Timeout all operations

### Secure Storage (Phase 2+)
- Use OS keychain for sensitive data (API keys, tokens)
- Encrypt SQLite database
- Never store passwords in plaintext

---

## Content Security Policy

### Frontend CSP Headers
Add to `index.html` or Wails config:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https: wss:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'none';
  frame-ancestors 'none';
">
```

---

## Production vs Development

### Build Tags

Create `security_prod.go`:
```go
//go:build production

package main

const (
    DevToolsEnabled = false
    DebugMode       = false
    MaxBodySize     = 10 * 1024 * 1024  // 10MB limit
)
```

Create `security_dev.go`:
```go
//go:build !production

package main

const (
    DevToolsEnabled = true
    DebugMode       = true
    MaxBodySize     = 100 * 1024 * 1024  // 100MB limit for testing
)
```

---

## Code Signing

### Windows (Authenticode)
```powershell
# Sign with certificate
signtool sign /f certificate.pfx /p password /tr http://timestamp.digicert.com /td sha256 /fd sha256 volt-api.exe
```

### macOS (Apple Developer)
```bash
# Sign the app
codesign --force --deep --sign "Developer ID Application: Your Name (TEAMID)" volt-api.app

# Notarize
xcrun notarytool submit volt-api.zip --apple-id "email" --team-id "TEAMID" --password "app-password"

# Staple notarization
xcrun stapler staple volt-api.app
```

### Linux (GPG)
```bash
# Sign release
gpg --armor --detach-sign volt-api-linux-amd64
```

---

## GitHub Actions Security Build

See `.github/workflows/build-secure.yml` for production pipeline with:
- Secret management
- Code signing
- Artifact signing
- Checksums generation

---

## Security Audit Checklist

### Before Release
- [ ] Run `go vet ./...`
- [ ] Run `staticcheck ./...`
- [ ] Run `gosec ./...` (security scanner)
- [ ] Run `npm audit` in frontend
- [ ] Check for hardcoded secrets
- [ ] Verify CSP headers
- [ ] Test with production flags
- [ ] Generate SHA256 checksums

### Tools to Install
```bash
# Go security tools
go install golang.org/x/vuln/cmd/govulncheck@latest
go install github.com/securego/gosec/v2/cmd/gosec@latest
go install honnef.co/go/tools/cmd/staticcheck@latest

# Run security scan
govulncheck ./...
gosec ./...
```

---

## Checksums

Generate for releases:
```bash
sha256sum volt-api-* > checksums.sha256
```

Users verify with:
```bash
sha256sum -c checksums.sha256
```
