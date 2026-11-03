/**
 * 圖示：只收錄設計稿實際用到的圖示，SVG 路徑照抄設計稿（線條風格、線寬 1.8）。
 * 設計稿沒有的新圖示，先跟設計確認再加。
 */
const PATHS = {
  check: "M5 12l5 5L20 7",
  shieldCheck: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z",
  menu: "M4 7h16M4 12h16M4 17h16",
  message: "M4 5h16v11H9l-5 4z",
  bell: "M6 16V11a6 6 0 0112 0v5l2 2H4zM10 20a2 2 0 004 0",
  chevronRight: "M9 5l7 7-7 7",
  chevronLeft: "M15 5l-7 7 7 7",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z",
  video: "M3 6h12v12H3zM15 10l6-3v10l-6-3z",
  lock: "M5 11h14v10H5zM8 11V8a4 4 0 018 0v3",
  play: "M8 5l11 7-11 7z",
  image: "M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6",
  plus: "M12 5v14M5 12h14",
  close: "M6 6l12 12M18 6L6 18",
  share: "M12 3v12M7 8l5-5 5 5M5 13v7h14v-7",
  warning: "M12 3l9 16H3zM12 10v4M12 17v.5",
  clock: "M12 3a9 9 0 110 18 9 9 0 010-18zM12 7v5l3 2",
  location: "M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11zM12 7.5a2.5 2.5 0 110 5 2.5 2.5 0 010-5",
  document: "M9 12h6M9 16h6M6 3h9l4 4v14H6zM14 3v5h5",
  checkCircle: "M12 3a9 9 0 110 18 9 9 0 010-18zM8 12l3 3 5-6",
  card: "M3 6h18v12H3zM3 10h18M7 15h4",
  camera: "M4 8h3l2-3h6l2 3h3v11H4zM12 10a3.5 3.5 0 110 7 3.5 3.5 0 010-7",
  pen: "M4 20l4-1 11-11-3-3L5 16zM14 6l3 3",
  hangUp: "M3 14c5-4 13-4 18 0l-2 3-4-1v-2c-2-.6-4-.6-6 0v2l-4 1z",
  send: "M4 12l16-8-6 16-2-7z",
  idCard: "M3 5h18v14H3zM9 9a2 2 0 110 4 2 2 0 010-4zM6 16c1-2 5-2 6 0M14 10h4M14 13h3",
  water: "M12 3s6 7 6 11a6 6 0 01-12 0c0-4 6-11 6-11z",
  snowflake: "M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9",
  appliance: "M5 3h14v18H5zM12 9a4 4 0 110 8 4 4 0 010-8zM8 6h2",
  bulb: "M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0012 3z",
  question:
    "M12 21a9 9 0 110-18 9 9 0 010 18zM9.5 9.5a2.5 2.5 0 115 .5c0 1.5-2.5 2-2.5 3.5M12 17v.5",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2",
} as const;

export type IconName = keyof typeof PATHS;
export const ICON_NAMES = Object.keys(PATHS) as IconName[];

type Props = {
  name: IconName;
  size?: number;
  /** 有意義的圖示要給說明文字（從語言檔來）；純裝飾的不用，會對螢幕閱讀器隱藏。 */
  label?: string;
  className?: string;
};

export function Icon({ name, size = 24, label, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
