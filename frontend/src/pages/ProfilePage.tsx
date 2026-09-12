import React, { useEffect, useState, useRef } from 'react';
import { Camera, Edit2, Check, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { authApi } from '../services/api';
import { Spinner } from '../components/UI';

export default function ProfilePage() {
  const { currentUser, refreshUser } = useAuth();
  const { language, setLanguage } = useLanguage();
  const gu = language === 'gu';
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(currentUser?.name ?? '');
  const [phone, setPhone] = useState(currentUser?.phone ?? '');
  const [profilePhoto, setProfilePhoto] = useState(currentUser?.profilePhoto ?? '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Password change
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  // Worker profile
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [yearsOfWork, setYearsOfWork] = useState('');
  const [saltProduction, setSaltProduction] = useState('');
  const [workerSaving, setWorkerSaving] = useState(false);
  const [workerLoaded, setWorkerLoaded] = useState(false);

  useEffect(() => {
    if (currentUser?.role === 'worker') {
      authApi.getWorkerProfile().then(res => {
        if (res.data) {
          setVillage(res.data.village ?? '');
          setDistrict(res.data.district ?? '');
          setYearsOfWork(String(res.data.yearsOfWork ?? ''));
          setSaltProduction(String(res.data.saltProductionTonnesPerSeason ?? ''));
        }
        setWorkerLoaded(true);
      }).catch(() => setWorkerLoaded(true));
    }
  }, [currentUser]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError(gu ? 'ĺ. 2MB ĺ.' : 'Photo must be less than 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setProfilePhoto(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(''); setSuccess('');
    try {
      await authApi.updateProfile({ name, phone: phone || undefined, profilePhoto: profilePhoto || undefined, language });
      await refreshUser();
      setSuccess(gu ? 'ĺ.' : 'Profile saved successfully.');
    } catch (e: any) {
      setError(e.message ?? (gu ? 'ĺ.' : 'Failed to save profile.'));
    } finally {
      setSaving(false);
    }
  }

  async function saveWorkerProfile(e: React.FormEvent) {
    e.preventDefault();
    setWorkerSaving(true);
    try {
      await authApi.updateWorkerProfile({
        village: village || undefined,
        district: district || undefined,
        yearsOfWork: yearsOfWork ? parseInt(yearsOfWork) : undefined,
        saltProductionTonnesPerSeason: saltProduction ? parseFloat(saltProduction) : undefined,
      });
      setSuccess(gu ? 'ĺ.' : 'Worker profile updated.');
    } finally {
      setWorkerSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(''); setPwSuccess('');
    if (newPw !== confirmPw) { setPwError(gu ? 'ĺ.' : 'Passwords do not match.'); return; }
    if (newPw.length < 6) { setPwError(gu ? 'ĺ. 6 ĺ.' : 'Password must be at least 6 characters.'); return; }
    setPwSaving(true);
    try {
      await authApi.changePassword(currentPw, newPw);
      setPwSuccess(gu ? 'ĺ.' : 'Password changed successfully.');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (e: any) {
      setPwError(e.message ?? (gu ? 'ĺ.' : 'Failed to change password.'));
    } finally {
      setPwSaving(false);
    }
  }

  if (!currentUser) return <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <p className="section-label mb-0.5">{gu ? 'ĺ.' : 'Account'}</p>
        <h1 className="text-2xl font-bold text-charcoal-900">{gu ? 'ĺ.' : 'My Profile'}</h1>
      </div>

      {/* Profile photo + basic info */}
      <div className="card">
        <h2 className="text-base font-semibold text-charcoal-900 mb-4">{gu ? 'ĺ.' : 'Profile Photo & Basic Info'}</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-eucalyptus-100 flex items-center justify-center">
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-eucalyptus-600">{currentUser.name?.[0]?.toUpperCase()}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 w-7 h-7 bg-eucalyptus-700 text-white rounded-full flex items-center justify-center hover:bg-eucalyptus-800 transition-colors"
              >
                <Camera size={13} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>
            <div>
              <p className="font-semibold text-charcoal-900">{currentUser.name}</p>
              <p className="text-sm text-charcoal-500">{currentUser.email}</p>
              <span className="badge badge-active text-xs mt-1">{currentUser.role}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">{gu ? 'ĺ.' : 'Full Name'} *</label>
              <input className="input" required value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="label">{gu ? 'ĺ.' : 'Phone Number'}</label>
              <input className="input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="label">{gu ? 'ĺ.' : 'Preferred Language'}</label>
            <div className="flex gap-3">
              {(['en', 'gu'] as const).map(lang => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-all ${language === lang ? 'border-eucalyptus-500 bg-eucalyptus-50 text-eucalyptus-700' : 'border-charcoal-100 text-charcoal-600 hover:border-eucalyptus-200'}`}
                >
                  {lang === 'en' ? 'English' : 'ગુજરાતી'}
                  {language === lang && <Check size={12} className="inline ml-1" />}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-eucalyptus-600 flex items-center gap-1"><Check size={14} /> {success}</p>}

          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? (gu ? 'ĺ.' : 'Saving…') : (gu ? 'ĺ.' : 'Save Profile')}
          </button>
        </form>
      </div>

      {/* Worker profile */}
      {currentUser.role === 'worker' && workerLoaded && (
        <div className="card">
          <h2 className="text-base font-semibold text-charcoal-900 mb-4">{gu ? 'ĺ.' : 'Salt Worker Details'}</h2>
          <form onSubmit={saveWorkerProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">{gu ? 'ĺ.' : 'Village'}</label>
                <input className="input" placeholder="e.g. Bajana" value={village} onChange={e => setVillage(e.target.value)} />
              </div>
              <div>
                <label className="label">{gu ? 'ĺ.' : 'District'}</label>
                <input className="input" placeholder="e.g. Surendranagar" value={district} onChange={e => setDistrict(e.target.value)} />
              </div>
              <div>
                <label className="label">{gu ? 'ĺ.' : 'Years of Salt Work'}</label>
                <input className="input" type="number" min="0" value={yearsOfWork} onChange={e => setYearsOfWork(e.target.value)} />
              </div>
              <div>
                <label className="label">{gu ? 'ĺ.' : 'Production (tonnes/season)'}</label>
                <input className="input" type="number" min="0" step="0.1" value={saltProduction} onChange={e => setSaltProduction(e.target.value)} />
              </div>
            </div>
            <button type="submit" disabled={workerSaving} className="btn-primary">
              {workerSaving ? (gu ? 'ĺ.' : 'Saving…') : (gu ? 'ĺ.' : 'Save Worker Details')}
            </button>
          </form>
        </div>
      )}

      {/* Password */}
      <div className="card">
        <h2 className="text-base font-semibold text-charcoal-900 mb-4 flex items-center gap-2">
          <Lock size={16} className="text-charcoal-400" />
          {gu ? 'ĺ.' : 'Change Password'}
        </h2>
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className="label">{gu ? 'ĺ.' : 'Current Password'} *</label>
            <input className="input" type="password" required value={currentPw} onChange={e => setCurrentPw(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{gu ? 'ĺ.' : 'New Password'} *</label>
              <input className="input" type="password" required minLength={6} value={newPw} onChange={e => setNewPw(e.target.value)} />
            </div>
            <div>
              <label className="label">{gu ? 'ĺ.' : 'Confirm Password'} *</label>
              <input className="input" type="password" required value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
            </div>
          </div>
          {pwError && <p className="text-sm text-red-600 flex items-center gap-1"><AlertCircle size={14} /> {pwError}</p>}
          {pwSuccess && <p className="text-sm text-eucalyptus-600 flex items-center gap-1"><Check size={14} /> {pwSuccess}</p>}
          <button type="submit" disabled={pwSaving} className="btn-primary">
            {pwSaving ? (gu ? 'ĺ.' : 'Updating…') : (gu ? 'ĺ.' : 'Change Password')}
          </button>
        </form>
      </div>

      {/* Account info */}
      <div className="card bg-charcoal-50 border-charcoal-100">
        <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wide mb-2">{gu ? 'ĺ.' : 'Account Info'}</p>
        <div className="space-y-1 text-sm text-charcoal-600">
          <p>{gu ? 'ĺ.' : 'Email'}: <strong>{currentUser.email}</strong></p>
          <p>{gu ? 'ĺ.' : 'Role'}: <strong className="capitalize">{currentUser.role}</strong></p>
          <p>{gu ? 'ĺ.' : 'Member since'}: <strong>{new Date(currentUser.createdAt).toLocaleDateString('en-IN')}</strong></p>
        </div>
      </div>
    </div>
  );
}
