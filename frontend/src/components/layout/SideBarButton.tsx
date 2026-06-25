export default function SideBarButton({
  label,
  onClick,
  currentPage,
}: {
  label: string;
  onClick: () => void;
  currentPage: string;
}) {
  const isActive = label === currentPage;
  return (
    <button onClick={onClick} className={isActive ? "active" : ""}>
      <span>{label}</span>
    </button>
  );
}
