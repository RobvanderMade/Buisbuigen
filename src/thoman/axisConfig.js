import * as THREE from 'three'

/**
 * Machine ↔ Three.js (Y-up).
 *
 * Kruispunt assen = (0,0,0). STR Z = afstand vanaf 0 naar achter (−Z).
 * Voorbeeld: 1275 → 680 → 280 (eerst ver, dan dichter bij 0).
 *
 * Config [hoogte, dwars, lengte] = machine [X, Y, Z] in mm:
 *   hoogte (X) → scene Y   machine Y (dwars) → scene X   machine Z → scene −Z
 *
 * Buigmal = machine X-as → scene Y (BEND_ARM_AXIS).
 * W-roll: om buisas (tangent). Y-bocht: om buigmal X (scene Y).
 */
export const LENGTH_SIGN = -1

export const MACHINE_AXES = {
  length: 'z',
  height: 'y',
  width: 'x',
  tubeDirection: new THREE.Vector3(0, 0, LENGTH_SIGN),
  roll: 'z',
  /** Y-bocht: rotatie om buigmal (machine X = scene Y). */
  bend: 'y',
}

/** Buigmal-as: machine X → scene Y. */
export const BEND_ARM_AXIS = new THREE.Vector3(0, 1, 0)

/** Vaste buigkant in XZ-vlak (machine Y–Z / scene X–Z) bij start langs −Z. */
export const BEND_OUTWARD = new THREE.Vector3(1, 0, 0)

const MM = 0.001

/** Afstand (mm) vanaf kruispunt → scene Z; achter = negatief. */
export function sceneLengthMm(lengthMm) {
  return lengthMm * MM * LENGTH_SIGN
}

/** positionMm / offset: [hoogte, dwars, lengte] in mm */
export function positionFromMachineMm([height = 0, width = 0, length = 0]) {
  return new THREE.Vector3(width * MM, height * MM, sceneLengthMm(length))
}

/** Loopwagen: STR Z-waarde (mm) = afstand vanaf kruispunt naar achter. */
export function setCarriageFeedPosition(node, baseMm, zMm) {
  const lengthMm = (baseMm[2] ?? 0) + (Number(zMm) || 0)
  node.position.set(
    (baseMm[1] ?? 0) * MM,
    (baseMm[0] ?? 0) * MM,
    sceneLengthMm(lengthMm),
  )
}

/** Zet rotatie op één as (graden); andere assen op 0. */
export function setRotationOnAxis(node, axis, degrees) {
  const r = THREE.MathUtils.degToRad(degrees)
  node.rotation.set(0, 0, 0)
  if (axis === 'x') node.rotation.x = r
  else if (axis === 'y') node.rotation.y = r
  else node.rotation.z = r
}
