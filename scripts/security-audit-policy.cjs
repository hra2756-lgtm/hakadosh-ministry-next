const levels = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 }
// The old advisory was withdrawn. No vulnerability exceptions remain.
function assess(report, verifiedNodes) {
  if (report?.error || report?.auditReportVersion !== 2 || !report.vulnerabilities || typeof report.vulnerabilities !== 'object' || Array.isArray(report.vulnerabilities)) throw Error('Invalid or failed npm audit report.')
  const entries = Object.entries(report.vulnerabilities)
  if (report.metadata?.vulnerabilities?.total !== entries.length) throw Error('Incomplete audit report.')
  if (!(verifiedNodes instanceof Set) || !verifiedNodes.size) throw Error('Installed patch verification is required.')
  for (const [name, finding] of entries) {
    if (!finding || !Object.hasOwn(levels, finding.severity)) throw Error('Unknown vulnerability severity.')
    if (levels[finding.severity] >= levels.moderate) throw Error(`Unapproved security advisory in ${name}.`)
  }
  return { status: 'no-moderate-or-higher-findings', dependencyFindings: 0 }
}
module.exports = { assess }
