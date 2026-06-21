/**

 * Drie STL-onderdelen vormen samen de machine.

 * Plaats de bestanden in: public/assets/stl/

 *

 * Assen — config [hoogte, dwars, lengte] = machine [X, Y, Z] in mm:
 *   machine X (hoogte) → scene Y   machine Y (dwars) → scene X   machine Z → scene -Z

 *

 * rotationDeg = [x, y, z] in graden

 * positionMm  = [hoogte X, dwars Y, lengte Z] in mm

 */

export const MACHINE_STL_PARTS = [

  {

    file: 'frame.stl',

    node: 'frame',

    scale: 0.001,

    rotationDeg: [-90, 0, 0],

  },

  {

    file: 'loopwagen.stl',

    node: 'carriageZ',

    scale: 0.001,

    positionMm: [180, -50, 180],

    rotationDeg: [-90, 0, 0],

  },

  {

    file: 'buigarm.stl',

    node: 'bendArmMount',

    scale: 0.001,

    positionMm: [0, 50, 50],

  },

]



/** Loopwagen basis (mm): [hoogte, dwars, lengte]. */
export const CARRIAGE_BASE_OFFSET_MM = [0, 0, 0]

/** Vaste STL-orientatie; buigmal = machine X (scene Y). */
export const BEND_ARM_MOUNT_DEG = [-90, 0, 0]

/** Buigarm-pivot op kruispunt, zelfde XY als loopwagen-boring. */
export const BEND_HEAD_OFFSET_MM = [180, -50, 0]

/** Fine-tune buisas t.o.v. loopwagen-midden [hoogte, dwars, lengte] mm. */
export const TUBE_FEED_OFFSET_MM = [0, 0, 0]



export const STL_BASE_URL = `${import.meta.env.BASE_URL}assets/stl/`

