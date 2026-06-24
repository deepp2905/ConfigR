import { StoreProvider } from './state/store'
import { PhonePreview } from './components/PhonePreview'
import { Controls } from './components/Controls'
import { isWebGL2Supported } from './lib/webgl'

export default function App() {
  // The whole tool depends on WebGL2 shader rendering. If it's unavailable, show a message
  // rather than a broken (blank-white) preview.
  if (!isWebGL2Supported()) {
    return (
      <div className="app unsupported">
        <div className="unsupported-card">
          <div className="brand-mark" aria-hidden />
          <h1>Not supported on this device yet</h1>
          <p>
            ConfigR needs WebGL2 to render its backgrounds, which isn’t available in this
            browser right now. We’re working on it — meanwhile, try enabling hardware
            acceleration or opening ConfigR in a different browser.
          </p>
        </div>
      </div>
    )
  }

  return (
    <StoreProvider>
      <div className="app">
        <main className="app-main">
          <PhonePreview />
          <Controls />
        </main>
      </div>
    </StoreProvider>
  )
}
