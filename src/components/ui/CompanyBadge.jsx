import companyBrands from "@/data/company_brands.json";

function getInitials(name) {
  const words = name.split(/[\s.]+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function getContrastColor(hexColor) {
  if (!hexColor || hexColor.startsWith("hsl")) return "#fff";
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#000" : "#fff";
}

/**
 * Displays a company name with a colored logo badge.
 *
 * @param {object} props
 * @param {string} props.company - Company name
 * @param {"sm" | "md" | "lg"} [props.size="md"] - Size variant
 * @param {string} [props.className]
 */
export function CompanyBadge({ company, size = "md", className = "" }) {
  const color = companyBrands[company] || "#71717a";
  const initials = getInitials(company);
  const textColor = getContrastColor(color);

  const sizeClasses = {
    sm: { box: "h-5 w-5 text-[8px]", text: "text-sm" },
    md: { box: "h-6 w-6 text-[9px]", text: "text-base" },
    lg: { box: "h-8 w-8 text-[11px]", text: "text-lg" },
  };

  const s = sizeClasses[size] || sizeClasses.md;

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className={`inline-flex items-center justify-center rounded font-semibold ${s.box}`}
        style={{ backgroundColor: color, color: textColor }}
      >
        {initials}
      </span>
      <span className={s.text}>{company}</span>
    </span>
  );
}
