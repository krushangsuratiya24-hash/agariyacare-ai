import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../context/authStore';
import { userService } from '../../services/userService';
import { WorkerProfile, BuyerProfile } from '../../types';
import { Alert, Spinner } from '../ui/index';
import toast from 'react-hot-toast';

export const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { user, updateUser } = useAuthStore();
  const [profile, setProfile] = useState<WorkerProfile | BuyerProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // User fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone]       = useState('');
  const [langPref, setLangPref] = useState<'en' | 'gu'>('en');

  // Worker fields
  const [village, setVillage]             = useState('');
  const [district, setDistrict]           = useState('');
  const [yearsExp, setYearsExp]           = useState('');
  const [saltPanArea, setSaltPanArea]     = useState('');
  const [saltType, setSaltType]           = useState('');
  const [annualProd, setAnnualProd]       = useState('');
  const [coopMember, setCoopMember]       = useState(false);
  const [coopName, setCoopName]           = useState('');
  const [workerBio, setWorkerBio]         = useState('');

  // Buyer fields
  const [companyName, setCompanyName]     = useState('');
  const [businessType, setBusinessType]   = useState('');
  const [location, setLocation]           = useState('');
  const [city, setCity]                   = useState('');
  const [state, setState]                 = useState('');
  const [prefSaltType, setPrefSaltType]   = useState('');
  const [monthlyDemand, setMonthlyDemand] = useState('');
  const [buyerBio, setBuyerBio]           = useState('');

  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setPhone(user.phone || '');
      setLangPref(user.language_pref);
    }
    loadProfile();
  }, [user?.id]);

  const loadProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const res = await userService.getProfile();
      if (res.success && res.data) {
        setProfile(res.data.profile);
        if (res.data.user.role === 'AGARIYA_WORKER' && res.data.profile) {
          const wp = res.data.profile as WorkerProfile;
          setVillage(wp.village || '');
          setDistrict(wp.district || '');
          setYearsExp(wp.years_experience?.toString() || '');
          setSaltPanArea(wp.salt_pan_area_acres?.toString() || '');
          setSaltType(wp.salt_type || '');
          setAnnualProd(wp.annual_production_kg?.toString() || '');
          setCoopMember(wp.cooperative_member || false);
          setCoopName(wp.cooperative_name || '');
          setWorkerBio(wp.bio || '');
        } else if (res.data.user.role === 'BUYER' && res.data.profile) {
          const bp = res.data.profile as BuyerProfile;
          setCompanyName(bp.company_name || '');
          setBusinessType(bp.business_type || '');
          setLocation(bp.location || '');
          setCity(bp.city || '');
          setState(bp.state || '');
          setPrefSaltType(bp.preferred_salt_type || '');
          setMonthlyDemand(bp.monthly_demand_kg?.toString() || '');
          setBuyerBio(bp.bio || '');
        }
      }
    } catch { /* silent */ }
    finally { setIsLoadingProfile(false); }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const res = await userService.uploadAvatar(file);
      if (res.success && res.data) {
        updateUser({ avatar_url: res.data.avatar_url });
        toast.success(t('profile.avatarUpdated'));
      }
    } catch {
      toast.error('Failed to upload photo');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    setSaveError(null);
    setIsSaving(true);
    try {
      // Save base user fields
      const userRes = await userService.updateProfile({
        full_name: fullName,
        phone: phone || undefined,
        language_pref: langPref,
      });
      if (userRes.success && userRes.data) {
        updateUser(userRes.data.user);
      }

      // Save role-specific profile
      if (user?.role === 'AGARIYA_WORKER') {
        await userService.updateWorkerProfile({
          village: village || undefined,
          district: district || undefined,
          years_experience: yearsExp ? parseInt(yearsExp) : undefined,
          salt_pan_area_acres: saltPanArea ? parseFloat(saltPanArea) : undefined,
          salt_type: saltType || undefined,
          annual_production_kg: annualProd ? parseInt(annualProd) : undefined,
          cooperative_member: coopMember,
          cooperative_name: coopName || undefined,
          bio: workerBio || undefined,
        } as Partial<WorkerProfile>);
      } else if (user?.role === 'BUYER') {
        await userService.updateBuyerProfile({
          company_name: companyName || undefined,
          business_type: businessType || undefined,
          location: location || undefined,
          city: city || undefined,
          state: state || undefined,
          preferred_salt_type: prefSaltType || undefined,
          monthly_demand_kg: monthlyDemand ? parseInt(monthlyDemand) : undefined,
          bio: buyerBio || undefined,
        } as Partial<BuyerProfile>);
      }

      toast.success(t('profile.saved'));
      setIsEditing(false);
      loadProfile();
    } catch {
      setSaveError('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  const avatarSrc = user.avatar_url || null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal-900">{t('profile.title')}</h1>
          <p className="text-sm text-charcoal-500 mt-0.5">{t(`auth.roles.${user.role}`)}</p>
        </div>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="btn-secondary btn-sm">
            {t('profile.editProfile')}
          </button>
        )}
      </div>

      {/* Avatar section */}
      <div className="card card-body mb-4">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-eucalyptus-100 flex items-center justify-center">
              {avatarSrc ? (
                <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-semibold text-eucalyptus-600">
                  {user.full_name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {isUploadingAvatar && (
              <div className="absolute inset-0 rounded-2xl bg-black/30 flex items-center justify-center">
                <Spinner size="sm" className="text-white" />
              </div>
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-charcoal-900">{user.full_name}</h2>
            <p className="text-sm text-charcoal-500">{user.email}</p>
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="text-xs text-eucalyptus-700 hover:underline mt-1"
              disabled={isUploadingAvatar}
            >
              {t(avatarSrc ? 'profile.changePhoto' : 'profile.uploadPhoto')}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleAvatarChange}
            />
          </div>
        </div>
      </div>

      {saveError && (
        <div className="mb-4">
          <Alert type="error" message={saveError} onClose={() => setSaveError(null)} />
        </div>
      )}

      {/* Base profile */}
      <div className="card card-body mb-4">
        <h3 className="section-title mb-4">Personal Information</h3>
        <div className="space-y-4">
          <div>
            <label className="label">{t('profile.name')}</label>
            {isEditing ? (
              <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            ) : (
              <p className="text-sm text-charcoal-800 py-2">{user.full_name}</p>
            )}
          </div>
          <div>
            <label className="label">{t('profile.email')}</label>
            <p className="text-sm text-charcoal-500 py-2">{user.email}</p>
          </div>
          <div>
            <label className="label">{t('profile.phone')}</label>
            {isEditing ? (
              <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            ) : (
              <p className="text-sm text-charcoal-800 py-2">{user.phone || '—'}</p>
            )}
          </div>
          <div>
            <label className="label">{t('profile.language')}</label>
            {isEditing ? (
              <select
                className="input"
                value={langPref}
                onChange={(e) => setLangPref(e.target.value as 'en' | 'gu')}
              >
                <option value="en">{t('profile.languages.en')}</option>
                <option value="gu">{t('profile.languages.gu')}</option>
              </select>
            ) : (
              <p className="text-sm text-charcoal-800 py-2">{t(`profile.languages.${user.language_pref}`)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Role-specific profile */}
      {!isLoadingProfile && (
        <>
          {user.role === 'AGARIYA_WORKER' && (
            <div className="card card-body mb-4">
              <h3 className="section-title mb-4">{t('profile.worker.title')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={t('profile.worker.village')} value={village} editing={isEditing} onChange={setVillage} />
                <Field label={t('profile.worker.district')} value={district} editing={isEditing} onChange={setDistrict} />
                <Field label={t('profile.worker.yearsExperience')} value={yearsExp} type="number" editing={isEditing} onChange={setYearsExp} />
                <Field label={t('profile.worker.saltPanArea')} value={saltPanArea} type="number" editing={isEditing} onChange={setSaltPanArea} />
                <Field label={t('profile.worker.saltType')} value={saltType} editing={isEditing} onChange={setSaltType} />
                <Field label={t('profile.worker.annualProduction')} value={annualProd} type="number" editing={isEditing} onChange={setAnnualProd} />
              </div>
              {isEditing && (
                <div className="mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={coopMember}
                      onChange={(e) => setCoopMember(e.target.checked)}
                      className="w-4 h-4 rounded border-ivory-300 text-eucalyptus-600 focus:ring-eucalyptus-400"
                    />
                    <span className="text-sm text-charcoal-700">{t('profile.worker.cooperativeMember')}</span>
                  </label>
                  {coopMember && (
                    <input
                      className="input mt-2"
                      placeholder={t('profile.worker.cooperativeName')}
                      value={coopName}
                      onChange={(e) => setCoopName(e.target.value)}
                    />
                  )}
                </div>
              )}
              {!isEditing && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label={t('profile.worker.cooperativeMember')} value={profile && (profile as WorkerProfile).cooperative_member ? 'Yes' : 'No'} editing={false} onChange={() => {}} />
                  {(profile as WorkerProfile)?.cooperative_name && (
                    <Field label={t('profile.worker.cooperativeName')} value={(profile as WorkerProfile).cooperative_name || ''} editing={false} onChange={() => {}} />
                  )}
                </div>
              )}
              <div className="mt-4">
                <label className="label">{t('profile.worker.bio')}</label>
                {isEditing ? (
                  <textarea
                    className="input min-h-[80px] resize-none"
                    value={workerBio}
                    onChange={(e) => setWorkerBio(e.target.value)}
                    rows={3}
                  />
                ) : (
                  <p className="text-sm text-charcoal-700 py-2">{workerBio || '—'}</p>
                )}
              </div>
            </div>
          )}

          {user.role === 'BUYER' && (
            <div className="card card-body mb-4">
              <h3 className="section-title mb-4">{t('profile.buyer.title')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={t('profile.buyer.companyName')} value={companyName} editing={isEditing} onChange={setCompanyName} />
                <Field label={t('profile.buyer.businessType')} value={businessType} editing={isEditing} onChange={setBusinessType} />
                <Field label={t('profile.buyer.city')} value={city} editing={isEditing} onChange={setCity} />
                <Field label={t('profile.buyer.state')} value={state} editing={isEditing} onChange={setState} />
                <Field label={t('profile.buyer.preferredSaltType')} value={prefSaltType} editing={isEditing} onChange={setPrefSaltType} />
                <Field label={t('profile.buyer.monthlyDemand')} value={monthlyDemand} type="number" editing={isEditing} onChange={setMonthlyDemand} />
              </div>
              <div className="mt-4">
                <label className="label">{t('profile.buyer.bio')}</label>
                {isEditing ? (
                  <textarea
                    className="input min-h-[80px] resize-none"
                    value={buyerBio}
                    onChange={(e) => setBuyerBio(e.target.value)}
                    rows={3}
                  />
                ) : (
                  <p className="text-sm text-charcoal-700 py-2">{buyerBio || '—'}</p>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Save/cancel buttons */}
      {isEditing && (
        <div className="flex gap-2 justify-end mb-8">
          <button onClick={() => { setIsEditing(false); loadProfile(); }} className="btn-secondary btn-md">
            {t('profile.cancel')}
          </button>
          <button onClick={handleSave} className="btn-primary btn-md" disabled={isSaving}>
            {isSaving ? <Spinner size="sm" /> : t('profile.saveChanges')}
          </button>
        </div>
      )}
    </div>
  );
};

// Small helper component
const Field: React.FC<{
  label: string;
  value: string;
  editing: boolean;
  type?: string;
  onChange: (v: string) => void;
}> = ({ label, value, editing, type = 'text', onChange }) => (
  <div>
    <label className="label">{label}</label>
    {editing ? (
      <input className="input" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    ) : (
      <p className="text-sm text-charcoal-800 py-2">{value || '—'}</p>
    )}
  </div>
);
