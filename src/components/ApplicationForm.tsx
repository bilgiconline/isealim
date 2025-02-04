'use client'

import { useState } from 'react';
import { db, storage, uploadFileToStorage } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { getDownloadURL } from 'firebase/storage';
import { BASE_PATH } from '@/lib/constants'
import Toast from './Toast';
import { z } from 'zod'

const formSchema = z.object({
  fullName: z.string()
    .min(2, 'İsim en az 2 karakter olmalıdır')
    .regex(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/, 'İsim sadece harflerden oluşmalıdır'),
  
  email: z.string()
    .email('Geçerli bir email adresi giriniz')
    .regex(
      /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/,
      'Geçerli bir email formatı giriniz'
    ),
  
  phone: z.string()
    .regex(
      /^(\+90|0)?\s*([0-9]{3})\s*([0-9]{3})\s*([0-9]{2})\s*([0-9]{2})$/,
      'Geçerli bir telefon numarası giriniz (Örn: 0555 333 22 11)'
    ),
  
  position: z.string()
    .min(2, 'Pozisyon bilgisi gereklidir')
    .max(100, 'Pozisyon bilgisi çok uzun'),
  
  experience: z.string()
    .min(10, 'Lütfen deneyiminizi detaylı açıklayın')
    .max(1000, 'Deneyim açıklaması çok uzun'),
  
  expectedSalary: z.string()
    .min(1, 'Maaş beklentinizi belirtiniz'),
  
  otherRequests: z.string(),
  
  availability: z.string()
    .min(1, 'İşe başlama durumunuzu belirtiniz'),
  
  kvkkApproval: z.boolean()
    .refine(val => val === true, 'KVKK metnini onaylamanız gerekmektedir'),
  
  education: z.string()
    .min(10, 'Eğitim bilgilerinizi detaylı yazınız')
    .max(1000, 'Eğitim bilgileri çok uzun'),
  
  certificates: z.string()
    .optional(),
  
  references: z.string()
    .optional(),
  
  militaryStatus: z.string()
    .optional(),
  
  travelRestriction: z.boolean()
    .default(false),
});

