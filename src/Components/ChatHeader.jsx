import { useState, useRef, useEffect } from "react";
import { FiUsers, FiX, FiUserPlus, FiMoreVertical } from "react-icons/fi";

export default function ChatHeader({
  title,
  members,
  allUsers,
  onAddMember,
  isChannel, // true if this is a channel, false if direct message
  currentUser,
  setActiveChannel,
}) {
  const [membersOpen, setMembersOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [customEmail, setCustomEmail] = useState("");

  const membersRef = useRef(null);
  const menuRef = useRef(null);
  // Convert emails to names
  const memberNames =
    typeof members === "string" && members.length > 0
      ? members.split(",").map((email) => {
          const user = allUsers.find((u) => u.Email === email.trim());
          return user ? user.Name : email.trim();
        })
      : [];

  // Users not in this channel
  const existingEmails = members ? members.split(",").map((e) => e.trim()) : [];
  const nonMembers = allUsers.filter((u) => !existingEmails.includes(u.Email));

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

  const toggleSelect = (email) => {
    setSelectedEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const handleAddSelected = () => {
    const emailsToAdd = [...selectedEmails];
    if (customEmail) emailsToAdd.push(customEmail.trim());
    if (emailsToAdd.length > 0) {
      onAddMember(emailsToAdd, "add"); // pass "add" action
      setSelectedEmails([]);
      setCustomEmail("");
      setShowAddModal(false);
    }
  };

  // Handle leaving channel (removing current user)
  const handleLeaveChannel = () => {
    onAddMember([currentUser], "remove"); // call remove
    setMenuOpen(false);
    alert("You have left the channel");
  };

  return (
    <div className="border-b bg-white shadow-sm p-1 flex justify-between items-center relative">
      {/* Left: Title + Members Button (if channel) */}
      <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
        <span className="font-bold text-base sm:text-lg md:text-xl text-gray-800 break-words min-w-0 max-w-full">
          {isChannel ? '#' : '@'} {title}
        </span>

        {isChannel && (
          <div ref={membersRef} className="relative">
            <button
              onClick={() => setMembersOpen(!membersOpen)}
              className="flex items-center space-x-1 p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
              title="View Members"
            >
              <FiUsers className="w-5 h-5" />
              <span className="text-sm font-medium">{memberNames.length}</span>
            </button>

            {membersOpen && (
              <div className="absolute right-0 lg:left-0 lg:right-auto top-12 bg-white border border-gray-200 rounded-lg shadow-xl text-sm max-h-60 overflow-y-auto w-56 z-30">
                {memberNames.length === 0 ? (
                  <div className="px-4 py-3 text-gray-400 italic">
                    No members in this channel
                  </div>
                ) : (
                  memberNames.map((name, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-2 hover:bg-blue-50 cursor-pointer flex items-center space-x-3"
                    >
                      <FiUsers className="w-4 h-4 text-blue-500" />
                      <span className="truncate">{name}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Action Buttons (only for channels) */}
      {isChannel && (
        <div className="flex items-center space-x-2">
          {/* Add Member */}
          <button
            onClick={() => setShowAddModal(true)}
            className="p-1.5 rounded-full bg-[#001c57] text-white hover:bg-blue-600 transition-colors shadow-sm flex items-center justify-center"
            title="Add Member"
          >
            <FiUserPlus className="w-4 h-4" />
          </button>

          {/* More Options */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
              title="More Options"
            >
              <FiMoreVertical className="w-5 h-5" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-xl text-sm z-20 w-48 overflow-hidden">
                <div
                  onClick={handleLeaveChannel}
                  className="px-4 py-2 hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors"
                >
                  Leave Channel
                </div>
                <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer transition-colors">
                  Mute Notifications
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {isChannel && showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 relative transform transition-all scale-100">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
              title="Close"
            >
              <FiX size={24} />
            </button>
            <h3 className="font-bold text-xl mb-4 text-gray-800">
              Add Members
            </h3>

            <input
              type="text"
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              placeholder="Enter custom email address"
              className="w-full border text-[16px] border-gray-300 px-4 py-2 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            />

            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 mb-4 bg-gray-50">
              {nonMembers.length === 0 ? (
                <div className="text-gray-500 italic text-center py-2">
                  All known users are already in this channel.
                </div>
              ) : (
                nonMembers.map((user, idx) => (
                  <label
                    key={idx}
                    className="flex justify-between items-center px-2 py-2 text-gray-700 hover:bg-white rounded-md cursor-pointer transition-colors"
                  >
                    <span className="font-medium truncate">{user.Name}</span>
                    <input
                      type="checkbox"
                      checked={selectedEmails.includes(user.Email)}
                      onChange={() => toggleSelect(user.Email)}
                      className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </label>
                ))
              )}
            </div>

            <button
              onClick={handleAddSelected}
              disabled={selectedEmails.length === 0 && !customEmail}
              className={`w-full font-semibold px-4 py-2 rounded-lg transition-all ${
                selectedEmails.length > 0 || customEmail
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              Add Selected Members
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
