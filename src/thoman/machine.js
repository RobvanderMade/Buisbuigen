import * as THREE from 'three'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'
import {
  MACHINE_AXES,
  positionFromMachineMm,
  setCarriageFeedPosition,
  setRotationOnAxis,
} from './axisConfig.js'
import { MACHINE_STL_PARTS, CARRIAGE_BASE_OFFSET_MM, TUBE_FEED_OFFSET_MM, BEND_HEAD_OFFSET_MM, BEND_ARM_MOUNT_DEG, STL_BASE_URL } from './machineConfig.js'

/** @param {THREE.Object3D} object @param {[number, number, number]|undefined} rotationDeg */
function applyRotationDeg(object, rotationDeg) {
  if (!rotationDeg) return
  object.rotation.set(
    THREE.MathUtils.degToRad(rotationDeg[0] ?? 0),
    THREE.MathUtils.degToRad(rotationDeg[1] ?? 0),
    THREE.MathUtils.degToRad(rotationDeg[2] ?? 0),
  )
}

const MACHINE_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0x8f97a8,
  metalness: 0.55,
  roughness: 0.42,
})

/**
 * Thoman doornbuigmachine: lengte=-Z (voor→achter), hoogte=Y, dwars=X.
 */
export class Machine {
  constructor(scene) {
    this.scene = scene
    this.root = new THREE.Group()
    this.root.name = 'MachineRoot'
    this.scene.add(this.root)

    this.nodes = {}
    this.stlMeshes = []
    this.carriageBaseMm = [...CARRIAGE_BASE_OFFSET_MM]
    this.stretchedLengthMm = 0
    this.#buildHierarchy()

    this.currentZmm = 0
    this.currentWdeg = 0
    this.currentYdeg = 0
  }

  async loadStlParts(parts = MACHINE_STL_PARTS) {
    const loader = new STLLoader()
    const loaded = []
    const missing = []

    for (const part of parts) {
      const node = this.nodes[part.node]
      if (!node) {
        console.warn(`Onbekende machine-node: ${part.node}`)
        continue
      }

      const url = `${STL_BASE_URL}${part.file}`
      try {
        const geometry = await loader.loadAsync(url)
        geometry.computeVertexNormals()

        const mesh = new THREE.Mesh(geometry, MACHINE_MATERIAL.clone())
        mesh.name = part.file
        mesh.castShadow = true
        mesh.receiveShadow = true

        mesh.scale.setScalar(part.scale ?? 0.001)

        if (part.positionMm) {
          mesh.position.copy(positionFromMachineMm(part.positionMm))
        } else if (part.position) {
          mesh.position.set(...part.position)
        }
        applyRotationDeg(mesh, part.rotationDeg)

        node.add(mesh)
        this.stlMeshes.push(mesh)
        loaded.push(part.file)
      } catch (error) {
        missing.push(part.file)
        console.warn(`STL niet geladen (${part.file}):`, error.message)
      }
    }

    if (loaded.includes('loopwagen.stl') || loaded.includes('buigarm.stl')) {
      this.#alignTubeFeedToLoopwagen()
      this.#alignBendHeadToBore()
    }

    return { loaded, missing }
  }

  /** Buisas op kruispunt-XY; loopwagen beweegt in Z. */
  #alignTubeFeedToLoopwagen() {
    if (!this.nodes.rotatorW) return

    const bore = positionFromMachineMm(BEND_HEAD_OFFSET_MM)
    const tune = positionFromMachineMm(TUBE_FEED_OFFSET_MM)

    this.nodes.rotatorW.position.set(
      bore.x + tune.x,
      bore.y + tune.y,
      bore.z + tune.z,
    )
    this.nodes.tubeFeed.position.set(0, 0, 0)
  }

  /** Buigarm-pivot op kruispunt (Z=0), zelfde XY als buis-boring. */
  #alignBendHeadToBore() {
    if (!this.nodes.bendHead) return
    this.nodes.bendHead.position.copy(positionFromMachineMm(BEND_HEAD_OFFSET_MM))
  }

  /** Gestrekte lengte / zaaglengte-referentie voor startpositie op voorkant loopwagen. */
  setStretchedLengthMm(lengthMm) {
    this.stretchedLengthMm = Math.max(0, Number(lengthMm) || 0)
  }

  /** STR Z = afstand vanaf kruispunt (1275 ver → 680 → 280 dichter bij 0). */
  setZmm(zMm) {
    this.currentZmm = Number(zMm) || 0
    if (this.nodes.carriageZ) {
      setCarriageFeedPosition(this.nodes.carriageZ, this.carriageBaseMm, this.currentZmm)
    }
  }

  /** W: verdraaien rond buisas (scene Z). */
  setWdeg(wDeg) {
    this.currentWdeg = Number(wDeg) || 0
    if (this.nodes.rotatorW) {
      setRotationOnAxis(this.nodes.rotatorW, MACHINE_AXES.roll, this.currentWdeg)
    }
  }

  /** Y-bocht: rotatie om buigmal (machine X = scene Y). */
  setYdeg(yDeg) {
    this.currentYdeg = Number(yDeg) || 0
    if (this.nodes.bendPivot) {
      setRotationOnAxis(this.nodes.bendPivot, MACHINE_AXES.bend, this.currentYdeg)
    }
  }

  resetY() {
    this.setYdeg(0)
  }

  getTubeFeedNode() {
    return this.nodes.tubeFeed
  }

  /** Kruispunt / buigmal — buis vormt zich hier. */
  getBendHeadNode() {
    return this.nodes.bendHead
  }

  getRoot() {
    return this.root
  }

  #buildHierarchy() {
    const frame = new THREE.Group()
    frame.name = 'Frame'

    const carriageZ = new THREE.Group()
    carriageZ.name = 'CarriageZ'

    const rotatorW = new THREE.Group()
    rotatorW.name = 'RotatorW'

    const tubeFeed = new THREE.Group()
    tubeFeed.name = 'TubeFeed'

    const bendHead = new THREE.Group()
    bendHead.name = 'BendHead'

    const bendPivot = new THREE.Group()
    bendPivot.name = 'BendPivot'

    const bendArmMount = new THREE.Group()
    bendArmMount.name = 'BendArmMount'
    applyRotationDeg(bendArmMount, BEND_ARM_MOUNT_DEG)

    bendPivot.add(bendArmMount)
    bendHead.add(bendPivot)

    rotatorW.add(tubeFeed)
    carriageZ.add(rotatorW)
    frame.add(carriageZ, bendHead)
    this.root.add(frame)

    setCarriageFeedPosition(carriageZ, this.carriageBaseMm, 0)

    this.nodes = {
      frame,
      carriageZ,
      rotatorW,
      tubeFeed,
      bendHead,
      bendPivot,
      bendArmMount,
    }
  }
}
