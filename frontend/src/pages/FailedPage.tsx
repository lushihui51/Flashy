/** What the user reads in place of a page that failed while it was being drawn. */
export default function FailedPage() {
  return (
    <div className="p-4">
      <p role="alert" className="text-sm text-(--color-wrong)">
        Could not load this page.
      </p>
    </div>
  );
}
