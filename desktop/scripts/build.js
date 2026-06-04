// Build one branded installer: node scripts/build.js <target> [--mac|--win|--linux]
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const targets = JSON.parse(fs.readFileSync(path.join(root, 'targets.json'), 'utf8'))
const target = process.argv[2]
const platform = process.argv[3] || '--mac'

const t = targets[target]
if (!t) {
  console.error('usage: node scripts/build.js <' + Object.keys(targets).join('|') + '> [--mac|--win|--linux]')
  process.exit(1)
}

// bake the target into the bundle, then build with per-app identity overrides
fs.writeFileSync(path.join(root, 'app.config.json'), JSON.stringify(t, null, 2))
const bin = path.join(root, 'node_modules', '.bin', 'electron-builder')
const args = [
  platform,
  '-c.appId=' + t.appId,
  '-c.productName=' + t.productName,
  '-c.directories.output=dist/' + target,
]
console.log('building', t.productName, '(' + target + ')', platform)
execFileSync(bin, args, { stdio: 'inherit', cwd: root })
