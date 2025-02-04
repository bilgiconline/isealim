'use client'

import { useEffect, useState } from 'react'

interface FileViewerProps {
  url: string
  onClose: () => void
}

export default function FileViewer({ url, onClose }: FileViewerProps) {
  // URL'den dosya adını çıkar
  const fileName = url.split('/').pop()?.split('?')[0] || 'CV';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium">
            {fileName}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">Kapat</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 p-4">
          <iframe
            src={url}
            className="w-full h-full rounded border"
            title="CV Görüntüleyici"
          />
        </div>
        <div className="p-4 border-t flex justify-end">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800"
          >
            Yeni Sekmede Aç
          </a>
        </div>
      </div>
    </div>
  )
} 