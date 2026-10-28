import { usePageTitle } from 'src/lib/pageTitle';

export default function HomePage() {
  usePageTitle('Home');
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold text-(--color-text)">Home</h1>
      <p className="text-(--color-text-muted)">Coming soon.</p>
    </div>
  );
}
