import { useState } from "react";

export default function ChatHeader({ title, activePerson }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="border-b bg-gray-100 p-3 flex justify-between items-center relative">
      <span className="font-semibold text-lg"># {title}</span>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="text-xl hover:text-gray-600"
      >
        ⋮
      </button>
      {menuOpen && (
        <div className="absolute right-3 top-10 bg-white border rounded shadow-md text-sm">
          <div className="px-3 py-2 hover:bg-gray-100 cursor-pointer">View Info</div>
          <div className="px-3 py-2 hover:bg-gray-100 cursor-pointer">Mute Notifications</div>
          <div className="px-3 py-2 hover:bg-gray-100 cursor-pointer">Leave Chat</div>
        </div>
      )}
    </div>
  );
}
