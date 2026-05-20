import { useState } from "react";
import { Outlet } from "react-router-dom";
import { TopBar } from "./TopBar";
import { LeftSidebar } from "./LeftSidebar";
import { RightSidebar } from "./RightSidebar";
import { RoomProvider } from "./rooms/RoomContext";
import { RoomOverlay } from "./rooms/RoomOverlay";

export function JwbaLayout() {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  return (
    <RoomProvider>
      <div className="h-screen flex flex-col bg-background">
        <TopBar
          onToggleLeft={() => setLeftCollapsed((v) => !v)}
          onToggleRight={() => setRightCollapsed((v) => !v)}
        />
        <div className="flex-1 flex min-h-0">
          <LeftSidebar collapsed={leftCollapsed} />
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
          <RightSidebar collapsed={rightCollapsed} />
        </div>
        <RoomOverlay />
      </div>
    </RoomProvider>
  );
}