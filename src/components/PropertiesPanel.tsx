import type { FileItem, FolderItem } from "../types/drive";

interface Props {
    item: FileItem | FolderItem;
    type: "file" | "folder";
    onClose: () => void;
}

export default function PropertiesPanel({ item, type, onClose }: Props) {
    const isFile = type === "file";
    const file = isFile ? (item as FileItem) : null;
    const folder = !isFile ? (item as FolderItem) : null;

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatSize = (bytes?: number) => {
        if (!bytes) return "Unknown";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getFileExtension = (fileName: string) => {
        const parts = fileName.split(".");
        return parts.length > 1 ? parts.pop()?.toUpperCase() : "Unknown";
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-lg text-[var(--text-primary)]">Properties</h2>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl">
                        ✕
                    </button>
                </div>

                {/* Icon and Name */}
                <div className="flex items-center gap-4 mb-6 p-4 bg-[var(--bg-hover)] rounded-xl">
                    <div className="text-4xl">{isFile ? "📄" : "📁"}</div>
                    <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-[var(--text-primary)]">{isFile ? file?.fileName : folder?.name}</p>
                        <p className="text-sm text-[var(--text-secondary)]">{isFile ? "File" : "Folder"}</p>
                    </div>
                </div>

                {/* Properties List */}
                <div className="space-y-3">
                    {isFile && file && (
                        <>
                            <div className="flex justify-between py-2 border-b border-[var(--border)]">
                                <span className="text-[var(--text-secondary)]">Type</span>
                                <span className="font-medium text-[var(--text-primary)]">{getFileExtension(file.fileName)} File</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-[var(--border)]">
                                <span className="text-[var(--text-secondary)]">Size</span>
                                <span className="font-medium text-[var(--text-primary)]">{formatSize(file.size)}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-[var(--border)]">
                                <span className="text-[var(--text-secondary)]">Location</span>
                                <span className="font-medium truncate max-w-[150px] text-[var(--text-primary)]">{file.folderPath || "/"}</span>
                            </div>
                            {file.mimeType && (
                                <div className="flex justify-between py-2 border-b border-[var(--border)]">
                                    <span className="text-[var(--text-secondary)]">MIME Type</span>
                                    <span className="font-medium text-xs text-[var(--text-primary)]">{file.mimeType}</span>
                                </div>
                            )}
                        </>
                    )}

                    {!isFile && folder && (
                        <>
                            <div className="flex justify-between py-2 border-b border-[var(--border)]">
                                <span className="text-[var(--text-secondary)]">Type</span>
                                <span className="font-medium text-[var(--text-primary)]">Folder</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-[var(--border)]">
                                <span className="text-[var(--text-secondary)]">Location</span>
                                <span className="font-medium truncate max-w-[150px] text-[var(--text-primary)]">{folder.parentPath || "/"}</span>
                            </div>
                        </>
                    )}

                    <div className="flex justify-between py-2">
                        <span className="text-[var(--text-secondary)]">Created</span>
                        <span className="font-medium text-sm text-[var(--text-primary)]">{formatDate(item.createdAt)}</span>
                    </div>
                </div>

                {/* Close Button */}
                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="btn btn-secondary">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
