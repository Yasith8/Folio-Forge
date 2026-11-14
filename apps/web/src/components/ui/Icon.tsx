import type { SVGProps } from 'react';

/** Minimal inline icon set (stroke icons, 20×20), decorative by default. */
const PATHS = {
  grip: 'M7 4h.01M7 10h.01M7 16h.01M13 4h.01M13 10h.01M13 16h.01',
  eye: 'M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6S1.5 10 1.5 10zM10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  eyeOff:
    'M3 3l14 14M8.2 4.3A8.9 8.9 0 0 1 10 4c5.5 0 8.5 6 8.5 6a15 15 0 0 1-2.4 3.1M5.6 5.7C3 7.4 1.5 10 1.5 10s3 6 8.5 6a8.4 8.4 0 0 0 4.3-1.2M8.2 8.3a2.5 2.5 0 0 0 3.5 3.5',
  trash: 'M3.5 5.5h13M8 5.5V3.5h4v2M5 5.5l.8 11h8.4l.8-11',
  plus: 'M10 4v12M4 10h12',
  chevronDown: 'M5 7.5l5 5 5-5',
  chevronRight: 'M7.5 5l5 5-5 5',
  undo: 'M7.5 4.5L4 8l3.5 3.5M4 8h8a4 4 0 0 1 0 8H9',
  redo: 'M12.5 4.5L16 8l-3.5 3.5M16 8H8a4 4 0 0 0 0 8h3',
  download: 'M10 3v10M6 9l4 4 4-4M4 16h12',
  upload: 'M10 13V3M6 7l4-4 4 4M4 16h12',
  globe:
    'M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM2 10h16M10 2c2.2 2.4 3.2 5 3.2 8s-1 5.6-3.2 8c-2.2-2.4-3.2-5-3.2-8s1-5.6 3.2-8z',
  copy: 'M7 7h9v9H7zM4 13V4h9',
  sun: 'M10 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M4 4l1.4 1.4M14.6 14.6L16 16M4 16l1.4-1.4M14.6 5.4L16 4',
  moon: 'M16.5 12.5A7 7 0 0 1 7.5 3.5a7 7 0 1 0 9 9z',
  arrowLeft: 'M16 10H4M9 5l-5 5 5 5',
  bold: 'M6 4h5a3 3 0 0 1 0 6H6zM6 10h6a3 3 0 0 1 0 6H6z',
  italic: 'M12 4h-4M12 16H8M11.5 4l-3 12',
  list: 'M8 5h9M8 10h9M8 15h9M3.5 5h.01M3.5 10h.01M3.5 15h.01',
  link: 'M8.5 11.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5L10 5M11.5 8.5a3.5 3.5 0 0 0-5 0L4 11a3.5 3.5 0 0 0 5 5l1-1',
  history: 'M3 10a7 7 0 1 0 2-4.9M3 3v3h3M10 6v4l3 2',
  file: 'M5 2.5h6l4 4v11H5zM11 2.5v4h4',
  external: 'M11 3h6v6M17 3l-8 8M14 12v5H3V6h5',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 18,
  ...rest
}: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
