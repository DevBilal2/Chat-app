import { useState, useRef, useEffect } from "react";
import { FiUsers } from "react-icons/fi";

export default function ChatHeader({ title, members, allUsers }) {
  const [membersOpen, setMembersOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const membersRef = useRef(null);
  const menuRef = useRef(null);

  // Convert emails to names
  const memberNames = members
    ? members.split(",").map((email) => {
        const user = allUsers.find((u) => u.Email === email.trim());
        return user ? user.Name : email.trim();
      })
    : [];

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (membersRef.current && !membersRef.current.contains(event.target)) {
        setMembersOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="border-b bg-gray-100 p-2 flex justify-between items-center relative">
      {/* Title + Members */}
      <div className="flex items-center space-x-3">
        <span className="font-semibold text-lg"># {title}</span>

        {/* Members Button */}
        <div ref={membersRef} className="relative">
          <button
            onClick={() => setMembersOpen(!membersOpen)}
            className="flex items-center space-x-1 px-2 py-1 rounded hover:bg-gray-200"
          >
            <FiUsers className="w-5 h-5" />
            <span className="text-sm">{memberNames.length}</span>
          </button>

          {membersOpen && (
            <div className="absolute left-0 top-10 bg-white border rounded shadow-md text-sm max-h-60 overflow-y-auto w-48 z-30">
              {memberNames.length === 0 ? (
                <div className="px-3 py-2 text-gray-400">No members</div>
              ) : (
                memberNames.map((name, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center space-x-2"
                  >
                    <FiUsers className="w-4 h-4 text-gray-500" />
                    <span>{name}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Options Button */}
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-xl hover:text-gray-600 px-2 py-1 rounded"
        >
          ⋮
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-10 bg-white border rounded shadow-md text-sm z-20">
            <div className="px-3 py-2 hover:bg-gray-100 cursor-pointer">
              Leave Channel
            </div>
            <div className="px-3 py-2 hover:bg-gray-100 cursor-pointer">
              Mute Notifications
            </div>
            <div className="px-3 py-2 hover:bg-gray-100 cursor-pointer">
              Leave Chat
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
