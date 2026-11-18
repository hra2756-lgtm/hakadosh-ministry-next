// Owner-approved temporary exception, conditional on verified patched code.
// Scope, expiry, and removal procedure: docs/picomatch-mitigation.md.
const ADVISORY = 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf'
const EXPIRES = '2026-11-25T06:00:00Z' // End of November 24 in Mexico City.
const levels = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 }

function assess(report, verifiedNodes, now = new Date()) {
  if (!(now instanceof Date) || !Number.isFinite(+now) || +now >= Date.parse(EXPIRES)) {
    throw Error('Temporary exception expired; upstream fix and patch review required.')
  }
  if (report?.error || report?.auditReportVersion !== 2 || !report.vulnerabilities || typeof report.vulnerabilities !== 'object' || Array.isArray(report.vulnerabilities)) {
    throw Error('Invalid or failed npm audit report.')
  }
  const vulnerabilities = report.vulnerabilities
  const entries = Object.entries(vulnerabilities)
  if (report.metadata?.vulnerabilities?.total !== entries.length) throw Error('Incomplete audit report.')
  if (!(verifiedNodes instanceof Set) || verifiedNodes.size === 0) throw Error('Installed patch verification is required.')

  function origins(name, seen = new Set()) {
    // npm can report cyclic dependency chains. A cycle without any real advisory
    // is rejected below; a chain reaching this advisory is still inspected.
    if (seen.has(name)) return []
    if (!Object.hasOwn(vulnerabilities, name)) throw Error('Incomplete advisory dependency chain.')
    const finding = vulnerabilities[name]
    if (!finding || !Array.isArray(finding.via) || finding.via.length === 0) throw Error('Incomplete advisory dependency chain.')
    const next = new Set([...seen, name])
    return finding.via.flatMap(via => {
      if (typeof via === 'string') return origins(via, next)
      if (!via || typeof via !== 'object' || typeof via.url !== 'string') throw Error('Malformed advisory.')
      return [{ owner: name, advisory: via }]
    })
  }

  const accepted = []
  for (const [name, finding] of entries) {
    if (!finding || !Object.hasOwn(levels, finding.severity)) throw Error('Unknown vulnerability severity.')
    // Preserve the previous npm audit --audit-level=moderate threshold.
    if (levels[finding.severity] < levels.moderate) continue
    const roots = origins(name)
    if (roots.length === 0) throw Error('Unresolved advisory dependency cycle.')
    for (const { owner, advisory } of roots) {
      if (owner !== 'picomatch' || advisory.name !== 'picomatch' || advisory.dependency !== 'picomatch' || advisory.url !== ADVISORY || advisory.severity !== 'high' || advisory.range !== '<=4.0.7') {
        throw Error(`Unapproved security advisory in ${name}.`)
      }
      const nodes = vulnerabilities[owner].nodes
      if (!Array.isArray(nodes) || nodes.length === 0 || nodes.some(node => !verifiedNodes.has(node))) {
        throw Error('An affected copy lacks verified protection.')
      }
    }
    accepted.push(name)
  }
  return {
    status: accepted.length ? 'mitigated-with-explicit-temporary-exception' : 'no-moderate-or-higher-findings',
    advisory: ADVISORY,
    dependencyFindings: accepted.length,
    expires: EXPIRES,
  }
}

module.exports = { assess, ADVISORY, EXPIRES }
