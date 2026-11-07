import { Link } from 'react-router-dom';

type LogoProps = {
  className?: string;
};

export default function Logo({ className }: LogoProps) {
  return (
    <Link
      to="/"
      aria-label="Flashy home"
      className={`whitespace-nowrap text-[1.3125rem] font-bold tracking-[-0.01em] text-(--color-ink) ${className ?? ''}`}
    >
      <svg
        viewBox="-2 -2 53 74"
        aria-hidden="true"
        style={{
          display: 'inline',
          height: '0.74em',
          width: '0.53em',
          margin: '0 0.028em 0 0.06em',
          verticalAlign: '-0.02em',
          overflow: 'visible',
        }}
      >
        <path
          d="M0,0 H49 V15 H18 V29 H42 V44 H18 V70 H0 Z"
          fill="var(--color-main-action)"
          stroke="var(--color-ink)"
          strokeWidth="1.2"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      lashy
    </Link>
  );
}
