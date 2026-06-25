import SideBarButton from "src/components/layout/SideBarButton";
import UserButton from "src/components/layout/UserButton";

export default function SideBar({
  dashboardHandleClick,
  subjectsHandleClick,
  decksHandleClick,
  practicesHandleClick,
  settingsHandleClick,
  userHandleClick,
  currentPage,
}: {
  dashboardHandleClick: () => void;
  subjectsHandleClick: () => void;
  decksHandleClick: () => void;
  practicesHandleClick: () => void;
  settingsHandleClick: () => void;
  userHandleClick: () => void;
  currentPage: string;
}) {
  return (
    <>
      <h1>Flashy</h1>
      <SideBarButton
        label="Dashboard"
        onClick={dashboardHandleClick}
        currentPage={currentPage}
      />
      <SideBarButton
        label="Subjects"
        onClick={subjectsHandleClick}
        currentPage={currentPage}
      />
      <SideBarButton
        label="Decks"
        onClick={decksHandleClick}
        currentPage={currentPage}
      />
      <SideBarButton
        label="Practices"
        onClick={practicesHandleClick}
        currentPage={currentPage}
      />
      <SideBarButton
        label="Settings"
        onClick={settingsHandleClick}
        currentPage={currentPage}
      />
      <UserButton userHandleClick={userHandleClick} />
    </>
  );
}
