'use client';

import { useEffect, useState, useRef } from 'react';
import { Upload, FileText, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { createSupabaseClientWithToken } from '@/lib/supabaseClient';
import { apiRequest } from '@/lib/apiClient';

interface CVUploadProps {
  aleoAddress: string;
  onUploadSuccess?: (filePath: string) => void;
  existingCV?: {
    filePath: string;
    uploadedAt: string;
  } | null;
  forceSeekerRole?: boolean;
}

export function CVUpload({ aleoAddress, onUploadSuccess, existingCV, forceSeekerRole = false }: CVUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [hasUploadedCv, setHasUploadedCv] = useState(Boolean(existingCV));
  const [isEditingExistingCv, setIsEditingExistingCv] = useState(!existingCV);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

  useEffect(() => {
    if (existingCV) {
      setHasUploadedCv(true);
      setIsEditingExistingCv(false);
      return;
    }

    setHasUploadedCv(false);
    setIsEditingExistingCv(true);
  }, [aleoAddress, existingCV?.filePath, existingCV?.uploadedAt]);

  const hasCv = hasUploadedCv || Boolean(existingCV);
  const readOnlyCvState = hasCv && !isEditingExistingCv;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnlyCvState) return;
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(false);

    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)} MB`);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !aleoAddress) return;

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      const client = createSupabaseClientWithToken(aleoAddress);

      let profileId: string;
      const { data: profile, error: profileError } = await client
        .from('profiles')
        .select('id, role')
        .eq('aleo_address', aleoAddress)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        const { data: newProfile, error: createError } = await client
          .from('profiles')
          .insert({
            aleo_address: aleoAddress,
            role: forceSeekerRole ? 'seeker' : null,
            role_locked: forceSeekerRole,
          })
          .select('id')
          .single();

        if (createError || !newProfile) throw createError || new Error('Unable to create profile.');
        profileId = newProfile.id;
      } else if (profileError || !profile) {
        throw profileError || new Error('Unable to load profile.');
      } else {
        if (forceSeekerRole && profile.role && profile.role !== 'seeker') {
          throw new Error('This wallet is role-locked and cannot upload seeker CV.');
        }

        if (forceSeekerRole && profile.role !== 'seeker') {
          const { error: roleUpdateError } = await client
            .from('profiles')
            .update({ role: 'seeker', role_locked: true, updated_at: new Date().toISOString() })
            .eq('id', profile.id);

          if (roleUpdateError) {
            throw roleUpdateError;
          }
        }

        profileId = profile.id;
      }

      const filePath = `user_${aleoAddress}/resume.pdf`;
      const { error: uploadError } = await client.storage
        .from('cvs')
        .upload(filePath, selectedFile, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) {
        if (uploadError.message.includes('bucket not found')) {
          throw new Error('Storage bucket "cvs" not found. Please create it in the Supabase dashboard.');
        }
        throw uploadError;
      }

      const { error: cvDbError } = await client
        .from('cvs')
        .upsert(
          {
            user_id: profileId,
            file_path: filePath,
            file_size: selectedFile.size,
            uploaded_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id',
          }
        );

      if (cvDbError) throw cvDbError;

      try {
        await apiRequest('/api/reputation/recalculate', {
          method: 'POST',
          body: { aleoAddress },
        });
      } catch (reputationError) {
        console.warn('[CVUpload] Reputation refresh failed:', reputationError);
      }

      setSuccess(true);
      setSelectedFile(null);
      setHasUploadedCv(true);
      setIsEditingExistingCv(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (onUploadSuccess) {
        onUploadSuccess(filePath);
      }
    } catch (err: any) {
      console.error('CV upload error:', err);
      setError(err.message || 'Failed to upload CV. Ensure "cvs" bucket exists.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setError(null);
    setSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStartEdit = () => {
    setError(null);
    setSuccess(false);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsEditingExistingCv(true);
  };

  const handleCancelEdit = () => {
    handleRemove();
    setIsEditingExistingCv(false);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="mb-2 text-xl font-bold text-white">{hasCv ? 'Your CV' : 'Upload Your CV'}</h3>
          <p className="text-sm text-slate-400">
            Your CV is required for seeker onboarding and reputation scoring.
          </p>
        </div>
        {hasCv && (
          <Badge variant="success" className="ml-4">
            <CheckCircle2 size={14} className="mr-1" />
            CV Uploaded
          </Badge>
        )}
      </div>

      {hasCv && !success && (
        <div className="mb-4 rounded-lg border border-slate-600 bg-slate-700/50 p-3">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <FileText size={16} />
            <span>
              Last uploaded on {existingCV?.uploadedAt ? new Date(existingCV.uploadedAt).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {readOnlyCvState ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-600 bg-slate-800/50 p-4 text-sm text-slate-300">
              CV already submitted for this wallet. Adding another CV is disabled.
              Use <span className="font-medium text-white">Edit CV</span> to replace it.
            </div>
            <Button variant="outline" onClick={handleStartEdit} className="w-full" type="button">
              Edit CV
            </Button>
          </div>
        ) : (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Select PDF File (Max 5 MB)</label>
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                className="hidden"
                id="cv-upload-input"
                disabled={uploading}
              />
              <label htmlFor="cv-upload-input" className="flex-1 cursor-pointer">
                <div className="rounded-lg border-2 border-dashed border-slate-600 p-6 text-center transition-colors hover:border-purple-500/50">
                  <Upload className="mx-auto mb-2 text-slate-400" size={32} />
                  <p className="text-sm text-slate-300">{selectedFile ? selectedFile.name : 'Click to select PDF file'}</p>
                  <p className="mt-1 text-xs text-slate-500">PDF only, max 5 MB</p>
                </div>
              </label>
            </div>
          </div>
        )}

        {selectedFile && (
          <div className="flex items-center justify-between rounded-lg border border-slate-600 bg-slate-700/50 p-3">
            <div className="flex items-center gap-3">
              <FileText className="text-purple-400" size={20} />
              <div>
                <p className="text-sm font-medium text-white">{selectedFile.name}</p>
                <p className="text-xs text-slate-400">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleRemove} disabled={uploading}>
              <X size={16} />
            </Button>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
            <CheckCircle2 size={16} />
            <span>CV uploaded successfully.</span>
          </div>
        )}

        {!readOnlyCvState && (
          <div className="flex gap-2">
            {hasCv && (
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                disabled={uploading}
                className="w-1/3"
                type="button"
              >
                Cancel
              </Button>
            )}
            <Button
              variant="primary"
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className={hasCv ? 'w-2/3' : 'w-full'}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 animate-spin" size={16} />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={16} className="mr-2" />
                  {hasCv ? 'Save CV Changes' : 'Upload CV'}
                </>
              )}
            </Button>
          </div>
        )}

        <p className="text-center text-xs italic text-slate-500">
          Note: This requires a "cvs" storage bucket in your Supabase project.
        </p>
      </div>
    </Card>
  );
}
