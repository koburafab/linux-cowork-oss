import { describe, it, expect } from 'vitest'
import {
  createDefaultRegistry,
  extractYouTubeVideoId,
} from '../src/backend/tool-registry'

describe('extractYouTubeVideoId', () => {
  it('should extract ID from standard watch URL', () => {
    expect(
      extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
    ).toBe('dQw4w9WgXcQ')
  })

  it('should extract ID from short youtu.be URL', () => {
    expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ',
    )
  })

  it('should extract ID from embed URL', () => {
    expect(
      extractYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ'),
    ).toBe('dQw4w9WgXcQ')
  })

  it('should extract ID from shorts URL', () => {
    expect(
      extractYouTubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ'),
    ).toBe('dQw4w9WgXcQ')
  })

  it('should accept a bare 11-char video ID', () => {
    expect(extractYouTubeVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('should extract ID from URL with extra params', () => {
    expect(
      extractYouTubeVideoId(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PLxyz',
      ),
    ).toBe('dQw4w9WgXcQ')
  })

  it('should return null for invalid input', () => {
    expect(extractYouTubeVideoId('https://example.com')).toBeNull()
    expect(extractYouTubeVideoId('not-a-url')).toBeNull()
    expect(extractYouTubeVideoId('')).toBeNull()
  })

  it('should handle youtube-nocookie.com', () => {
    expect(
      extractYouTubeVideoId(
        'https://www.youtube-nocookie.com/watch?v=dQw4w9WgXcQ',
      ),
    ).toBe('dQw4w9WgXcQ')
  })
})

describe('youtube_transcript tool in registry', () => {
  it('should be registered in the default registry', () => {
    const registry = createDefaultRegistry()
    const tool = registry.get('youtube_transcript')
    expect(tool).toBeDefined()
    expect(tool!.definition.name).toBe('youtube_transcript')
  })

  it('should have a url input parameter', () => {
    const registry = createDefaultRegistry()
    const tool = registry.get('youtube_transcript')!
    expect(tool.definition.input_schema.properties).toHaveProperty('url')
    expect(tool.definition.input_schema.required).toContain('url')
  })

  it('should have a description mentioning transcript', () => {
    const registry = createDefaultRegistry()
    const tool = registry.get('youtube_transcript')!
    expect(tool.definition.description.toLowerCase()).toContain('transcript')
  })
})
