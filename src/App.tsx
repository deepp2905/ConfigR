import { StoreProvider } from './state/store'
import { PhonePreview } from './components/PhonePreview'
import { Controls } from './components/Controls'
import { QrStyleMenu } from './components/QrStyleMenu'

export default function App() {
  return (
    <StoreProvider>
      <div className="app">
        <header className="app-header">
          <div className="brand">
            <span className="brand-mark" aria-hidden />
            <span className="brand-name">ConfigR</span>
          </div>
          <p className="tagline">QR wallpapers for Config attendees</p>
        </header>

        <main className="app-main">
          <PhonePreview />
          <Controls />
        </main>
      </div>
      <QrStyleMenu />
    </StoreProvider>
  )
}
