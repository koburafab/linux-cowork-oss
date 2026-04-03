import { describe, it, expect } from 'vitest'
import {
  ToolRegistry,
  createDefaultRegistry,
  type RegisteredTool,
} from '../src/backend/tool-registry'

describe('ToolRegistry', () => {
  describe('basic operations', () => {
    it('should register and retrieve a tool', () => {
      const registry = new ToolRegistry()
      const tool: RegisteredTool = {
        definition: {
          name: 'test_tool',
          description: 'A test tool',
          input_schema: { type: 'object', properties: {}, required: [] },
        },
        executor: async () => 'result',
      }

      registry.register(tool)
      const retrieved = registry.get('test_tool')
      expect(retrieved).toBeDefined()
      expect(retrieved!.definition.name).toBe('test_tool')
    })

    it('should return undefined for unknown tool', () => {
      const registry = new ToolRegistry()
      expect(registry.get('nonexistent')).toBeUndefined()
    })

    it('should return all definitions', () => {
      const registry = new ToolRegistry()
      registry.register({
        definition: {
          name: 'tool_a',
          description: 'Tool A',
          input_schema: { type: 'object', properties: {} },
        },
        executor: async () => 'a',
      })
      registry.register({
        definition: {
          name: 'tool_b',
          description: 'Tool B',
          input_schema: { type: 'object', properties: {} },
        },
        executor: async () => 'b',
      })

      const defs = registry.getDefinitions()
      expect(defs).toHaveLength(2)
      expect(defs.map((d) => d.name)).toContain('tool_a')
      expect(defs.map((d) => d.name)).toContain('tool_b')
    })

    it('should overwrite a tool when re-registered with same name', () => {
      const registry = new ToolRegistry()
      registry.register({
        definition: {
          name: 'tool_x',
          description: 'Original',
          input_schema: { type: 'object', properties: {} },
        },
        executor: async () => 'original',
      })
      registry.register({
        definition: {
          name: 'tool_x',
          description: 'Updated',
          input_schema: { type: 'object', properties: {} },
        },
        executor: async () => 'updated',
      })

      const defs = registry.getDefinitions()
      expect(defs).toHaveLength(1)
      expect(defs[0].description).toBe('Updated')
    })
  })

  describe('createDefaultRegistry', () => {
    it('should register exactly 19 tools', () => {
      const registry = createDefaultRegistry()
      const defs = registry.getDefinitions()
      expect(defs).toHaveLength(19)
    })

    it('should register all expected tool names', () => {
      const registry = createDefaultRegistry()
      const names = registry.getDefinitions().map((d) => d.name)

      const expected = [
        'screenshot',
        'click',
        'type_text',
        'key_press',
        'mouse_move',
        'list_windows',
        'focus_window',
        'read_file',
        'write_file',
        'list_directory',
        'bash',
      ]

      for (const name of expected) {
        expect(names).toContain(name)
      }
    })

    it('should have valid input_schema on every tool', () => {
      const registry = createDefaultRegistry()
      const defs = registry.getDefinitions()

      for (const def of defs) {
        expect(def.input_schema).toBeDefined()
        expect(def.input_schema.type).toBe('object')
        expect(def.input_schema.properties).toBeDefined()
        expect(typeof def.input_schema.properties).toBe('object')
      }
    })

    it('every tool should have a description', () => {
      const registry = createDefaultRegistry()
      const defs = registry.getDefinitions()

      for (const def of defs) {
        expect(def.description).toBeTruthy()
        expect(typeof def.description).toBe('string')
      }
    })

    it('every tool should have an executor function', () => {
      const registry = createDefaultRegistry()
      const defs = registry.getDefinitions()

      for (const def of defs) {
        const tool = registry.get(def.name)
        expect(tool).toBeDefined()
        expect(typeof tool!.executor).toBe('function')
      }
    })
  })
})
