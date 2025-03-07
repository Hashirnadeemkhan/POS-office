"use client"

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { getImage,getImageIdFromUrl } from '@/lib/imageStorage'
import { ImageIcon } from 'lucide-react'

interface LocalImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  fill?: boolean
  className?: string
}

export default function LocalImage({ src, alt, width, height, fill = false, className = '' }: LocalImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function loadImage() {
      setIsLoading(true)
      setError(false)
      
      // If it's not a local image URL, use it directly
      if (!src.startsWith('local-image://')) {
        setImageSrc(src)
        setIsLoading(false)
        return
      }
      
      // Get the image ID from the URL
      const imageId = getImageIdFromUrl(src)
      
      if (!imageId) {
        setError(true)
        setIsLoading(false)
        return
      }
      
      // Get the image from IndexedDB
      try {
        const imageUrl = await getImage(imageId)
        setImageSrc(imageUrl)
      } catch (err) {
        console.error('Error loading image:', err)
        setError(true)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadImage()
    
    // Clean up object URL when component unmounts
    return () => {
      if (imageSrc && imageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc)
      }
    }
  }, [src])

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`} style={{ width, height }}>
        <div className="animate-pulse">
          <ImageIcon className="h-6 w-6 text-gray-400" />
        </div>
      </div>
    )
  }

  if (error || !imageSrc) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`} style={{ width, height }}>
        <ImageIcon className="h-6 w-6 text-gray-400" />
      </div>
    )
  }

  if (fill) {
    return (
      <div className={`relative ${className}`} style={{ width: '100%', height: '100%' }}>
        <Image 
          src={imageSrc || "/placeholder.svg"} 
          alt={alt} 
          fill 
          className={`object-cover ${className}`}
        />
      </div>
    )
  }

  return (
    <Image 
      src={imageSrc || "/placeholder.svg"} 
      alt={alt} 
      width={width || 100} 
      height={height || 100} 
      className={className}
    />
  )
}

