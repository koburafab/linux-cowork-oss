/**
 * Artifact extraction — detects code blocks in assistant messages
 * and converts them to renderable artifacts.
 */

import type { Artifact } from '../stores/chatStore'

/** Supported artifact language tags and their mapped types */
const LANG_TYPE_MAP: Record<string, Artifact['type']> = {
  html: 'html',
  svg: 'svg',
  mermaid: 'mermaid',
}

export interface ExtractedBlock {
  lang: string
  content: string
  type: Artifact['type']
}

/**
 * Extract all artifact-worthy code blocks from a message string.
 * Returns an array of blocks with lang, content, and resolved type.
 */
export function extractArtifactBlocks(text: string): ExtractedBlock[] {
  const regex = /```(\w+)\n([\s\S]*?)```/g
  const blocks: ExtractedBlock[] = []
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    const lang = match[1].toLowerCase()
    const content = match[2].trimEnd()
    const type = LANG_TYPE_MAP[lang] ?? 'code'
    blocks.push({ lang, content, type })
  }

  return blocks
}

/**
 * Build an Artifact object from an extracted block.
 */
export function blockToArtifact(block: ExtractedBlock): Artifact {
  return {
    id: crypto.randomUUID(),
    type: block.type,
    content: block.content,
    title: `${block.lang} artifact`,
    timestamp: Date.now(),
  }
}

/**
 * Scan text and return the first artifact-worthy block (html/svg/mermaid),
 * or null if none found.
 */
export function detectFirstArtifact(text: string): Artifact | null {
  const blocks = extractArtifactBlocks(text)
  // Prefer html/svg/mermaid over generic code
  const priority = blocks.find((b) => b.type !== 'code')
  if (priority) return blockToArtifact(priority)
  return null
}
