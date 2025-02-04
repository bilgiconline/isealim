'use client'

import { useEffect, useState } from 'react'
import { db, auth } from '@/lib/firebase'
import { collection, query, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore'
import { signInWithEmailAndPassword } from 'firebase/auth'
import FileViewer from '@/components/FileViewer'

interface Application {
  id: string
  fullName: string
  email: string
  phone: string
  position: string
  experience: string
  expectedSalary: string
  availability: string
  otherRequests: string
  status: string
  submittedAt: any
  cvUrl: string
  education: string
  certificates: string
  references: string
  militaryStatus: string
  travelRestriction: boolean
}

export default function AdminPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [selectedCV, setSelectedCV] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0
  })
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await signInWithEmailAndPassword(auth, loginData.email, loginData.password)
      setIsLoggedIn(true)
    } catch (error) {
      alert('Giriş başarısız!')
    }
  }

  useEffect(() => {
    if (!isLoggedIn) return

    const q = query(collection(db, 'applications'), orderBy('submittedAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Application[]
      setApplications(apps)
      setStats({
        total: apps.length,
        pending: apps.filter(app => app.status === 'pending').length,
        accepted: apps.filter(app => app.status === 'accepted').length,
        rejected: apps.filter(app => app.status === 'rejected').length
      })
    })

    return () => unsubscribe()
  }, [isLoggedIn])

  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.experience.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.expectedSalary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.availability.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.otherRequests.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || app.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const docRef = doc(db, 'applications', id)
      await updateDoc(docRef, { status: newStatus })
      setApplications(prevApplications =>
        prevApplications.map(app =>
          app.id === id ? { ...app, status: newStatus } : app
        )
      )
    } catch (error) {
      alert('Durum güncellenirken bir hata oluştu!')
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <form onSubmit={handleLogin} className="mt-8 space-y-6">
            <input type="email"
              placeholder="Email"
              onChange={(e) => setLoginData({...loginData, email: e.target.value})}
              className="appearance-none rounded-none relative block w-full px-3 py-2 border"
            />
            <input type="password"
              placeholder="Şifre"
              onChange={(e) => setLoginData({...loginData, password: e.target.value})}
              className="appearance-none rounded-none relative block w-full px-3 py-2 border"
            />
            <button type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Giriş Yap
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium">Toplam Başvuru</h3>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium">Bekleyen</h3>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium">Kabul Edilen</h3>
            <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium">Reddedilen</h3>
            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Başvurular</h2>
              <div className="mt-4 md:mt-0 flex space-x-4">
                <input
                  type="text"
                  placeholder="Ara..."
                  className="rounded-md border-gray-300"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-md border-gray-300"
                >
                  <option value="all">Tüm Durumlar</option>
                  <option value="pending">Bekleyen</option>
                  <option value="reviewing">İnceleniyor</option>
                  <option value="accepted">Kabul Edildi</option>
                  <option value="rejected">Reddedildi</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Başvuran
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pozisyon
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Maaş Beklentisi
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşe Başlama
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CV
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tarih
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredApplications.map((app) => (
                    <tr 
                      key={app.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedApplication(app)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-900">{app.fullName}</div>
                          <div className="text-sm text-gray-500">{app.email}</div>
                          <div className="text-sm text-gray-500">{app.phone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{app.position}</div>
                        <div className="text-sm text-gray-500 max-w-xs truncate" title={app.experience}>
                          {app.experience}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {app.expectedSalary}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {app.availability}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={app.status}
                          onChange={(e) => updateStatus(app.id, e.target.value)}
                          className={`rounded-full px-3 py-1 text-sm font-semibold ${
                            app.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            app.status === 'reviewing' ? 'bg-blue-100 text-blue-800' :
                            app.status === 'accepted' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}
                        >
                          <option value="pending">Bekleyen</option>
                          <option value="reviewing">İnceleniyor</option>
                          <option value="accepted">Kabul Edildi</option>
                          <option value="rejected">Reddedildi</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {app.cvUrl && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedCV(app.cvUrl)
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            CV'yi Görüntüle
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(app.submittedAt.toDate()).toLocaleDateString('tr-TR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {selectedCV && (
        <FileViewer url={selectedCV} onClose={() => setSelectedCV(null)} />
      )}

      {selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Başvuru Detayları</h3>
              <button onClick={() => setSelectedApplication(null)}>
                <span className="sr-only">Kapat</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Eğitim Bilgileri</dt>
                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selectedApplication.education}</dd>
              </div>
              
              {selectedApplication.certificates && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Sertifikalar ve Kurslar</dt>
                  <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selectedApplication.certificates}</dd>
                </div>
              )}
              
              {selectedApplication.references && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Referanslar</dt>
                  <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selectedApplication.references}</dd>
                </div>
              )}
              
              {selectedApplication.militaryStatus && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Askerlik Durumu</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {selectedApplication.militaryStatus === 'completed' ? 'Yapıldı' :
                     selectedApplication.militaryStatus === 'exempt' ? 'Muaf' :
                     selectedApplication.militaryStatus === 'postponed' ? 'Tecilli' : 'İlgili Değil'}
                  </dd>
                </div>
              )}
              
              <div>
                <dt className="text-sm font-medium text-gray-500">Seyahat Engeli</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {selectedApplication.travelRestriction ? 'Var' : 'Yok'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  )
} 