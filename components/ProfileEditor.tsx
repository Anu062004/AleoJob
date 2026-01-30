'use client';

import { useState, useEffect } from 'react';
import { User, Save, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { supabase, createSupabaseClientWithToken } from '@/lib/supabaseClient';

interface ProfileEditorProps {
  aleoAddress: string;
  onUpdate?: () => void;
}

export function ProfileEditor({ aleoAddress, onUpdate }: ProfileEditorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    skills: [] as string[],
    experienceYears: 0,
    educationLevel: '',
  });
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    if (aleoAddress) {
      fetchProfile();
    }
  }, [aleoAddress]);

  const fetchProfile = async () => {
    try {
      setLoading(true);

      const client = createSupabaseClientWithToken(aleoAddress);

      const { data, error } = await client
        .from('profiles')
        .select(`
          *,
          cv:cvs(id, file_path, uploaded_at)
        `)
        .eq('aleo_address', aleoAddress)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist
        setProfile(null);
      } else if (error) {
        throw error;
      } else {
        setProfile(data);
        setFormData({
          name: data.name || '',
          skills: data.skills || [],
          experienceYears: data.experience_years || 0,
          educationLevel: data.education_level || '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateScore = (data: any, hasCV: boolean) => {
    let score = 0;
    if (data.educationLevel) score += 20;
    if (data.skills.length >= 5) score += 20;
    if (data.experienceYears >= 2) score += 30;
    if (hasCV) score += 10;
    // Note: projects verified can be added later
    return Math.min(score, 100);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const client = createSupabaseClientWithToken(aleoAddress);

      const score = calculateScore(formData, !!profile?.cv);

      const { data, error } = await client
        .from('profiles')
        .upsert({
          aleo_address: aleoAddress,
          name: formData.name || null,
          skills: formData.skills || [],
          experience_years: formData.experienceYears || 0,
          education_level: formData.educationLevel || null,
          profile_score: score,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'aleo_address',
        })
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      if (onUpdate) onUpdate();
      alert('Profile updated successfully!');
    } catch (error: any) {
      console.error('Save profile error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, newSkill.trim()],
      });
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((s) => s !== skill),
    });
  };

  const calculateCompleteness = () => {
    let score = 0;
    if (formData.name) score += 20;
    if (formData.skills.length > 0) score += 20;
    if (formData.experienceYears > 0) score += 20;
    if (formData.educationLevel) score += 20;
    if (profile?.cv) score += 20;
    return score;
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white mb-2">Your Profile</h3>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm">Profile Completeness:</span>
            <Badge variant={completeness >= 80 ? 'success' : completeness >= 50 ? 'info' : 'warning'}>
              {completeness}%
            </Badge>
          </div>
        </div>
        <User className="text-purple-400" size={24} />
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Name (Optional)
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
            placeholder="Your name (optional)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Skills ({formData.skills.length} / 5+ recommended)
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addSkill()}
              className="flex-1 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              placeholder="Add a skill (e.g., React, TypeScript)"
            />
            <Button variant="outline" onClick={addSkill} size="sm">
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.skills.map((skill) => (
              <Badge key={skill} variant="info" className="cursor-pointer" onClick={() => removeSkill(skill)}>
                {skill} ×
              </Badge>
            ))}
          </div>
          {formData.skills.length < 5 && (
            <p className="text-slate-500 text-xs mt-2">
              Add at least 5 skills to boost your reputation score
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Experience (Years)
          </label>
          <input
            type="number"
            min="0"
            value={formData.experienceYears}
            onChange={(e) => setFormData({ ...formData, experienceYears: parseInt(e.target.value) || 0 })}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
            placeholder="0"
          />
          {formData.experienceYears >= 2 && (
            <p className="text-green-400 text-xs mt-1">✓ 2+ years experience adds to reputation</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Education Level
          </label>
          <select
            value={formData.educationLevel}
            onChange={(e) => setFormData({ ...formData, educationLevel: e.target.value })}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
          >
            <option value="">Select education level</option>
            <option value="high_school">High School</option>
            <option value="associate">Associate Degree</option>
            <option value="bachelor">Bachelor's Degree</option>
            <option value="master">Master's Degree</option>
            <option value="phd">PhD</option>
            <option value="other">Other</option>
          </select>
        </div>

        <Button
          variant="primary"
          onClick={handleSave}
          disabled={saving}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="animate-spin mr-2" size={16} />
              Saving...
            </>
          ) : (
            <>
              <Save size={16} className="mr-2" />
              Save Profile
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

