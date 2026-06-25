import { useState } from "react";
import SideBar from "src/components/layout/SideBar";
import TopBar from "src/components/layout/TopBar";

export default function AppShell() {
  const [topBarTitle, setTopBarTitle] = useState("Dashboard");
  const dashboardHandleClick = () => {
    setTopBarTitle("Dashboard");
  };
  const subjectsHandleClick = () => {
    setTopBarTitle("Subjects");
  };
  const decksHandleClick = () => {
    setTopBarTitle("Decks");
  };
  const practicesHandleClick = () => {
    setTopBarTitle("Practices");
  };
  const settingsHandleClick = () => {
    setTopBarTitle("Settings");
  };
  const userHandleClick = () => {
    console.log("User button clicked");
  };
  return (
    <>
      <TopBar topBarTitle={topBarTitle} />
      <SideBar
        dashboardHandleClick={dashboardHandleClick}
        subjectsHandleClick={subjectsHandleClick}
        decksHandleClick={decksHandleClick}
        practicesHandleClick={practicesHandleClick}
        settingsHandleClick={settingsHandleClick}
        userHandleClick={userHandleClick}
        currentPage={topBarTitle}
      />
    </>
  );
}
