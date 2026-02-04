# Code Signing Guide for Volt-API

## Why Code Signing Matters

Without code signing:
- **Windows**: SmartScreen shows "Windows protected your PC" - most users won't proceed
- **macOS**: Gatekeeper completely blocks the app - "cannot be opened because the developer cannot be verified"
- **Antivirus**: Many AV tools flag unsigned executables as suspicious

With code signing:
- Your app is trusted by the operating system
- Users can install without warnings
- Shows your company/developer name instead of "Unknown Publisher"

---

## Windows Code Signing

### Option 1: Standard Code Signing Certificate (~$200-500/year)

**Providers:**
- [DigiCert](https://www.digicert.com/signing/code-signing-certificates) - $474/year
- [Sectigo](https://sectigo.com/ssl-certificates-tls/code-signing) - $199/year
- [GlobalSign](https://www.globalsign.com/en/code-signing-certificate) - $249/year
- [SSL.com](https://www.ssl.com/certificates/code-signing/) - $249/year

**Process:**
1. Purchase certificate from a CA (Certificate Authority)
2. Complete identity verification (business or individual)
3. Receive certificate file (.pfx)
4. Sign your executable

### Option 2: EV Code Signing Certificate (~$350-600/year)

**Benefits over standard:**
- Immediate SmartScreen reputation (no "warming up" period)
- Required for kernel-mode drivers
- Hardware token required (more secure)

**Recommended for:** Production apps with many users

### Signing Commands

```powershell
# Install Windows SDK (includes signtool)
# Download from: https://developer.microsoft.com/windows/downloads/windows-sdk/

# Sign the executable
signtool sign /f certificate.pfx /p "password" /tr http://timestamp.digicert.com /td sha256 /fd sha256 volt-api.exe

# Verify signature
signtool verify /pa volt-api.exe
```

### GitHub Actions Setup

```yaml
# Add these secrets to your repository:
# WINDOWS_CERT_BASE64 - Base64 encoded .pfx file
# WINDOWS_CERT_PASSWORD - Certificate password

- name: Sign Windows Binary
  run: |
    echo "${{ secrets.WINDOWS_CERT_BASE64 }}" | base64 -d > cert.pfx
    signtool sign /f cert.pfx /p "${{ secrets.WINDOWS_CERT_PASSWORD }}" /tr http://timestamp.digicert.com /td sha256 /fd sha256 build/bin/volt-api.exe
    rm cert.pfx
```

---

## macOS Code Signing & Notarization

### Requirements

1. **Apple Developer Account** - $99/year at [developer.apple.com](https://developer.apple.com)
2. **Developer ID Application Certificate** - Created in Apple Developer portal
3. **Notarization** - Apple scans your app for malware

### Step 1: Get Apple Developer Account

1. Go to [developer.apple.com/programs](https://developer.apple.com/programs/)
2. Enroll as Individual ($99/year) or Organization ($99/year)
3. Complete identity verification

### Step 2: Create Signing Certificate

1. Open **Keychain Access** on your Mac
2. Go to **Keychain Access → Certificate Assistant → Request a Certificate from a Certificate Authority**
3. Save the CSR file
4. Go to [developer.apple.com/account/resources/certificates](https://developer.apple.com/account/resources/certificates/list)
5. Click **+** → Select **Developer ID Application**
6. Upload your CSR
7. Download and install the certificate

### Step 3: Sign the App

```bash
# Find your signing identity
security find-identity -v -p codesigning

# Sign the app (replace with your identity)
codesign --force --deep --options runtime --sign "Developer ID Application: Your Name (TEAMID)" volt-api.app

# Verify
codesign --verify --verbose volt-api.app
```

### Step 4: Notarize the App

```bash
# Create a zip for notarization
ditto -c -k --keepParent volt-api.app volt-api.zip

# Submit for notarization
xcrun notarytool submit volt-api.zip \
  --apple-id "your@email.com" \
  --team-id "YOURTEAMID" \
  --password "app-specific-password" \
  --wait

# Staple the notarization ticket
xcrun stapler staple volt-api.app

# Verify notarization
spctl --assess --verbose volt-api.app
```

### App-Specific Password

1. Go to [appleid.apple.com](https://appleid.apple.com)
2. Sign in → Security → App-Specific Passwords
3. Generate a password for "Notarization"

### GitHub Actions Setup

```yaml
# Secrets needed:
# APPLE_CERT_BASE64 - Base64 encoded .p12 certificate
# APPLE_CERT_PASSWORD - Certificate password
# APPLE_ID - Your Apple ID email
# APPLE_TEAM_ID - Your Team ID
# APPLE_APP_PASSWORD - App-specific password

- name: Import Certificate
  run: |
    echo "${{ secrets.APPLE_CERT_BASE64 }}" | base64 -d > cert.p12
    security create-keychain -p "" build.keychain
    security import cert.p12 -k build.keychain -P "${{ secrets.APPLE_CERT_PASSWORD }}" -T /usr/bin/codesign
    security set-key-partition-list -S apple-tool:,apple: -s -k "" build.keychain
    security default-keychain -s build.keychain

- name: Sign App
  run: |
    codesign --force --deep --options runtime --sign "Developer ID Application: ${{ secrets.APPLE_TEAM_ID }}" build/bin/volt-api.app

- name: Notarize App
  run: |
    ditto -c -k --keepParent build/bin/volt-api.app volt-api.zip
    xcrun notarytool submit volt-api.zip \
      --apple-id "${{ secrets.APPLE_ID }}" \
      --team-id "${{ secrets.APPLE_TEAM_ID }}" \
      --password "${{ secrets.APPLE_APP_PASSWORD }}" \
      --wait
    xcrun stapler staple build/bin/volt-api.app
```

---

## Linux Signing

Linux doesn't require code signing for execution, but it's good practice:

### GPG Signing

```bash
# Generate GPG key (if you don't have one)
gpg --full-generate-key

# Sign the binary
gpg --armor --detach-sign volt-api-linux-amd64

# Creates: volt-api-linux-amd64.asc

# Users verify with:
gpg --verify volt-api-linux-amd64.asc volt-api-linux-amd64
```

### Package Signing (for .deb/.rpm)

If distributing via package managers, sign the packages:

```bash
# Debian packages
dpkg-sig --sign builder volt-api.deb

# RPM packages
rpm --addsign volt-api.rpm
```

---

## Cost Summary

| Item | Cost | Frequency |
|------|------|-----------|
| Windows Code Signing (Standard) | $199-300 | Per year |
| Windows Code Signing (EV) | $350-500 | Per year |
| Apple Developer Program | $99 | Per year |
| Linux GPG | Free | One-time |
| **Total (Minimum)** | **$298/year** | |
| **Total (Recommended - EV)** | **$450-600/year** | |

---

## Free Alternatives (Limited)

### SignPath Foundation (Free for Open Source)
- [signpath.io](https://signpath.io) offers free code signing for open source projects
- Requires your project to be public and open source

### Azure Trusted Signing (Preview)
- Microsoft's new service, potentially cheaper
- [azure.microsoft.com/products/trusted-signing](https://azure.microsoft.com/en-us/products/trusted-signing/)

---

## Checklist Before Release

- [ ] Purchase Windows code signing certificate
- [ ] Enroll in Apple Developer Program
- [ ] Create Developer ID Application certificate
- [ ] Generate app-specific password for notarization
- [ ] Add all secrets to GitHub repository
- [ ] Test signed builds on fresh machines
- [ ] Verify no SmartScreen/Gatekeeper warnings

---

## Troubleshooting

### Windows: "Unknown Publisher" still showing
- Certificate may not be from a trusted CA
- Timestamp server may have failed - always use `/tr` flag
- EV certificate recommended for immediate trust

### macOS: "App is damaged"
- App wasn't notarized, or stapling failed
- Run: `xattr -cr volt-api.app` (removes quarantine, but not a fix)
- Re-notarize and staple

### macOS: Notarization fails
- Check for hardened runtime issues
- Ensure no unsigned libraries are bundled
- Check Apple's notarization logs for details

### Antivirus false positives
- Submit to AV vendors for whitelisting:
  - [Microsoft](https://www.microsoft.com/wdsi/filesubmission)
  - [Kaspersky](https://opentip.kaspersky.com)
  - [Avast/AVG](https://www.avast.com/false-positive-file-form.php)
