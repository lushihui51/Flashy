export default function TopBar({ topBarTitle }: { topBarTitle: string }) {
  const date: Date = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
  };
  const formattedDate: string = date.toLocaleDateString("en-US", options);

  return (
    <>
      <p>{formattedDate}</p>
      <h1>{topBarTitle}</h1>
    </>
  );
}
