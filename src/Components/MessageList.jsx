import { useState, useEffect, useRef } from "react";

export default function MessageList({
  messages,
  currentUser,
  allUsers,
  onMessageClick,
  onPinToggle,
  onDeleteMessage,
}) {
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const dropdownRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const messageRefs = {};

  const getSenderName = (email) => {
    if (email === currentUser) return "You";
    const user = allUsers.find((u) => u.Email === email);
    return user?.Name || email || "Unknown";
  };

  const pinnedMessages = messages.filter((msg) => msg.Pin === true);

  const scrollToMessage = (msgId) => {
    const el = messageRefs[msgId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(msgId);
      setTimeout(() => setHighlightedMessageId(null), 1500);
    }
  };

  const toggleDropdown = (msgId) => {
    setOpenDropdownId(openDropdownId === msgId ? null : msgId);
  };

  const dropdownClasses =
    "absolute left-0 top-full mt-1 w-28 bg-white border border-gray-200 rounded shadow-md z-20 text-sm";
  const dropdownButtonClasses =
    "block w-full text-left px-3 py-1 hover:bg-gray-100 transition-colors duration-150";

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      50;

    // Only scroll if the user is near the bottom
    if (isNearBottom) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);
  const sortedMessages = [...messages].sort((a, b) => {
    const timeA = a.Added_Time ? new Date(a.Added_Time).getTime() : 0;
    const timeB = b.Added_Time ? new Date(b.Added_Time).getTime() : 0;
    return timeA - timeB;
  });

  // Generate consistent color per user
  const getMentionColor = (name) => {
    if (!name) return "#3b82f6"; // fallback blue
    let hash = 0;
    for (let i = 0; i < name.length; i++)
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 50%)`;
  };

  // Highlight @mentions in text
  const renderMessageText = (text) => {
    if (!text) return "";
    const mentionRegex = /@(\w+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      const mention = match[1];
      parts.push(
        <span
          key={`${mention}-${match.index}`}
          style={{
            color: "#00000", // nice solid blue
            fontWeight: 600,
            padding: "0 2px",
            borderRadius: "4px",
          }}
        >
          @{mention}
        </span>
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return parts;
  };
  console.log(pinnedMessages);
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Pinned Messages */}
      {pinnedMessages.length > 0 && (
        <div className="flex flex-col w-full z-10">
          {pinnedMessages.map((msg) => (
            <div
              key={msg.ID}
              className="w-full px-3 py-1 flex justify-between items-center bg-yellow-100 border-b border-gray-300 cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap"
              title={msg.Message}
              onClick={() => scrollToMessage(msg.ID)}
            >
              <div className="font-medium">
                {renderMessageText(msg.Message)}
              </div>
              <div className="flex space-x-2">
                <button
                  className="text-blue-600 text-sm underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPinToggle(msg);
                  }}
                >
                  Unpin
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-1 flex flex-col-reverse"
        ref={scrollContainerRef}
      >
        {[...sortedMessages].reverse().map((msg) => {
          if (!msg.Message || msg.Message.trim() === "") return null;
          const isMine = msg.SentBy === currentUser;
          const isHighlighted = highlightedMessageId === msg.ID;

          return (
            <div
              key={msg.ID}
              ref={(el) => (messageRefs[msg.ID] = el)}
              className={`flex ${
                isMine ? "justify-end" : "justify-start"
              } mb-1 ${isHighlighted ? "bg-yellow-100" : ""}`}
            >
              <div className="flex items-start space-x-1 relative">
                {isMine && (
                  <div className="relative flex-shrink-0">
                    <button
                      className="px-1 text-sm font-bold"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDropdown(msg.ID);
                      }}
                    >
                      ⋮
                    </button>
                    {openDropdownId === msg.ID && (
                      <div className={dropdownClasses} ref={dropdownRef}>
                        <button
                          className={dropdownButtonClasses}
                          onClick={(e) => {
                            e.stopPropagation();
                            onPinToggle(msg);
                            setOpenDropdownId(null);
                          }}
                        >
                          {msg.Pin === true ? "Unpin" : "Pin"}
                        </button>
                        <button
                          className={`${dropdownButtonClasses} text-red-500`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteMessage(msg);
                            setOpenDropdownId(null);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div
                  className={`relative max-w-xs px-3 py-0.5 rounded-lg shadow ${
                    isMine
                      ? "bg-blue-500 text-white rounded-br-none text-right"
                      : "bg-gray-200 text-gray-800 rounded-bl-none text-left"
                  }`}
                >
                  {isMine ? null : (
                    <div className="text-[10px] opacity-70 mb-1 flex justify-between items-center">
                      <span>{getSenderName(msg.SentBy)}</span>
                      {msg.Already_Highlighted === "true" && (
                        <span
                          className={`w-2 h-2 bg-yellow-400 rounded-full ${
                            isMine ? "ml-1" : "mr-1"
                          }`}
                        ></span>
                      )}
                    </div>
                  )}
                  <div className="break-words text-left">
                    {renderMessageText(msg.Message)}
                  </div>
                  {msg.Added_Time && (
                    <div className="text-[9px] mt-1 opacity-60">
                      {msg.Added_Time}
                    </div>
                  )}
                </div>

                {!isMine && (
                  <div className="relative flex-shrink-0">
                    <button
                      className="px-1 text-sm font-bold"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDropdown(msg.ID);
                      }}
                    >
                      ⋮
                    </button>
                    {openDropdownId === msg.ID && (
                      <div className={dropdownClasses} ref={dropdownRef}>
                        <button
                          className={dropdownButtonClasses}
                          onClick={(e) => {
                            e.stopPropagation();
                            onPinToggle(msg);
                            setOpenDropdownId(null);
                          }}
                        >
                          {msg.Pin === "true" ? "Unpin" : "Pin"}
                        </button>
                        <button
                          className={`${dropdownButtonClasses} text-red-500`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteMessage(msg);
                            setOpenDropdownId(null);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
