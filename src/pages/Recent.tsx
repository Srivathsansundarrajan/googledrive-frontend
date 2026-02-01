import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { getRecentAccessApi, getFrequentAccessApi } from "../api/shared";

interface AccessItem {
    _id?: { resourceId: string; resourceType: string };
    resourceName: string;
    resourceType: string;
    resourceId: string;
    lastAccessed?: string;
    count?: number;
    score?: number;
}

export default function Recent() {
    const navigate = useNavigate();
    const [smartItems, setSmartItems] = useState<AccessItem[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            setLoading(true);
            const [recentRes, frequentRes] = await Promise.all([
                getRecentAccessApi(),
                getFrequentAccessApi()
            ]);
            const recentItems = recentRes.data.items || [];
            const frequentItems = frequentRes.data.items || [];

            // Calculate smart score combining recency and frequency
            const scoredItems = calculateSmartScore(recentItems, frequentItems);
            setSmartItems(scoredItems);
        } catch (err) {
            console.error("Failed to load access data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const calculateSmartScore = (recentItems: AccessItem[], frequentItems: AccessItem[]): AccessItem[] => {
        // Create a map to combine items by resourceId
        const itemMap = new Map<string, AccessItem>();

        const recencyWeight = 0.6;  // 60% weight for recency
        const frequencyWeight = 0.4; // 40% weight for frequency

        // Process recent items
        recentItems.forEach((item, index) => {
            const id = item._id?.resourceId || item.resourceId;
            // Recency score: newer items get higher scores (decays from 1.0 to 0)
            const recencyScore = 1.0 - (index / Math.max(recentItems.length, 1));

            itemMap.set(id, {
                ...item,
                resourceId: id,
                score: recencyScore * recencyWeight,
                lastAccessed: item.lastAccessed,
                count: 0
            });
        });

        // Add frequency scores
        const maxCount = Math.max(...frequentItems.map(item => item.count || 0), 1);
        frequentItems.forEach(item => {
            const id = item._id?.resourceId || item.resourceId;
            const frequencyScore = (item.count || 0) / maxCount;

            const existing = itemMap.get(id);
            if (existing) {
                // Item exists in recent, add frequency score
                existing.score = (existing.score || 0) + (frequencyScore * frequencyWeight);
                existing.count = item.count;
            } else {
                // Item only in frequent, add with frequency score only
                itemMap.set(id, {
                    ...item,
                    resourceId: id,
                    score: frequencyScore * frequencyWeight,
                    count: item.count
                });
            }
        });

        // Convert to array and sort by score
        return Array.from(itemMap.values())
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .slice(0, 20); // Top 20 items
    };

    const getIcon = (type: string, name: string) => {
        if (type === "folder") return "📁";
        const ext = name.split(".").pop()?.toLowerCase() || "";
        const icons: Record<string, string> = {
            pdf: "📄", doc: "📝", docx: "📝", xls: "📊", xlsx: "📊",
            jpg: "🖼️", jpeg: "🖼️", png: "🖼️", gif: "🖼️",
            mp4: "🎬", mp3: "🎵", zip: "📦",
        };
        return icons[ext] || "📄";
    };

    const handleClick = (_item: AccessItem) => {
        // Navigate to dashboard - this is a simple implementation
        navigate("/dashboard");
    };

    const getBadge = (item: AccessItem) => {
        const badges = [];
        if (item.lastAccessed) {
            const daysDiff = Math.floor((Date.now() - new Date(item.lastAccessed).getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff === 0) badges.push({ text: "Today", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" });
            else if (daysDiff === 1) badges.push({ text: "Yesterday", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" });
        }
        if (item.count && item.count > 5) {
            badges.push({ text: `${item.count} uses`, color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" });
        }
        return badges;
    };

    return (
        <Layout>
            <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Smart Suggestions</h1>

                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                )}

                {!loading && (
                    <div>
                        <div className="card p-6">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[var(--text-primary)]">
                                ⭐ Recommended Files & Folders
                                <span className="text-xs font-normal text-[var(--text-muted)]">(Based on recency and frequency)</span>
                            </h2>
                            {smartItems.length === 0 ? (
                                <p className="text-[var(--text-secondary)] text-sm">No accessed files yet. Start working on files to see smart suggestions here.</p>
                            ) : (
                                <div className="space-y-2">
                                    {smartItems.map((item, i) => {
                                        const badges = getBadge(item);
                                        return (
                                            <div
                                                key={i}
                                                onClick={() => handleClick(item)}
                                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--bg-hover)] cursor-pointer transition-colors border border-transparent hover:border-[var(--accent)]"
                                            >
                                                <span className="text-2xl">{getIcon(item.resourceType, item.resourceName)}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate text-[var(--text-primary)]">{item.resourceName}</p>
                                                    <div className="flex gap-2 mt-1">
                                                        {badges.map((badge, idx) => (
                                                            <span key={idx} className={`text-xs px-2 py-0.5 rounded ${badge.color}`}>
                                                                {badge.text}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                {/* Score indicator */}
                                                <div className="text-xs text-[var(--text-muted)]">
                                                    Score: {((item.score || 0) * 100).toFixed(0)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
