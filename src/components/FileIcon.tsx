interface FileIconProps {
    fileName: string;
    size?: "sm" | "md" | "lg";
}

const getFileType = (fileName: string): string => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const types: Record<string, string> = {
        pdf: "pdf",
        doc: "doc", docx: "doc",
        xls: "xls", xlsx: "xls", csv: "xls",
        ppt: "ppt", pptx: "ppt",
        jpg: "img", jpeg: "img", png: "img", gif: "img", webp: "img", svg: "img", bmp: "img",
        mp4: "vid", mov: "vid", avi: "vid", mkv: "vid", webm: "vid",
        mp3: "aud", wav: "aud", flac: "aud", aac: "aud", ogg: "aud",
        zip: "zip", rar: "zip", "7z": "zip", tar: "zip", gz: "zip",
        js: "code", ts: "code", jsx: "code", tsx: "code", py: "code", java: "code",
        html: "code", css: "code", json: "code", xml: "code", yaml: "code", yml: "code",
        txt: "txt", md: "txt", rtf: "txt",
    };
    return types[ext] || "default";
};

const getFileLabel = (fileName: string): string => {
    const ext = fileName.split(".").pop()?.toUpperCase() || "";
    if (ext.length > 4) return ext.substring(0, 4);
    return ext || "FILE";
};

export default function FileIcon({ fileName, size = "md" }: FileIconProps) {
    const type = getFileType(fileName);
    const label = getFileLabel(fileName);

    const sizeClasses = {
        sm: "w-10 h-10 text-xs",
        md: "w-14 h-14 text-sm",
        lg: "w-20 h-20 text-base"
    };

    return (
        <div className={`file-icon file-icon-${type} ${sizeClasses[size]}`}>
            <span className="relative z-10">{label}</span>
        </div>
    );
}

export function FolderIcon({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
    const sizeClasses = {
        sm: "w-10 h-10",
        md: "w-14 h-14",
        lg: "w-20 h-20"
    };

    return (
        <div className={`folder-icon ${sizeClasses[size]}`}>
            <div className="folder-icon-front"></div>
            <div className="folder-icon-back"></div>
        </div>
    );
}
