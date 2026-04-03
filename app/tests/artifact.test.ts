import { describe, it, expect, beforeEach } from 'vitest'
import { extractArtifactBlocks, blockToArtifact, detectFirstArtifact } from '../src/utils/artifacts'
import { useChatStore } from '../src/stores/chatStore'
import type { Artifact } from '../src/stores/chatStore'

describe('Artifact extraction', () => {
  it('should extract an HTML code block', () => {
    const text = 'Here is a page:\n```html\n<h1>Hello</h1>\n```\nDone.'
    const blocks = extractArtifactBlocks(text)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].lang).toBe('html')
    expect(blocks[0].type).toBe('html')
    expect(blocks[0].content).toBe('<h1>Hello</h1>')
  })

  it('should extract an SVG code block', () => {
    const text = '```svg\n<svg><circle r="10"/></svg>\n```'
    const blocks = extractArtifactBlocks(text)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].lang).toBe('svg')
    expect(blocks[0].type).toBe('svg')
    expect(blocks[0].content).toBe('<svg><circle r="10"/></svg>')
  })

  it('should extract a mermaid code block', () => {
    const text = '```mermaid\ngraph TD\n  A-->B\n```'
    const blocks = extractArtifactBlocks(text)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].lang).toBe('mermaid')
    expect(blocks[0].type).toBe('mermaid')
    expect(blocks[0].content).toBe('graph TD\n  A-->B')
  })

  it('should detect generic code blocks as type "code"', () => {
    const text = '```python\nprint("hi")\n```'
    const blocks = extractArtifactBlocks(text)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].lang).toBe('python')
    expect(blocks[0].type).toBe('code')
  })

  it('should extract multiple blocks from a single message', () => {
    const text = '```html\n<p>A</p>\n```\nText\n```svg\n<svg></svg>\n```'
    const blocks = extractArtifactBlocks(text)
    expect(blocks).toHaveLength(2)
    expect(blocks[0].type).toBe('html')
    expect(blocks[1].type).toBe('svg')
  })

  it('should return empty array when no code blocks', () => {
    const blocks = extractArtifactBlocks('Just some text, no code.')
    expect(blocks).toHaveLength(0)
  })

  it('blockToArtifact should create a valid Artifact', () => {
    const block = { lang: 'html', content: '<p>test</p>', type: 'html' as const }
    const artifact = blockToArtifact(block)
    expect(artifact.type).toBe('html')
    expect(artifact.content).toBe('<p>test</p>')
    expect(artifact.title).toBe('html artifact')
    expect(typeof artifact.id).toBe('string')
    expect(typeof artifact.timestamp).toBe('number')
  })

  it('detectFirstArtifact should prefer html/svg/mermaid over generic code', () => {
    const text = '```python\nprint("hi")\n```\n```html\n<div>X</div>\n```'
    const artifact = detectFirstArtifact(text)
    expect(artifact).not.toBeNull()
    expect(artifact!.type).toBe('html')
    expect(artifact!.content).toBe('<div>X</div>')
  })

  it('detectFirstArtifact should return null when no artifact blocks', () => {
    const text = '```python\nprint("hi")\n```'
    const artifact = detectFirstArtifact(text)
    expect(artifact).toBeNull()
  })
})

describe('Artifact store', () => {
  beforeEach(() => {
    useChatStore.setState({ currentArtifact: null })
  })

  it('should start with null artifact', () => {
    expect(useChatStore.getState().currentArtifact).toBeNull()
  })

  it('setArtifact should store the artifact', () => {
    const artifact: Artifact = {
      id: 'test-1',
      type: 'html',
      content: '<p>Hello</p>',
      title: 'Test',
      timestamp: Date.now(),
    }
    useChatStore.getState().setArtifact(artifact)
    expect(useChatStore.getState().currentArtifact).toEqual(artifact)
  })

  it('clearArtifact should reset to null', () => {
    const artifact: Artifact = {
      id: 'test-2',
      type: 'svg',
      content: '<svg></svg>',
      timestamp: Date.now(),
    }
    useChatStore.getState().setArtifact(artifact)
    expect(useChatStore.getState().currentArtifact).not.toBeNull()
    useChatStore.getState().clearArtifact()
    expect(useChatStore.getState().currentArtifact).toBeNull()
  })

  it('setArtifact should replace existing artifact', () => {
    const a1: Artifact = { id: '1', type: 'html', content: '<p>A</p>', timestamp: 1 }
    const a2: Artifact = { id: '2', type: 'svg', content: '<svg/>', timestamp: 2 }
    useChatStore.getState().setArtifact(a1)
    useChatStore.getState().setArtifact(a2)
    expect(useChatStore.getState().currentArtifact).toEqual(a2)
  })
})
