import { copyFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// Replaces the old `cp dist/404.html dist/ipfs-404.html` (cross-platform).
const dist = join(process.cwd(), 'dist')
const source = join(dist, '404.html')
const target = join(dist, 'ipfs-404.html')

if (existsSync(source)) {
  copyFileSync(source, target)
  console.log('Copied 404.html -> ipfs-404.html')
} else {
  console.warn('dist/404.html not found, skipping ipfs-404.html copy')
}
