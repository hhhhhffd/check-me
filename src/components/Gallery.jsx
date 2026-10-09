import { useEffect, useRef, useState } from 'react'

const TEXT = {
  en: { open: (index) => `Open screenshot ${index}`, close: 'Close', prev: 'Previous screenshot', next: 'Next screenshot', alt: (title, index) => `${title} — screenshot ${index}` },
  ru: { open: (index) => `Открыть скриншот ${index}`, close: 'Закрыть', prev: 'Предыдущий скриншот', next: 'Следующий скриншот', alt: (title, index) => `${title} — скриншот ${index}` },
}

function Gallery({ images, title, lang }) {
  const dialogRef = useRef(null)
  const [openIndex, setOpenIndex] = useState(null)
  const text = TEXT[lang]

  useEffect(() => {
    const dialog = dialogRef.current
    if (openIndex !== null && !dialog.open) dialog.showModal()
  }, [openIndex])

  function step(delta) {
    setOpenIndex((index) => (index + delta + images.length) % images.length)
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowRight') step(1)
    else if (event.key === 'ArrowLeft') step(-1)
  }

  return (
    <>
      <ul className="gallery">
        {images.map((src, index) => (
          <li key={src}>
            <button type="button" onClick={() => setOpenIndex(index)} aria-label={text.open(index + 1)}>
              <img src={src} alt="" loading="lazy" width="1280" height="800" />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        className="lightbox"
        onClose={() => setOpenIndex(null)}
        onKeyDown={handleKeyDown}
        onClick={(event) => { if (event.target === event.currentTarget) dialogRef.current.close() }}
      >
        {openIndex !== null && (
          <>
            <img src={images[openIndex]} alt={text.alt(title, openIndex + 1)} width="1280" height="800" />
            <div className="lightbox-bar">
              <button type="button" onClick={() => step(-1)} aria-label={text.prev}>←</button>
              <span>{openIndex + 1} / {images.length}</span>
              <button type="button" onClick={() => step(1)} aria-label={text.next}>→</button>
              <button type="button" className="lightbox-close" onClick={() => dialogRef.current.close()}>{text.close}</button>
            </div>
          </>
        )}
      </dialog>
    </>
  )
}

export default Gallery
