import type { SymbolId } from "@/lib/chart/types";
import { symbolColor } from "@/lib/chart/symbols";

type Props = {
  id: SymbolId;
  size?: number;
  className?: string;
  color?: string;
};

export function SymbolGlyph({ id, size = 22, className, color }: Props) {
  const stroke = color || symbolColor(id);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke={stroke}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <GlyphPath id={id} color={stroke} />
    </svg>
  );
}

function GlyphPath({ id, color }: { id: SymbolId; color: string }) {
  switch (id) {
    case "pain":
      return <circle cx="12" cy="12" r="6.5" fill={color} stroke="none" />;
    case "tenderJoint":
      return (
        <>
          <circle cx="12" cy="12" r="7.5" />
          <path d="M8.2 8.2 15.8 15.8M15.8 8.2 8.2 15.8" />
        </>
      );
    case "tenderness":
      return <path d="M12 4.5 19 18.5H5Z" fill={color} stroke="none" />;
    case "numbness":
      return (
        <path
          d="M13.2 2.2 6.1 12.8h5.3L9.4 21.8 18.4 10.6h-5.2L14.8 2.2Z"
          fill={color}
          stroke="none"
        />
      );
    case "paresthesia":
      return <path d="M5 16 9 8l4 8 4-8 2 4" />;
    case "weakness":
      return <rect x="6" y="6" width="12" height="12" rx="1.5" />;
    case "triggerPoint":
      return (
        <path
          d="M12 3.5 13.4 9.2 19.5 9.2 14.6 12.8 16.4 18.5 12 14.8 7.6 18.5 9.4 12.8 4.5 9.2 10.6 9.2Z"
          fill={color}
          stroke="none"
        />
      );
    case "radiation":
      return (
        <>
          <path d="M6 12h12" strokeDasharray="2 2" />
          <path d="M12 12 18 6M12 12 18 12M12 12 18 18" />
        </>
      );
    case "inflammation":
      return (
        <>
          <circle cx="12" cy="12" r="7.5" />
          <circle cx="12" cy="12" r="3.6" />
        </>
      );
    case "swelling":
      return <ellipse cx="12" cy="12" rx="8" ry="5.5" fill={color} stroke="none" />;
    case "spasm":
      return <path d="M4 12c2-6 4 6 6 0s4 6 6 0 4 6 6 0" />;
    case "adhesion":
      return <path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5" strokeWidth="2.2" />;
    case "friction":
      return (
        <>
          <path d="M8 6v12M12 6v12M16 6v12" />
        </>
      );
    case "hypomobility":
      return <path d="M6 10h12M8 14h8M10 18h4" />;
    case "hypermobility":
      return <path d="M6 14h12M8 10h8M10 6h4" />;
  }
}
