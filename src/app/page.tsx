import ApplicationForm from '@/components/ApplicationForm'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Alya-Doruk Ortaklık  İş Başvuru Formu
          </h1>
          <p className="mt-3 text-xl text-gray-500 sm:mt-4">
             Mimari Proje Sayısallaştırma Başvuru Formu
          </p>
        </div>
        <div className="mt-12">
          <ApplicationForm />
        </div>
      </div>
    </main>
  )
} 
