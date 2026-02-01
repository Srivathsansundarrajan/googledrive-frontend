import { useState, useEffect } from "react";
import { listSharedDrivesApi, moveToSharedDriveApi } from "../api/shared";

interface SharedDrive {
    _id: string;
    name: string;
}

interface Props {
    resourceType: "file" | "folder";
    resourceId: string;
    resourceName: string;
    onClose: () => void;
    onMoved?: () => void;
}

export default function MoveToSharedDrive({ resourceType, resourceId, resourceName, onClose, onMoved }: Props) {
    const [drives, setDrives] = useState<SharedDrive[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDrive, setSelectedDrive] = useState<string>("");
    const [moving, setMoving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        loadDrives();
    }, []);

    const loadDrives = async () => {
        try {
            const res = await listSharedDrivesApi();
            setDrives(res.data.sharedDrives || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleMove = async () => {
        if (!selectedDrive) return;
        setMoving(true);
        setError("");
        try {
            await moveToSharedDriveApi(selectedDrive, resourceType, resourceId);
            onMoved?.();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to move item");
        } finally {
            setMoving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-lg text-[var(--text-primary)]">Move to Shared Drive</h2>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl">
                        ✕
                    </button>
                </div>

                <p className="text-sm text-[var(--text-secondary)] mb-4">
                    Move "<strong>{resourceName}</strong>" to a shared drive
                </p>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                ) : drives.length === 0 ? (
                    <div className="text-center py-8 text-[var(--text-secondary)]">
                        <p>No shared drives available.</p>
                        <p className="text-sm mt-2 text-[var(--text-muted)]">Create a shared drive first to move files into it.</p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-60 overflow-auto mb-4">
                        {drives.map((drive) => (
                            <label
                                key={drive._id}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                  ${selectedDrive === drive._id ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-[var(--border)] hover:bg-[var(--bg-hover)]"}`}
                            >
                                <input
                                    type="radio"
                                    name="drive"
                                    value={drive._id}
                                    checked={selectedDrive === drive._id}
                                    onChange={(e) => setSelectedDrive(e.target.value)}
                                    className="hidden"
                                />
                                <span className="text-xl">🏢</span>
                                <span className="font-medium text-[var(--text-primary)]">{drive.name}</span>
                            </label>
                        ))}
                    </div>
                )}

                {error && (
                    <div className="text-red-500 text-sm mb-3">{error}</div>
                )}

                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="btn btn-secondary">
                        Cancel
                    </button>
                    <button
                        onClick={handleMove}
                        disabled={moving || !selectedDrive}
                        className="btn btn-primary"
                    >
                        {moving ? "Moving..." : "Move"}
                    </button>
                </div>
            </div>
        </div>
    );
}
