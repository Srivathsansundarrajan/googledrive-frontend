import { useEffect, useState } from "react";
import { listFilesApi, createFolderApi, deleteFileApi, deleteFolderApi, previewFileApi, downloadFileApi, moveFileApi, moveFolderApi } from "../api/files";
import type { FileItem, FolderItem } from "../types/drive";
import Breadcrumb from "../components/Breadcrumb";
import UploadModal from "../components/UploadModal";
import ContextMenu from "../components/ContextMenu";
import type { ContextMenuItem } from "../components/ContextMenu";
import Layout from "../components/Layout";
import PropertiesPanel from "../components/PropertiesPanel";
import ShareModal from "../components/ShareModal";
import MoveToSharedDrive from "../components/MoveToSharedDrive";
import MoveModal from "../components/MoveModal";
import StickyNotePanel from "../components/StickyNotePanel";
import { FolderIcon } from "../components/FileIcon";
import FileThumbnail from "../components/FileThumbnail";
import { getNotesApi, logAccessApi, toggleStarredApi } from "../api/shared";
import soundService from "../services/soundService";

interface ContextMenuState {
  x: number;
  y: number;
  type: "empty" | "file" | "folder";
  target?: FileItem | FolderItem;
}

interface StickyNote {
  _id: string;
  content: string;
  color: string;
  createdAt: string;
}

