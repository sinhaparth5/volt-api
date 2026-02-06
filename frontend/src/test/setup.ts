import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Wails runtime
vi.mock('../../wailsjs/runtime/runtime', () => ({
  WindowMinimise: vi.fn(),
  WindowToggleMaximise: vi.fn(),
  Quit: vi.fn(),
  EventsOn: vi.fn(),
  EventsOff: vi.fn(),
}));

// Mock Wails Go bindings
vi.mock('../../wailsjs/go/main/App', () => ({
  SendRequest: vi.fn(),
  GetHistory: vi.fn().mockResolvedValue([]),
  DeleteHistoryItem: vi.fn(),
  ClearHistory: vi.fn(),
  GetCollections: vi.fn().mockResolvedValue([]),
  CreateCollection: vi.fn(),
  DeleteCollection: vi.fn(),
  RenameCollection: vi.fn(),
  SaveToCollection: vi.fn(),
  RemoveFromCollection: vi.fn(),
  MoveToCollection: vi.fn(),
  ExportCollection: vi.fn(),
  ImportCollection: vi.fn(),
  GetEnvironments: vi.fn().mockResolvedValue([]),
  CreateEnvironment: vi.fn(),
  UpdateEnvironment: vi.fn(),
  DeleteEnvironment: vi.fn(),
  ExportEnvironment: vi.fn(),
  ImportEnvironment: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
