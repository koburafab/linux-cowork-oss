import { describe, it, expect } from 'vitest'
import { createDefaultRegistry } from '../src/backend/tool-registry'

describe('Quick-win tools', () => {
  const registry = createDefaultRegistry()
  const names = registry.getDefinitions().map((d) => d.name)

  const quickWinTools = [
    'read_clipboard',
    'write_clipboard',
    'system_info',
    'open_url',
    'open_app',
  ]

  for (const toolName of quickWinTools) {
    it(`should have "${toolName}" registered in the registry`, () => {
      expect(names).toContain(toolName)
    })
  }

  it('system_info executor should return valid JSON', async () => {
    const tool = registry.get('system_info')
    expect(tool).toBeDefined()

    const result = await tool!.executor({})
    expect(typeof result).toBe('string')

    const parsed = JSON.parse(result as string)
    expect(parsed).toHaveProperty('hostname')
    expect(parsed).toHaveProperty('username')
    expect(parsed).toHaveProperty('platform')
    expect(parsed).toHaveProperty('uptime')
    expect(parsed).toHaveProperty('memory')
    expect(parsed.memory).toHaveProperty('free')
    expect(parsed.memory).toHaveProperty('total')
    expect(parsed).toHaveProperty('display_server')
    expect(parsed).toHaveProperty('cpu_model')
  })

  it('all quick-win tools should have valid schemas', () => {
    for (const toolName of quickWinTools) {
      const tool = registry.get(toolName)
      expect(tool).toBeDefined()
      expect(tool!.definition.input_schema).toBeDefined()
      expect(tool!.definition.input_schema.type).toBe('object')
      expect(tool!.definition.input_schema.properties).toBeDefined()
      expect(typeof tool!.definition.input_schema.properties).toBe('object')
    }
  })

  it('write_clipboard should require "text" param', () => {
    const tool = registry.get('write_clipboard')
    expect(tool!.definition.input_schema.required).toContain('text')
  })

  it('open_url should require "url" param', () => {
    const tool = registry.get('open_url')
    expect(tool!.definition.input_schema.required).toContain('url')
  })

  it('open_app should require "name" param', () => {
    const tool = registry.get('open_app')
    expect(tool!.definition.input_schema.required).toContain('name')
  })

  it('read_clipboard and system_info should have no required params', () => {
    for (const toolName of ['read_clipboard', 'system_info']) {
      const tool = registry.get(toolName)
      const required = tool!.definition.input_schema.required || []
      expect(required).toHaveLength(0)
    }
  })
})