const formatSize = (bytes?: number): string => {
  if (!bytes) return "File";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

export default function Dashboard() {
  const [path, setPath] = useState("/");
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Context menu
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Create folder
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creating, setCreating] = useState(false);

  // Properties panel
  const [propertiesItem, setPropertiesItem] = useState<FileItem | FolderItem | null>(null);
  const [propertiesType, setPropertiesType] = useState<"file" | "folder">("file");

  // Share modal
  const [shareItem, setShareItem] = useState<{ type: "file" | "folder"; id: string; name: string } | null>(null);

  // Move to shared drive
  const [moveItem, setMoveItem] = useState<{ type: "file" | "folder"; id: string; name: string } | null>(null);

  // Sticky notes
  const [notesItem, setNotesItem] = useState<{ type: "file" | "folder"; id: string } | null>(null);
  const [fileNotes, setFileNotes] = useState<Record<string, StickyNote[]>>({});

  // Move to folder (not to shared drive)
  const [moveToFolderItem, setMoveToFolderItem] = useState<{ type: "file" | "folder"; id: string; name: string } | null>(null);

  // Drag and drop state
  const [dragItem, setDragItem] = useState<{ type: "file" | "folder"; item: FileItem | FolderItem } | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  const loadData = async (currentPath: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await listFilesApi(currentPath);
      setFolders(res.data.folders);
      setFiles(res.data.files);
      // Load all notes after getting files/folders
      loadAllNotes(res.data.files || [], res.data.folders || []);
    } catch {
      setError("Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  const loadAllNotes = async (fileList: FileItem[], folderList: FolderItem[]) => {
    const notes: Record<string, StickyNote[]> = {};
    try {
      for (const file of fileList) {
        try {
          const res = await getNotesApi("file", file._id);
          if (res.data.notes?.length > 0) {
            notes[`file-${file._id}`] = res.data.notes;
          }
        } catch {
          // Ignore errors for individual files
        }
      }
      for (const folder of folderList) {
        try {
          const res = await getNotesApi("folder", folder._id);
          if (res.data.notes?.length > 0) {
            notes[`folder-${folder._id}`] = res.data.notes;
          }
        } catch {
          // Ignore errors for individual folders
        }
      }
      setFileNotes(notes);
    } catch (err) {
      console.error("Failed to load notes", err);
    }
  };

  useEffect(() => {
    loadData(path);
  }, [path]);

  const goBack = () => {
    if (path === "/") return;
    const parts = path.split("/").filter(Boolean);
    parts.pop();
    setPath(parts.length === 0 ? "/" : "/" + parts.join("/"));
  };

  const refresh = () => loadData(path);

  // Context menu handlers
  const handleContextMenu = (e: React.MouseEvent, type: "empty" | "file" | "folder", target?: FileItem | FolderItem) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, type, target });
  };

  const closeContextMenu = () => setContextMenu(null);

  // File operations
  const handlePreview = async (file: FileItem) => {
    try {
      // Log access for Recent/Most Used tracking
      logAccessApi("file", file._id, file.fileName).catch(() => { });

      const res = await previewFileApi(file._id);
      // Backend returns previewUrl, not url
      if (res.data.previewUrl) {
        window.open(res.data.previewUrl, "_blank");
      } else {
        console.error("No previewUrl in response:", res.data);
      }
    } catch (err) {
      console.error("Preview error:", err);
    }
  };

  const handleDownload = async (file: FileItem) => {
    try {
      const res = await downloadFileApi(file._id);
      const link = document.createElement("a");
      // Backend returns downloadUrl, not url
      link.href = res.data.downloadUrl;
      link.download = file.fileName;
      link.click();
    } catch (err) {
      console.error("Download error:", err);
    }
  };

  const handleDeleteFile = async (file: FileItem) => {
    if (!confirm(`Delete "${file.fileName}"?`)) return;
    try {
      await deleteFileApi(file._id);
      soundService.playDelete();
      refresh();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleDeleteFolder = async (folder: FolderItem) => {
    if (!confirm(`Delete folder "${folder.name}" and all its contents?`)) return;
    try {
      await deleteFolderApi(folder._id);
      soundService.playDelete();
      refresh();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreating(true);
    try {
      await createFolderApi(newFolderName.trim(), path);
      setNewFolderName("");
      setShowCreateFolder(false);
      soundService.playCreate();
      refresh();
    } catch (err) {
      console.error("Create folder error:", err);
    } finally {
      setCreating(false);
    }
  };

  // Get latest sticky note for display on card
  const getLatestNote = (type: "file" | "folder", itemId: string): StickyNote | null => {
    const notes = fileNotes[`${type}-${itemId}`];
    if (!notes || notes.length === 0) return null;
    return notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, type: "file" | "folder", item: FileItem | FolderItem) => {
    setDragItem({ type, item });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverFolder(folderId);
  };

  const handleDragLeave = () => {
    setDragOverFolder(null);
  };

  const handleDrop = async (e: React.DragEvent, targetFolder: FolderItem) => {
    e.preventDefault();
    setDragOverFolder(null);

    if (!dragItem) return;

    try {
      const targetPath = path === "/" ? `/${targetFolder.name}` : `${path}/${targetFolder.name}`;

      if (dragItem.type === "file") {
        await moveFileApi(dragItem.item._id, targetPath);
      } else {
        await moveFolderApi(dragItem.item._id, targetPath);
      }

      soundService.playSuccess();
      refresh();
    } catch (err) {
      console.error("Drag and drop error:", err);
    } finally {
      setDragItem(null);
    }
  };

  const getContextMenuItems = (): ContextMenuItem[] => {
    if (!contextMenu) return [];

    if (contextMenu.type === "empty") {
      return [
        { label: "New Folder", icon: "📁", onClick: () => setShowCreateFolder(true) },
        { label: "Refresh", icon: "🔄", onClick: refresh },
      ];
    }

    if (contextMenu.type === "folder" && contextMenu.target) {
      const folder = contextMenu.target as FolderItem;
      const isStarred = (folder as any).isStarred;
      return [
        { label: "Open", icon: "📂", onClick: () => setPath(path === "/" ? `/${folder.name}` : `${path}/${folder.name}`) },
        { label: isStarred ? "Unstar" : "Star", icon: isStarred ? "⭐" : "☆", onClick: async () => { await toggleStarredApi("folder", folder._id); refresh(); } },
        { label: "Move", icon: "📁", onClick: () => setMoveToFolderItem({ type: "folder", id: folder._id, name: folder.name }) },
        { label: "Notes", icon: "📝", onClick: () => setNotesItem({ type: "folder", id: folder._id }) },
        { label: "Share", icon: "🔗", onClick: () => setShareItem({ type: "folder", id: folder._id, name: folder.name }) },
        { label: "Move to Shared Drive", icon: "🏢", onClick: () => setMoveItem({ type: "folder", id: folder._id, name: folder.name }) },
        { label: "Properties", icon: "ℹ️", onClick: () => { setPropertiesItem(folder); setPropertiesType("folder"); } },
        { label: "Delete", icon: "🗑️", onClick: () => handleDeleteFolder(folder), danger: true },
      ];
    }

    if (contextMenu.type === "file" && contextMenu.target) {
      const file = contextMenu.target as FileItem;
      const isStarred = (file as any).isStarred;
      return [
        { label: "Open", icon: "👁️", onClick: () => handlePreview(file) },
        { label: "Download", icon: "⬇️", onClick: () => handleDownload(file) },
        { label: isStarred ? "Unstar" : "Star", icon: isStarred ? "⭐" : "☆", onClick: async () => { await toggleStarredApi("file", file._id); refresh(); } },
        { label: "Move", icon: "📁", onClick: () => setMoveToFolderItem({ type: "file", id: file._id, name: file.fileName }) },
        { label: "Notes", icon: "📝", onClick: () => setNotesItem({ type: "file", id: file._id }) },
        { label: "Share", icon: "🔗", onClick: () => setShareItem({ type: "file", id: file._id, name: file.fileName }) },
        { label: "Move to Shared Drive", icon: "🏢", onClick: () => setMoveItem({ type: "file", id: file._id, name: file.fileName }) },
        { label: "Properties", icon: "ℹ️", onClick: () => { setPropertiesItem(file); setPropertiesType("file"); } },
        { label: "Delete", icon: "🗑️", onClick: () => handleDeleteFile(file), danger: true },
      ];
    }

    return [];
  };

  return (
    <Layout>
      <div onClick={closeContextMenu} onContextMenu={(e) => { if (e.target === e.currentTarget) handleContextMenu(e, "empty"); }}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Drive</h1>
            {path !== "/" && (
              <button onClick={goBack} className="btn btn-secondary text-sm">
                ← Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateFolder(true)}
              className="btn btn-secondary"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              New Folder
            </button>
            <UploadModal path={path} onUploaded={refresh} />
          </div>
        </div>

        <Breadcrumb path={path} onNavigate={setPath} />

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full"></div>
          </div>
        )}

        {error && <p className="text-[var(--danger)]">{error}</p>}

        {!loading && folders.length === 0 && files.length === 0 && (
          <div
            className="card text-center py-16 mt-4"
            onContextMenu={(e) => handleContextMenu(e, "empty")}
          >
            <div className="w-20 h-20 mx-auto mb-4">
              <FolderIcon size="lg" />
            </div>
            <p className="text-lg text-[var(--text-secondary)] mb-2">This folder is empty</p>
            <p className="text-sm text-[var(--text-muted)]">Drop files here or use the Upload button</p>
          </div>
        )}

        {/* Files Grid */}
        <div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-6"
          onContextMenu={(e) => { if (e.target === e.currentTarget) handleContextMenu(e, "empty"); }}
        >
          {folders.map((folder) => {
            const latestNote = getLatestNote("folder", folder._id);
            const isDragOver = dragOverFolder === folder._id;
            return (
              <div
                key={folder._id}
                draggable
                onDragStart={(e) => handleDragStart(e, "folder", folder)}
                onDragOver={(e) => handleDragOver(e, folder._id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, folder)}
                onContextMenu={(e) => handleContextMenu(e, "folder", folder)}
                onClick={() => setPath(path === "/" ? `/${folder.name}` : `${path}/${folder.name}`)}
                className={`file-card group ${isDragOver ? "ring-2 ring-[var(--accent)] bg-[var(--accent-light)]" : ""
                  }`}
              >
                {/* Sticky Note Preview */}
                {latestNote && (
                  <div className={`sticky-note-preview sticky-note-${latestNote.color}`}>
                    {latestNote.content.length > 25
                      ? latestNote.content.substring(0, 25) + "..."
                      : latestNote.content}
                  </div>
                )}
                <div className="flex justify-center mb-3 group-hover:scale-110 transition-transform">
                  <FolderIcon />
                </div>
                <p className="font-medium truncate text-sm text-[var(--text-primary)] text-center">{folder.name}</p>
                <p className="text-xs text-[var(--text-muted)] text-center">Folder</p>
              </div>
            );
          })}

          {files.map((file) => {
            const latestNote = getLatestNote("file", file._id);
            return (
              <div
                key={file._id}
                draggable
                onDragStart={(e) => handleDragStart(e, "file", file)}
                onContextMenu={(e) => handleContextMenu(e, "file", file)}
                onClick={() => handlePreview(file)}
                className="file-card group"
              >
                {/* Sticky Note Preview */}
                {latestNote && (
                  <div className={`sticky-note-preview sticky-note-${latestNote.color}`}>
                    {latestNote.content.length > 25
                      ? latestNote.content.substring(0, 25) + "..."
                      : latestNote.content}
                  </div>
                )}
                <div className="flex justify-center mb-3 group-hover:scale-110 transition-transform">
                  <FileThumbnail fileId={file._id} fileName={file.fileName} mimeType={file.mimeType} />
                </div>
                <p className="font-medium truncate text-sm text-[var(--text-primary)] text-center" title={file.fileName}>{file.fileName}</p>
                <p className="text-xs text-[var(--text-muted)] text-center">
                  {formatSize(file.size)}
                </p>
              </div>
            );
          })}
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            items={getContextMenuItems()}
            onClose={closeContextMenu}
          />
        )}

        {/* Create Folder Modal */}
        {showCreateFolder && (
          <div className="modal-overlay" onClick={() => setShowCreateFolder(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2 className="font-semibold text-lg text-[var(--text-primary)] mb-4">Create New Folder</h2>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="input mb-4"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateFolder();
                  if (e.key === "Escape") setShowCreateFolder(false);
                }}
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => { setShowCreateFolder(false); setNewFolderName(""); }} className="btn btn-secondary">
                  Cancel
                </button>
                <button onClick={handleCreateFolder} disabled={creating || !newFolderName.trim()} className="btn btn-primary">
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Properties Panel */}
        {propertiesItem && (
          <PropertiesPanel
            item={propertiesItem}
            type={propertiesType}
            onClose={() => setPropertiesItem(null)}
          />
        )}

        {/* Share Modal */}
        {shareItem && (
          <ShareModal
            resourceType={shareItem.type}
            resourceId={shareItem.id}
            resourceName={shareItem.name}
            onClose={() => setShareItem(null)}
          />
        )}

        {/* Move to Shared Drive Modal */}
        {moveItem && (
          <MoveToSharedDrive
            resourceType={moveItem.type}
            resourceId={moveItem.id}
            resourceName={moveItem.name}
            onClose={() => setMoveItem(null)}
            onMoved={() => loadData(path)}
          />
        )}

        {/* Sticky Notes Panel */}
        {notesItem && (
          <StickyNotePanel
            resourceType={notesItem.type}
            resourceId={notesItem.id}
            onClose={() => { setNotesItem(null); refresh(); }}
          />
        )}

        {/* Move to Folder Modal */}
        {moveToFolderItem && (
          <MoveModal
            type={moveToFolderItem.type}
            itemId={moveToFolderItem.id}
            itemName={moveToFolderItem.name}
            currentPath={path}
            onClose={() => setMoveToFolderItem(null)}
            onMoved={() => { refresh(); soundService.playSuccess(); }}
          />
        )}
      </div>
    </Layout>
  );
}
