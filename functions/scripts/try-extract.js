/* eslint-disable */
// Runs the extraction pipeline locally against real URLs (no Firestore, no limits).
// Usage: npm run build && node scripts/try-extract.js <url> [<url> ...]
// Set ANTHROPIC_API_KEY to enable the AI step; without it, only JSON-LD is used.
const { extractFromUrl } = require('../lib/extract/pipeline')
const { assertPublicHttpUrl } = require('../lib/lib/ssrf')
const { normalizeUrl } = require('../lib/lib/url')

async function main() {
  for (const raw of process.argv.slice(2)) {
    const started = Date.now()
    process.stdout.write(`\n=== ${raw}\n`)
    try {
      const url = normalizeUrl(assertPublicHttpUrl(raw))
      const r = await extractFromUrl(url)
      const j = r.job
      console.log({
        ms: Date.now() - started,
        normalized: url.toString(),
        source: r.sourceName,
        confidence: r.confidence,
        usedAi: r.usedAi,
        title: j.title,
        company: j.company,
        location: j.location,
        workMode: j.workMode,
        employmentType: j.employmentType,
        salary: j.salaryMin || j.salaryMax ? `${j.salaryMin}-${j.salaryMax} ${j.currency}/${j.salaryPeriod}` : null,
        deadline: j.deadline,
        datePosted: j.datePosted,
        tags: j.tags.join(', '),
        description: j.description ? `${j.description.length} chars: ${j.description.slice(0, 140).replace(/\n/g, ' ')}…` : null,
        filledBy: r.filledBy,
      })
    } catch (err) {
      console.log('FAILED:', err.constructor.name, err.reason ?? '', err.status ?? '', err.message)
    }
  }
}

main()
