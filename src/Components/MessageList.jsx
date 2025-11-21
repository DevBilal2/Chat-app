import { useState, useEffect, useRef } from "react";

// --- Icon Placeholders ---
const DownloadIcon = ({ className = "" }) => (
  <svg
    className={`w-4 h-4 ${className}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
);
const CloseIcon = ({ className = "" }) => (
  <svg
    className={`w-6 h-6 ${className}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

// New Icon for Generic Files (Document Placeholder)
const DocumentIcon = ({ className = "" }) => (
  <svg
    className={`w-6 h-6 ${className}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);
// -------------------------

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
  // New state for the full-screen image viewer
  const [fullScreenImage, setFullScreenImage] = useState(null);

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

  // Handler to open the full-screen image
  const handleImageClick = (url) => {
    setFullScreenImage(url);
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

    if (isNearBottom) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  const sortedMessages = [...messages].sort((a, b) => {
    const timeA = a.Added_Time ? new Date(a.Added_Time).getTime() : 0;
    const timeB = b.Added_Time ? new Date(b.Added_Time).getTime() : 0;
    return timeA - timeB;
  });

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
            color: "#00000",
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

  // Helper to determine if the file is an image
  const isImageFile = (fileName) => {
    if (!fileName) return false;
    const extension = fileName.split(".").pop().toLowerCase();
    return ["jpg", "jpeg", "png", "gif", "webp"].includes(extension);
  };

  const getCreatorFileUrl = (fileUpload) => {
    if (!fileUpload) return null;

    // Remove the leading "/" so that the split array starts with the first meaningful part
    const cleanedPath = fileUpload.startsWith("/")
      ? fileUpload.substring(1)
      : fileUpload;

    // Split by "/"
    const parts = cleanedPath.split("/");

    // The indices below are relative to the 'cleanedPath' split array
    const appOwner = parts[2];
    const appName = parts[3];
    const reportName = parts[5];
    const recordId = parts[6];
    const fieldName = parts[7];

    // Extract filename from the last part which contains the query param
    const lastPart = parts[8];
    const filepathParam = lastPart ? lastPart.split("filepath=")[1] : null;
    const fileName = filepathParam || "unknown_file";

    const personMessageToken =
      "XZfj5ET7sZAQd6WuWeF23tDg8Xrxf4KMfDwHNCGfKrmUHmFPEYXrjhQ5j9Zn3Tu7421jprjEUWtQkJ5DRbbxOBJp19u57e3fdk9d";
    const channelMessageToken =
      "4ZB8d90knQygt877HUqDStQuHD9xPqhDNZBhrhgq1KCBanwVjkHO0qEYEJrnKwD25M4Og5pDGnDHS4W5NXDgpjCrFnvNOZ5CsBnd";

    // Decide which dummy token to use
    const token =
      reportName === "ChannelsHiddenForm_Report"
        ? channelMessageToken
        : personMessageToken;

    // Construct the correct public URL:
    const finalUrl = `https://creatorapp.zoho.com/${appOwner}/${appName}/report/${reportName}/${recordId}/${fieldName}/download-file/${token}?filepath=${fileName}`;

    return { url: finalUrl, fileName: fileName };
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
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
          if (!msg.Message && !msg.File_upload) return null;
          const isMine = msg.SentBy === currentUser;
          const isHighlighted = highlightedMessageId === msg.ID;

          const fileData = getCreatorFileUrl(msg.File_upload);
          const fileUrl = fileData ? fileData.url : null;
          const fileName = fileData ? fileData.fileName : null;
          const isImage = fileName ? isImageFile(fileName) : false;

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
                  {!isMine && (
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
                    {fileUrl && (
                      <div className="mt-1 relative">
                        {isImage ? (
                          <>
                            <button
                              onClick={() => handleImageClick(fileUrl)}
                              className="block relative focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
                            >
                              <img
                                src={fileUrl}
                                alt={fileName || "Attached Image"}
                                className="w-48 h-48 rounded border object-cover cursor-pointer"
                              />
                              {/* Download Icon (Top Right) */}
                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={fileName}
                                // Prevent modal from opening when clicking the download icon
                                onClick={(e) => e.stopPropagation()}
                                className="absolute top-1 right-1 p-1 bg-black bg-opacity-40 rounded-full cursor-pointer transition-opacity hover:opacity-100 opacity-80"
                                title="Download File"
                              >
                                <DownloadIcon className="w-4 h-4 text-white" />
                              </a>
                            </button>
                          </>
                        ) : (
                          // For non-image files, display as a styled document link
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={fileName}
                            className={`flex items-center space-x-3 p-3 rounded-lg border-2 ${
                              isMine
                                ? "bg-blue-600 text-white border-blue-700 hover:bg-blue-700"
                                : "bg-white text-gray-900 border-gray-300 hover:bg-gray-50"
                            } transition-colors duration-150 cursor-pointer w-full`}
                          >
                            <DocumentIcon
                              className={`w-6 h-6 flex-shrink-0 ${
                                isMine ? "text-white" : "text-blue-500"
                              }`}
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-semibold truncate max-w-full">
                                {fileName || "Attached Document"}
                              </span>
                              <span className="text-xs opacity-80">
                                Click to Download
                              </span>
                            </div>
                            <DownloadIcon
                              className={`w-5 h-5 flex-shrink-0 ${
                                isMine ? "text-white" : "text-gray-500"
                              }`}
                            />
                          </a>
                        )}
                      </div>
                    )}
                    {/* The message text is rendered here, ensuring it is on a new line below the file div */}
                    {msg.Message && renderMessageText(msg.Message)}
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

      {/* 🖼️ Full-Screen Image Modal (Lightbox) */}
      {fullScreenImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
          onClick={() => setFullScreenImage(null)} // Close on background click
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 p-2"
            onClick={(e) => {
              e.stopPropagation();
              setFullScreenImage(null);
            }}
          >
            <CloseIcon className="w-8 h-8" />
          </button>

          <img
            src={fullScreenImage}
            alt="Full-Screen Attachment"
            // Prevent closing the modal when clicking the image itself
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
