// Local activation record. Once a device proves it holds a Pass, we cache that
// here so the user isn't re-challenged every launch. Lives in the app's userData.
const fs = require('fs')
const path = require('path')

function file(userDataDir) {
  return path.join(userDataDir, 'activation.json')
}

function load(userDataDir) {
  try {
    return JSON.parse(fs.readFileSync(file(userDataDir), 'utf8'))
  } catch (_) {
    return null
  }
}

function activate(userDataDir, address) {
  const data = { activated: true, address, at: new Date().toISOString() }
  try {
    fs.mkdirSync(userDataDir, { recursive: true })
    fs.writeFileSync(file(userDataDir), JSON.stringify(data))
  } catch (_) {}
  return data
}

function isActivated(userDataDir) {
  const a = load(userDataDir)
  return !!(a && a.activated && a.address)
}

module.exports = { load, activate, isActivated, file }
