/**
 * SVG icon components — monochrome, stroke-based, consistent style.
 * All icons use currentColor and default to 20x20.
 */

interface IconProps {
  size?: number
  className?: string
}

const defaults = (size = 20, className?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: className ? `icon ${className}` : 'icon',
})

export function FolderIcon({ size, className }: IconProps) {
  return (
    <svg {...defaults(size, className)}>
      <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z" />
    </svg>
  )
}

export function MicIcon({ size, className }: IconProps) {
  return (
    <svg {...defaults(size, className)}>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

export function PaperclipIcon({ size, className }: IconProps) {
  return (
    <svg {...defaults(size, className)}>
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  )
}

export function HeartPulseIcon({ size, className }: IconProps) {
  return (
    <svg {...defaults(size, className)}>
      <path d="M19.5 12.572l-7.5 7.428-7.5-7.428a5 5 0 1 1 7.5-6.566 5 5 0 1 1 7.5 6.566z" />
      <path d="M3 12h4l2-4 4 8 2-4h6" />
    </svg>
  )
}

export function CameraIcon({ size, className }: IconProps) {
  return (
    <svg {...defaults(size, className)}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

export function SearchIcon({ size, className }: IconProps) {
  return (
    <svg {...defaults(size, className)}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

export function GitBranchIcon({ size, className }: IconProps) {
  return (
    <svg {...defaults(size, className)}>
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  )
}

export function CalendarIcon({ size, className }: IconProps) {
  return (
    <svg {...defaults(size, className)}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

export function SettingsIcon({ size, className }: IconProps) {
  return (
    <svg {...defaults(size, className)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1.08z" />
    </svg>
  )
}

export function PuzzleIcon({ size, className }: IconProps) {
  return (
    <svg {...defaults(size, className)}>
      <path d="M20 17v-2a2 2 0 0 0-2-2h-1a1.5 1.5 0 0 1 0-3h1a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2.17a1.5 1.5 0 0 1-2.83 0H6a2 2 0 0 0-2 2v2.17a1.5 1.5 0 0 1 0 2.83V17a2 2 0 0 0 2 2h2.17a1.5 1.5 0 0 1 2.83 0H18a2 2 0 0 0 2-2z" />
    </svg>
  )
}

export function BotIcon({ size, className }: IconProps) {
  return (
    <svg {...defaults(size, className)}>
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <circle cx="9" cy="14" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15" cy="14" r="1.5" fill="currentColor" stroke="none" />
      <line x1="12" y1="4" x2="12" y2="8" />
      <circle cx="12" cy="3" r="1" />
    </svg>
  )
}

export function SendIcon({ size, className }: IconProps) {
  return (
    <svg {...defaults(size, className)}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

export function ChevronLeftIcon({ size, className }: IconProps) {
  return (
    <svg {...defaults(size, className)}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

export function ChevronRightIcon({ size, className }: IconProps) {
  return (
    <svg {...defaults(size, className)}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

export function PlusIcon({ size, className }: IconProps) {
  return (
    <svg {...defaults(size, className)}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export function PlayIcon({ size, className }: IconProps) {
  return (
    <svg {...defaults(size, className)}>
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}

export function CloseIcon({ size, className }: IconProps) {
  return (
    <svg {...defaults(size, className)}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function CopyIcon({ size, className }: IconProps) {
  return (
    <svg {...defaults(size, className)}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

export function ExternalLinkIcon({ size, className }: IconProps) {
  return (
    <svg {...defaults(size, className)}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

export function FullscreenIcon({ size, className }: IconProps) {
  return (
    <svg {...defaults(size, className)}>
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  )
}

export function RestoreIcon({ size, className }: IconProps) {
  return (
    <svg {...defaults(size, className)}>
      <polyline points="4 14 10 14 10 20" />
      <polyline points="20 10 14 10 14 4" />
      <line x1="14" y1="10" x2="21" y2="3" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  )
}

export function UndoIcon({ size, className }: IconProps) {
  return (
    <svg {...defaults(size, className)}>
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  )
}

/** Map from string icon keys (used in workflow data) to icon components */
export const WORKFLOW_ICON_MAP: Record<string, React.FC<IconProps>> = {
  folder: FolderIcon,
  'heart-pulse': HeartPulseIcon,
  camera: CameraIcon,
  search: SearchIcon,
  'git-branch': GitBranchIcon,
  calendar: CalendarIcon,
}
