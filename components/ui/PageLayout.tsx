import type { ReactNode } from "react";

type PageLayoutProps = {
  children: ReactNode;
  /** Ancho máximo: `default` (1400px) o `narrow` (6xl, operativa). */
  width?: "default" | "narrow";
  className?: string;
};

const widthClasses = {
  default: "max-w-[1400px]",
  narrow: "max-w-6xl",
} as const;

export default function PageLayout({
  children,
  width = "default",
  className = "",
}: PageLayoutProps) {
  return (
    <main
      className={`mx-auto space-y-8 px-6 py-8 ${widthClasses[width]} ${className}`}
    >
      {children}
    </main>
  );
}
