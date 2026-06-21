import { StoreProvider } from './state/store'
import { PhonePreview } from './components/PhonePreview'
import { Controls } from './components/Controls'

export default function App() {
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
