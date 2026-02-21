import { redirect } from 'next/navigation';

// Redirects legacy login route to the unified login page
export default function JobSeekerLoginLegacy() {
  redirect('/login?role=seeker');
}
