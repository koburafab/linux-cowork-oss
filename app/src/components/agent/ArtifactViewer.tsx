/**
 * ArtifactViewer — renders HTML/SVG/Mermaid/code artifacts in the Agent panel
 */

import { useCallback, useState } from 'react'
import { useChatStore } from '../../stores/chatStore'
import { openFile } from '../../api/client'
import type { Artifact } from '../../stores/chatStore'

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {
    // Fallback: noop
  })
}

function downloadSvg(content: string, filename = 'artifact.svg') {
  const blob = new Blob([content], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function HtmlRenderer({ artifact }: { artifact: Artifact }) {
  return (
    <iframe
      className="artifact-viewer__iframe"
      sandbox="allow-scripts"
      srcDoc={artifact.content}
      title={artifact.title ?? 'HTML preview'}
    />
  )
}

function SvgRenderer({ artifact }: { artifact: Artifact }) {
  return (
    <div
      className="artifact-viewer__svg"
      dangerouslySetInnerHTML={{ __html: artifact.content }}
    />
  )
}

function MermaidRenderer({ artifact }: { artifact: Artifact }) {
  return (
    <pre className="artifact-viewer__code">
      <code>{artifact.content}</code>
    </pre>
  )
}

function CodeRenderer({ artifact }: { artifact: Artifact }) {
  return (
    <pre className="artifact-viewer__code">
      <code>{artifact.content}</code>
    </pre>
  )
}

export function ArtifactViewer() {
  const artifact = useChatStore((s) => s.currentArtifact)
  const clearArtifact = useChatStore((s) => s.clearArtifact)
  const [fullscreen, setFullscreen] = useState(false)

  const handleOpenInBrowser = useCallback(async () => {
    if (!artifact) return
    const ext = artifact.type === 'svg' ? 'svg' : 'html'
    const filename = `artifact-${Date.now()}.${ext}`
    try {
      await openFile(artifact.content, filename)
    } catch {
      // Fallback: noop
    }
  }, [artifact])

  const handleDetach = useCallback(async () => {
    if (!artifact) return
    const ext = artifact.type === 'svg' ? 'svg' : 'html'
    const filename = `artifact-${Date.now()}.${ext}`
    try {
      await openFile(artifact.content, filename)
    } catch {
      // Fallback: noop
    }
  }, [artifact])

  if (!artifact) return null

  return (
    <div className={`artifact-viewer${fullscreen ? ' artifact-viewer--fullscreen' : ''}`}>
      <div className="artifact-viewer__header">
        <span className="artifact-viewer__title">
          {artifact.title ?? `${artifact.type} preview`}
        </span>
        <div className="artifact-viewer__toolbar">
          {(artifact.type === 'html' || artifact.type === 'code' || artifact.type === 'mermaid') && (
            <button
              className="artifact-viewer__btn"
              onClick={() => copyToClipboard(artifact.content)}
            >
              Copy
            </button>
          )}
          {artifact.type === 'svg' && (
            <button
              className="artifact-viewer__btn"
              onClick={() => downloadSvg(artifact.content)}
            >
              Download
            </button>
          )}
          {(artifact.type === 'html' || artifact.type === 'svg') && (
            <button
              className="artifact-viewer__btn"
              onClick={handleOpenInBrowser}
            >
              Open
            </button>
          )}
          {(artifact.type === 'html' || artifact.type === 'svg') && (
            <button
              className="artifact-viewer__btn"
              onClick={handleDetach}
            >
              Detach
            </button>
          )}
          <button
            className="artifact-viewer__btn"
            onClick={() => setFullscreen((v) => !v)}
          >
            {fullscreen ? 'Restore' : 'Fullscreen'}
          </button>
          <button
            className="artifact-viewer__btn artifact-viewer__btn--close"
            onClick={() => { setFullscreen(false); clearArtifact() }}
          >
            Close
          </button>
        </div>
      </div>

      <div className="artifact-viewer__content">
        {artifact.type === 'html' && <HtmlRenderer artifact={artifact} />}
        {artifact.type === 'svg' && <SvgRenderer artifact={artifact} />}
        {artifact.type === 'mermaid' && <MermaidRenderer artifact={artifact} />}
        {artifact.type === 'code' && <CodeRenderer artifact={artifact} />}
      </div>
    </div>
  )
}
