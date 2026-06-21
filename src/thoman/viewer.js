import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import {
  buildTubeGridLineGeometry,
  createClearTubeShellMaterial,
  createTubeGridLineMaterial,
} from './tubeGridLines.js'

const BG = 0x050508
const MM_SCALE = 0.001
const AXIS_LENGTH = 1.2

/** @param {string} text @param {string} color */
function createAxisLabel(text, color) {
  const el = document.createElement('div')
  el.textContent = text
  el.style.color = color
  el.style.fontSize = '15px'
  el.style.fontWeight = '700'
  el.style.fontFamily = 'system-ui, sans-serif'
  el.style.pointerEvents = 'none'
  el.style.userSelect = 'none'
  el.style.textShadow = '0 0 6px rgba(0,0,0,0.9)'
  return new CSS2DObject(el)
}

/** Assen + X/Y/Z labels aan de uiteinden. */
function createLabeledAxes(length = AXIS_LENGTH) {
  const group = new THREE.Group()
  group.name = 'LabeledAxes'

  group.add(new THREE.AxesHelper(length))

  const tip = length * 1.08
  // Machine: X=hoogte (scene Y), Y=dwars (scene X), Z=lengte
  const labels = [
    { text: 'Y', color: '#ff5555', position: [tip, 0, 0] },
    { text: 'X', color: '#55ff55', position: [0, tip, 0] },
    { text: 'Z', color: '#5599ff', position: [0, 0, tip] },
  ]

  for (const { text, color, position } of labels) {
    const label = createAxisLabel(text, color)
    label.position.set(...position)
    group.add(label)
  }

  return group
}

/**
 * Three.js viewer: scene, camera, tube/machine layers, raycast voor bochten.
 */
export class Viewer {
  /**
   * @param {HTMLElement} container
   * @param {{ onBendClick?: (feature: object) => void }} callbacks
   */
  constructor(container, callbacks = {}) {
    this.container = container
    this.callbacks = callbacks

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(BG)

    const width = Math.max(320, container.clientWidth || window.innerWidth)
    const height = Math.max(320, container.clientHeight || window.innerHeight)
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 200)
    this.camera.position.set(2.2, 1.6, 2.4)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setSize(width, height)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    container.appendChild(this.renderer.domElement)

    this.labelRenderer = new CSS2DRenderer()
    this.labelRenderer.setSize(width, height)
    this.labelRenderer.domElement.style.position = 'absolute'
    this.labelRenderer.domElement.style.top = '0'
    this.labelRenderer.domElement.style.left = '0'
    this.labelRenderer.domElement.style.pointerEvents = 'none'
    container.appendChild(this.labelRenderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.target.set(0, 0.18, 0)

    this.grid = new THREE.GridHelper(6, 30, 0x334155, 0x1e293b)
    this.scene.add(this.grid)

    this.axes = createLabeledAxes(AXIS_LENGTH)
    this.scene.add(this.axes)

    const ambient = new THREE.AmbientLight(0xffffff, 0.45)
    const key = new THREE.DirectionalLight(0xffffff, 1.15)
    key.position.set(4, 6, 3)
    const fill = new THREE.DirectionalLight(0x88aaff, 0.35)
    fill.position.set(-3, 2, -2)
    this.scene.add(ambient, key, fill)

    this.tubeGroup = new THREE.Group()
    this.tubeGroup.name = 'TubeGroup'
    this.tubeGroup.scale.setScalar(MM_SCALE)
    this.scene.add(this.tubeGroup)

    this.bendMarkers = new THREE.Group()
    this.bendMarkers.name = 'BendMarkers'
    this.bendMarkers.scale.setScalar(MM_SCALE)
    this.scene.add(this.bendMarkers)

    this.tubeAnchor = null
    this.kruispuntNode = null

    this.tubeShellMesh = null
    this.tubeGridLines = null
    this.centerline = null
    this.markerMeshes = []

    this.raycaster = new THREE.Raycaster()
    this.pointer = new THREE.Vector2()

    this.onResize = () => this.#handleResize()
    this.onPointerDown = (event) => this.#handlePointerDown(event)
    window.addEventListener('resize', this.onResize)
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown)

