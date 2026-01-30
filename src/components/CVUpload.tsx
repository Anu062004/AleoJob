'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { supabase, createSupabaseClientWithToken } from '@/lib/supabaseClient';

interface CVUploadProps {
    aleoAddress: string;
    onUploadSuccess?: (filePath: string) => void;
    existingCV?: {
        filePath: string;
        uploadedAt: string;
    } | null;
}

export function CVUpload({ aleoAddress, onUploadSuccess, existingCV }: CVUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setError(null);
        setSuccess(false);

        // Validate file type
        if (file.type !== 'application/pdf') {
            setError('Only PDF files are allowed');
            return;
        }

        // Validate file size
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

            // 1. Ensure profile exists
            let profileId: string;
            const { data: profile, error: profileError } = await client
                .from('profiles')
                .select('id, profile_score')
                .eq('aleo_address', aleoAddress)
                .single();

            if (profileError && profileError.code === 'PGRST116') {
                const { data: newProfile, error: createError } = await client
                    .from('profiles')
                    .insert({
                        aleo_address: aleoAddress,
                        profile_score: 10, // Initial score for just uploading CV
                    })
                    .select('id')
                    .single();
                if (createError) throw createError;
                profileId = newProfile.id;
            } else if (profileError) {
                throw profileError;
            } else {
                profileId = profile.id;

                // Update score if CV wasn't already uploaded
                if (!existingCV) {
                    await client
                        .from('profiles')
                        .update({ profile_score: Math.min((profile.profile_score || 0) + 10, 100) })
                        .eq('id', profileId);
                }
            }

            // 2. Upload to Storage
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

            // 3. Update CV metadata in database
            const { error: cvDbError } = await client
                .from('cvs')
                .upsert({
                    user_id: profileId,
                    file_path: filePath,
                    file_size: selectedFile.size,
                    uploaded_at: new Date().toISOString(),
                }, {
                    onConflict: 'user_id',
                });

            if (cvDbError) throw cvDbError;

            setSuccess(true);
            setSelectedFile(null);
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

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / 1024 / 1024).toFixed(2) + ' MB';
    };

    return (
        <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-xl font-bold text-white mb-2">Upload Your CV</h3>
                    <p className="text-slate-400 text-sm">
                        Your CV is used to verify skills and calculate reputation.
                    </p>
                </div>
                {existingCV && (
                    <Badge variant="success" className="ml-4">
                        <CheckCircle2 size={14} className="mr-1" />
                        CV Uploaded
                    </Badge>
                )}
            </div>

            {existingCV && !success && (
                <div className="mb-4 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                    <div className="flex items-center gap-2 text-slate-300 text-sm">
                        <FileText size={16} />
                        <span>Last uploaded on {new Date(existingCV.uploadedAt).toLocaleDateString()}</span>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Select PDF File (Max 5 MB)
                    </label>
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
                        <label
                            htmlFor="cv-upload-input"
                            className="flex-1 cursor-pointer"
                        >
                            <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-purple-500/50 transition-colors">
                                <Upload className="mx-auto mb-2 text-slate-400" size={32} />
                                <p className="text-slate-300 text-sm">
                                    {selectedFile ? selectedFile.name : 'Click to select PDF file'}
                                </p>
                                <p className="text-slate-500 text-xs mt-1">
                                    PDF only, max 5 MB
                                </p>
                            </div>
                        </label>
                    </div>
                </div>

                {selectedFile && (
                    <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                        <div className="flex items-center gap-3">
                            <FileText className="text-purple-400" size={20} />
                            <div>
                                <p className="text-white text-sm font-medium">{selectedFile.name}</p>
                                <p className="text-slate-400 text-xs">{formatFileSize(selectedFile.size)}</p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRemove}
                            disabled={uploading}
                        >
                            <X size={16} />
                        </Button>
                    </div>
                )}

                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                )}

                {success && (
                    <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
                        <CheckCircle2 size={16} />
                        <span>CV uploaded successfully!</span>
                    </div>
                )}

                <Button
                    variant="primary"
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading}
                    className="w-full"
                >
                    {uploading ? (
                        <>
                            <Loader2 className="animate-spin mr-2" size={16} />
                            Uploading...
                        </>
                    ) : (
                        <>
                            <Upload size={16} className="mr-2" />
                            {existingCV ? 'Replace CV' : 'Upload CV'}
                        </>
                    )}
                </Button>

                <p className="text-slate-500 text-xs text-center italic">
                    Note: This requires a "cvs" storage bucket in your Supabase project.
                </p>
            </div>
        </Card>
    );
}
