/**
 * Skills/Plugins loader
 * Loads skill definitions from ~/.config/linux-cowork/skills/
 * Supports .md (with YAML frontmatter) and .json files
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { watch, type FSWatcher } from 'chokidar'
import type { Hook } from '../hooks/engine'

export interface Skill {
  name: string
  description: string
  prompt: string
  hooks?: Hook[]
  tools?: string[]
}

function getSkillsDir(): string {
  return path.join(os.homedir(), '.config', 'linux-cowork', 'skills')
}

/**
 * Parse YAML frontmatter from a markdown string.
 * Returns { meta, content } where meta is the parsed key-value pairs
 * and content is the body after the frontmatter.
 */
export function parseFrontmatter(raw: string): {
  meta: Record<string, unknown>
  content: string
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) {
    return { meta: {}, content: raw }
  }

  const yamlBlock = match[1]
  const content = match[2]

  // Simple YAML parser for flat key-value pairs and arrays
  const meta: Record<string, unknown> = {}
  const lines = yamlBlock.split('\n')
  let currentKey = ''

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    // Array item
    if (trimmed.startsWith('- ') && currentKey) {
      const val = trimmed.slice(2).trim()
      if (!Array.isArray(meta[currentKey])) {
        meta[currentKey] = []
      }
      ;(meta[currentKey] as string[]).push(val)
      continue
    }

    // Key-value pair
    const kvMatch = trimmed.match(/^(\w+)\s*:\s*(.*)$/)
    if (kvMatch) {
      currentKey = kvMatch[1]
      const value = kvMatch[2].trim()
      if (value) {
        meta[currentKey] = value
      }
      // If no value, it might be followed by array items
    }
  }

  return { meta, content }
}

/**
 * Parse a single skill file (either .md or .json)
 */
function parseSkillFile(filePath: string): Skill | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const ext = path.extname(filePath)
    const baseName = path.basename(filePath, ext)

    if (ext === '.json') {
      const data = JSON.parse(raw) as Partial<Skill>
      return {
        name: data.name || baseName,
        description: data.description || '',
        prompt: data.prompt || '',
        hooks: data.hooks,
        tools: data.tools,
      }
    }

    if (ext === '.md') {
      const { meta, content } = parseFrontmatter(raw)
      return {
        name: (meta.name as string) || baseName,
        description: (meta.description as string) || '',
        prompt: content.trim(),
        tools: meta.tools as string[] | undefined,
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Load all skills from the skills directory.
 * Optionally accepts a custom directory path (useful for tests).
 */
export function loadSkills(skillsDir?: string): Skill[] {
  const dir = skillsDir || getSkillsDir()

  if (!fs.existsSync(dir)) {
    return []
  }

  const files = fs.readdirSync(dir)
  const skills: Skill[] = []

  for (const file of files) {
    const ext = path.extname(file)
    if (ext !== '.md' && ext !== '.json') continue

    const skill = parseSkillFile(path.join(dir, file))
    if (skill) {
      skills.push(skill)
    }
  }

  return skills
}

/**
 * Get a single skill by name from the skills directory.
 */
export function getSkill(name: string, skillsDir?: string): Skill | undefined {
  const skills = loadSkills(skillsDir)
  return skills.find((s) => s.name === name)
}

/**
 * Watch the skills directory for changes and invoke callback on add/change/unlink.
 * Returns a cleanup function to stop watching.
 */
export function watchSkills(
  callback: (skills: Skill[]) => void,
  skillsDir?: string,
): () => void {
  const dir = skillsDir || getSkillsDir()

  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const watcher: FSWatcher = watch(dir, {
    persistent: false,
    ignoreInitial: true,
  })

  const reload = () => {
    const skills = loadSkills(dir)
    callback(skills)
  }

  watcher.on('add', reload)
  watcher.on('change', reload)
  watcher.on('unlink', reload)

  return () => {
    watcher.close()
  }
}
