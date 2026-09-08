import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ImageCarousel({
  images,
  linkTo,
  alt = 'Изображение проекта',
  loading = 'lazy',
  imageClassName = 'w-full h-full object-contain',
}) {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!images || images.length === 0) return null

  const nextSlide = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  const prevSlide = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const ImageElement = (
    <img
      src={images[currentIndex]}
      alt={`${alt}, слайд ${currentIndex + 1}`}
      className={imageClassName}
      loading={loading}
      decoding="async"
    />
  )

  return (
    <div className="flex flex-col w-full h-full group bg-transparent">
      {/* Container for Image and Arrows */}
      <div className="relative flex-grow flex items-center justify-center overflow-hidden rounded-xl bg-gray-100/50 dark:bg-[#12121a]/50">
        
        {images.length > 1 && (
          <button
            onClick={prevSlide}
            className="absolute left-2 p-2 rounded-full bg-white/80 dark:bg-black/50 text-gray-800 dark:text-white opacity-0 group-hover:opacity-100 hover:bg-white dark:hover:bg-black transition-all duration-300 z-10 shadow-md hover:scale-110"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <div className="w-full h-full p-2 flex items-center justify-center">
          {linkTo ? (
            <Link to={linkTo} className="block w-full h-full">
              {ImageElement}
            </Link>
          ) : (
            ImageElement
          )}
        </div>

        {images.length > 1 && (
          <button
            onClick={nextSlide}
            className="absolute right-2 p-2 rounded-full bg-white/80 dark:bg-black/50 text-gray-800 dark:text-white opacity-0 group-hover:opacity-100 hover:bg-white dark:hover:bg-black transition-all duration-300 z-10 shadow-md hover:scale-110"
            aria-label="Next image"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
      
      {/* Dots Below Image */}
      {images.length > 1 && (
        <div className="flex justify-center items-center gap-2 mt-3 mb-1 min-h-[12px]">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setCurrentIndex(idx)
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentIndex 
                  ? 'bg-indigo-500 w-6' 
                  : 'bg-gray-300 dark:bg-gray-600 w-2 hover:bg-indigo-400'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
