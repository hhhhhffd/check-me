import { useEffect, useLayoutEffect, useRef } from 'react'
import { ArrowLeftIcon, CloseIcon } from './Icons'

// Нативный <dialog>: фокус, Esc и блокировка фона — из коробки.
function Modal({ open, title, eyebrow, onClose, onBack, ui, children }) {
  const dialogRef = useRef(null)
  const bodyRef = useRef(null)
  const titleRef = useRef(null)

  // Layout-эффект: диалог открывается и закрывается в том же коммите, что и рендер.
  // Это нужно View Transition в App — снимок «после» должен уже видеть диалог открытым или закрытым.
  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // При открытии и переходе внутри модалки (список → проект) начинаем сверху и ставим фокус
  // на заголовок: так скринридер читает, куда попали, а на крестике не висит кольцо фокуса.
  useEffect(() => {
    if (!open) return
    if (bodyRef.current) bodyRef.current.scrollTop = 0
    titleRef.current?.focus()
  }, [open, title])

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby="modal-title"
      onClose={onClose}
      // Esc, крестик и клик по фону не закрывают диалог сами, а просят App:
      // тот закрывает его внутри анимации «панель → плитка».
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}
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
              <h2 id="modal-title" ref={titleRef} tabIndex={-1}>{title}</h2>
            </div>
            <button type="button" className="icon-button" onClick={onClose} aria-label={ui.close}>
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
