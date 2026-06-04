// Writes app.config.json for a chosen target so main.js knows which site to load.
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const targets = JSON.parse(fs.readFileSync(path.join(root, 'targets.json'), 'utf8'))
const target = process.argv[2]

if (!target || !targets[target]) {
  console.error('usage: node scripts/prep.js <' + Object.keys(targets).join('|') + '>')
  process.exit(1)
}

fs.writeFileSync(path.join(root, 'app.config.json'), JSON.stringify(targets[target], null, 2))
console.log('prepared:', target, '→', targets[target].url)
