// Launch a Node command with a server-only key. Never print or write the key.
const { spawn } = require('node:child_process')
const { readFileSync } = require('node:fs')
const path = require('node:path')

const args = process.argv.slice(2)
if (!args.length) throw new Error('Supply the Node script to launch')

let child
if (process.platform === 'win32' && !process.env.YOUTUBE_API_KEY) {
  const source = readFileSync(path.join(__dirname, 'with-youtube-key.ps1'), 'utf8')
  child = spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', source], {
    stdio: 'inherit',
    windowsHide: true,
    env: { ...process.env, HAKADOSH_NODE_PATH: process.execPath, HAKADOSH_NODE_ARGS: JSON.stringify(args) },
  })
} else {
  child = spawn(process.execPath, args, { stdio: 'inherit', env: process.env })
}
child.on('error', () => {
  console.error('Unable to start the local server. Check Node.js and Windows PowerShell.')
  process.exitCode = 1
})
child.on('exit', code => { process.exitCode = code ?? 1 })
