import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "activity"
  | "book"
  | "download"
  | "calendar"
  | "check"
  | "chevronDown"
  | "chevronLeft"
  | "chevronRight"
  | "clock"
  | "close"
  | "file"
  | "filter"
  | "grid"
  | "headphones"
  | "menu"
  | "message"
  | "more"
  | "palette"
  | "play"
  | "plus"
  | "search"
  | "settings"
  | "sort"
  | "users";

const paths: Record<IconName, ReactNode> = {
  activity: <path d="M4 12h3l2-7 4 14 2-7h5" />,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M4 5.5v16M8 7h8M8 11h8" /></>,
  calendar: <><rect x="3" y="4.5" width="18" height="17" rx="2" /><path d="M7 2.5v4M17 2.5v4M3 9h18" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  chevronDown: <path d="m7 10 5 5 5-5" />,
  chevronLeft: <path d="m14 6-6 6 6 6" />,
  chevronRight: <path d="m10 6 6 6-6 6" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></>,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  file: <><path d="M6 2.5h8l4 4V21H6z" /><path d="M14 2.5V7h4" /></>,
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  grid: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
  headphones: <><path d="M4 13v-1a8 8 0 0 1 16 0v1" /><path d="M4 13h3v6H5a1 1 0 0 1-1-1zM20 13h-3v6h2a1 1 0 0 0 1-1z" /></>,
  download: <><path d="M12 4v10m0 0 4-4m-4 4-4-4M5 20h14" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  message: <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />,
  more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></>,
  palette: <><path d="M12 3a9 9 0 0 0 0 18h1.5a1.5 1.5 0 0 0 0-3H12a2 2 0 0 1 0-4h3a6 6 0 0 0 0-12z" /><circle cx="7.5" cy="10" r="1" fill="currentColor" stroke="none" /><circle cx="9" cy="6.5" r="1" fill="currentColor" stroke="none" /><circle cx="14" cy="6.5" r="1" fill="currentColor" stroke="none" /><circle cx="17.5" cy="10" r="1" fill="currentColor" stroke="none" /></>,
  play: <path d="m9 6 8 6-8 6z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  search: <><circle cx="10.8" cy="10.8" r="6.3" /><path d="m16 16 4.5 4.5" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-2.6V20a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H6v-2.6h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V5h2.6v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v2.6h-.2a1.7 1.7 0 0 0-1.6 1z" /></>,
  sort: <path d="M8 5v14m0 0-3-3m3 3 3-3M16 19V5m0 0-3 3m3-3 3 3" />,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 19a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5.8M17 14a5.5 5.5 0 0 1 4 5" /></>,
};

export function Icon({ name, size = 18, strokeWidth = 1.7, ...props }: { name: IconName; size?: number; strokeWidth?: number } & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg aria-hidden="true" fill="none" height={size} viewBox="0 0 24 24" width={size} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} {...props}>
      {paths[name]}
    </svg>
  );
}
