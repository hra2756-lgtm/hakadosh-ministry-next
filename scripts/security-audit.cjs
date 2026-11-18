const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const patch = require('./patch-picomatch.cjs')
const { assess, EXPIRES } = require('./security-audit-policy.cjs')

function run() {
  // No cached-report, skip-test, alternate-date, or ignore-list CLI options.
  if (process.argv.length > 2) throw Error('Audit overrides are not supported.')
  if (Date.now() >= Date.parse(EXPIRES)) throw Error('Temporary exception expired; review required.')
  const project = process.cwd()
  const npmCli = process.env.npm_execpath
  if (!npmCli || !path.isAbsolute(npmCli) || !fs.existsSync(npmCli)) throw Error('Run npm run security:audit so a fresh npm audit is available.')

  patch.apply(project, true)
  const check = spawnSync(process.execPath, ['--test', path.join(__dirname, 'picomatch-security.test.cjs')], {
    cwd: project, encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024, windowsHide: true,
  })
  if (check.error || check.status !== 0) throw Error('Picomatch attack/compatibility tests failed; release blocked.')
  process.stdout.write(check.stdout)

  const audit = spawnSync(process.execPath, [npmCli, 'audit', '--include=dev', '--include=optional', '--include=peer', '--json'], {
    cwd: project, encoding: 'utf8', timeout: 120000, maxBuffer: 10 * 1024 * 1024, windowsHide: true,
  })
  if (audit.error || ![0, 1].includes(audit.status)) throw Error('npm audit could not complete; release blocked.')
  let report
  try { report = JSON.parse(audit.stdout) } catch { throw Error('npm audit returned invalid JSON; release blocked.') }
  if (report?.error) throw Error('npm audit returned an error; release blocked.')

  // Keep the complete npm finding visible, including unapproved advisories.
  console.log(JSON.stringify(report, null, 2))
  // Verify again immediately before the decision; never accept a boolean flag
  // or a package name alone as evidence of installed protection.
  patch.apply(project, true)
  const nodes = new Set(patch.packages(project).map(p => path.relative(project, p.directory).split(path.sep).join('/')))
  const decision = assess(report, nodes)
  if (audit.status === 1 && !Object.keys(report.vulnerabilities).length) throw Error('npm audit failed without reporting findings; release blocked.')
  console.log('Guarded audit decision:', JSON.stringify(decision))
}

try { run() } catch (error) {
  console.error('Security audit blocked:', error.message)
  process.exitCode = 1
}
