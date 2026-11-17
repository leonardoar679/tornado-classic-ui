import { copyFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Replaces the old `cp dist/404.html dist/ipfs-404.html` (cross-platform).
// `dist/` was the Nuxt 2 output dir; Nuxt 4 generates into `.output/public`.
const dist = join(process.cwd(), '.output', 'public')
const source = join(dist, '404.html')
const target = join(dist, 'ipfs-404.html')

// existsSync() is true for directories too - only copy a real file
if (existsSync(source) && statSync(source).isFile()) {
  copyFileSync(source, target)
  console.log('Copied 404.html -> ipfs-404.html')
} else {
  console.warn('.output/public/404.html not found, skipping ipfs-404.html copy')
}
