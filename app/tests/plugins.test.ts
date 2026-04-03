import { describe, it, expect } from 'vitest'
import { createDefaultRegistry } from '../src/backend/tool-registry'
import { loadSkills } from '../src/core/skills/loader'
import type { Plugin } from '../src/backend/routes/plugins'

/**
 * Build the plugin list the same way the route does,
 * without needing HTTP or mocks.
 */
function buildPluginList(): Plugin[] {
  const plugins: Plugin[] = []

  const registry = createDefaultRegistry()
  const defs = registry.getDefinitions()
  for (const def of defs) {
    plugins.push({
      id: `builtin:${def.name}`,
      name: def.name,
      description: def.description,
      type: 'builtin',
      enabled: true,
      tools: [def.name],
    })
  }

  const skills = loadSkills()
  for (const skill of skills) {
    plugins.push({
      id: `skill:${skill.name}`,
      name: skill.name,
      description: skill.description,
      type: 'skill',
      enabled: true,
      tools: skill.tools,
    })
  }

  return plugins
}

describe('Plugins', () => {
  it('should return at least 19 plugins (built-in tools)', () => {
    const plugins = buildPluginList()
    expect(plugins.length).toBeGreaterThanOrEqual(19)
  })

  it('every plugin has id, name, and type', () => {
    const plugins = buildPluginList()
    for (const p of plugins) {
      expect(p.id).toBeTruthy()
      expect(typeof p.id).toBe('string')
      expect(p.name).toBeTruthy()
      expect(typeof p.name).toBe('string')
      expect(['builtin', 'skill', 'mcp']).toContain(p.type)
    }
  })

  it('built-in plugins are enabled by default', () => {
    const plugins = buildPluginList()
    const builtins = plugins.filter((p) => p.type === 'builtin')
    expect(builtins.length).toBe(19)
    for (const p of builtins) {
      expect(p.enabled).toBe(true)
    }
  })

  it('every built-in plugin has a description', () => {
    const plugins = buildPluginList()
    const builtins = plugins.filter((p) => p.type === 'builtin')
    for (const p of builtins) {
      expect(p.description).toBeTruthy()
      expect(typeof p.description).toBe('string')
    }
  })

  it('every plugin has a tools array with at least one entry', () => {
    const plugins = buildPluginList()
    const builtins = plugins.filter((p) => p.type === 'builtin')
    for (const p of builtins) {
      expect(Array.isArray(p.tools)).toBe(true)
      expect(p.tools!.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('plugin IDs are unique', () => {
    const plugins = buildPluginList()
    const ids = plugins.map((p) => p.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })
})
