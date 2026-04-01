import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { loadSkills, getSkill, parseFrontmatter } from '../src/core/skills/loader'

describe('Skills Loader', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lc-skills-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('parseFrontmatter', () => {
    it('should parse YAML frontmatter from markdown', () => {
      const md = `---
name: test-skill
description: A test skill
tools:
- bash
- read
---
This is the prompt content.`

      const { meta, content } = parseFrontmatter(md)
      expect(meta.name).toBe('test-skill')
      expect(meta.description).toBe('A test skill')
      expect(meta.tools).toEqual(['bash', 'read'])
      expect(content.trim()).toBe('This is the prompt content.')
    })

    it('should return raw content when no frontmatter', () => {
      const md = 'Just plain text, no frontmatter.'
      const { meta, content } = parseFrontmatter(md)
      expect(meta).toEqual({})
      expect(content).toBe(md)
    })
  })

  describe('loadSkills', () => {
    it('should return empty array for non-existent directory', () => {
      const skills = loadSkills('/tmp/does-not-exist-12345')
      expect(skills).toEqual([])
    })

    it('should load .md skills', () => {
      const md = `---
name: my-skill
description: Does things
---
You are a helpful skill.`
      fs.writeFileSync(path.join(tmpDir, 'my-skill.md'), md)

      const skills = loadSkills(tmpDir)
      expect(skills).toHaveLength(1)
      expect(skills[0].name).toBe('my-skill')
      expect(skills[0].description).toBe('Does things')
      expect(skills[0].prompt).toBe('You are a helpful skill.')
    })

    it('should load .json skills', () => {
      const skill = {
        name: 'json-skill',
        description: 'JSON-based',
        prompt: 'Do the thing.',
        tools: ['bash'],
      }
      fs.writeFileSync(
        path.join(tmpDir, 'json-skill.json'),
        JSON.stringify(skill),
      )

      const skills = loadSkills(tmpDir)
      expect(skills).toHaveLength(1)
      expect(skills[0].name).toBe('json-skill')
      expect(skills[0].tools).toEqual(['bash'])
    })

    it('should ignore non-.md/.json files', () => {
      fs.writeFileSync(path.join(tmpDir, 'readme.txt'), 'ignore me')
      fs.writeFileSync(
        path.join(tmpDir, 'real.json'),
        JSON.stringify({ name: 'real', description: 'yes', prompt: 'go' }),
      )

      const skills = loadSkills(tmpDir)
      expect(skills).toHaveLength(1)
      expect(skills[0].name).toBe('real')
    })

    it('should load multiple skills', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'a.json'),
        JSON.stringify({ name: 'a', description: 'A', prompt: 'pa' }),
      )
      fs.writeFileSync(
        path.join(tmpDir, 'b.json'),
        JSON.stringify({ name: 'b', description: 'B', prompt: 'pb' }),
      )

      const skills = loadSkills(tmpDir)
      expect(skills).toHaveLength(2)
    })

    it('should skip invalid files', () => {
      fs.writeFileSync(path.join(tmpDir, 'bad.json'), 'not valid json{{{')
      const skills = loadSkills(tmpDir)
      expect(skills).toEqual([])
    })
  })

  describe('getSkill', () => {
    it('should return a skill by name', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'target.json'),
        JSON.stringify({ name: 'target', description: 'T', prompt: 'go' }),
      )

      const skill = getSkill('target', tmpDir)
      expect(skill).toBeDefined()
      expect(skill!.name).toBe('target')
    })

    it('should return undefined for missing skill', () => {
      const skill = getSkill('nonexistent', tmpDir)
      expect(skill).toBeUndefined()
    })
  })
})
