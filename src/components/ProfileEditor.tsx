'use client';

import { useState, useEffect } from 'react';
import { User, Save, Loader2 } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { createSupabaseClientWithToken } from '@/lib/supabaseClient';
import { apiRequest } from '@/lib/apiClient';

interface ProfileEditorProps {
  aleoAddress: string;
  onUpdate?: () => void;
  requireSeekerFields?: boolean;
}

export function ProfileEditor({ aleoAddress, onUpdate, requireSeekerFields = false }: ProfileEditorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [hasCv, setHasCv] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    skills: [] as string[],
    experienceYears: 0,
    educationLevel: '',
  });
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    if (aleoAddress) {
      void fetchProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aleoAddress]);

  const applyProfileToForm = (data: any | null) => {
    if (!data) {
      setFormData({
        email: '',
        name: '',
        skills: [],
        experienceYears: 0,
        educationLevel: '',
      });
      return;
    }

    setFormData({
      email: data.email || '',
      name: data.name || '',
      skills: data.skills || [],
      experienceYears: data.experience_years || 0,
      educationLevel: data.education_level || '',
    });
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);

      const client = createSupabaseClientWithToken(aleoAddress);

      const { data, error } = await client
        .from('profiles')
        .select(
          `
            id,
            role,
            email,
            name,
            skills,
            experience_years,
            education_level,
            profile_score,
            cvs (
              id
            )
          `
        )
        .eq('aleo_address', aleoAddress)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        setProfile(null);
        setHasCv(false);
        applyProfileToForm(null);
        setIsEditMode(true);
        return;
      }

      setProfile(data);
      setHasCv(Array.isArray(data.cvs) && data.cvs.length > 0);
      applyProfileToForm(data);
      setIsEditMode(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (requireSeekerFields) {
        if (!formData.email.trim()) {
          throw new Error('Email is required for seeker onboarding.');
        }
        if (!formData.educationLevel.trim()) {
          throw new Error('Qualification is required for seeker onboarding.');
        }
        if (formData.experienceYears < 0) {
          throw new Error('Experience cannot be negative.');
        }
      }

      const client = createSupabaseClientWithToken(aleoAddress);

      if (requireSeekerFields && profile?.role && profile.role !== 'seeker') {
        throw new Error('This wallet is role-locked and cannot be updated as seeker.');
      }

      const payload: Record<string, unknown> = {
        aleo_address: aleoAddress,
        email: formData.email.trim() || null,
        name: formData.name.trim() || null,
        skills: formData.skills || [],
        experience_years: formData.experienceYears || 0,
        education_level: formData.educationLevel || null,
        updated_at: new Date().toISOString(),
      };

      if (requireSeekerFields) {
        payload.role = 'seeker';
        payload.role_locked = true;
      }

      const { data, error } = await client
        .from('profiles')
        .upsert(payload, {
          onConflict: 'aleo_address',
        })
        .select('*')
        .single();

      if (error || !data) throw error || new Error('Failed to save profile.');

      setProfile(data);
      applyProfileToForm(data);
      setIsEditMode(false);

      try {
        await apiRequest('/api/reputation/recalculate', {
          method: 'POST',
          body: { aleoAddress },
        });
      } catch (reputationError) {
        console.warn('[ProfileEditor] Reputation refresh failed:', reputationError);
      }

      if (onUpdate) onUpdate();
      alert('Profile updated successfully.');
    } catch (error: any) {
      console.error('Save profile error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const profileExists = Boolean(profile?.id);
  const isEditing = !profileExists || isEditMode;

  const handleStartEdit = () => {
    setNewSkill('');
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    applyProfileToForm(profile);
    setIsEditMode(false);
  };

  const addSkill = () => {
    if (!isEditing) return;
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, newSkill.trim()],
      });
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    if (!isEditing) return;
    setFormData({
      ...formData,
      skills: formData.skills.filter((s: string) => s !== skill),
    });
  };

  const calculateCompleteness = () => {
    let score = 0;
    if (formData.email) score += 20;
    if (formData.name) score += 10;
    if (formData.skills.length > 0) score += 20;
    if (formData.experienceYears >= 0) score += 20;
    if (formData.educationLevel) score += 20;
    if (hasCv) score += 10;
    return Math.min(score, 100);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-purple-400" size={24} />
        </div>
      </Card>
    );
  }

  const completeness = calculateCompleteness();

  return (
    <Card className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="mb-2 text-xl font-bold text-white">Your Profile</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Profile Completeness:</span>
            <Badge variant={completeness >= 80 ? 'success' : completeness >= 50 ? 'info' : 'warning'}>
              {completeness}%
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {profileExists && !isEditing && (
            <Button variant="outline" size="sm" type="button" onClick={handleStartEdit}>
              Edit Profile
            </Button>
          )}
          <User className="text-purple-400" size={24} />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Email {requireSeekerFields ? '(Required)' : '(Optional)'}
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(event) => setFormData({ ...formData, email: event.target.value })}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
            placeholder="you@example.com"
            disabled={!isEditing || saving}
            required={requireSeekerFields}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">Name (Optional)</label>
          <input
            type="text"
            value={formData.name}
            onChange={(event) => setFormData({ ...formData, name: event.target.value })}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
            placeholder="Display name"
            disabled={!isEditing || saving}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Qualification {requireSeekerFields ? '(Required)' : ''}
          </label>
          <select
            value={formData.educationLevel}
            onChange={(event) => setFormData({ ...formData, educationLevel: event.target.value })}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
            disabled={!isEditing || saving}
            required={requireSeekerFields}
          >
            <option value="">Select qualification</option>
            <option value="high_school">High School</option>
            <option value="associate">Associate Degree</option>
            <option value="bachelor">Bachelor Degree</option>
            <option value="master">Master Degree</option>
            <option value="phd">PhD</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">Experience (Years)</label>
          <input
            type="number"
            min="0"
            value={formData.experienceYears}
            onChange={(event) => setFormData({ ...formData, experienceYears: parseInt(event.target.value, 10) || 0 })}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
            placeholder="0"
            disabled={!isEditing || saving}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Skills ({formData.skills.length} / 5+ recommended)
          </label>
          <div className="mb-2 flex gap-2">
            <input
              type="text"
              value={newSkill}
              onChange={(event) => setNewSkill(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addSkill();
                }
              }}
              className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
              placeholder="Add a skill"
              disabled={!isEditing || saving}
            />
            <Button variant="outline" onClick={addSkill} size="sm" type="button" disabled={!isEditing || saving}>
              Add
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {formData.skills.map((skill: string) => (
              <Badge
                key={skill}
                variant="info"
                className={isEditing ? 'cursor-pointer' : ''}
                onClick={isEditing ? () => removeSkill(skill) : undefined}
              >
                {skill} x
              </Badge>
            ))}
          </div>
        </div>

        {isEditing ? (
          <div className="flex gap-2">
            {profileExists && (
              <Button
                variant="outline"
                type="button"
                onClick={handleCancelEdit}
                disabled={saving}
                className="w-1/3"
              >
                Cancel
              </Button>
            )}

            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving}
              className={profileExists ? 'w-2/3' : 'w-full'}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 animate-spin" size={16} />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  {profileExists ? 'Save Profile Changes' : 'Save Profile'}
                </>
              )}
            </Button>
          </div>
        ) : (
          <p className="text-center text-xs italic text-slate-500">
            Profile is saved. Use "Edit Profile" anytime to upgrade your details.
          </p>
        )}
      </div>
    </Card>
  );
}
