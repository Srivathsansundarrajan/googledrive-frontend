import { useState, useRef, useEffect } from "react";
import { uploadFileApi, checkFolderExistsApi } from "../api/files";
import soundService from "../services/soundService";

type ConflictAction = "merge" | "replace" | "rename" | null;
type UploadPhase = "idle" | "selecting" | "uploading" | "success" | "error";

interface ConflictInfo {
    folderName: string;
    action: ConflictAction;
}

const CONCURRENCY = 3;

interface Props {
    path: string;
    onUploaded: () => void;
}

export default function UploadModal({ path, onUploaded }: Props) {
    const [phase, setPhase] = useState<UploadPhase>("idle");
    const [files, setFiles] = useState<File[]>([]);
    const [percent, setPercent] = useState(0);
    const [uploadedBytes, setUploadedBytes] = useState(0);
    const [totalBytes, setTotalBytes] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [conflict, setConflict] = useState<ConflictInfo | null>(null);
    const [newFolderName, setNewFolderName] = useState("");
    const [showFilePicker, setShowFilePicker] = useState(false);

    const controllersRef = useRef<AbortController[]>([]);
    const cancelledRef = useRef(false);
    const fileProgressRef = useRef<Map<string, number>>(new Map());

    // Auto-hide success message after 3 seconds
    useEffect(() => {
        if (phase === "success") {
            const timer = setTimeout(() => {
                setPhase("idle");
                setPercent(0);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [phase]);

    const chunkArray = <T,>(arr: T[], size: number): T[][] => {
        const chunks: T[][] = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    };

    // Drag and drop handlers for the entire page
    useEffect(() => {
        const handleDragOver = (e: DragEvent) => {
            e.preventDefault();
            setIsDragging(true);
        };

        const handleDragLeave = (e: DragEvent) => {
            if (!e.relatedTarget) setIsDragging(false);
        };

        const handleDrop = (e: DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            const droppedFiles = Array.from(e.dataTransfer?.files || []).filter(
                (f) => f.size > 0
            );
            if (droppedFiles.length > 0) {
                setFiles(droppedFiles);
                setShowFilePicker(true);
            }
        };

        document.addEventListener("dragover", handleDragOver);
        document.addEventListener("dragleave", handleDragLeave);
        document.addEventListener("drop", handleDrop);

        return () => {
            document.removeEventListener("dragover", handleDragOver);
            document.removeEventListener("dragleave", handleDragLeave);
            document.removeEventListener("drop", handleDrop);
        };
    }, []);

    const getFolderNameFromFiles = (): string | null => {
        if (files.length === 0) return null;
        const firstFile = files[0] as any;
        if (firstFile.webkitRelativePath) {
            const parts = firstFile.webkitRelativePath.split("/");
            if (parts.length > 1) return parts[0];
        }
        if (files.length === 1 && files[0].name.endsWith(".zip")) {
            return files[0].name.replace(/\.zip$/i, "");
        }
        return null;
    };

    const checkForConflicts = async (): Promise<boolean> => {
        const folderName = getFolderNameFromFiles();
        if (!folderName) return false;
        try {
            const res = await checkFolderExistsApi(folderName, path);
            if (res.data.exists) {
                setConflict({ folderName, action: null });
                return true;
            }
        } catch {
            // API doesn't exist, proceed
        }
        return false;
    };

    const uploadFiles = async (conflictAction?: ConflictAction, customName?: string) => {
        if (files.length === 0) return;

        cancelledRef.current = false;
        controllersRef.current = [];
        fileProgressRef.current.clear();

        setPhase("uploading");
        setShowFilePicker(false);
        setConflict(null);  // Close conflict dialog immediately

        const total = files.reduce((sum, f) => sum + f.size, 0);
        setTotalBytes(total);
        setUploadedBytes(0);
        setPercent(0);

        try {
            const batches = chunkArray(files, CONCURRENCY);

            for (const batch of batches) {
                if (cancelledRef.current) break;

                await Promise.all(
                    batch.map((file) => {
                        const relativePath = (file as any).webkitRelativePath || file.name;
                        const relativeFolders = relativePath.includes("/")
                            ? relativePath.split("/").slice(0, -1).join("/")
                            : "";

                        let folderPath = relativeFolders
                            ? (path === "/" ? "/" + relativeFolders : path + "/" + relativeFolders)
                            : path;

                        if (customName && relativeFolders) {
                            const parts = folderPath.split("/");
                            const idx = parts.findIndex(p => p === relativeFolders.split("/")[0]);
                            if (idx !== -1) {
                                parts[idx] = customName;
                                folderPath = parts.join("/");
                            }
                        }

                        const form = new FormData();
                        form.append("file", file);
                        form.append("path", folderPath);
                        if (conflictAction) form.append("conflictAction", conflictAction);
                        if (customName) form.append("customName", customName);

                        const controller = new AbortController();
                        controllersRef.current.push(controller);

                        return uploadFileApi(
                            form,
                            (pct) => {
                                if (cancelledRef.current) return;
                                const bytes = (pct / 100) * file.size;
                                fileProgressRef.current.set(file.name, bytes);
                                const sum = Array.from(fileProgressRef.current.values())
                                    .reduce((a, b) => a + b, 0);
                                setUploadedBytes(Math.min(sum, total));
                                setPercent(Math.round((sum / total) * 100));
                            },
                            controller.signal
                        );
                    })
                );
            }

            if (!cancelledRef.current) {
                setPhase("success");
                soundService.playUpload();
                onUploaded();
                setFiles([]);
                setConflict(null);
            }
        } catch (err: any) {
            if (err.name !== "CanceledError") {
                console.error(err);
                setPhase("error");
            }
        }
    };

    const handleUploadClick = async () => {
        const hasConflict = await checkForConflicts();
        if (!hasConflict) {
            uploadFiles();
        }
    };

    const handleConflictAction = (action: ConflictAction) => {
        if (action === "rename") {
            setConflict(prev => prev ? { ...prev, action: "rename" } : null);
        } else {
            uploadFiles(action);
        }
    };

    const handleRename = async () => {
        if (!newFolderName.trim()) {
            alert("Please enter a folder name");
            return;
        }
        try {
            const res = await checkFolderExistsApi(newFolderName, path);
            if (res.data.exists) {
                alert("This name also exists. Please choose another.");
                return;
            }
        } catch { }
        uploadFiles("rename", newFolderName);
    };

    const cancelUpload = () => {
        cancelledRef.current = true;
        controllersRef.current.forEach((c) => c.abort());
        controllersRef.current = [];
        setFiles([]);
        setPhase("idle");
        setPercent(0);
        setConflict(null);
        setShowFilePicker(false);
    };

    // Compact upload button with integrated progress
    return (
        <>
            {/* Upload Button Area */}
            <div className="flex items-center gap-2">
                {phase === "idle" && (
                    <button
                        onClick={() => setShowFilePicker(true)}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        ⬆️ Upload
                    </button>
                )}

                {phase === "uploading" && (
                    <div className="flex items-center gap-2 bg-blue-100 px-4 py-2 rounded">
                        <div className="w-24 h-2 bg-gray-200 rounded overflow-hidden">
                            <div
                                className="h-full bg-blue-600 transition-all"
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                        <span className="text-sm text-blue-700 font-medium">{percent}%</span>
                        <button
                            onClick={cancelUpload}
                            className="text-red-500 text-sm hover:underline"
                        >
                            Cancel
                        </button>
                    </div>
                )}

                {phase === "success" && (
                    <div className="flex items-center gap-2 bg-green-100 px-4 py-2 rounded text-green-700">
                        ✓ Upload complete!
                    </div>
                )}

                {phase === "error" && (
                    <div className="flex items-center gap-2 bg-red-100 px-4 py-2 rounded text-red-700">
                        ✕ Upload failed
                        <button
                            onClick={() => setPhase("idle")}
                            className="text-sm underline"
                        >
                            Dismiss
                        </button>
                    </div>
                )}
            </div>

            {/* Drag overlay */}
            {isDragging && (
                <div className="fixed inset-0 bg-blue-500/20 border-4 border-dashed border-blue-500 flex items-center justify-center z-50">
                    <p className="text-2xl font-semibold text-blue-700 bg-white px-6 py-4 rounded-lg shadow-lg">
                        Drop files here to upload
                    </p>
                </div>
            )}

            {/* File picker modal */}
            {showFilePicker && !conflict && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-[var(--bg-card)] p-6 rounded-lg shadow-xl w-96 space-y-4">
                        <h2 className="font-semibold text-lg text-[var(--text-primary)]">Select files to upload</h2>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-[var(--text-primary)]">Upload files</label>
                                <input
                                    type="file"
                                    multiple
                                    className="w-full text-sm text-[var(--text-primary)]"
                                    onChange={(e) => setFiles(Array.from(e.target.files || []))}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 text-[var(--text-primary)]">Upload folder</label>
                                <input
                                    type="file"
                                    multiple
                                    className="w-full text-sm text-[var(--text-primary)]"
                                    // @ts-ignore
                                    webkitdirectory="true"
                                    onChange={(e) => setFiles(Array.from(e.target.files || []))}
                                />
                            </div>
                        </div>

                        {files.length > 0 && (
                            <div className="max-h-32 overflow-y-auto border border-[var(--border)] rounded p-2 text-sm bg-[var(--bg-secondary)]">
                                <p className="font-medium mb-1 text-[var(--text-primary)]">Selected: {files.length} file(s)</p>
                                <ul className="space-y-1">
                                    {files.slice(0, 3).map((file, i) => (
                                        <li key={i} className="truncate text-[var(--text-secondary)]">
                                            {(file as any).webkitRelativePath || file.name}
                                        </li>
                                    ))}
                                    {files.length > 3 && (
                                        <li className="text-[var(--text-muted)]">+{files.length - 3} more</li>
                                    )}
                                </ul>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => {
                                    setShowFilePicker(false);
                                    setFiles([]);
                                }}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUploadClick}
                                disabled={files.length === 0}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                Upload
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Conflict resolution modal */}
            {conflict && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-96 space-y-4">
                        <h2 className="font-semibold text-lg">Folder Already Exists</h2>
                        <p className="text-gray-600">
                            "<strong>{conflict.folderName}</strong>" already exists.
                        </p>

                        {conflict.action !== "rename" ? (
                            <div className="space-y-2">
                                <button
                                    onClick={() => handleConflictAction("merge")}
                                    className="w-full p-3 border rounded hover:bg-blue-50 text-left"
                                >
                                    <span className="font-medium">📁 Merge</span>
                                    <p className="text-sm text-gray-500">Add files to existing folder</p>
                                </button>
                                <button
                                    onClick={() => handleConflictAction("replace")}
                                    className="w-full p-3 border rounded hover:bg-red-50 text-left"
                                >
                                    <span className="font-medium">🔄 Replace</span>
                                    <p className="text-sm text-gray-500">Delete existing and upload new</p>
                                </button>
                                <button
                                    onClick={() => handleConflictAction("rename")}
                                    className="w-full p-3 border rounded hover:bg-green-50 text-left"
                                >
                                    <span className="font-medium">✏️ Rename</span>
                                    <p className="text-sm text-gray-500">Upload with different name</p>
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    placeholder="Enter new folder name"
                                    className="w-full p-2 border rounded"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setConflict(prev => prev ? { ...prev, action: null } : null)}
                                        className="flex-1 p-2 border rounded hover:bg-gray-50"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleRename}
                                        className="flex-1 p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                        Upload
                                    </button>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={cancelUpload}
                            className="w-full p-2 text-gray-500 hover:text-gray-700"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
