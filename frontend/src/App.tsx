import { useState } from "react";
import "./App.css";

function App() {
  return (
    <div className="flex h-screen bg-jb-bg text-jb-text font-mono">
      {/* Sidebar - Collections & History */}
      <aside className="w-64 bg-jb-sidebar border-r border-jb-border flex flex-col">
        <div className="p-4 border-b border-jb-border font-bold text-xs uppercase tracking-widest text-gray-400">
          Collections
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {/* Collections will go here */}
          <p className="text-xs italic p-2 text-gray-500">
            No collections yet...
          </p>
        </div>
      </aside>

      {/* Main Content - Request & Response */}
      <main className="flex-1 flex flex-col">
        <header className="h-12 border-b border-jb-border flex items-center px-4 bg-jb-sidebar">
          <span className="text-sm font-semibold">New Request</span>
        </header>

        <section className="p-6 space-y-4">
          {/* URL Bar Area */}
          <div className="flex gap-2">
            <select className="bg-jb-input border border-jb-border px-3 py-2 rounded text-sm outline-none focus:border-jb-accent">
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>DELETE</option>
            </select>
            <input
              type="text"
              placeholder="https://api.revolut.com/v1/..."
              className="flex-1 bg-jb-input border border-jb-border px-4 py-2 rounded text-sm outline-none focus:border-jb-accent"
            />
            <button className="bg-jb-accent hover:opacity-90 px-6 py-2 rounded text-sm font-bold text-white transition-all">
              SEND
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
