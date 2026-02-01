interface Props {
  path: string;
  onNavigate: (path: string) => void;
}

export default function Breadcrumb({ path, onNavigate }: Props) {
  const parts = path.split("/").filter(Boolean);

  return (
    <div className="text-sm text-[var(--text-secondary)] mb-4">
      <span
        className="cursor-pointer hover:underline"
        onClick={() => onNavigate("/")}
      >
        Home
      </span>

      {parts.map((part, idx) => {
        const subPath = "/" + parts.slice(0, idx + 1).join("/");
        return (
          <span key={idx}>
            {" / "}
            <span
              className="cursor-pointer hover:underline"
              onClick={() => onNavigate(subPath)}
            >
              {part}
            </span>
          </span>
        );
      })}
    </div>
  );
}
