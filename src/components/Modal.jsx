import { useEffect, useRef } from 'react'
import { ArrowLeftIcon, CloseIcon } from './Icons'

// Нативный <dialog>: фокус, Esc и блокировка фона — из коробки.
function Modal({ open, title, eyebrow, onClose, onBack, ui, children }) {
  const dialogRef = useRef(null)
  const bodyRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // При переходе внутри модалки (список → проект) начинаем сверху.
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0
  }, [title])

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby="modal-title"
      onClose={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) dialogRef.current.close() }}
    >
      {open && (
        <div className="modal-panel" ref={bodyRef}>
          <header className="modal-head">
            {onBack && (
              <button type="button" className="icon-button" onClick={onBack} aria-label={ui.back}>
                <ArrowLeftIcon size={18} />
              </button>
            )}
            <div className="modal-titles">
              {eyebrow && <p className="modal-eyebrow">{eyebrow}</p>}
              <h2 id="modal-title">{title}</h2>
            </div>
            <button type="button" className="icon-button" onClick={() => dialogRef.current.close()} aria-label={ui.close}>
              <CloseIcon size={18} />
            </button>
          </header>
          <div className="modal-body">{children}</div>
        </div>
      )}
    </dialog>
  )
}

export default Modal
