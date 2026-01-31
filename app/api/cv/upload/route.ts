// API Route: Upload CV to Supabase Storage
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const aleoAddress = formData.get('aleoAddress') as string;

    if (!file || !aleoAddress) {
      return NextResponse.json(
        { error: 'File and aleoAddress are required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (5 MB max)
    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File size must be less than ${MAX_SIZE / (1024 * 1024)} MB` },
        { status: 400 }
      );
    }

    // Convert file to buffer for hash calculation
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Calculate file hash
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

    // File path: user_<aleo_address>/resume.pdf
    const filePath = `user_${aleoAddress}/resume.pdf`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('cvs')
      .upload(filePath, buffer, {
        contentType: 'application/pdf',
        upsert: true, // Replace if exists
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file to storage', details: uploadError.message },
        { status: 500 }
      );
    }

    // Get or create profile
    let { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('aleo_address', aleoAddress)
      .single();

    if (profileError && profileError.code === 'PGRST116') {
      // Profile doesn't exist, create it
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('profiles')
        .insert({
          aleo_address: aleoAddress,
          profile_score: 0,
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        return NextResponse.json(
          { error: 'Failed to create profile', details: createError.message },
          { status: 500 }
        );
      }
      profile = newProfile;
    } else if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch profile', details: profileError.message },
        { status: 500 }
      );
    }

    // Upsert CV record
    const { data: cvData, error: cvError } = await supabaseAdmin
      .from('cvs')
      .upsert({
        user_id: profile.id,
        file_path: filePath,
        file_hash: fileHash,
        file_size: file.size,
        uploaded_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (cvError) {
      console.error('Error saving CV record:', cvError);
      return NextResponse.json(
        { error: 'Failed to save CV record', details: cvError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'CV uploaded successfully',
      filePath: uploadData.path,
      fileHash,
      cvId: cvData.id,
    });
  } catch (error: any) {
    console.error('CV upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload CV', message: error.message },
      { status: 500 }
    );
  }
}






