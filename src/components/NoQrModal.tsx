interface NoQrModalProps {
  onProceed: () => void
  onBack: () => void
}

export function NoQrModal({ onProceed, onBack }: NoQrModalProps) {
  return (
    <div className="modal-overlay" onPointerDown={onBack}>
      <div className="modal" onPointerDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="modal-title">No link added</h3>
        <p className="modal-body">
          There’s no QR code in this wallpaper. Add a link first, or export the plain shader
          wallpaper without a QR.
        </p>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onBack}>
            Go back
          </button>
          <button className="btn-solid" onClick={onProceed}>
            Proceed
          </button>
        </div>
      </div>
    </div>
  )
}
