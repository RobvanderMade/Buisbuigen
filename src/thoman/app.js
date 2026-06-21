import { parseStrFile, buildAnimationOperations } from './strParser.js'
import { TubeBuilder } from './tubeBuilder.js'
import { Machine } from './machine.js'
import { Viewer } from './viewer.js'
import { AnimationController } from './animationController.js'

/**
 * Thoman STR-simulatie — mount in een DOM-container (geen aparte pagina).
 */
export class ThomanSimApp {
  /** @param {HTMLElement} root */
  constructor(root) {
    if (!root) throw new Error('ThomanSimApp: root element ontbreekt')
    this.root = root
    this.parsed = null
    this.operations = []

    const viewport = this.#el('viewport')
    if (!viewport) throw new Error('ThomanSimApp: viewport ontbreekt')

    this.tubeBuilder = new TubeBuilder({ diameterMm: 32, bendRadiusMm: 50 })
    this.viewer = new Viewer(viewport, {
      onBendClick: (feature) => this.#showBendPopup(feature),
    })
    this.machine = new Machine(this.viewer.scene)
    this.viewer.attachMachine(this.machine.getRoot())
    this.viewer.attachTubeToMachine(this.machine.getBendHeadNode())

    this.animation = new AnimationController({
      machine: this.machine,
      tubeBuilder: this.tubeBuilder,
      viewer: this.viewer,
      operations: [],
      steps: [],
      onStepChange: (state) => this.#updateUi(state),
    })

    this.#bindUi()
    void this.#loadMachineModel()
    void this.#loadDemoProgram()
  }

