interface AppLogoProps {
  size?: number;
  className?: string;
}

export function AppLogo({ size = 32, className = "" }: AppLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background circle */}
      <circle cx="32" cy="32" r="30" className="fill-ctp-mauve" />

      {/* Lightning bolt (Volt) */}
      <path
        d="M36 12L20 36H30L28 52L44 28H34L36 12Z"
        className="fill-ctp-base"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* API dots */}
      <circle cx="16" cy="32" r="3" className="fill-ctp-base opacity-60" />
      <circle cx="48" cy="32" r="3" className="fill-ctp-base opacity-60" />
    </svg>
  );
}

// Smaller icon variant for tabs/headers
export function AppIcon({ size = 16, className = "" }: AppLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M13 2L4 14H11L10 22L19 10H12L13 2Z"
        className="stroke-current"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
