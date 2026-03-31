/**
 * File access — secure filesystem operations with audit logging
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'

export interface FileOperation {
  type: 'read' | 'write' | 'edit' | 'list'
  path: string
  timestamp: number
}

const operationLog: FileOperation[] = []

function logOperation(type: FileOperation['type'], filePath: string): void {
  operationLog.push({ type, path: filePath, timestamp: Date.now() })
}

/**
 * Get the audit log of file operations
 */
export function getFileOperationLog(): FileOperation[] {
  return [...operationLog]
}

/**
 * Validate path — reject path traversal attempts
 */
function validatePath(filePath: string): string {
  const resolved = path.resolve(filePath)

  // Block path traversal: the resolved path must not differ from
  // what we'd expect (i.e., no /../ tricks)
  if (filePath.includes('/../') || filePath.endsWith('/..') || filePath === '..') {
    throw new Error(`Path traversal detected: ${filePath}`)
  }

  return resolved
}

/**
 * Read a file and return its contents
 */
export async function readFile(filePath: string): Promise<string> {
  const resolved = validatePath(filePath)
  logOperation('read', resolved)
  return fs.readFile(resolved, 'utf-8')
}

/**
 * Write content to a file, creating parent directories as needed
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  const resolved = validatePath(filePath)
  logOperation('write', resolved)
  await fs.mkdir(path.dirname(resolved), { recursive: true })
  await fs.writeFile(resolved, content, 'utf-8')
}

/**
 * Edit a file by replacing a string
 */
export async function editFile(
  filePath: string,
  oldStr: string,
  newStr: string,
): Promise<void> {
  const resolved = validatePath(filePath)
  logOperation('edit', resolved)

  const content = await fs.readFile(resolved, 'utf-8')
  if (!content.includes(oldStr)) {
    throw new Error(`String not found in ${resolved}: "${oldStr.slice(0, 50)}"`)
  }
  const updated = content.replace(oldStr, newStr)
  await fs.writeFile(resolved, updated, 'utf-8')
}

/**
 * List directory contents
 */
export async function listDir(dirPath: string): Promise<string[]> {
  const resolved = validatePath(dirPath)
  logOperation('list', resolved)
  const entries = await fs.readdir(resolved)
  return entries.sort()
}

/**
 * Check if a file or directory exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  const resolved = validatePath(filePath)
  try {
    await fs.access(resolved)
    return true
  } catch {
    return false
  }
}
