/**
 * Parse Thoman STR-bestanden: gestrekte lengte + Z/W/Y-stations.
 * Compatible met volledige Thoman .str (Beginn Info-blok).
 */

const NUM = String.raw`-?[\d.]+`
const STRETCHED_RE = /gestre\w+\s+l\w+\s+([\d.]+)/i
const BEND_INFO_FULL_RE = new RegExp(
  String.raw`(\d+):\s+Z\s*=\s*(${NUM})(?:\s+W\s*=\s*(${NUM}))?(?:\s+Y\s*=\s*(${NUM}))?`,
  'i',
)
const BEND_INFO_ZW_RE = new RegExp(
  String.raw`(\d+):\s+Z\s*=\s*(${NUM})\s+W\s*=\s*(${NUM})\s*$`,
  'i',
)
const BEND_INFO_Z_RE = new RegExp(String.raw`(\d+):\s+Z\s*=\s*(${NUM})\s*$`, 'i')
const NC_NAME_RE = /Name=\s*(.+)/i

/**
 * @param {Array<{ z: number }>} steps
 * @param {number|null} stretchedLength
 * @returns {number[]}
 */
export function computeSegmentFeeds(steps, stretchedLength) {
  if (!steps.length) return []
  let base = stretchedLength
  if (base == null) {
    base = Math.max(...steps.map((s) => s.z))
  }
  const feeds = []
  let previousZ = base
  for (const step of steps) {
    feeds.push(Math.round((previousZ - step.z) * 100) / 100)
    previousZ = step.z
  }
  feeds.push(Math.round(previousZ * 100) / 100)
  return feeds
}

function parseInfoLine(trimmed) {
  if (!trimmed || !/^\d/.test(trimmed)) return null

  let match = trimmed.match(BEND_INFO_FULL_RE)
  if (match) {
    return {
      step: Number(match[1]),
      z: Number(match[2]),
      w: match[3] != null ? Number(match[3]) : 0,
      y: match[4] != null ? Number(match[4]) : 0,
    }
  }

  match = trimmed.match(BEND_INFO_ZW_RE)
  if (match) {
    return {
      step: Number(match[1]),
      z: Number(match[2]),
      w: Number(match[3]),
      y: null,
    }
  }

  match = trimmed.match(BEND_INFO_Z_RE)
  if (match) {
    return {
      step: Number(match[1]),
      z: Number(match[2]),
      w: null,
      y: null,
    }
  }

  return null
}

/**
 * @param {string} text
 * @returns {{
 *   name: string,
 *   stretchedLength: number|null,
 *   steps: Array<{ step: number, z: number, w: number|null, y: number|null }>,
 *   feeds: number[],
 *   error?: string
 * }}
 */
export function parseStrFile(text) {
  const raw = String(text ?? '')
  const stretchedMatch = raw.match(STRETCHED_RE)
  let stretchedLength = stretchedMatch ? Number(stretchedMatch[1]) : null

  const stepsByIndex = new Map()
  const hasInfoBlock = /Beginn Info/i.test(raw)
  const lineSource = hasInfoBlock
    ? raw.split('Beginn Info').pop().split('Ende Info')[0]
    : raw

  for (const line of lineSource.split(/\r?\n/)) {
    const parsed = parseInfoLine(line.trim())
    if (parsed) stepsByIndex.set(parsed.step, parsed)
  }

  const steps = [...stepsByIndex.values()].sort((a, b) => a.step - b.step)
  const ncSource = raw.includes('Anfang NC') ? raw.split('Anfang NC').pop() : raw
  const nameMatch = ncSource.match(NC_NAME_RE)
  const feeds = computeSegmentFeeds(steps, stretchedLength)

  if (stretchedLength == null && steps.length) {
    stretchedLength = Math.max(...steps.map((s) => s.z))
  }

  const result = {
    name: nameMatch?.[1]?.trim() || 'STR programma',
    stretchedLength,
    steps,
    feeds,
  }

  if (!steps.length) {
    result.error = 'Geen Z/W/Y-regels gevonden in het STR-bestand.'
  }

  return result
}

/**
 * @param {ReturnType<typeof parseStrFile>} parsed
 */
export function buildAnimationOperations(parsed) {
  const { steps, feeds } = parsed
  const operations = []
  let lastW = 0

  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i]
    const feed = Number(feeds[i]) || 0
    const wAbs = step.w != null ? Number(step.w) : lastW

    if (feed > 0.01) {
      operations.push({
        type: 'feed',
        stepIndex: i,
        step: step.step,
        z: step.z,
        w: wAbs,
        y: step.y,
        feed,
      })
    }

    const wDelta = wAbs - lastW
    if (Math.abs(wDelta) > 0.01) {
      operations.push({
        type: 'roll',
        stepIndex: i,
        step: step.step,
        z: step.z,
        w: wAbs,
        y: step.y,
        wDelta,
      })
      lastW = wAbs
    }

    if (step.y != null && Math.abs(step.y) > 0.01) {
      operations.push({
        type: 'bend',
        stepIndex: i,
        step: step.step,
        z: step.z,
        w: wAbs,
        y: step.y,
        feed,
      })
    }
  }

  const tailFeed = Number(feeds[feeds.length - 1]) || 0
  if (tailFeed > 0.01) {
    const last = steps[steps.length - 1]
    operations.push({
      type: 'feed',
      stepIndex: steps.length - 1,
      step: last?.step ?? 0,
      z: last?.z ?? 0,
      w: last?.w ?? lastW,
      y: null,
      feed: tailFeed,
      tail: true,
    })
  }

  return operations
}
