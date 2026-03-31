import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { checkPermission, matchPattern, loadPermissionRules } from '../src/core/permissions'

describe('Permissions', () => {
  let tmpDir: string
  let settingsPath: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'permissions-test-'))
    settingsPath = path.join(tmpDir, 'settings.json')
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('matchPattern', () => {
    it('should match exact strings', () => {
      expect(matchPattern('rm -rf', 'rm -rf')).toBe(true)
    })

    it('should match with includes for simple patterns', () => {
      expect(matchPattern('rm -rf /tmp/foo', 'rm -rf')).toBe(true)
      expect(matchPattern('cat /etc/hosts', '.ssh')).toBe(false)
    })

    it('should match glob * pattern', () => {
      expect(matchPattern('write:project/foo.ts', 'write:project/*')).toBe(true)
      expect(matchPattern('write:project/sub/foo.ts', 'write:project/*')).toBe(false)
    })

    it('should match glob ** pattern', () => {
      expect(matchPattern('write:project/sub/deep/foo.ts', 'write:project/**')).toBe(true)
    })

    it('should match glob ? pattern', () => {
      expect(matchPattern('file_a.ts', 'file_?.ts')).toBe(true)
      expect(matchPattern('file_ab.ts', 'file_?.ts')).toBe(false)
    })
  })

  describe('deny patterns', () => {
    it('should deny rm -rf', () => {
      const result = checkPermission('rm -rf /tmp/important', undefined, settingsPath)
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Denied')
    })

    it('should deny rm -fr', () => {
      const result = checkPermission('rm -fr /tmp/important', undefined, settingsPath)
      expect(result.allowed).toBe(false)
    })

    it('should deny .git access', () => {
      const result = checkPermission('cat', '.git/config', settingsPath)
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Denied')
    })

    it('should deny .ssh access', () => {
      const result = checkPermission('read:', '.ssh/id_rsa', settingsPath)
      expect(result.allowed).toBe(false)
    })

    it('should deny .gnupg access', () => {
      const result = checkPermission('read:', '.gnupg/private-keys', settingsPath)
      expect(result.allowed).toBe(false)
    })

    it('should deny .env file access', () => {
      const result = checkPermission('cat .env', undefined, settingsPath)
      expect(result.allowed).toBe(false)
    })

    it('should deny chmod 777', () => {
      const result = checkPermission('chmod 777 /tmp/file', undefined, settingsPath)
      expect(result.allowed).toBe(false)
    })
  })

  describe('allow patterns', () => {
    it('should allow reading files', () => {
      const result = checkPermission('cat /etc/hostname', undefined, settingsPath)
      expect(result.allowed).toBe(true)
    })

    it('should allow ls', () => {
      const result = checkPermission('ls /tmp', undefined, settingsPath)
      expect(result.allowed).toBe(true)
    })

    it('should allow write in project dir', () => {
      const result = checkPermission('write:project/src/main.ts', undefined, settingsPath)
      expect(result.allowed).toBe(true)
    })

    it('should allow basic commands (pwd, whoami, date)', () => {
      expect(checkPermission('pwd', undefined, settingsPath).allowed).toBe(true)
      expect(checkPermission('whoami', undefined, settingsPath).allowed).toBe(true)
      expect(checkPermission('date', undefined, settingsPath).allowed).toBe(true)
    })
  })

  describe('ask patterns (denied with confirmation reason)', () => {
    it('should require confirmation for sudo', () => {
      const result = checkPermission('sudo apt update', undefined, settingsPath)
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('confirmation')
    })

    it('should require confirmation for curl', () => {
      const result = checkPermission('curl https://example.com', undefined, settingsPath)
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('confirmation')
    })

    it('should require confirmation for npm install', () => {
      const result = checkPermission('npm install lodash', undefined, settingsPath)
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('confirmation')
    })
  })

  describe('custom rules from config', () => {
    it('should apply custom deny rules', () => {
      fs.writeFileSync(settingsPath, JSON.stringify({
        permissions: {
          deny: ['docker rm'],
        },
      }))

      const result = checkPermission('docker rm container123', undefined, settingsPath)
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('docker rm')
    })

    it('should apply custom allow rules', () => {
      fs.writeFileSync(settingsPath, JSON.stringify({
        permissions: {
          allow: ['docker ps'],
        },
      }))

      const result = checkPermission('docker ps', undefined, settingsPath)
      expect(result.allowed).toBe(true)
    })

    it('should respect mode=auto (allow everything except denies)', () => {
      fs.writeFileSync(settingsPath, JSON.stringify({
        permissions: {
          mode: 'auto',
        },
      }))

      // random command should be allowed in auto mode
      const result = checkPermission('some-unknown-command', undefined, settingsPath)
      expect(result.allowed).toBe(true)

      // but rm -rf still denied
      const deny = checkPermission('rm -rf /tmp', undefined, settingsPath)
      expect(deny.allowed).toBe(false)
    })

    it('should respect mode=restricted (deny everything except explicit allows)', () => {
      fs.writeFileSync(settingsPath, JSON.stringify({
        permissions: {
          mode: 'restricted',
          allow: ['echo hello'],
        },
      }))

      const allowed = checkPermission('echo hello', undefined, settingsPath)
      expect(allowed.allowed).toBe(true)

      const denied = checkPermission('ls /tmp', undefined, settingsPath)
      expect(denied.allowed).toBe(false)
      expect(denied.reason).toContain('Restricted')
    })
  })

  describe('loadPermissionRules', () => {
    it('should return defaults when no config file', () => {
      const { mode, rules } = loadPermissionRules('/nonexistent/path.json')
      expect(mode).toBe('default')
      expect(rules.length).toBeGreaterThan(0)
    })

    it('should merge user rules with defaults', () => {
      fs.writeFileSync(settingsPath, JSON.stringify({
        permissions: {
          deny: ['custom-danger'],
          allow: ['custom-safe'],
        },
      }))

      const { rules } = loadPermissionRules(settingsPath)
      const patterns = rules.map(r => r.pattern)
      expect(patterns).toContain('custom-danger')
      expect(patterns).toContain('custom-safe')
      // defaults still present
      expect(patterns).toContain('rm -rf')
    })
  })
})
