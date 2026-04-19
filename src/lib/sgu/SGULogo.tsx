import { SVGProps } from 'react';

/**
 * SGU square logo — navy rounded square with gold "SGU" letters and gold stroke.
 * Sized through `className` (defaults 32x32 via viewBox + currentColor-free fills).
 */
export function SGULogo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="SGU"
      role="img"
      {...props}
    >
      <rect
        x="1.5"
        y="1.5"
        width="29"
        height="29"
        rx="6"
        fill="hsl(224 64% 18%)"
        stroke="hsl(44 92% 56%)"
        strokeWidth="1.5"
      />
      <text
        x="16"
        y="21"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight="800"
        fontSize="11"
        letterSpacing="0.5"
        fill="hsl(44 92% 56%)"
      >
        SGU
      </text>
    </svg>
  );
}
