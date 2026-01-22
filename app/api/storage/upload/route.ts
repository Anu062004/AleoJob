// API Route: Upload Encrypted File to Supabase Storage
// POST /api/storage/upload

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bucket = formData.get('bucket') as string; // 'resumes' or 'cover_letters'
    const aleoAddress = formData.get('aleoAddress') as string;

    if (!file || !bucket || !aleoAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: file, bucket, aleoAddress' },
        { status: 400 }
      );
    }

    if (!['resumes', 'cover_letters'].includes(bucket)) {
      return NextResponse.json(
        { error: 'Invalid bucket. Must be "resumes" or "cover_letters"' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop() || 'bin';
    const fileName = `${aleoAddress}/${timestamp}-${randomString}.${fileExtension}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading file:', error);
      return NextResponse.json(
        { error: 'Failed to upload file', details: error.message },
        { status: 500 }
      );
    }

    // Get public URL (or signed URL for private files)
    const { data: urlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: fileName,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file', message: error.message },
      { status: 500 }
    );
  }
}

