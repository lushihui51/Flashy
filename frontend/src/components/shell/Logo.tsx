import { Link } from 'react-router-dom';

type LogoProps = {
  className?: string;
};

export default function Logo({ className }: LogoProps) {
  return (
    <Link to="/" className={className} aria-label="Flashy home">
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        role="img"
        aria-hidden="true"
        className="rounded-lg"
      >
        <rect width="32" height="32" rx="8" fill="var(--color-primary)" />
        <text
          x="16"
          y="22"
          textAnchor="middle"
          fontSize="18"
          fontWeight="700"
          fill="var(--color-primary-contrast)"
        >
          F
        </text>
      </svg>
    </Link>
  );
}
