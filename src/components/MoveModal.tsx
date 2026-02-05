import { useState, useEffect } from "react";
import { listFilesApi, moveFileApi, moveFolderApi } from "../api/files";

interface Folder {
    _id: string;
    name: string;
    parentPath: string;
}

interface Props {
    type: "file" | "folder";
    itemId: string;
    itemName: string;
    currentPath: string;
    onClose: () => void;
    onMoved?: () => void;
}

export default function MoveModal({ type, itemId, itemName, currentPath, onClose, onMoved }: Props) {
    const [folders, setFolders] = useState<Folder[]>([]);
    const [selectedPath, setSelectedPath] = useState<string>("/");
    const [loading, setLoading] = useState(true);
    const [moving, setMoving] = useState(false);
    const [error, setError] = useState("");
    const [browsePath, setBrowsePath] = useState("/");

    useEffect(() => {
        loadFolders(browsePath);
    }, [browsePath]);

    const loadFolders = async (path: string) => {
        setLoading(true);
        try {
            const res = await listFilesApi(path);
            setFolders(res.data.folders || []);
        } catch (err) {
            console.error("Failed to load folders", err);
        } finally {
            setLoading(false);
        }
    };

    const handleMove = async () => {
        if (selectedPath === currentPath) {
            setError("Item is already in this location");
            return;
        }
        setMoving(true);
        setError("");
        try {
            if (type === "file") {
                await moveFileApi(itemId, selectedPath);
            } else {
                await moveFolderApi(itemId, selectedPath);
            }
            onMoved?.();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || err.response?.data?.error || "Failed to move item");
        } finally {
            setMoving(false);
        }
    };

    const navigateToFolder = (folder: Folder) => {
        const newPath = folder.parentPath === "/"
            ? `/${folder.name}`
            : `${folder.parentPath}/${folder.name}`;
        setBrowsePath(newPath);
        setSelectedPath(newPath);
    };

    const navigateUp = () => {
        const parts = browsePath.split("/").filter(Boolean);
        parts.pop();
        const newPath = parts.length > 0 ? `/${parts.join("/")}` : "/";
        setBrowsePath(newPath);
        setSelectedPath(newPath);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-lg text-[var(--text-primary)]">Move "{itemName}"</h2>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl">
                        ✕
                    </button>
                </div>

                <p className="text-sm text-[var(--text-secondary)] mb-4">
                    Select destination folder
                </p>

                {/* Current Path */}
                <div className="flex items-center gap-2 mb-3 p-2 bg-[var(--bg-hover)] rounded">
                    {browsePath !== "/" && (
                        <button
                            onClick={navigateUp}
                            className="p-1 hover:bg-[var(--bg-secondary)] rounded"
                            title="Go up"
                        >
                            ⬆️
                        </button>
                    )}
                    <span className="text-sm text-[var(--text-primary)]">📁 {browsePath}</span>
                </div>

                {/* Folder List */}
                <div className="border border-[var(--border)] rounded-lg max-h-60 overflow-auto mb-4">
                    {/* Root Option */}
                    <button
                        onClick={() => setSelectedPath("/")}
                        className={`w-full p-3 text-left flex items-center gap-3 border-b border-[var(--border)] hover:bg-[var(--bg-hover)] ${selectedPath === "/" ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                    >
                        <span>🏠</span>
                        <span className="text-[var(--text-primary)]">Root (My Drive)</span>
                        {selectedPath === "/" && <span className="ml-auto text-blue-500">✓</span>}
                    </button>

                    {loading ? (
                        <div className="flex justify-center py-6">
                            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        </div>
                    ) : folders.length === 0 ? (
                        <div className="p-4 text-center text-[var(--text-muted)]">
                            No folders in this location
                        </div>
                    ) : (
                        folders.map((folder) => (
                            <div
                                key={folder._id}
                                className={`w-full p-3 flex items-center gap-3 border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-hover)] cursor-pointer ${selectedPath === (folder.parentPath === "/" ? `/${folder.name}` : `${folder.parentPath}/${folder.name}`)
                                    ? "bg-blue-50 dark:bg-blue-900/20"
                                    : ""
                                    }`}
                            >
                                <button
                                    onClick={() => {
                                        const path = folder.parentPath === "/"
                                            ? `/${folder.name}`
                                            : `${folder.parentPath}/${folder.name}`;
                                        setSelectedPath(path);
                                    }}
                                    className="flex items-center gap-3 flex-1"
                                >
                                    <span>📁</span>
                                    <span className="text-[var(--text-primary)]">{folder.name}</span>
                                    {selectedPath === (folder.parentPath === "/" ? `/${folder.name}` : `${folder.parentPath}/${folder.name}`) && (
                                        <span className="ml-auto text-blue-500">✓</span>
                                    )}
                                </button>
                                <button
                                    onClick={() => navigateToFolder(folder)}
                                    className="p-1 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-muted)]"
                                    title="Open folder"
                                >
                                    →
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {error && (
                    <div className="text-red-500 text-sm mb-3">{error}</div>
                )}

                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="btn btn-secondary">
                        Cancel
                    </button>
                    <button
                        onClick={handleMove}
                        disabled={moving}
                        className="btn btn-primary"
                    >
                        {moving ? "Moving..." : "Move"}
                    </button>
                </div>
            </div>
        </div>
    );
}
