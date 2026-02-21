import { redirect } from 'next/navigation';

// Redirects legacy route to the new seeker dashboard
export default function JobSeekerDashboardLegacy() {
  redirect('/seeker');
}
