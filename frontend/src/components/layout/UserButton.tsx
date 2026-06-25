export default function UserButton({
  userName = "Jaden Lu",
  userHandleClick,
}: {
  userName?: string;
  userHandleClick: () => void;
}) {
  return <button onClick={userHandleClick}>{userName}</button>;
}
