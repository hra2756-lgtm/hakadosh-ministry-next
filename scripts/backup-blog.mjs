import { spawn } from 'node:child_process'
import { constants } from 'node:fs'
import { copyFile, mkdir, readFile, realpath, rename, stat, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fileHash, verifyArchive } from './blog-backup-archive.mjs'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const studio = join(repo, 'studio')
const backups = join(repo, 'backups')
const settingsPath = join(backups, 'settings.json')
const project = '2a3jhsqe'

function cli(args) {
  return new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, [join(studio, 'node_modules/sanity/bin/sanity'), ...args], {
      cwd: studio, shell: false, windowsHide: true,
      env: { ...process.env, CI: 'true', NO_COLOR: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
    })
    let output = ''
    let assetWarning = false
    function collect(chunk) {
      output = (output + chunk.toString()).slice(-65536)
      if (/asset[^\n]*(?:ignoring|skipped|inaccessible|failed|missing)/i.test(output)) assetWarning = true
    }
    child.stdout.on('data', collect)
    child.stderr.on('data', collect)
    child.once('error', reject)
    child.once('close', code => resolveResult({ code, assetWarning }))
  })
}

async function main() {
  const args = process.argv.slice(2)
  if (args[0] === '--verify' && args.length === 2) {
    console.log(JSON.stringify(await verifyArchive(resolve(args[1]))))
    console.log(`SHA-256: ${await fileHash(resolve(args[1]))}`)
    return
  }
  if (args.length && (args[0] !== '--destination' || args.length !== 2)) {
    throw new Error('Usage: npm run backup:blog [-- --destination "absolute Google Drive folder"]')
  }
  let configured
  if (!args[1]) {
    try { configured = JSON.parse(await readFile(settingsPath, 'utf8')).destination } catch (error) {
      if (error.code !== 'ENOENT') throw new Error('Cannot read backup settings. Supply --destination to configure the folder.')
    }
  }
  const requested = args[1] || configured
  if (!requested || !isAbsolute(requested)) throw new Error('Supply the existing Google Drive backup folder with --destination.')
  const destination = await realpath(requested)
  if (!(await stat(destination)).isDirectory()) throw new Error('Backup destination must be an existing folder.')
  const repoRelative = relative(await realpath(repo), destination)
  if (!repoRelative || (!repoRelative.startsWith(`..${sep}`) && !isAbsolute(repoRelative))) {
    throw new Error('Choose a private backup destination outside this repository.')
  }
  await mkdir(backups, { recursive: true })
  await writeFile(settingsPath, JSON.stringify({ destination }, null, 2) + '\n', { mode: 0o600 })
  if ((await cli(['whoami'])).code !== 0) {
    throw new Error('Sign in first: npm.cmd --prefix studio run login. Then run npm.cmd run backup:blog again.')
  }
  const stamp = new Date().toISOString().replaceAll(':', '-')
  const name = `sanity-production-${stamp}-${randomUUID().slice(0, 8)}.tar.gz`
  const staging = join(backups, `${name}.partial`)
  console.log('Exporting Production posts, drafts and uploaded assets from Sanity…')
  const exported = await cli(['datasets', 'export', 'production', staging, '--project', project])
  if (exported.code !== 0 || exported.assetWarning) {
    throw new Error('Export failed or reported missing assets. No archive was copied to Drive; inspect the export before retrying.')
  }
  console.log('Checking document data, asset references and image/file checksums…')
  const contents = await verifyArchive(staging)
  const sha256 = await fileHash(staging)
  const local = join(backups, name)
  await rename(staging, local)
  const drivePartial = join(destination, `${name}.partial`)
  await copyFile(local, drivePartial, constants.COPYFILE_EXCL)
  if (await fileHash(drivePartial) !== sha256) throw new Error('Drive copy checksum mismatch. The verified local copy is retained.')
  const driveArchive = join(destination, name)
  await rename(drivePartial, driveArchive)
  const report = JSON.stringify({ project, dataset: 'production', createdAt: new Date().toISOString(), archive: name,
    sha256, bytes: (await stat(local)).size, ...contents, cloudUploadVerified: false, sanityRestoreTested: false }, null, 2) + '\n'
  await writeFile(join(backups, `${name}.json`), report, { flag: 'wx', mode: 0o600 })
  await writeFile(join(destination, `${name}.json`), report, { flag: 'wx', mode: 0o600 })
  console.log(`Verified backup: ${contents.posts} post documents (${contents.drafts} draft documents), ${contents.images} images, ${contents.files} files.`)
  console.log(`Saved to: ${driveArchive}`)
  console.log('A local copy is also retained in the ignored backups folder.')
  console.log('Wait for Google Drive to finish syncing, then confirm the archive at drive.google.com. A local copy does not prove cloud upload.')
}

main().catch(error => { console.error(`Backup not completed: ${error.message}`); process.exitCode = 1 })
