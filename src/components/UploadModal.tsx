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
    onCreateFolder?: () => void;
    uploadApi?: (data: FormData, onProgress: (percent: number) => void, signal: AbortSignal) => Promise<any>;
    checkExistsApi?: (name: string, path: string) => Promise<any>;
}

export default function UploadModal({
    path,
    onUploaded,
    onCreateFolder,
    uploadApi = uploadFileApi,
    checkExistsApi = checkFolderExistsApi
}: Props) {
    const [phase, setPhase] = useState<UploadPhase>("idle");
    const [files, setFiles] = useState<File[]>([]);
    const [percent, setPercent] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [conflict, setConflict] = useState<ConflictInfo | null>(null);
    const [newFolderName, setNewFolderName] = useState("");
    const [showUploadChoice, setShowUploadChoice] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);

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

    // Main upload logic
    const uploadFilesList = async (fileList: File[], conflictAction?: ConflictAction, customName?: string) => {
        if (fileList.length === 0) return;

        cancelledRef.current = false;
        controllersRef.current = [];
        fileProgressRef.current.clear();

        setPhase("uploading");
        setShowUploadChoice(false);
        setConflict(null);

        const total = fileList.reduce((sum, f) => sum + f.size, 0);

        setPercent(0);

        try {
            const batches = chunkArray(fileList, CONCURRENCY);

            for (const batch of batches) {
                if (cancelledRef.current) break;

                await Promise.all(
                    batch.map((file) => {
                        const fileObj = file as any;
                        const relativePath = fileObj.manualPath || fileObj.webkitRelativePath || file.name;
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

                        return uploadApi(
                            form,
                            (pct) => {
                                if (cancelledRef.current) return;
                                const bytes = (pct / 100) * file.size;
                                fileProgressRef.current.set(file.name, bytes);
                                const sum = Array.from(fileProgressRef.current.values())
                                    .reduce((a, b) => a + b, 0);

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

    const handleFilesSelected = async (selectedFiles: File[]) => {
        setFiles(selectedFiles);
        // Need to wait for state update or pass directly? 
        // Better to refactor check for conflicts to accept files arg.

        // Small delay to ensure state is set, OR refactor logic throughout.
        // Let's refactor logic to use the passed argument if possible, but existing functions use 'files' state.
        // For safety, let's update state then call a wrapper that uses the state after a tick, or just rely on the fact that we set it.
        // Actually, the best way:

        const folderName = getFolderNameFromFilesList(selectedFiles);
        let hasConflict = false;

        if (folderName) {
            try {
                const res = await checkExistsApi(folderName, path);
                if (res.data.exists) {
                    setConflict({ folderName, action: null });
                    hasConflict = true;
                }
            } catch { }
        }

        if (!hasConflict) {
            uploadFilesList(selectedFiles);
        }
    };

    const getFolderNameFromFilesList = (fileList: File[]): string | null => {
        if (fileList.length === 0) return null;
        const firstFile = fileList[0] as any;
        const relativePath = firstFile.manualPath || firstFile.webkitRelativePath;

        if (relativePath) {
            const parts = relativePath.split("/");
            if (parts.length > 1) return parts[0];
        }
        if (fileList.length === 1 && fileList[0].name.endsWith(".zip")) {
            return fileList[0].name.replace(/\.zip$/i, "");
        }
        return null;
    };



    // Wrapper for conflict resolution retry which uses state.files
    const uploadFiles = (conflictAction?: ConflictAction, customName?: string) => {
        uploadFilesList(files, conflictAction, customName);
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
            const res = await checkExistsApi(newFolderName, path);
            if (res.data.exists) {
                alert("This name also exists. Please choose another.");
                return;
            }
        } catch { }
        uploadFiles("rename", newFolderName);
    };

    // Drag and drop handlers for the entire page
    useEffect(() => {
        const scanFiles = async (entry: any, path = ""): Promise<File[]> => {
            if (entry.isFile) {
                return new Promise((resolve) => {
                    entry.file((file: File) => {
                        // Manually define path for logic downstream
                        // We use a custom property because webkitRelativePath might be read-only
                        const fullPath = path + file.name;

                        // Try to set webkitRelativePath for compatibility
                        try {
                            Object.defineProperty(file, "webkitRelativePath", {
                                value: fullPath,
                                writable: true,
                                configurable: true
                            });
                        } catch (e) {
                            console.warn("Could not set webkitRelativePath", e);
                        }

                        // Set custom property as fallback
                        (file as any).manualPath = fullPath;

                        resolve([file]);
                    });
                });
            } else if (entry.isDirectory) {
                const reader = entry.createReader();
                const entries: any[] = [];

                // DirectoryReader.readEntries must be called repeatedly until it returns empty array
                // to handle large directories in some browsers (like Chrome)
                const readAll = () => new Promise<void>((resolve) => {
                    const next = () => {
                        reader.readEntries(async (batch: any[]) => {
                            if (batch.length === 0) {
                                resolve();
                            } else {
                                entries.push(...batch);
                                next();
                            }
                        });
                    };
                    next();
                });

                await readAll();

                const files: File[] = [];
                for (const child of entries) {
                    // Recurse with current folder name
                    const childFiles = await scanFiles(child, path + entry.name + "/");
                    files.push(...childFiles);
                }
                return files;
            }
            return [];
        };

        const handleDragOver = (e: DragEvent) => {
            e.preventDefault();
            setIsDragging(true);
        };

        const handleDragLeave = (e: DragEvent) => {
            if (!e.relatedTarget) setIsDragging(false);
        };

        const handleDrop = async (e: DragEvent) => {
            e.preventDefault();
            setIsDragging(false);

            const items = e.dataTransfer?.items;
            if (!items) return;

            const promises: Promise<File[]>[] = [];
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.kind === "file") {
                    const entry = item.webkitGetAsEntry();
                    if (entry) {
                        promises.push(scanFiles(entry));
                    }
                }
            }

            const results = await Promise.all(promises);
            const droppedFiles = results.flat();

            if (droppedFiles.length > 0) {
                handleFilesSelected(droppedFiles);
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
    }, [handleFilesSelected]); // Depend on handleFilesSelected to capture current path context

    const cancelUpload = () => {
        cancelledRef.current = true;
        controllersRef.current.forEach((c) => c.abort());
        controllersRef.current = [];
        setFiles([]);
        setPhase("idle");
        setPercent(0);
        setConflict(null);
        setShowUploadChoice(false);
    };

    // Compact upload button with integrated progress
    return (
        <>
            {/* Upload Button Area */}
            <div className="flex items-center gap-2 relative">
                {phase === "idle" && (
                    <div className="flex items-center gap-2">
                        {onCreateFolder && (
                            <button
                                onClick={onCreateFolder}
                                className="btn btn-secondary flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                </svg>
                                New Folder
                            </button>
                        )}
                        <button
                            onClick={() => setShowUploadChoice(true)}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Upload
                        </button>
                    </div>
                )}

                {phase === "uploading" && (
                    <div className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 px-4 py-2 rounded">
                        <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                            <div
                                className="h-full bg-blue-600 transition-all"
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                        <span className="text-sm text-blue-900 dark:text-blue-200 font-bold">{percent}%</span>
                        <button
                            onClick={cancelUpload}
                            className="text-red-600 dark:text-red-400 text-sm hover:underline font-medium"
                        >
                            Cancel
                        </button>
                    </div>
                )}

                {phase === "success" && (
                    <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 px-4 py-2 rounded text-green-700 dark:text-green-300">
                        ✓ Upload complete!
                    </div>
                )}

                {phase === "error" && (
                    <div className="flex items-center gap-2 bg-red-100 dark:bg-red-900/30 px-4 py-2 rounded text-red-700 dark:text-red-300">
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

            {/* Hidden Inputs */}
            <input
                type="file"
                multiple
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                    const selected = Array.from(e.target.files || []);
                    if (selected.length) {
                        setFiles(selected);
                        handleFilesSelected(selected);
                    }
                    setShowUploadChoice(false);
                    e.target.value = "";
                }}
            />
            <input
                type="file"
                multiple
                // @ts-ignore
                webkitdirectory="true"
                ref={folderInputRef}
                className="hidden"
                onChange={(e) => {
                    const selected = Array.from(e.target.files || []);
                    if (selected.length) {
                        setFiles(selected);
                        handleFilesSelected(selected);
                    }
                    setShowUploadChoice(false);
                    e.target.value = "";
                }}
            />

            {/* Upload Choice Modal */}
            {showUploadChoice && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fadeIn" onClick={() => setShowUploadChoice(false)}>
                    <div className="bg-[var(--bg-card)] p-6 rounded-xl shadow-2xl w-[400px] border border-[var(--border)]" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">Upload</h2>
                            <button onClick={() => setShowUploadChoice(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => {
                                    fileInputRef.current?.click();
                                    setShowUploadChoice(false);
                                }}
                                className="flex flex-col items-center justify-center p-6 border-2 border-[var(--border)] rounded-xl hover:border-[var(--accent)] hover:bg-[var(--bg-hover)] transition-all group"
                            >
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <span className="font-semibold text-[var(--text-primary)]">Files</span>
                                <span className="text-xs text-[var(--text-muted)] mt-1">Upload single or multiple files</span>
                            </button>

                            <button
                                onClick={() => {
                                    folderInputRef.current?.click();
                                    setShowUploadChoice(false);
                                }}
                                className="flex flex-col items-center justify-center p-6 border-2 border-[var(--border)] rounded-xl hover:border-[var(--accent)] hover:bg-[var(--bg-hover)] transition-all group"
                            >
                                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                    </svg>
                                </div>
                                <span className="font-semibold text-[var(--text-primary)]">Folder</span>
                                <span className="text-xs text-[var(--text-muted)] mt-1">Upload an entire folder</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Drag overlay - keep current logic */}
            {isDragging && (
                <div className="fixed inset-0 bg-blue-500/20 border-4 border-dashed border-blue-500 flex items-center justify-center z-50">
                    <p className="text-2xl font-semibold text-blue-700 bg-white px-6 py-4 rounded-lg shadow-lg">
                        Drop files here to upload
                    </p>
                </div>
            )}

            {/* Conflict resolution modal - keep current logic */}
            {conflict && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-[var(--bg-card)] p-6 rounded-lg shadow-xl w-96 space-y-4">
                        <h2 className="font-semibold text-lg text-[var(--text-primary)]">Folder Already Exists</h2>
                        <p className="text-[var(--text-secondary)]">
                            "<strong>{conflict.folderName}</strong>" already exists.
                        </p>

                        {conflict.action !== "rename" ? (
                            <div className="space-y-2">
                                <button
                                    onClick={() => handleConflictAction("merge")}
                                    className="w-full p-3 border border-[var(--border)] rounded hover:bg-[var(--bg-hover)] text-left"
                                >
                                    <span className="font-medium text-[var(--text-primary)]">📁 Merge</span>
                                    <p className="text-sm text-[var(--text-muted)]">Add files to existing folder</p>
                                </button>
                                <button
                                    onClick={() => handleConflictAction("replace")}
                                    className="w-full p-3 border border-[var(--border)] rounded hover:bg-[var(--bg-hover)] text-left"
                                >
                                    <span className="font-medium text-[var(--text-primary)]">🔄 Replace</span>
                                    <p className="text-sm text-[var(--text-muted)]">Delete existing and upload new</p>
                                </button>
                                <button
                                    onClick={() => handleConflictAction("rename")}
                                    className="w-full p-3 border border-[var(--border)] rounded hover:bg-[var(--bg-hover)] text-left"
                                >
                                    <span className="font-medium text-[var(--text-primary)]">✏️ Rename</span>
                                    <p className="text-sm text-[var(--text-muted)]">Upload with different name</p>
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    placeholder="Enter new folder name"
                                    className="input w-full"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setConflict(prev => prev ? { ...prev, action: null } : null)}
                                        className="flex-1 p-2 border border-[var(--border)] rounded hover:bg-[var(--bg-hover)] text-[var(--text-primary)]"
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
                            className="w-full p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
