# Free Code Signing for Open Source Projects

## Windows: SignPath Foundation (FREE)

[SignPath.io](https://signpath.io) provides **free code signing certificates** for open source projects.

### Requirements
- Project must be open source (public GitHub repo)
- Must have a reasonable commit history
- Project must have a clear purpose

### How to Apply

1. Go to [signpath.io/open-source](https://signpath.io/open-source)
2. Click "Apply for Open Source"
3. Submit your GitHub repository URL
4. Wait for approval (usually 1-2 weeks)

### Once Approved

SignPath integrates directly with GitHub Actions:

```yaml
- name: Sign with SignPath
  uses: signpath/github-action-submit-signing-request@v1
  with:
    api-token: ${{ secrets.SIGNPATH_API_TOKEN }}
    organization-id: ${{ secrets.SIGNPATH_ORG_ID }}
    project-slug: 'volt-api'
    signing-policy-slug: 'release-signing'
    artifact-configuration-slug: 'windows-exe'
    github-artifact-id: ${{ steps.upload.outputs.artifact-id }}
```

### Alternative: Azure Trusted Signing (Free Tier)

Microsoft's [Azure Trusted Signing](https://azure.microsoft.com/en-us/products/trusted-signing/) has a free tier:
- 5,000 signatures/month free
- Requires Azure account (free)

---

## macOS: Free Workarounds

**Bad news:** Apple doesn't offer free code signing. The $99/year Apple Developer Program is required for proper signing.

**Good news:** There are workarounds for open source distribution:

### Option 1: Homebrew Distribution (Recommended)

Distribute via Homebrew - users trust Homebrew and it handles the unsigned app gracefully.

```bash
# Users install with:
brew install --cask volt-api
```

**To set up Homebrew Cask:**

1. Create a tap repository: `github.com/yourusername/homebrew-tap`
2. Add a cask formula:

```ruby
# Casks/volt-api.rb
cask "volt-api" do
  version "0.1.0"
  sha256 "SHA256_OF_YOUR_DMG"

  url "https://github.com/yourusername/volt-api/releases/download/v#{version}/volt-api-darwin-arm64.tar.gz"
  name "Volt API"
  desc "High-performance API client"
  homepage "https://github.com/yourusername/volt-api"

  app "volt-api.app"

  # Remove quarantine attribute
  postflight do
    system_command "/usr/bin/xattr",
                   args: ["-dr", "com.apple.quarantine", "#{appdir}/volt-api.app"]
  end
end
```

Users install with:
```bash
brew tap yourusername/tap
brew install --cask volt-api
```

### Option 2: User Instructions (No Signing)

For direct downloads, provide clear instructions:

**In your README and download page:**

```markdown
## macOS Installation

Since this is an open-source app without Apple code signing, macOS will block it initially.

**To install:**
1. Download `volt-api-darwin-arm64.zip` (or amd64 for Intel Macs)
2. Extract the zip
3. **Right-click** on `volt-api.app` and select **"Open"**
4. Click **"Open"** in the dialog that appears
5. The app will now work normally

This only needs to be done once.
```

### Option 3: Automated Quarantine Removal

Provide a shell script that users run after download:

```bash
#!/bin/bash
# install-mac.sh - Run this after downloading

APP_PATH="/Applications/volt-api.app"

if [ -d "$APP_PATH" ]; then
    echo "Removing quarantine flag..."
    xattr -dr com.apple.quarantine "$APP_PATH"
    echo "Done! You can now open Volt API normally."
else
    echo "Please move volt-api.app to /Applications first"
fi
```

### Option 4: DMG with Instructions

Create a DMG that includes installation instructions:

```bash
# Create DMG with background image showing instructions
hdiutil create -volname "Volt API" -srcfolder dist -ov -format UDZO volt-api.dmg
```

---

## Linux: GPG Signing (FREE)

GPG is completely free:

```bash
# One-time setup
gpg --full-generate-key

# Sign each release
gpg --armor --detach-sign volt-api-linux-amd64

# Users verify with your public key
gpg --verify volt-api-linux-amd64.asc
```

Publish your public key on:
- Your GitHub repo
- keys.openpgp.org
- Your website

---

## Updated GitHub Actions (Free Signing)

```yaml
name: Build & Release (Free Signing)

on:
  push:
    tags:
      - 'v*'

jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.23'

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Wails
        run: go install github.com/wailsapp/wails/v2/cmd/wails@latest

      - name: Build
        run: wails build -clean -platform windows/amd64

      - name: Upload for SignPath
        uses: actions/upload-artifact@v4
        with:
          name: windows-unsigned
          path: build/bin/volt-api.exe

  # SignPath will sign asynchronously after approval
  # Configure webhook in SignPath dashboard

  build-macos:
    runs-on: macos-latest
    strategy:
      matrix:
        arch: [amd64, arm64]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.23'

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Wails
        run: go install github.com/wailsapp/wails/v2/cmd/wails@latest

      - name: Build
        run: wails build -clean -platform darwin/${{ matrix.arch }}

      # Ad-hoc sign (allows local execution, not distribution trust)
      - name: Ad-hoc Sign
        run: codesign --force --deep -s - build/bin/volt-api.app

      - name: Create Archive
        run: |
          cd build/bin
          tar -czvf volt-api-darwin-${{ matrix.arch }}.tar.gz volt-api.app

      - name: Upload Artifact
        uses: actions/upload-artifact@v4
        with:
          name: macos-${{ matrix.arch }}
          path: build/bin/volt-api-darwin-${{ matrix.arch }}.tar.gz

  build-linux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.23'

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Dependencies
        run: sudo apt-get update && sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.0-dev

      - name: Install Wails
        run: go install github.com/wailsapp/wails/v2/cmd/wails@latest

      - name: Build
        run: wails build -clean -platform linux/amd64

      # GPG sign if key is available
      - name: GPG Sign
        if: secrets.GPG_PRIVATE_KEY != ''
        run: |
          echo "${{ secrets.GPG_PRIVATE_KEY }}" | gpg --import
          gpg --armor --detach-sign build/bin/volt-api

      - name: Upload Artifact
        uses: actions/upload-artifact@v4
        with:
          name: linux-amd64
          path: |
            build/bin/volt-api
            build/bin/volt-api.asc

  release:
    needs: [build-windows, build-macos, build-linux]
    runs-on: ubuntu-latest
    steps:
      - name: Download All Artifacts
        uses: actions/download-artifact@v4
        with:
          path: artifacts

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: artifacts/**/*
          body: |
            ## Installation

            ### Windows
            Download `volt-api.exe` and run it.

            ### macOS
            1. Download the appropriate file for your Mac:
               - Apple Silicon (M1/M2/M3): `volt-api-darwin-arm64.tar.gz`
               - Intel: `volt-api-darwin-amd64.tar.gz`
            2. Extract the archive
            3. Move `volt-api.app` to Applications
            4. **Right-click** the app and select **"Open"**
            5. Click **"Open"** in the security dialog

            ### Linux
            ```bash
            tar -xzf volt-api-linux-amd64.tar.gz
            chmod +x volt-api
            ./volt-api
            ```
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Summary: Free Setup

| Platform | Solution | Trust Level |
|----------|----------|-------------|
| **Windows** | SignPath Foundation | Full trust (signed) |
| **macOS** | Homebrew + instructions | Works with one extra click |
| **Linux** | GPG signing | Full trust for those who verify |

## Action Items

1. [ ] Apply to SignPath Foundation: [signpath.io/open-source](https://signpath.io/open-source)
2. [ ] Create Homebrew tap for macOS distribution
3. [ ] Add clear macOS installation instructions to README
4. [ ] Generate GPG key for Linux releases
5. [ ] Update GitHub Actions workflow
