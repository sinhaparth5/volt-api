import { useState } from "react";
import { SendRequest } from "../wailsjs/go/main/App";
import "./style.css";

interface HTTPResponse {
  statusCode: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  timingMs: number;
  contentLength: number;
  error?: string;
}

type RequestState = 'idle' | 'loading' | 'success' | 'error';

function App() {
  const [method, setMethod] = useState<string>('GET');
  const [url, setUrl] = useState<string>('');
  const [requestBody, setRequestBody] = useState<string>('');
  const [response, setResponse] = useState<HTTPResponse | null>(null);
  const [requestState, setRequestState] = useState<RequestState>('idle');

  const handleSend = async () => {
    if (!url.trim()) {
      return;
    }

    setRequestState('loading');
    setResponse(null);

    try {
      const result = await SendRequest({
        method,
        url: url.trim(),
        headers: {},
        body: requestBody,
      });

      setResponse(result);
      setRequestState(result.error ? 'error' : 'success');
    } catch (err) {
      setResponse({
        statusCode: 0,
        statusText: '',
        headers: {},
        body: '',
        timingMs: 0,
        contentLength: 0,
        error: String(err),
      });
      setRequestState('error');
    }
  };

  const formatJSON = (str: string): string => {
    try {
      return JSON.stringify(JSON.parse(str), null, 2);
    } catch {
      return str;
    }
  };

  const getStatusColor = (code: number): string => {
    if (code >= 200 && code < 300) return 'text-jb-success';
    if (code >= 300 && code < 400) return 'text-jb-warning';
    return 'text-jb-error';
  };

  const getMethodColor = (m: string): string => {
    switch (m) {
      case 'GET': return 'text-jb-success';
      case 'POST': return 'text-jb-warning';
      case 'PUT': return 'text-jb-accent';
      case 'DELETE': return 'text-jb-error';
      case 'PATCH': return 'text-orange-400';
      default: return 'text-jb-text';
    }
  };

  return (
    <div className="flex h-screen bg-jb-bg text-jb-text font-mono text-sm">
      {/* Sidebar */}
      <aside className="w-56 bg-jb-sidebar border-r border-jb-border flex flex-col">
        <div className="px-4 py-3 border-b border-jb-border">
          <h1 className="text-jb-accent font-bold tracking-wide">VOLT-API</h1>
        </div>
        <div className="px-3 py-2 border-b border-jb-border">
          <span className="text-xs text-jb-muted uppercase tracking-wider">Collections</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-xs text-jb-muted italic">No collections yet...</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-10 border-b border-jb-border flex items-center px-4 bg-jb-sidebar">
          <span className="text-jb-text">New Request</span>
        </header>

        {/* Request Section */}
        <section className="p-4 border-b border-jb-border bg-jb-bg">
          {/* URL Bar */}
          <div className="flex gap-2 items-center">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className={`bg-jb-input border border-jb-border px-3 py-2 rounded outline-none focus:border-jb-accent w-28 font-bold ${getMethodColor(method)}`}
            >
              <option value="GET" className="text-jb-success">GET</option>
              <option value="POST" className="text-jb-warning">POST</option>
              <option value="PUT" className="text-jb-accent">PUT</option>
              <option value="DELETE" className="text-jb-error">DELETE</option>
              <option value="PATCH" className="text-orange-400">PATCH</option>
            </select>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Enter request URL..."
              className="flex-1 bg-jb-input border border-jb-border px-4 py-2 rounded outline-none focus:border-jb-accent text-jb-text placeholder:text-jb-muted"
            />
            <button
              onClick={handleSend}
              disabled={requestState === 'loading' || !url.trim()}
              className="bg-jb-accent hover:bg-jb-accent/80 px-6 py-2 rounded font-bold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {requestState === 'loading' ? 'Sending...' : 'Send'}
            </button>
          </div>

          {/* Request Body */}
          {['POST', 'PUT', 'PATCH'].includes(method) && (
            <div className="mt-4">
              <label className="text-xs text-jb-muted mb-2 block uppercase tracking-wider">Request Body</label>
              <textarea
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                placeholder='{"key": "value"}'
                className="w-full h-28 bg-jb-input border border-jb-border px-4 py-3 rounded outline-none focus:border-jb-accent resize-none text-jb-text placeholder:text-jb-muted"
              />
            </div>
          )}
        </section>

        {/* Response Section */}
        <section className="flex-1 flex flex-col overflow-hidden bg-jb-bg">
          {requestState === 'loading' && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-jb-muted flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Sending request...
              </div>
            </div>
          )}

          {response && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Status Bar */}
              <div className="px-4 py-2 bg-jb-sidebar border-b border-jb-border flex items-center gap-4">
                {response.error ? (
                  <span className="text-jb-error font-medium">Error: {response.error}</span>
                ) : (
                  <>
                    <span className={`font-bold ${getStatusColor(response.statusCode)}`}>
                      {response.statusCode}
                    </span>
                    <span className="text-jb-muted">•</span>
                    <span className="text-jb-text">{response.timingMs} ms</span>
                    <span className="text-jb-muted">•</span>
                    <span className="text-jb-text">
                      {response.contentLength > 0
                        ? `${(response.contentLength / 1024).toFixed(2)} KB`
                        : `${(response.body.length / 1024).toFixed(2)} KB`}
                    </span>
                  </>
                )}
              </div>

              {/* Headers */}
              {response.headers && Object.keys(response.headers).length > 0 && (
                <details className="border-b border-jb-border">
                  <summary className="px-4 py-2 cursor-pointer text-jb-muted hover:text-jb-text bg-jb-sidebar select-none">
                    Headers ({Object.keys(response.headers).length})
                  </summary>
                  <div className="px-4 py-2 bg-jb-bg max-h-40 overflow-auto">
                    {Object.entries(response.headers).map(([key, value]) => (
                      <div key={key} className="py-1 flex">
                        <span className="text-jb-accent min-w-48">{key}</span>
                        <span className="text-jb-text">{value}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* Body */}
              <div className="flex-1 overflow-auto p-4">
                <pre className="text-jb-text whitespace-pre-wrap break-words leading-relaxed">
                  {formatJSON(response.body)}
                </pre>
              </div>
            </div>
          )}

          {requestState === 'idle' && !response && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-jb-muted text-lg mb-2">No Response</div>
                <div className="text-jb-muted/60 text-xs">Enter a URL and click Send</div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
