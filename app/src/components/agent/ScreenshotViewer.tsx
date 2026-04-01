/**
 * ScreenshotViewer — displays a base64-encoded screenshot
 */

interface ScreenshotViewerProps {
  base64: string
  timestamp?: number
}

export function ScreenshotViewer({ base64, timestamp }: ScreenshotViewerProps) {
  const timeStr = timestamp
    ? new Date(timestamp).toLocaleTimeString('fr-CH', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null

  return (
    <div className="screenshot-viewer">
      <img
        className="screenshot-viewer__img"
        src={`data:image/jpeg;base64,${base64}`}
        alt="Agent screenshot"
      />
      {timeStr && <span className="screenshot-viewer__time">{timeStr}</span>}
    </div>
  )
}
