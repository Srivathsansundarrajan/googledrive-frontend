import { useEffect, useRef } from "react";

export interface ContextMenuItem {
    label: string;
    icon: string;
    onClick: () => void;
    danger?: boolean;
}

interface Props {
    x: number;
    y: number;
    items: ContextMenuItem[];
    onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: Props) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [onClose]);

    // Adjust position if menu would go off screen
    const adjustedX = Math.min(x, window.innerWidth - 180);
    const adjustedY = Math.min(y, window.innerHeight - (items.length * 40 + 16));

    return (
        <div
            ref={menuRef}
            className="fixed bg-[var(--bg-card)] rounded-lg shadow-xl border border-[var(--border)] py-2 z-50 min-w-[160px]"
            style={{ left: adjustedX, top: adjustedY }}
        >
            {items.map((item, idx) => (
                <button
                    key={idx}
                    onClick={() => {
                        item.onClick();
                        onClose();
                    }}
                    className={`w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-[var(--bg-hover)] ${item.danger ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" : "text-[var(--text-primary)]"
                        }`}
                >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                </button>
            ))}
        </div>
    );
}