  /** @param {string} name */
  #el(name) {
    return this.root.querySelector(`[data-thoman="${name}"]`)
  }

  destroy() {
    this.animation?.pause()
    this.viewer?.destroy()
  }

  async #loadMachineModel() {
    const { loaded, missing } = await this.machine.loadStlParts()
    if (loaded.length) {
      this.#setStatus(`Machine STL: ${loaded.join(', ')}`)
      this.viewer.setAxesOrigin(this.machine.getBendHeadNode())
      this.viewer.attachTubeToMachine(this.machine.getBendHeadNode())
      this.viewer.setCameraPreset('machine')
    } else {
      this.#setStatus(
        'Plaats STL-bestanden in public/assets/stl/: frame.stl, loopwagen.stl, buigarm.stl',
        true,
      )
    }
    if (missing.length && loaded.length) {
      console.warn('Ontbrekende STL:', missing.join(', '))
    }
  }

  async #loadDemoProgram() {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}demo.str`)
      if (!res.ok) return
      const text = await res.text()
      this.parsed = parseStrFile(text)
      this.operations = buildAnimationOperations(this.parsed)
      const programName = this.#el('programName')
      if (programName) {
        programName.textContent = `${this.parsed.name} · ${this.parsed.steps.length} bochten (demo)`
      }
      this.animation.loadProgram(this.parsed, this.operations)
      this.#setStatus(`Demo geladen (${this.parsed.steps.length} bochten)`)
    } catch (error) {
      console.warn('Demo STR niet geladen:', error)
    }
  }

  #bindUi() {
    const fileInput = this.#el('strFile')
    if (!fileInput) throw new Error('ThomanSimApp: strFile ontbreekt')

    fileInput.addEventListener('change', (event) => {
      const file = event.target.files?.[0]
      if (file) void this.#loadStrFile(file)
      event.target.value = ''
    })

    this.#el('btnPlay')?.addEventListener('click', () => this.animation.play())
    this.#el('btnPause')?.addEventListener('click', () => this.animation.pause())
    this.#el('btnStop')?.addEventListener('click', () => this.animation.stop())
    this.#el('btnPrev')?.addEventListener('click', () => this.animation.previousStep())
    this.#el('btnNext')?.addEventListener('click', () => this.animation.nextStep())

    this.#el('tubeDiameter')?.addEventListener('change', (event) => {
      const value = Number(event.target.value) || 32
      this.tubeBuilder.setDiameterMm(value)
      this.viewer.updateTube(this.tubeBuilder, value)
      this.viewer.updateBendMarkers(this.tubeBuilder.getBendFeatures(), value)
    })

    this.#el('bendRadius')?.addEventListener('change', (event) => {
      this.tubeBuilder.setBendRadiusMm(Number(event.target.value) || 50)
      if (this.parsed) this.#reloadProgram()
    })

    this.root.querySelectorAll('[data-camera]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = btn.getAttribute('data-camera')
        const tubeBox = this.viewer.getTubeBounds()
        this.viewer.setCameraPreset(preset, tubeBox)
      })
    })

    this.#el('bendPopupClose')?.addEventListener('click', () => {
      this.#el('bendPopup')?.classList.add('hidden')
    })
  }

  /** @param {File} file */
  async #loadStrFile(file) {
    this.#setStatus(`Laden: ${file.name}…`)
    try {
      const text = await this.#readStrText(file)
      this.parsed = parseStrFile(text)

      if (this.parsed.error) {
        this.#setStatus(this.parsed.error, true)
        return
      }

      this.operations = buildAnimationOperations(this.parsed)
      if (!this.operations.length) {
        this.#setStatus('Geen bewerkingen gevonden in dit STR-bestand.', true)
        return
      }

      const programName = this.#el('programName')
      if (programName) {
        programName.textContent = `${this.parsed.name} · ${this.parsed.steps.length} bochten`
      }
      this.#reloadProgram()
      this.#setStatus(
        `Geladen: ${file.name} (${this.parsed.steps.length} bochten, ${this.operations.length} stappen)`,
      )
    } catch (error) {
      console.error('STR laden mislukt:', error)
      this.#setStatus(`Fout bij laden: ${error.message || String(error)}`, true)
    }
  }

  async #readStrText(file) {
    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let text = ''
    for (let i = 0; i < bytes.length; i += 1) {
      text += String.fromCharCode(bytes[i])
    }
    return text
  }

  #setStatus(message, isError = false) {
    const el = this.#el('statusMessage')
    if (!el) return
    el.textContent = message
    el.classList.toggle('status-message--error', isError)
    el.classList.toggle('status-message--ok', !isError && Boolean(message))
  }

  #reloadProgram() {
    if (!this.parsed) return
    this.operations = buildAnimationOperations(this.parsed)
    this.animation.loadProgram(this.parsed, this.operations)
  }

  #updateUi(state) {
    const stepLabel = this.#el('stepLabel')
    const opNum = state.operationIndex + 1
    const opTotal = state.operationTotal

    if (stepLabel) {
      if (state.operationIndex < 0) {
        stepLabel.textContent = `Stap — / ${state.stepTotal || '—'}`
      } else {
        stepLabel.textContent = `Stap ${state.stepNumber} / ${state.stepTotal} · bewerking ${opNum}/${opTotal}`
      }
    }

    const valZ = this.#el('valZ')
    const valW = this.#el('valW')
    const valY = this.#el('valY')
    if (valZ) {
      valZ.textContent =
        state.z != null && state.operationIndex >= 0 ? Number(state.z).toFixed(2) : '—'
    }
    if (valW) {
      valW.textContent =
        state.w != null && state.operationIndex >= 0 ? Number(state.w).toFixed(2) : '—'
    }
    if (valY) {
      valY.textContent =
        state.y != null && state.operationIndex >= 0 ? Number(state.y).toFixed(2) : '—'
    }

    const phaseNames = {
      feed: 'Invoer Z',
      roll: 'Verdraaien W',
      bend: 'Bocht Y',
      idle: '',
    }
    const phaseLabel = this.#el('phaseLabel')
    if (phaseLabel) phaseLabel.textContent = phaseNames[state.phase] ?? ''
  }

  #showBendPopup(feature) {
    if (!feature) return
    const title = this.#el('bendPopupTitle')
    if (title) title.textContent = `Bocht ${feature.step}`
    const popupStep = this.#el('popupStep')
    const popupZ = this.#el('popupZ')
    const popupW = this.#el('popupW')
    const popupY = this.#el('popupY')
    if (popupStep) popupStep.textContent = String(feature.step)
    if (popupZ) popupZ.textContent = Number(feature.z).toFixed(2)
    if (popupW) popupW.textContent = Number(feature.w).toFixed(2)
    if (popupY) popupY.textContent = Number(feature.y).toFixed(2)
    this.#el('bendPopup')?.classList.remove('hidden')
  }
}
