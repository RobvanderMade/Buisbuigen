import { useEffect, useRef } from 'react'
import { ThomanSimApp } from '../thoman/app.js'
import '../thoman/thoman-sim.css'

export function ThomanSimPanel() {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined

    let app: ThomanSimApp | null = null
    try {
      app = new ThomanSimApp(root)
    } catch (error) {
      console.error(error)
      const status = root.querySelector('[data-thoman="statusMessage"]')
      if (status) {
        status.textContent = `Startfout: ${error instanceof Error ? error.message : String(error)}`
        status.classList.add('status-message--error')
      }
    }

    return () => {
      app?.destroy()
    }
  }, [])

  return (
    <div ref={rootRef} className="thoman-sim min-h-0 flex-1">
      <div className="thoman-sim__viewport" data-thoman="viewport" />

      <div className="panel panel--left">
        <h1>Thoman STR</h1>
        <label className="file-open">
          <span className="file-open__label">Open STR</span>
          <input data-thoman="strFile" type="file" accept="*/*" />
        </label>
        <p data-thoman="statusMessage" className="status-message" aria-live="polite" />
        <div className="btn-row">
          <button data-thoman="btnPlay" type="button">
            Play
          </button>
          <button data-thoman="btnPause" type="button">
            Pause
          </button>
          <button data-thoman="btnStop" type="button">
            Stop
          </button>
        </div>
        <div className="btn-row">
          <button data-thoman="btnPrev" type="button">
            Vorige
          </button>
          <button data-thoman="btnNext" type="button">
            Volgende
          </button>
        </div>
        <label className="field">
          Buis Ø (mm)
          <input data-thoman="tubeDiameter" type="number" min="2" step="0.1" defaultValue={32} />
        </label>
        <label className="field">
          Buigradius (mm)
          <input data-thoman="bendRadius" type="number" min="1" step="0.1" defaultValue={50} />
        </label>
        <fieldset className="camera-presets">
          <legend>Camera</legend>
          <button type="button" data-camera="machine">
            Machine View
          </button>
          <button type="button" data-camera="top">
            Top View
          </button>
          <button type="button" data-camera="side">
            Side View
          </button>
          <button type="button" data-camera="tube">
            Tube View
          </button>
        </fieldset>
      </div>

      <div className="panel panel--right">
        <h2>Actuele waarden</h2>
        <p data-thoman="stepLabel" className="step-label">
          Stap — / —
        </p>
        <dl className="values">
          <div>
            <dt>Z</dt>
            <dd data-thoman="valZ">—</dd>
          </div>
          <div>
            <dt>W</dt>
            <dd data-thoman="valW">—</dd>
          </div>
          <div>
            <dt>Y</dt>
            <dd data-thoman="valY">—</dd>
          </div>
        </dl>
        <p data-thoman="phaseLabel" className="phase-label" />
        <p data-thoman="programName" className="hint" />
      </div>

      <div data-thoman="bendPopup" className="bend-popup hidden" role="dialog" aria-modal="true">
        <button
          data-thoman="bendPopupClose"
          type="button"
          className="bend-popup__close"
          aria-label="Sluiten"
        >
          ×
        </button>
        <h3 data-thoman="bendPopupTitle">Bocht</h3>
        <dl className="values">
          <div>
            <dt>Bocht</dt>
            <dd data-thoman="popupStep">—</dd>
          </div>
          <div>
            <dt>Z</dt>
            <dd data-thoman="popupZ">—</dd>
          </div>
          <div>
            <dt>W</dt>
            <dd data-thoman="popupW">—</dd>
          </div>
          <div>
            <dt>Y</dt>
            <dd data-thoman="popupY">—</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