    this.resizeObserver = new ResizeObserver(() => this.#handleResize())
    this.resizeObserver.observe(container)

    this.controls.update()

    this.raf = requestAnimationFrame(() => this.#animate())
    requestAnimationFrame(() => this.#handleResize())
  }

  /** @param {THREE.Object3D} machineRoot */
  attachMachine(machineRoot) {
    this.scene.add(machineRoot)
  }

  /** Assen op kruispunt (buigmal X). */
  setAxesOrigin(anchorNode) {
    if (!anchorNode) return
    this.kruispuntNode = anchorNode

    if (this.axes.parent) {
      this.axes.parent.remove(this.axes)
    }
    anchorNode.add(this.axes)
    this.axes.position.set(0, 0, 0)

    const target = new THREE.Vector3()
    anchorNode.getWorldPosition(target)
    this.controls.target.copy(target)
    this.controls.update()
  }

  getKruispuntTarget() {
    const target = new THREE.Vector3(0, 0.18, 0)
    if (this.kruispuntNode) {
      this.kruispuntNode.getWorldPosition(target)
    }
    return target
  }

  /** Buis op kruispunt (buigmal X); loopwagen beweegt los. */
  attachTubeToMachine(anchorNode) {
    if (!anchorNode) return
    this.tubeAnchor = anchorNode

    if (this.tubeGroup.parent) {
      this.tubeGroup.parent.remove(this.tubeGroup)
    }
    anchorNode.add(this.tubeGroup)
    this.tubeGroup.position.set(0, 0, 0)
    this.tubeGroup.rotation.set(0, 0, 0)

    if (this.bendMarkers.parent) {
      this.bendMarkers.parent.remove(this.bendMarkers)
    }
    anchorNode.add(this.bendMarkers)
    this.bendMarkers.position.set(0, 0, 0)
  }

  /**
   * @param {import('./tubeBuilder.js').TubeBuilder} tubeBuilder
   * @param {number} diameterMm
   */
  updateTube(tubeBuilder, diameterMm) {
    this.#disposeTube()

    try {
      const tubeGeo = tubeBuilder.buildTubeGeometry()
      if (tubeGeo) {
        const radial = tubeGeo.userData.radialSegments ?? 24
        const tubular = tubeGeo.userData.tubularSegments ?? 48
        const shellGeo = tubeGeo.clone()

        this.tubeShellMesh = new THREE.Mesh(shellGeo, createClearTubeShellMaterial())
        this.tubeShellMesh.renderOrder = 1
        this.tubeGroup.add(this.tubeShellMesh)

        const gridGeo = buildTubeGridLineGeometry(tubeGeo, radial, tubular)
        this.tubeGridLines = new THREE.LineSegments(gridGeo, createTubeGridLineMaterial())
        this.tubeGridLines.renderOrder = 2
        this.tubeGroup.add(this.tubeGridLines)
      }
    } catch (error) {
      console.error('TubeGeometry fout:', error)
    }

    const lineGeo = tubeBuilder.buildCenterlineGeometry()
    if (lineGeo) {
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x66ccff,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      })
      this.centerline = new THREE.Line(lineGeo, lineMat)
      this.tubeGroup.add(this.centerline)
    }
  }

  /**
   * @param {object[]} bendFeatures
   * @param {number} diameterMm
   */
  updateBendMarkers(bendFeatures, diameterMm) {
    this.#clearMarkers()
    const r = Math.max(6, diameterMm * 0.35)

    for (const feature of bendFeatures) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(r, 16, 12),
        new THREE.MeshStandardMaterial({
          color: 0xffb347,
          emissive: 0x331a00,
          metalness: 0.25,
          roughness: 0.5,
        }),
      )
      mesh.position.copy(feature.clickPoint)
      mesh.userData.bendFeature = feature
      this.bendMarkers.add(mesh)
      this.markerMeshes.push(mesh)
    }
  }

  /**
   * @param {'machine'|'top'|'side'|'tube'} preset
   * @param {THREE.Box3|null} tubeBox
   */
  setCameraPreset(preset, tubeBox = null) {
    const target = this.getKruispuntTarget()
    let pos

    switch (preset) {
      case 'top':
        pos = new THREE.Vector3(0, 4.5, 0)
        break
      case 'side':
        pos = new THREE.Vector3(4.2, 0.8, 0)
        break
      case 'tube':
        if (tubeBox && !tubeBox.isEmpty()) {
          const c = tubeBox.getCenter(new THREE.Vector3())
          const size = tubeBox.getSize(new THREE.Vector3())
          const d = Math.max(size.x, size.y, size.z, 0.5) * 2.2
          target.copy(c)
          pos = new THREE.Vector3(c.x + d * 0.45, c.y + d * 0.35, c.z - d * 0.5)
        } else {
          pos = new THREE.Vector3(1.2, 1.0, 1.5)
        }
        break
      case 'machine':
      default:
        pos = new THREE.Vector3(1.8, 1.4, 1.8)
        break
    }

    this.camera.position.copy(pos)
    this.controls.target.copy(target)
    this.controls.update()
  }

  /** Bbox van buis in wereldmeters (voor Tube View). */
  getTubeBounds() {
    const box = new THREE.Box3()
    if (this.tubeShellMesh) box.expandByObject(this.tubeShellMesh)
    if (this.tubeGridLines) box.expandByObject(this.tubeGridLines)
    return box
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    window.removeEventListener('resize', this.onResize)
    this.resizeObserver?.disconnect()
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown)
    this.#disposeTube()
    this.#clearMarkers()
    this.controls.dispose()
    this.renderer.dispose()
    if (this.labelRenderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.labelRenderer.domElement)
    }
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement)
    }
  }

  #handleResize() {
    const width = Math.max(320, this.container.clientWidth || window.innerWidth)
    const height = Math.max(320, this.container.clientHeight || window.innerHeight)
    if (width === 0 || height === 0) return
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
    this.labelRenderer.setSize(width, height)
  }

  #handlePointerDown(event) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hits = this.raycaster.intersectObjects(this.markerMeshes, false)
    if (hits.length) {
      this.callbacks.onBendClick?.(hits[0].object.userData.bendFeature)
    }
  }

  #disposeTube() {
    if (this.tubeShellMesh) {
      this.tubeGroup.remove(this.tubeShellMesh)
      this.tubeShellMesh.geometry.dispose()
      this.tubeShellMesh.material.dispose()
      this.tubeShellMesh = null
    }
    if (this.tubeGridLines) {
      this.tubeGroup.remove(this.tubeGridLines)
      this.tubeGridLines.geometry.dispose()
      this.tubeGridLines.material.dispose()
      this.tubeGridLines = null
    }
    if (this.centerline) {
      this.tubeGroup.remove(this.centerline)
      this.centerline.geometry.dispose()
      this.centerline.material.dispose()
      this.centerline = null
    }
  }

  #clearMarkers() {
    for (const mesh of this.markerMeshes) {
      this.bendMarkers.remove(mesh)
      mesh.geometry.dispose()
      mesh.material.dispose()
    }
    this.markerMeshes = []
  }

  #animate() {
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
    this.labelRenderer.render(this.scene, this.camera)
    this.raf = requestAnimationFrame(() => this.#animate())
  }
}
