import { useState, useEffect } from "react";
import { GetCollections, SaveRequestToCollection, CreateCollection } from "../../wailsjs/go/app/App";
import { app } from "../../wailsjs/go/models";
import { Icons } from "./Icons";

type Collection = app.Collection;

interface SaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}

export function SaveRequestModal({
  isOpen,
  onClose,
  onSaved,
  method,
  url,
  headers,
  body,
}: SaveRequestModalProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const [requestName, setRequestName] = useState("");
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCollections();
      // Generate default name from URL
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split("/").filter(Boolean);
        const defaultName = pathParts.length > 0
          ? `${method} ${pathParts[pathParts.length - 1]}`
          : `${method} ${urlObj.hostname}`;
        setRequestName(defaultName);
      } catch {
        setRequestName(`${method} Request`);
      }
    }
  }, [isOpen, url, method]);

  const loadCollections = async () => {
    try {
      const items = await GetCollections();
      setCollections(items);
      if (items.length > 0 && !selectedCollectionId) {
        setSelectedCollectionId(items[0].id);
      }
    } catch (err) {
      console.error("Failed to load collections:", err);
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;
    try {
      const newCollection = await CreateCollection(newCollectionName.trim());
      if (newCollection) {
        setSelectedCollectionId(newCollection.id);
        setNewCollectionName("");
        setIsCreatingCollection(false);
        loadCollections();
      }
    } catch (err) {
      console.error("Failed to create collection:", err);
    }
  };

  const handleSave = async () => {
    if (!selectedCollectionId || !requestName.trim()) return;

    setIsSaving(true);
    try {
      await SaveRequestToCollection(selectedCollectionId, {
        name: requestName.trim(),
        method,
        url,
        headers,
        body,
      });
      onSaved();
      onClose();
    } catch (err) {
      console.error("Failed to save request:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-ctp-crust/80 flex items-center justify-center z-50">
      <div className="bg-ctp-mantle border border-ctp-surface0 rounded-lg w-96 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-ctp-surface0">
          <h2 className="text-sm font-bold text-ctp-text flex items-center gap-2">
            <Icons.Save size={16} className="text-ctp-mauve" />
            Save Request
          </h2>
          <button
            onClick={onClose}
            className="text-ctp-subtext0 hover:text-ctp-text"
          >
            <Icons.X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Request Name */}
          <div>
            <label className="text-xs text-ctp-subtext0 block mb-1.5">
              Request Name
            </label>
            <input
              type="text"
              value={requestName}
              onChange={(e) => setRequestName(e.target.value)}
              placeholder="My Request"
              className="w-full bg-ctp-surface0 border border-ctp-surface1 px-3 py-2 rounded text-sm outline-none focus:border-ctp-lavender text-ctp-text"
            />
          </div>

          {/* Collection Selector */}
          <div>
            <label className="text-xs text-ctp-subtext0 block mb-1.5">
              Collection
            </label>
            {collections.length === 0 && !isCreatingCollection ? (
              <div className="text-xs text-ctp-overlay0 p-3 bg-ctp-surface0 rounded border border-ctp-surface1">
                No collections yet.{" "}
                <button
                  onClick={() => setIsCreatingCollection(true)}
                  className="text-ctp-mauve hover:underline"
                >
                  Create one
                </button>
              </div>
            ) : isCreatingCollection ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateCollection();
                    if (e.key === "Escape") {
                      setIsCreatingCollection(false);
                      setNewCollectionName("");
                    }
                  }}
                  placeholder="Collection name..."
                  className="w-full bg-ctp-surface0 border border-ctp-surface1 px-3 py-2 rounded text-sm outline-none focus:border-ctp-lavender text-ctp-text"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateCollection}
                    className="flex-1 px-3 py-1.5 text-xs bg-ctp-mauve text-ctp-base rounded hover:bg-ctp-mauve/80"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setIsCreatingCollection(false);
                      setNewCollectionName("");
                    }}
                    className="px-3 py-1.5 text-xs text-ctp-subtext0 hover:text-ctp-text"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  value={selectedCollectionId}
                  onChange={(e) => setSelectedCollectionId(e.target.value)}
                  className="flex-1 bg-ctp-surface0 border border-ctp-surface1 px-3 py-2 rounded text-sm outline-none focus:border-ctp-lavender text-ctp-text"
                >
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setIsCreatingCollection(true)}
                  className="px-3 py-2 bg-ctp-surface0 border border-ctp-surface1 rounded text-ctp-subtext0 hover:text-ctp-text hover:border-ctp-surface2"
                  title="New Collection"
                >
                  <Icons.Plus size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="p-3 bg-ctp-base rounded border border-ctp-surface0 text-xs">
            <div className="flex items-center gap-2 text-ctp-subtext0">
              <span className="font-bold text-ctp-green">{method}</span>
              <span className="truncate text-ctp-text">{url}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-ctp-surface0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-ctp-subtext0 hover:text-ctp-text"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !selectedCollectionId || !requestName.trim()}
            className="px-4 py-2 text-xs bg-ctp-mauve text-ctp-base rounded font-bold hover:bg-ctp-mauve/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Icons.Spinner size={12} />
                Saving...
              </>
            ) : (
              <>
                <Icons.Save size={12} />
                Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
