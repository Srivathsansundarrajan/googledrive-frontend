import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { listSharedDrivesApi, createSharedDriveApi, deleteSharedDriveApi } from "../api/shared";

interface SharedDrive {
    _id: string;
    name: string;
    description?: string;
    members: { email: string; role: string }[];
    createdAt: string;
}

export default function SharedDrives() {
    const navigate = useNavigate();
    const [drives, setDrives] = useState<SharedDrive[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newDriveName, setNewDriveName] = useState("");
    const [newDriveDesc, setNewDriveDesc] = useState("");
    const [creating, setCreating] = useState(false);

    const loadDrives = async () => {
        try {
            setLoading(true);
            const res = await listSharedDrivesApi();
            setDrives(res.data.sharedDrives || []);
        } catch (err) {
            console.error("Failed to load shared drives", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDrives();
    }, []);

    const handleCreate = async () => {
        if (!newDriveName.trim()) return;
        setCreating(true);
        try {
            await createSharedDriveApi(newDriveName.trim(), newDriveDesc.trim());
            setShowCreate(false);
            setNewDriveName("");
            setNewDriveDesc("");
            loadDrives();
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to create shared drive");
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (drive: SharedDrive) => {
        if (!confirm(`Delete "${drive.name}" and all its contents? This cannot be undone.`)) return;
        try {
            await deleteSharedDriveApi(drive._id);
            loadDrives();
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to delete");
        }
    };

    return (
        <Layout>
            <div>
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Shared Drives</h1>
                    <button onClick={() => setShowCreate(true)} className="btn btn-primary">
                        + Create Shared Drive
                    </button>
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                )}

                {!loading && drives.length === 0 && (
                    <div className="card text-center py-16">
                        <div className="text-6xl mb-4">🏢</div>
                        <p className="text-lg text-[var(--text-secondary)] mb-2">No shared drives yet</p>
                        <p className="text-sm text-gray-400">Create a shared drive to collaborate with your team</p>
                    </div>
                )}

                {!loading && drives.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {drives.map((drive) => (
                            <div
                                key={drive._id}
                                className="card p-4 cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => navigate(`/shared-drives/${drive._id}`)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white text-2xl">
                                            🏢
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">{drive.name}</h3>
                                            <p className="text-sm text-[var(--text-secondary)]">
                                                {drive.members.length} member{drive.members.length !== 1 ? "s" : ""}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(drive);
                                        }}
                                        className="text-gray-400 hover:text-red-500 p-1"
                                        title="Delete"
                                    >
                                        🗑️
                                    </button>
                                </div>
                                {drive.description && (
                                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">{drive.description}</p>
                                )}
                                <div className="mt-3 flex flex-wrap gap-1">
                                    {drive.members.slice(0, 3).map((m, i) => (
                                        <span key={i} className="badge badge-blue">{m.email.split("@")[0]}</span>
                                    ))}
                                    {drive.members.length > 3 && (
                                        <span className="text-xs text-gray-400">+{drive.members.length - 3} more</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Create Modal */}
                {showCreate && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h2 className="font-semibold text-lg mb-4">Create Shared Drive</h2>
                            <input
                                type="text"
                                value={newDriveName}
                                onChange={(e) => setNewDriveName(e.target.value)}
                                placeholder="Shared drive name"
                                className="input mb-3"
                                autoFocus
                            />
                            <textarea
                                value={newDriveDesc}
                                onChange={(e) => setNewDriveDesc(e.target.value)}
                                placeholder="Description (optional)"
                                className="input mb-4"
                                rows={2}
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setShowCreate(false)} className="btn btn-secondary">
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={creating || !newDriveName.trim()}
                                    className="btn btn-primary"
                                >
                                    {creating ? "Creating..." : "Create"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
