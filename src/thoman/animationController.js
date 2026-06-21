/**
 * CNC: loopwagen Z → feed → W → Y. Buis vormt op kruispunt (buigmal X).
 */
export class AnimationController {
  constructor(deps) {
    this.machine = deps.machine
    this.tubeBuilder = deps.tubeBuilder
    this.viewer = deps.viewer
    this.operations = deps.operations ?? []
    this.steps = deps.steps ?? []
    this.onStepChange = deps.onStepChange ?? (() => {})
    this.stepDurationMs = deps.stepDurationMs ?? 700

    this.operationIndex = -1
    this.playing = false
    this.timer = null

    this.displayZ = 0
    this.displayW = 0
    this.displayY = 0
    this.stretchedLength = 0
  }

  loadProgram(parsed, operations) {
    this.operations = operations
    this.steps = parsed.steps
    this.stretchedLength = parsed.stretchedLength ?? 0
    this.machine.setStretchedLengthMm(this.stretchedLength)
    this.pause()
    this.operationIndex = -1
    this.#showGestrekteStock()
    this.#emitState()
  }

  /** Gestrekte buis op kruispunt; loopwagen op verste Z. */
  #showGestrekteStock() {
    this.displayZ = this.stretchedLength
    this.displayW = 0
    this.displayY = 0
    this.machine.setZmm(this.displayZ)
    this.machine.setWdeg(0)
    this.machine.resetY()
    this.tubeBuilder.buildClampedStock(this.stretchedLength)
    this.viewer.updateTube(this.tubeBuilder, this.tubeBuilder.diameterMm)
    this.viewer.updateBendMarkers([], this.tubeBuilder.diameterMm)
    const tubeBox = this.viewer.getTubeBounds()
    if (!tubeBox.isEmpty()) {
      this.viewer.setCameraPreset('tube', tubeBox)
    }
  }

  play() {
    if (!this.operations.length) return
    this.pause()
    this.playing = true
    if (this.operationIndex >= this.operations.length - 1) {
      this.operationIndex = -1
    }
    this.#scheduleNext(120)
  }

  pause() {
    this.playing = false
    if (this.timer != null) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  stop() {
    this.pause()
    this.operationIndex = -1
    this.#showGestrekteStock()
    this.#emitState()
  }

  nextStep() {
    this.pause()
    if (this.operationIndex >= this.operations.length - 1) return
    this.#runOperation(this.operationIndex + 1)
  }

  previousStep() {
    this.pause()
    this.#rebuildToOperation(Math.max(-1, this.operationIndex - 1))
  }

  #runOperation(index) {
    if (index < 0 || index >= this.operations.length) return

    const op = this.operations[index]
    this.operationIndex = index

    this.displayZ = op.z ?? this.displayZ
    this.machine.setZmm(this.displayZ)

    if (op.type === 'roll' || op.type === 'bend' || op.w != null) {
      this.displayW = op.w ?? this.displayW
      this.machine.setWdeg(this.displayW)
    }

    if (op.type === 'bend') {
      this.displayY = op.y ?? 0
      this.machine.setYdeg(this.displayY)
    } else {
      this.machine.resetY()
      this.displayY = 0
    }

    this.tubeBuilder.rebuildThroughOperations(this.operations, index + 1, {
      stretchedLength: this.stretchedLength,
      clampZ: this.displayZ,
    })
    this.viewer.updateTube(this.tubeBuilder, this.tubeBuilder.diameterMm)
    this.viewer.updateBendMarkers(this.tubeBuilder.getBendFeatures(), this.tubeBuilder.diameterMm)
    this.#emitState(op)
  }

  #rebuildToOperation(targetIndex) {
    this.operationIndex = targetIndex
    if (targetIndex < 0) {
      this.stop()
      return
    }

    const op = this.operations[targetIndex]
    this.displayZ = op.z ?? 0
    this.displayW = op.w ?? 0
    this.displayY = op.type === 'bend' ? op.y ?? 0 : 0

    this.machine.setZmm(this.displayZ)
    this.machine.setWdeg(this.displayW)
    this.machine.setYdeg(this.displayY)
    if (op.type !== 'bend') this.machine.resetY()

    this.tubeBuilder.rebuildThroughOperations(this.operations, targetIndex + 1, {
      stretchedLength: this.stretchedLength,
      clampZ: this.displayZ,
    })
    this.viewer.updateTube(this.tubeBuilder, this.tubeBuilder.diameterMm)
    this.viewer.updateBendMarkers(this.tubeBuilder.getBendFeatures(), this.tubeBuilder.diameterMm)
    this.#emitState(op)
  }

  #scheduleNext(delayMs) {
    if (!this.playing) return
    this.timer = setTimeout(() => {
      const next = this.operationIndex + 1
      if (next >= this.operations.length) {
        this.pause()
        return
      }
      this.#runOperation(next)
      this.#scheduleNext(this.stepDurationMs)
    }, delayMs)
  }

  #emitState(op = null) {
    const currentOp = op ?? (this.operationIndex >= 0 ? this.operations[this.operationIndex] : null)
    this.onStepChange({
      operationIndex: this.operationIndex,
      operationTotal: this.operations.length,
      stepNumber: currentOp?.step ?? 0,
      stepIndex: currentOp?.stepIndex ?? 0,
      stepTotal: this.steps.length,
      z: this.displayZ,
      w: this.displayW,
      y: this.displayY,
      phase: currentOp?.type ?? 'idle',
      playing: this.playing,
    })
  }
}
