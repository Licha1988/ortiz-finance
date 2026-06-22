import type { ReactNode } from "react";
import { sectionHeaders } from "@/lib/ui/tokens";

type SectionTone = keyof typeof sectionHeaders;

type SectionCardProps = {
  title: string;
  subtitle?: string;
  tone?: SectionTone;
  children: ReactNode;
  centered?: boolean;
  className?: string;
};

export default function SectionCard({
  title,
  subtitle,
  tone = "cashflow",
  children,
  centered = false,
  className = "",
}: SectionCardProps) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-stone-200/80 bg-white/95 shadow-sm backdrop-blur-sm ${className}`}
    >
      <div
        className={`border-b border-white/10 px-5 py-4 text-sm font-semibold tracking-wide ${sectionHeaders[tone]} ${
          centered ? "text-center" : ""
        }`}
      >
        <p className="text-base font-semibold">{title}</p>
        {subtitle && (
          <p className="mt-1 text-xs font-normal leading-relaxed text-white/75">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}
