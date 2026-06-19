import { useConfig, useDispatchConfig, QR_STYLES } from '../state/store'

/** Floating tab switcher for the immersive QR treatment. */
export function QrStyleMenu() {
  const state = useConfig()
  const dispatch = useDispatchConfig()
  return (
    <div className="qr-style-menu" role="tablist" aria-label="QR style">
      {QR_STYLES.map((s) => (
        <button
          key={s.id}
          role="tab"
          aria-selected={state.qrStyle === s.id}
          className={`qr-style-tab ${state.qrStyle === s.id ? 'is-active' : ''}`}
          onClick={() => dispatch({ type: 'SET_QR_STYLE', value: s.id })}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}
