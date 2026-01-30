interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Logo({ size = "md", className }: LogoProps) {
  const sizes = {
    sm: "h-4",
    md: "h-8",
    lg: "h-12",
  };
  return (
    <img
      src="/Stecam logo 2.png"
      alt="Stecam Logo"
      className={`${sizes[size]} w-auto ${className}`}
    />
  );
}
