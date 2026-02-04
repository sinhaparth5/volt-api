# Volt-API

A high-performance, cross-platform API client built with Go and React.

## Philosophy

Volt-API follows three guiding principles:

1. **Performance First**: No Electron bloat. Uses the system's native WebView engine to stay under 20MB.
2. **IDE Aesthetic**: A high-density, "no-nonsense" interface inspired by JetBrains (Darcula theme).
3. **Protocol Flexibility**: Starting with REST, but architected to handle gRPC and RPC from day one.

## Architecture

The application is structured as a **High-Performance Bridge** between a native systems language (Go) and a modern UI framework (React):

| Component | Role | Responsibility |
|-----------|------|----------------|
| **Frontend (React)** | The Waiter | Handles the user experience—takes input (URL, Headers, Method) and presents responses. Doesn't make network calls directly. |
| **Backend (Go)** | The Chef | Makes actual network connections, handles security/certificates, and processes raw data. |
| **Bridge (Wails)** | The Service Window | Enables instant communication between frontend and backend without network overhead. |

## Development Roadmap

### Phase 1: The "Functional" Client (Current)

Establish the basic connection.

- **UI**: A JetBrains-style URL bar and "Send" button
- **Logic**: Make real HTTP calls and display JSON results
- **Goal**: Prove the bridge works and outperforms Postman

### Phase 2: Persistence & History

Implement data lifecycle management.

- **Storage**: Local database (SQLite) for request persistence
- **Feature**: Sidebar tracking request history
- **Goal**: Demonstrate understanding of data lifecycle management

### Phase 3: Pro Features

- **Multi-Protocol**: gRPC support (vital for fintech infrastructure)
- **Scripting**: Pre-request script execution
- **Environments**: Staging vs Production variable management (API keys, etc.)

## Development

### Live Development

Run in live development mode:

```bash
wails dev
```

This starts a Vite development server with hot reload. A dev server also runs on http://localhost:34115 for browser-based development with access to Go methods.

### Building

Build a redistributable, production package:

```bash
wails build
```

## Configuration

Configure the project by editing `wails.json`. See the [Wails documentation](https://wails.io/docs/reference/project-config) for details.
