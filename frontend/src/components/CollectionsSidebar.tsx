import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  GetCollections,
  GetCollectionRequests,
  CreateCollection,
  RenameCollection,
  DeleteCollection,
  DeleteSavedRequest,
  ExportCollection,
  ImportCollection,
  MoveSavedRequest,
} from "../../wailsjs/go/app/App";
import { app } from "../../wailsjs/go/models";
import { Icons } from "./Icons";
import { getMethodColor } from "../utils/helpers";

type Collection = app.Collection;
type SavedRequest = app.SavedRequest;

export interface CollectionsSidebarRef {
  refresh: () => void;
}

interface CollectionsSidebarProps {
  onSelectRequest: (request: SavedRequest) => void;
}

interface CollectionWithRequests extends Collection {
  requests: SavedRequest[];
  isExpanded: boolean;
  isLoading: boolean;
}

export const CollectionsSidebar = forwardRef<CollectionsSidebarRef, CollectionsSidebarProps>(
  ({ onSelectRequest }, ref) => {
    const [collections, setCollections] = useState<CollectionWithRequests[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");
    const [contextMenu, setContextMenu] = useState<{
      type: "collection" | "request";
      id: string;
      collectionId?: string;
      x: number;
      y: number;
    } | null>(null);

    useImperativeHandle(ref, () => ({
      refresh: loadCollections,
    }));

    useEffect(() => {
      loadCollections();
    }, []);

    // Close context menu on click outside
    useEffect(() => {
      const handleClick = () => setContextMenu(null);
      if (contextMenu) {
        document.addEventListener("click", handleClick);
        return () => document.removeEventListener("click", handleClick);
      }
    }, [contextMenu]);

    const loadCollections = async () => {
      try {
        const items = await GetCollections();
        setCollections(
          items.map((c) => ({
            ...c,
            requests: [],
            isExpanded: false,
            isLoading: false,
          }))
        );
      } catch (err) {
        console.error("Failed to load collections:", err);
      }
    };

    const toggleCollection = async (id: string) => {
      setCollections((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          if (!c.isExpanded && c.requests.length === 0) {
            // Load requests when expanding for the first time
            loadCollectionRequests(id);
            return { ...c, isExpanded: true, isLoading: true };
          }
          return { ...c, isExpanded: !c.isExpanded };
        })
      );
    };

    const loadCollectionRequests = async (collectionId: string) => {
      try {
        const requests = await GetCollectionRequests(collectionId);
        setCollections((prev) =>
          prev.map((c) =>
            c.id === collectionId ? { ...c, requests, isLoading: false } : c
          )
        );
      } catch (err) {
        console.error("Failed to load collection requests:", err);
        setCollections((prev) =>
          prev.map((c) =>
            c.id === collectionId ? { ...c, isLoading: false } : c
          )
        );
      }
    };

    const handleCreate = async () => {
      if (!newName.trim()) return;
      try {
        await CreateCollection(newName.trim());
        setNewName("");
        setIsCreating(false);
        loadCollections();
      } catch (err) {
        console.error("Failed to create collection:", err);
      }
    };

    const handleRename = async (id: string) => {
      if (!editingName.trim()) return;
      try {
        await RenameCollection(id, editingName.trim());
        setEditingId(null);
        setEditingName("");
        loadCollections();
      } catch (err) {
        console.error("Failed to rename collection:", err);
      }
    };

    const handleDeleteCollection = async (id: string) => {
      try {
        await DeleteCollection(id);
        loadCollections();
      } catch (err) {
        console.error("Failed to delete collection:", err);
      }
    };

    const handleDeleteRequest = async (id: string, collectionId: string) => {
      try {
        await DeleteSavedRequest(id);
        loadCollectionRequests(collectionId);
      } catch (err) {
        console.error("Failed to delete request:", err);
      }
    };

    const handleExport = async (id: string) => {
      try {
        const jsonData = await ExportCollection(id);
        const collection = collections.find((c) => c.id === id);
        const blob = new Blob([jsonData], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${collection?.name || "collection"}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Failed to export collection:", err);
      }
    };

    const handleImport = async () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          await ImportCollection(text);
          loadCollections();
        } catch (err) {
          console.error("Failed to import collection:", err);
        }
      };
      input.click();
    };

    const handleContextMenu = (
      e: React.MouseEvent,
      type: "collection" | "request",
      id: string,
      collectionId?: string
    ) => {
      e.preventDefault();
      setContextMenu({ type, id, collectionId, x: e.clientX, y: e.clientY });
    };

    const handleMoveRequest = async (requestId: string, newCollectionId: string) => {
      try {
        await MoveSavedRequest(requestId, newCollectionId);
        // Refresh all collections to update counts
        loadCollections();
      } catch (err) {
        console.error("Failed to move request:", err);
      }
    };

    return (
      <div className="h-full flex flex-col">
        {/* Header with actions */}
        <div className="p-2 border-b border-ctp-surface0 flex items-center gap-1">
          <button
            onClick={() => setIsCreating(true)}
            className="flex-1 px-2 py-1.5 text-xs text-ctp-subtext0 hover:text-ctp-text hover:bg-ctp-surface0 rounded flex items-center justify-center gap-1"
            title="New Collection"
          >
            <Icons.Plus size={14} />
            New
          </button>
          <button
            onClick={handleImport}
            className="px-2 py-1.5 text-xs text-ctp-subtext0 hover:text-ctp-text hover:bg-ctp-surface0 rounded"
            title="Import Collection"
          >
            <Icons.Import size={14} />
          </button>
        </div>

        {/* New collection input */}
        {isCreating && (
          <div className="p-2 border-b border-ctp-surface0">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") {
                  setIsCreating(false);
                  setNewName("");
                }
              }}
              placeholder="Collection name..."
              className="w-full bg-ctp-surface0 border border-ctp-surface1 px-2 py-1.5 rounded text-xs outline-none focus:border-ctp-lavender"
              autoFocus
            />
            <div className="flex gap-1 mt-1">
              <button
                onClick={handleCreate}
                className="flex-1 px-2 py-1 text-xs bg-ctp-mauve text-ctp-base rounded hover:bg-ctp-mauve/80"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewName("");
                }}
                className="px-2 py-1 text-xs text-ctp-subtext0 hover:text-ctp-text"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Collections list */}
        <div className="flex-1 overflow-auto">
          {collections.length === 0 && !isCreating ? (
            <div className="p-4 text-xs text-ctp-subtext0 text-center">
              No collections yet
            </div>
          ) : (
            collections.map((collection) => (
              <div key={collection.id} className="border-b border-ctp-surface0/50">
                {/* Collection header */}
                <div
                  className="flex items-center gap-1 px-2 py-2 hover:bg-ctp-surface0/50 cursor-pointer group"
                  onClick={() => toggleCollection(collection.id)}
                  onContextMenu={(e) =>
                    handleContextMenu(e, "collection", collection.id)
                  }
                >
                  <Icons.ChevronRight
                    size={12}
                    className={`text-ctp-subtext0 transition-transform ${
                      collection.isExpanded ? "rotate-90" : ""
                    }`}
                  />
                  {editingId === collection.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(collection.id);
                        if (e.key === "Escape") {
                          setEditingId(null);
                          setEditingName("");
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 bg-ctp-surface0 border border-ctp-lavender px-1 py-0.5 rounded text-xs outline-none"
                      autoFocus
                    />
                  ) : (
                    <>
                      <Icons.Folder size={14} className="text-ctp-peach" />
                      <span className="flex-1 text-xs text-ctp-text truncate">
                        {collection.name}
                      </span>
                      <span className="text-xs text-ctp-overlay0 opacity-0 group-hover:opacity-100">
                        {collection.requests.length > 0
                          ? collection.requests.length
                          : ""}
                      </span>
                    </>
                  )}
                </div>

                {/* Requests in collection */}
                {collection.isExpanded && (
                  <div className="bg-ctp-base/50">
                    {collection.isLoading ? (
                      <div className="px-6 py-2 text-xs text-ctp-subtext0">
                        Loading...
                      </div>
                    ) : collection.requests.length === 0 ? (
                      <div className="px-6 py-2 text-xs text-ctp-overlay0 italic">
                        Empty collection
                      </div>
                    ) : (
                      collection.requests.map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center gap-2 px-2 pl-6 py-1.5 hover:bg-ctp-surface0/50 cursor-pointer group"
                          onClick={() => onSelectRequest(request)}
                          onContextMenu={(e) =>
                            handleContextMenu(
                              e,
                              "request",
                              request.id,
                              collection.id
                            )
                          }
                        >
                          <span
                            className={`text-[10px] font-bold w-10 ${getMethodColor(
                              request.method
                            )}`}
                          >
                            {request.method}
                          </span>
                          <span className="flex-1 text-xs text-ctp-subtext1 truncate">
                            {request.name}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="fixed bg-ctp-surface0 border border-ctp-surface1 rounded-lg shadow-lg shadow-ctp-crust/50 py-1 z-50 min-w-32"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {contextMenu.type === "collection" ? (
              <>
                <button
                  onClick={() => {
                    const col = collections.find(
                      (c) => c.id === contextMenu.id
                    );
                    setEditingId(contextMenu.id);
                    setEditingName(col?.name || "");
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-left text-ctp-text hover:bg-ctp-surface1 flex items-center gap-2"
                >
                  <Icons.Edit size={12} />
                  Rename
                </button>
                <button
                  onClick={() => {
                    handleExport(contextMenu.id);
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-left text-ctp-text hover:bg-ctp-surface1 flex items-center gap-2"
                >
                  <Icons.Export size={12} />
                  Export
                </button>
                <div className="border-t border-ctp-surface1 my-1" />
                <button
                  onClick={() => {
                    handleDeleteCollection(contextMenu.id);
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-left text-ctp-red hover:bg-ctp-surface1 flex items-center gap-2"
                >
                  <Icons.Trash size={12} />
                  Delete
                </button>
              </>
            ) : (
              <>
                {/* Move to submenu */}
                <div className="relative group/move">
                  <button className="w-full px-3 py-1.5 text-xs text-left text-ctp-text hover:bg-ctp-surface1 flex items-center gap-2 justify-between">
                    <span className="flex items-center gap-2">
                      <Icons.Folder size={12} />
                      Move to
                    </span>
                    <Icons.ChevronRight size={12} />
                  </button>
                  <div className="absolute left-full top-0 bg-ctp-surface0 border border-ctp-surface1 rounded-lg shadow-lg py-1 min-w-32 hidden group-hover/move:block">
                    {collections
                      .filter((c) => c.id !== contextMenu.collectionId)
                      .map((col) => (
                        <button
                          key={col.id}
                          onClick={() => {
                            handleMoveRequest(contextMenu.id, col.id);
                            setContextMenu(null);
                          }}
                          className="w-full px-3 py-1.5 text-xs text-left text-ctp-text hover:bg-ctp-surface1 flex items-center gap-2"
                        >
                          <Icons.Folder size={12} className="text-ctp-peach" />
                          {col.name}
                        </button>
                      ))}
                  </div>
                </div>
                <div className="border-t border-ctp-surface1 my-1" />
                <button
                  onClick={() => {
                    handleDeleteRequest(
                      contextMenu.id,
                      contextMenu.collectionId!
                    );
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-left text-ctp-red hover:bg-ctp-surface1 flex items-center gap-2"
                >
                  <Icons.Trash size={12} />
                  Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }
);

CollectionsSidebar.displayName = "CollectionsSidebar";
