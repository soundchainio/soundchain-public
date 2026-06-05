// Generates branded PDFs from the in-app help pages using Electron's printToPDF.
// Run: yarn pdf   (electron scripts/make-pdf.js)
const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

const ROOT = path.join(__dirname, '..')
const jobs = [
  ['renderer/manual.html', 'docs/SoundChain-Manual.pdf'],
  ['renderer/faq.html', 'docs/SoundChain-FAQ.pdf'],
]

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 900, height: 1200 })
  for (const [src, out] of jobs) {
    await win.loadFile(path.join(ROOT, src))
    await new Promise((r) => setTimeout(r, 500)) // let fonts/gradients settle
    const data = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { top: 0.4, bottom: 0.4, left: 0.5, right: 0.5 },
    })
    const dest = path.join(ROOT, out)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, data)
    console.log('wrote', out, '(' + data.length + ' bytes)')
  }
  app.quit()
})

app.on('window-all-closed', () => app.quit())
