import { usePageTitle } from 'src/lib/pageTitle';

export default function NotificationsPage() {
  usePageTitle('Notifications');
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold text-(--color-ink)">Notifications</h1>
      <p className="text-(--color-aside)">Coming soon.</p>
    </div>
  );
}
