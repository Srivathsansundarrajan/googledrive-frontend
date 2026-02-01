import { useState, useEffect } from "react";
import { getNotesApi, addNoteApi, deleteNoteApi} from "../api/shared";
import soundService from "../services/soundService";

interface Note {
    _id: string;
    content: string;
    color: string;
    createdAt: string;
}

interface Props {
    resourceType: "file" | "folder";
    resourceId: string;
    onClose: () => void;
}

const COLORS = [
    { name: "yellow", bg: "bg-yellow-100", border: "border-yellow-300" },
    { name: "blue", bg: "bg-blue-100", border: "border-blue-300" },
    { name: "green", bg: "bg-green-100", border: "border-green-300" },
    { name: "pink", bg: "bg-pink-100", border: "border-pink-300" },
    { name: "purple", bg: "bg-purple-100", border: "border-purple-300" },
];

export default function StickyNotePanel({ resourceType, resourceId, onClose }: Props) {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [newNote, setNewNote] = useState("");
    const [selectedColor, setSelectedColor] = useState("yellow");
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        loadNotes();
    }, []);

    const loadNotes = async () => {
        try {
            setLoading(true);
            const res = await getNotesApi(resourceType, resourceId);
            setNotes(res.data.notes || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newNote.trim()) return;
        setAdding(true);
        try {
            await addNoteApi(resourceType, resourceId, newNote.trim(), selectedColor);
            soundService.playCreate();
            setNewNote("");
            loadNotes();
        } catch (err) {
            console.error(err);
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (noteId: string) => {
        if (!confirm("Delete this note?")) return;
        try {
            await deleteNoteApi(noteId);
            loadNotes();
        } catch (err) {
            console.error(err);
        }
    };

    const getColorClasses = (colorName: string) => {
        return COLORS.find(c => c.name === colorName) || COLORS[0];
    };

    return (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-[var(--bg-card)] rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                    <h2 className="font-semibold text-lg text-[var(--text-primary)]">📝 Sticky Notes</h2>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl">✕</button>
                </div>

                <div className="flex-1 overflow-auto p-4 space-y-3">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full"></div>
                        </div>
                    ) : notes.length === 0 ? (
                        <p className="text-center text-[var(--text-muted)] py-8">No notes yet. Add your first note below!</p>
                    ) : (
                        notes.map(note => {
                            const colors = getColorClasses(note.color);
                            return (
                                <div key={note._id} className={`p-3 rounded-lg border-2 ${colors.bg} ${colors.border}`}>
                                    <p className="text-sm whitespace-pre-wrap text-gray-800 dark:text-gray-900">{note.content}</p>
                                    <div className="flex justify-between items-center mt-2 text-xs text-gray-600 dark:text-gray-700">
                                        <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                                        <button onClick={() => handleDelete(note._id)} className="text-red-500 hover:underline">Delete</button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-4 border-t border-[var(--border)]">
                    {/* Color picker */}
                    <div className="flex gap-2 mb-3">
                        {COLORS.map(c => (
                            <button
                                key={c.name}
                                onClick={() => setSelectedColor(c.name)}
                                className={`w-6 h-6 rounded-full ${c.bg} border-2 ${selectedColor === c.name ? "border-gray-800 dark:border-white ring-2 ring-gray-400" : c.border}`}
                                title={c.name}
                            />
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <textarea
                            value={newNote}
                            onChange={e => setNewNote(e.target.value)}
                            placeholder="Add a note..."
                            className="input flex-1 text-sm"
                            rows={2}
                        />
                        <button
                            onClick={handleAdd}
                            disabled={adding || !newNote.trim()}
                            className="btn btn-primary px-4"
                        >
                            {adding ? "..." : "+"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
