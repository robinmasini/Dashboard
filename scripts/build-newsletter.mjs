#!/usr/bin/env node
/**
 * Turns the commit history into the newsletter's work journal.
 *
 * Derived rather than written by hand: an entry only exists if the commit that
 * carries it exists, so the journal cannot claim work that was never done.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')
const output = resolve(repoRoot, 'public/newsletter.json')

/** Commits touching the TradeView engine or its screens. */
const PATHS = ['tradeview', 'src/components/tradeview', 'src/hooks/useTradeViewWebSocket.ts']
const SEPARATOR = ''
const FIELD = ''

function readCommits(limit = 80) {
  const raw = execFileSync(
    'git',
    [
      'log',
      `-${limit}`,
      `--format=%H${FIELD}%aI${FIELD}%s${FIELD}%b${SEPARATOR}`,
      '--',
      ...PATHS,
    ],
    { cwd: repoRoot, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }
  )

  return raw
    .split(SEPARATOR)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [hash, date, subject, body = ''] = chunk.split(FIELD)
      return {
        id: hash.slice(0, 7),
        date,
        title: subject,
        // The trailer is bookkeeping, not news.
        body: body
          .split('\n')
          .filter((line) => !line.startsWith('Co-Authored-By:'))
          .join('\n')
          .trim(),
      }
    })
}

const commits = readCommits()
mkdirSync(dirname(output), { recursive: true })
writeFileSync(
  output,
  JSON.stringify({ generatedAt: new Date().toISOString(), entries: commits }, null, 2)
)

console.log(`newsletter: ${commits.length} entrées → ${output}`)