export default function ApplicationForm() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    position: '',
    experience: '',
    expectedSalary: '',
    otherRequests: '',
    availability: '',
    kvkkApproval: false,
    education: '',
    certificates: '',
    references: '',
    militaryStatus: '',
    travelRestriction: false
  });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ show: false, message: '', type: 'info' });
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Sürükle-bırak için state'ler
  const [isDragging, setIsDragging] = useState(false);

  const validateForm = () => {
    try {
      formSchema.parse(formData)
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {}
        error.errors.forEach((err) => {
          if (err.path) {
            newErrors[err.path[0]] = err.message
          }
        })
        setErrors(newErrors)
      }
      return false
    }
  }

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({
      show: true,
      message,
      type
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // CV kontrolü
    if (!cvFile) {
      showToast('Lütfen CV yükleyiniz', 'error');
      return;
    }

    // Form validasyonu
    if (!validateForm()) {
      showToast('Lütfen form alanlarını kontrol ediniz.', 'error');
      return;
    }

    setLoading(true);
    showToast('Başvurunuz işleniyor...', 'info');
    setUploadProgress(0);

    try {
      let cvUrl = '';
      if (cvFile) {
        // Dosya uzantısı kontrolü
        const validTypes = ['.pdf', '.doc', '.docx'];
        const fileExtension = cvFile.name.substring(cvFile.name.lastIndexOf('.')).toLowerCase();
        
        if (!validTypes.includes(fileExtension)) {
          showToast('Lütfen sadece PDF veya Word dosyası yükleyin', 'error');
          return;
        }

        // Dosya boyutu kontrolü
        if (cvFile.size > 10 * 1024 * 1024) {
          showToast('Dosya boyutu 10MB\'dan küçük olmalıdır', 'error');
          return;
        }

        showToast('CV yükleniyor...', 'info');
        const fileName = `${Date.now()}-${cvFile.name}`;
        try {
          const uploadResult = await uploadFileToStorage(cvFile, `cvs/${fileName}`);
          cvUrl = await getDownloadURL(uploadResult.ref);
          showToast('CV başarıyla yüklendi', 'success');
        } catch (error) {
          showToast('CV yüklenirken bir hata oluştu', 'error');
          console.error('CV upload error:', error);
          return;
        }
      }

      showToast('Başvuru kaydediliyor...', 'info');
      await addDoc(collection(db, 'applications'), {
        ...formData,
        cvUrl,
        submittedAt: new Date(),
        status: 'pending',
        expectedSalary: formData.expectedSalary,
        otherRequests: formData.otherRequests,
        availability: formData.availability,
        kvkkApproval: formData.kvkkApproval
      });

      showToast('Başvurunuz başarıyla gönderildi!', 'success');
      
      // Form reset
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        position: '',
        experience: '',
        expectedSalary: '',
        otherRequests: '',
        availability: '',
        kvkkApproval: false,
        education: '',
        certificates: '',
        references: '',
        militaryStatus: '',
        travelRestriction: false
      });
      setCvFile(null);
      setUploadProgress(0);
      if (e.target instanceof HTMLFormElement) {
        e.target.reset();
      }
    } catch (error) {
      console.error('Error:', error);
      showToast(
        'Başvuru gönderilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // Sürükle-bırak olayları için handler'lar
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Dosya tipi kontrolü
      const validTypes = ['.pdf', '.doc', '.docx'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      if (!validTypes.includes(fileExtension)) {
        showToast('Sadece PDF veya Word dosyası yükleyebilirsiniz', 'error');
        return;
      }

      // Dosya boyutu kontrolü
      if (file.size > 10 * 1024 * 1024) {
        showToast('Dosya boyutu 10MB\'dan büyük olamaz', 'error');
        return;
      }

      setCvFile(file);
      showToast(`${file.name} dosyası seçildi`, 'info');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Dosya boyutu kontrolü
      if (file.size > 10 * 1024 * 1024) {
        showToast('Dosya boyutu 10MB\'dan büyük olamaz', 'error');
        return;
      }
      
      // Dosya tipi kontrolü
      const validTypes = ['.pdf', '.doc', '.docx'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      if (!validTypes.includes(fileExtension)) {
        showToast('Sadece PDF veya Word dosyası yükleyebilirsiniz', 'error');
        return;
      }

      setCvFile(file);
      showToast(`${file.name} dosyası seçildi`, 'info');
    }
  };

  // Telefon numarası formatlaması için
  const formatPhoneNumber = (value: string) => {
    // Sadece rakamları al
    const numbers = value.replace(/[^\d]/g, '');
    
    // Formatlama
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return numbers.slice(0, 3) + ' ' + numbers.slice(3);
    if (numbers.length <= 8) return numbers.slice(0, 3) + ' ' + numbers.slice(3, 6) + ' ' + numbers.slice(6);
    return numbers.slice(0, 3) + ' ' + numbers.slice(3, 6) + ' ' + numbers.slice(6, 8) + ' ' + numbers.slice(8, 10);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-6 p-6 bg-white rounded-lg shadow-lg">
        <div className="border-b pb-4 mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Başvuru Formu</h2>
          <p className="mt-1 text-sm text-gray-600">
            Lütfen tüm alanları eksiksiz doldurunuz.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Ad Soyad
          </label>
          <input
            type="text"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            value={formData.fullName}
            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
          />
          {errors['fullName'] && (
            <p className="mt-1 text-sm text-red-600">{errors['fullName']}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
          {errors['email'] && (
            <p className="mt-1 text-sm text-red-600">{errors['email']}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Telefon
          </label>
          <input
            type="tel"
            required
            placeholder="0555 333 22 11"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            value={formData.phone}
            onChange={(e) => {
              const formatted = formatPhoneNumber(e.target.value);
              setFormData({...formData, phone: formatted});
            }}
            maxLength={14} // "0555 333 22 11" formatı için
          />
          {errors['phone'] && (
            <p className="mt-1 text-sm text-red-600">{errors['phone']}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Başvurulan Pozisyon
          </label>
          <input
            type="text"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            value={formData.position}
            onChange={(e) => setFormData({...formData, position: e.target.value})}
          />
          {errors['position'] && (
            <p className="mt-1 text-sm text-red-600">{errors['position']}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Deneyimler ve Nitelikler
          </label>
          <textarea
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            rows={4}
            value={formData.experience}
            onChange={(e) => setFormData({...formData, experience: e.target.value})}
          />
          {errors['experience'] && (
            <p className="mt-1 text-sm text-red-600">{errors['experience']}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Maaş Beklentisi
          </label>
          <input
            type="text"
            required
            placeholder="Aylık beklediğiniz net maaş"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            value={formData.expectedSalary}
            onChange={(e) => setFormData({...formData, expectedSalary: e.target.value})}
          />
          {errors['expectedSalary'] && (
            <p className="mt-1 text-sm text-red-600">{errors['expectedSalary']}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            İşe Başlama Durumu
          </label>
          <input
            type="text"
            required
            placeholder="Ne zaman işe başlayabilirsiniz?"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            value={formData.availability}
            onChange={(e) => setFormData({...formData, availability: e.target.value})}
          />
          {errors['availability'] && (
            <p className="mt-1 text-sm text-red-600">{errors['availability']}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Eğitim Bilgileri
          </label>
          <textarea
            required
            placeholder="Eğitim geçmişinizi yazınız (Okul, bölüm, mezuniyet yılı vb.)"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            rows={4}
            value={formData.education}
            onChange={(e) => setFormData({...formData, education: e.target.value})}
          />
          {errors['education'] && (
            <p className="mt-1 text-sm text-red-600">{errors['education']}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Sertifikalar ve Kurslar
          </label>
          <textarea
            placeholder="Varsa sertifika ve kurslarınızı yazınız"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            rows={3}
            value={formData.certificates}
            onChange={(e) => setFormData({...formData, certificates: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Referanslar
          </label>
          <textarea
            placeholder="Varsa referanslarınızı yazınız (İsim, pozisyon, iletişim bilgileri)"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            rows={3}
            value={formData.references}
            onChange={(e) => setFormData({...formData, references: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Askerlik Durumu
          </label>
          <select
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            value={formData.militaryStatus}
            onChange={(e) => setFormData({...formData, militaryStatus: e.target.value})}
          >
            <option value="">Seçiniz</option>
            <option value="completed">Yapıldı</option>
            <option value="exempt">Muaf</option>
            <option value="postponed">Tecilli</option>
            <option value="notApplicable">İlgili Değil</option>
          </select>
        </div>

        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
              checked={formData.travelRestriction}
              onChange={(e) => setFormData({...formData, travelRestriction: e.target.checked})}
            />
          </div>
          <div className="ml-3">
            <label className="text-sm text-gray-700">
              Seyahat engelim vardır
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Diğer İstekler / Notlar
          </label>
          <textarea
            placeholder="Varsa diğer isteklerinizi belirtiniz"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            rows={3}
            value={formData.otherRequests}
            onChange={(e) => setFormData({...formData, otherRequests: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            CV Yükle (PDF veya Word, max 10MB) <span className="text-red-500">*</span>
          </label>
          <div
            className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors duration-200 ${
              isDragging 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="space-y-1 text-center">
              <svg
                className={`mx-auto h-12 w-12 ${
                  isDragging ? 'text-blue-500' : 'text-gray-400'
                }`}
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                >
                  <span>Dosya Seç</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                  />
                </label>
                <p className="pl-1">veya sürükle bırak</p>
              </div>
              <p className="text-xs text-gray-500">
                PDF veya Word, maksimum 10MB
              </p>
              {cvFile && (
                <p className="text-sm text-green-600">
                  Seçilen dosya: {cvFile.name}
                </p>
              )}
            </div>
          </div>
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="mt-2">
              <div className="bg-blue-100 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 text-center mt-1">
                {uploadProgress}% yüklendi
              </p>
            </div>
          )}
          {!cvFile && (
            <p className="mt-1 text-sm text-red-600">CV yüklemek zorunludur</p>
          )}
        </div>

        <div className="space-y-4 bg-gray-50 p-4 rounded-md">
          <div className="text-sm text-gray-700">
            <h3 className="font-medium mb-2">Kişisel Verilerin Korunması</h3>
            <p className="mb-4">
              6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında, iş başvurunuz için paylaştığınız 
              kişisel verileriniz, değerlendirme sürecinde kullanılmak üzere sistemimizde güvenli bir şekilde 
              saklanacaktır. Verileriniz üçüncü taraflarla paylaşılmayacak ve başvuru değerlendirme süreci 
              dışında kullanılmayacaktır. Detaylı bilgi için{' '}
              <a 
                href="#" 
                className="text-blue-600 hover:text-blue-800"
                onClick={(e) => {
                  e.preventDefault();
                  // KVKK detay modalı açılabilir
                  alert('KVKK metni detayları burada gösterilebilir');
                }}
              >
                KVKK metnini
              </a>
              {' '}inceleyebilirsiniz.
            </p>
          </div>
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="kvkk"
                type="checkbox"
                required
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
                checked={formData.kvkkApproval}
                onChange={(e) => setFormData({...formData, kvkkApproval: e.target.checked})}
              />
            </div>
            <div className="ml-3">
              <label htmlFor="kvkk" className="text-sm text-gray-700">
                Kişisel verilerimin yukarıda belirtilen kapsamda işlenmesini kabul ediyorum
              </label>
            </div>
          </div>
          {errors['kvkkApproval'] && (
            <p className="mt-1 text-sm text-red-600">{errors['kvkkApproval']}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {loading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              İşlem devam ediyor...
            </span>
          ) : (
            'Başvuru Yap'
          )}
        </button>
      </form>

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
    </>
  );
} 