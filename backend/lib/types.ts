export interface User {
  id: string;
  aleo_address: string;
  role: 'giver' | 'seeker';
  reputation_score: number;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  giver_id: string;
  title: string;
  description: string;
  skills: string[];
  budget: string | null;
  is_active: boolean;
  zk_membership_hash: string;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  job_id: string;
  seeker_id: string;
  encrypted_resume_url: string | null;
  encrypted_cover_letter: string | null;
  zk_application_hash: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}


