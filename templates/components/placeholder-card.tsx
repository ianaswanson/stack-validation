/**
 * PlaceholderCard Component
 *
 * Use this component to indicate areas where developers should add their own content.
 * Provides clear visual distinction between template structure and customizable areas.
 */

interface PlaceholderCardProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  height?: "sm" | "md" | "lg";
}

export function PlaceholderCard({
  title = "Your Feature Here",
  description = "Replace this placeholder with your own content",
  icon,
  height = "md",
}: PlaceholderCardProps) {
  const heightClasses = {
    sm: "min-h-[150px]",
    md: "min-h-[200px]",
    lg: "min-h-[300px]",
  };

  return (
    <div
      className={`${heightClasses[height]} bg-neutral-50 border-2 border-dashed border-neutral-300 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-neutral-100 hover:border-neutral-400 transition-colors`}
    >
      {/* Icon */}
      <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center mb-4">
        {icon || (
          <svg
            className="w-6 h-6 text-neutral-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        )}
      </div>

      {/* Title */}
      <h3 className="text-h5 text-neutral-500 mb-2">{title}</h3>

      {/* Description */}
      <p className="text-body-sm text-neutral-400 max-w-sm">{description}</p>
    </div>
  );
}
