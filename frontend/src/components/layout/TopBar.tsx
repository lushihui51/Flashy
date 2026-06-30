export default function TopBar({ topBarTitle }: { topBarTitle: string }) {
  const date: Date = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  };
  const formattedDate: string = date.toLocaleDateString('en-US', options);

  return (
    <div className="px-8 py-6">
      <p className="text-sm text-gray-500">{formattedDate}</p>
      <h1 className="text-3xl font-bold">{topBarTitle}</h1>
    </div>
  );
}
