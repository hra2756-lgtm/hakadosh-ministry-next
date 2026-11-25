const test = require('node:test')
const assert = require('node:assert/strict')
const {assess} = require('./security-audit-policy.cjs')
const nodes = new Set(['node_modules/picomatch'])
const report = (vulnerabilities = {}) => ({auditReportVersion:2, vulnerabilities, metadata:{vulnerabilities:{total:Object.keys(vulnerabilities).length}}})
test('clean audit passes after the old deadline without exceptions', () => assert.equal(assess(report(), nodes).dependencyFindings,0))
test('all moderate and higher findings block, including picomatch', () => {
  for(const severity of ['moderate','high','critical']) assert.throws(() => assess(report({picomatch:{severity}}),nodes), /Unapproved/)
})
test('failed, malformed and incomplete audit reports fail closed', () => {
  for(const r of [{error:{}},{}, {...report(), metadata:{vulnerabilities:{total:1}}}, report({unknown:{severity:'other'}})]) assert.throws(() => assess(r,nodes))
  assert.throws(() => assess(report(),new Set()), /verification/)
})
test('low findings preserve original audit threshold', () => assert.equal(assess(report({other:{severity:'low'}}),nodes).dependencyFindings,0))
