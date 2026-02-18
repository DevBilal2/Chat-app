import { useState, useEffect, useRef } from "react";
// Import DOMPurify for critical client-side HTML sanitization
// NOTE: You must install this library: npm install dompurify
import DOMPurify from "dompurify";

// --- Icon Placeholders ---
const PinIcon = ({ className = "", isSolid = true }) => (
  <svg
    className={`w-4 h-4 ${className}`}
    viewBox="0 0 24 24"
    fill={isSolid ? "currentColor" : "none"}
    stroke={isSolid ? "none" : "currentColor"}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10.151 5.448l2.977-2.977a1 1 0 011.414 0l1.838 1.838a1 1 0 010 1.414L15.3 7.828l3.657 3.657-3.12 3.12a2.5 2.5 0 01-3.536 0l-3.657-3.657-1.767 1.768a1 1 0 01-1.414 0l-1.838-1.838a1 1 0 010-1.414l2.977-2.977zm-3.89 3.89l1.767-1.767 3.657 3.657a.5.5 0 00.707 0l3.12-3.12.354.353a.5.5 0 000 .707l-3.657 3.657a2.5 2.5 0 01-3.536 0l-1.838-1.838a.5.5 0 00-.707 0l-.353.354zM9.5 22h5c.276 0 .5-.224.5-.5V17a.5.5 0 00-.5-.5h-5a.5.5 0 00-.5.5v4.5c0 .276.224.5.5.5z"
      fillRule="evenodd"
    />
  </svg>
);
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

// NOTE: MicrophoneIcon is unused in this component but kept for completeness
// const MicrophoneIcon = ({ className = "" }) => (
//   <svg
//     className={`w-6 h-6 ${className}`}
//     fill="none"
//     stroke="currentColor"
//     viewBox="0 0 24 24"
//     xmlns="http://www.w3.org/2000/svg"
//   >
//     <path
//       strokeLinecap="round"
//       strokeLinejoin="round"
//       strokeWidth={2}
//       d="M19 11a7 7 0 01-7 7v1h2v-1a5 5 0 005-5h-2z"
//     />
//     <path
//       strokeLinecap="round"
//       strokeLinejoin="round"
//       strokeWidth={2}
//       d="M12 18V20m0-8V2h2v10h-2z"
//     />
//     <circle cx="12" cy="7" r="4" />
//   </svg>
// );

export default function MessageList({
  messages,
  currentUser,
  allUsers,
  onMessageClick,
  onPinToggle,
  onDeleteMessage,
  scrollToMessageId,
  onScrollComplete,
}) {
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    isMine: false,
  });
  // -------------------------

  const dropdownRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const messageRefs = useRef({});

  const getSenderName = (email, botName = null) => {
    // If botName is provided and SentBy is empty, use bot name
    if (!email && botName) return botName;
    if (email === currentUser) return "You";
    const user = allUsers.find((u) => u.Email === email);
    return user?.Name || email || "Unknown";
  };

  const pinnedMessages = messages.filter((msg) => msg.Pin === true);

  const scrollToMessage = (msgId) => {
    const el = messageRefs.current[msgId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(msgId);
      setTimeout(() => setHighlightedMessageId(null), 1500);
    }
  };

  const toggleDropdown = (msgId, event, isMine) => {
    if (openDropdownId === msgId) {
      setOpenDropdownId(null);
      setDropdownPosition({ top: 0, left: 0, isMine: false });
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 5, // 5px below the button
        left: isMine ? rect.right : rect.left, // Use left/right for positioning based on side
        isMine: isMine,
      });
      setOpenDropdownId(msgId);
    }
  };

  const handleImageClick = (url) => {
    setFullScreenImage(url);
  };
  const dropdownClassesMine =
    "absolute mt-1 w-28 bg-white border border-gray-200 rounded shadow-md z-500 text-sm";
  const dropdownClassesOther =
    "absolute mt-1 w-28 bg-white border border-gray-200 rounded shadow-md z-500 text-sm";
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

  // Handle scrolling to a specific message from query params
  useEffect(() => {
    if (!scrollToMessageId || messages.length === 0) return;

    // Try to find and scroll immediately, with minimal delay for DOM rendering
    const tryScroll = () => {
      const targetMessage = messages.find((msg) => {
        // Try matching by ID field first (exact match)
        if (msg.ID === scrollToMessageId || 
            String(msg.ID) === String(scrollToMessageId)) {
          return true;
        }
        
        // Also try matching by MainID field if it exists
        if (msg.MainID) {
          if (msg.MainID === scrollToMessageId || 
              String(msg.MainID) === String(scrollToMessageId)) {
            return true;
          }
        }
        
        return false;
      });

      if (targetMessage) {
        // Use requestAnimationFrame for immediate DOM update, then scroll
        requestAnimationFrame(() => {
          setTimeout(() => {
            scrollToMessage(targetMessage.ID);
            // Call onScrollComplete after scrolling
            if (onScrollComplete) {
              setTimeout(() => {
                onScrollComplete();
              }, 1500);
            }
          }, 50);
        });
      }
    };

    // Try immediately, and retry once after a short delay if needed
    tryScroll();
    const timeoutId = setTimeout(() => {
      tryScroll();
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [scrollToMessageId, messages, onScrollComplete]);

  const sortedMessages = [...messages].sort((a, b) => {
    const timeA = a.Added_Time ? new Date(a.Added_Time).getTime() : 0;
    const timeB = b.Added_Time ? new Date(b.Added_Time).getTime() : 0;
    return timeA - timeB;
  });
  const decodeDelugeChars = (text) => {
    if (!text) return text;
    return text.replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16))
    );
  };
  // 1. REVISED FUNCTION: Now handles HTML safely.
  // It uses DOMPurify to sanitize the content, removing risky tags
  // before injecting the HTML into the DOM.
  const renderMessageText = (text) => {
    if (!text) return null;

    var decodedText = decodeDelugeChars(text);
    
    // Convert newlines to <br> tags (handles both \n and \r\n)
    decodedText = decodedText.replace(/\r?\n/g, '<br>');
    
    // const mentionRegex = /@([a-zA-Z0-9_\s-]+)(?=\s|[,.?!:;]|$)/g;
    // decodedText = decodedText.replace(
    //   mentionRegex,
    //   `<span data-mention="true" class="message-mention">@$1</span>`
    // );
    // decodedText = decodedText.replace(
    //   /@(\S+)/g,
    //   `<span data-mention="true" class="message-mention">@$1</span>`
    // );

    // Sanitize HTML
    const cleanHtml = DOMPurify.sanitize(decodedText, {
      ALLOWED_TAGS: [
        "b",
        "i",
        "u",
        "em",
        "strong",
        "a",
        "p",
        "div",
        "ul",
        "ol",
        "li",
        "pre",
        "code",
        "blockquote",
        "span",
        "br",
      ],
      ALLOWED_ATTR: ["href", "target", "class", "style", "data-mention-list"],
    });

    return (
      <div
        className="break-words text-left min-w-0 max-w-full"
        style={{ overflowWrap: 'anywhere' }}
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
      />
    );
  };

  const isImageFile = (fileName) => {
    if (!fileName) return false;
    const extension = fileName.split(".").pop().toLowerCase();
    return ["jpg", "jpeg", "png", "gif", "webp"].includes(extension);
  };

  const isAudioFile = (fileName) => {
    if (!fileName) return false;
    const extension = fileName.split(".").pop().toLowerCase();
    return ["mp3", "ogg", "wav", "webm", "m4a", "aac", "caf"].includes(
      extension
    );
  };

  const getCreatorFileUrl = (fileUpload) => {
    if (!fileUpload) return null;

    const cleanedPath = fileUpload.startsWith("/")
      ? fileUpload.substring(1)
      : fileUpload;

    const parts = cleanedPath.split("/");

    const appOwner = parts[2];
    const appName = parts[3];
    const reportName = parts[5];
    const recordId = parts[6];
    const fieldName = parts[7];
    const lastPart = parts[8];
    const filepathParam = lastPart ? lastPart.split("filepath=")[1] : null;
    const fileName = filepathParam || "unknown_file";

    const personMessageToken =
      "XZfj5ET7sZAQd6WuWeF23tDg8Xrxf4KMfDwHNCGfKrmUHmFPEYXrjhQ5j9Zn3Tu7421jprjEUWtQkJ5DRbbxOBJp19u57e3fdk9d";
    const channelMessageToken =
      "4ZB8d90knQygt877HUqDStQuHD9xPqhDNZBhrhgq1KCBanwVjkHO0qEYEJrnKwD25M4Og5pDGnDHS4W5NXDgpjCrFnvNOZ5CsBnd";

    const token =
      reportName === "ChannelsHiddenForm_Report"
        ? channelMessageToken
        : personMessageToken;

    // const finalUrl = `https://creatorapp.zoho.com/${appOwner}/${appName}/report/${reportName}/${recordId}/${fieldName}/download-file/${token}?filepath=${fileName}`;
    const finalUrl = `https://creatorapp.zoho.com/${appOwner}/${appName}/report/${reportName}/${recordId}/${fieldName}/download-file/${token}?filepath=${encodeURIComponent(
      fileName
    )}`;

    return { url: finalUrl, fileName: fileName };
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {pinnedMessages.length > 0 && (
        <div className="flex flex-col w-full z-10">
          {pinnedMessages.map((msg) => (
            <div
              key={msg.ID}
              className="w-full px-3 py-1 flex justify-between items-center bg-yellow-100 border-b border-gray-300 cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap"
              title={msg.Message}
              onClick={() => scrollToMessage(msg.ID)}
            >
              {/* START CHANGE */}
              <div className="font-medium flex-1 flex items-center min-w-0">
                {/* Sender Name with light styling */}
                <span className="text-xs font-semibold text-gray-600 mr-2 flex-shrink-0">
                  {getSenderName(msg.SentBy, msg.BotName)}:
                </span>
                {/* Message Content */}
                <div className="truncate min-w-0">
                  {renderMessageText(msg.Message)}
                </div>
              </div>
              {/* END CHANGE */}
              <div className="flex space-x-2 flex-shrink-0">
                <button
                  className="text-gray-500 hover:text-gray-700 transition-colors duration-150 flex items-center justify-center p-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPinToggle(msg);
                  }}
                  title="Unpin Message"
                >
                  <PinIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        className="flex-1 overflow-y-auto p-1 flex flex-col-reverse"
        ref={scrollContainerRef}
      >
        {[...sortedMessages].reverse().map((msg) => {
          if (!msg.Message && !msg.File_upload) return null;
          const isBotMessage = (msg.SentBy === "" || !msg.SentBy) && 
                               (msg.BotCheck === true || msg.BotCheck === "true" || String(msg.BotCheck).toLowerCase() === "true");
          const isMine = msg.SentBy === currentUser && !isBotMessage;
          const isHighlighted = highlightedMessageId === msg.ID;

          const fileData = getCreatorFileUrl(msg.File_upload);
          const fileUrl = fileData ? fileData.url : null;
          const fileName = fileData ? fileData.fileName : null;
          const isImage = fileName ? isImageFile(fileName) : false;
          const isAudio = fileName ? isAudioFile(fileName) : false;

          return (
            <div
              key={msg.ID}
              ref={(el) => (messageRefs.current[msg.ID] = el)}
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
                        // --- UPDATED CALL ---
                        toggleDropdown(msg.ID, e, true);
                        // --------------------
                      }}
                    >
                      ⋮
                    </button>
                    {/* {openDropdownId === msg.ID && (
                      <div
                        className={
                          isMine ? dropdownClassesMine : dropdownClassesOther
                        }
                        ref={dropdownRef}
                      >
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
                    )} */}
                  </div>
                )}

                <div
                  className={`relative max-w-xs min-w-0 px-3 py-0.5 rounded-lg shadow ${
                    isMine
                      ? "bg-[#5F9EA0] text-white rounded-br-none text-right"
                      : "bg-gray-200 text-gray-800 rounded-bl-none text-left"
                  }`}
                >
                  {!isMine && (
                    <div className="text-[10px] opacity-70 mb-1 flex justify-between items-center">
                      <span>{getSenderName(msg.SentBy, msg.BotName)}</span>
                      {msg.Already_Highlighted === "true" && (
                        <span
                          className={`w-2 h-2 bg-yellow-400 rounded-full ${
                            isMine ? "ml-1" : "mr-1"
                          }`}
                        ></span>
                      )}
                    </div>
                  )}

                  <div className="break-words text-left min-w-0" style={{ overflowWrap: 'anywhere' }}>
                    {fileUrl && (
                      <div className="mt-1 relative">
                        {isImage ? (
                          <button
                            onClick={() => handleImageClick(fileUrl)}
                            className="block relative focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
                          >
                            <img
                              src={fileUrl}
                              alt={fileName || "Attached Image"}
                              className="w-48 h-48 rounded border object-cover cursor-pointer"
                            />
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={fileName}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute top-1 right-1 p-1 bg-black bg-opacity-40 rounded-full cursor-pointer transition-opacity hover:opacity-100 opacity-80"
                              title="Download File"
                            >
                              <DownloadIcon className="w-4 h-4 text-white" />
                            </a>
                          </button>
                        ) : isAudio ? (
                          // --- ENHANCED AUDIO UI ---
                          <div className="flex flex-col flex-1 w-full ">
                            <audio
                              src={fileUrl}
                              controls
                              className="h-8 rounded-md"
                              preload="metadata" // important for iOS
                            >
                              Your browser does not support the audio element.
                            </audio>
                          </div>
                        ) : (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={fileName}
                            className={`flex items-center space-x-3 p-3 rounded-lg border-2 ${
                              isMine
                                ? "bg-[#5F9EA0] text-white border-[#5F9EA0] hover:[#5F9EA9]"
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
                        {/* 3. CONDITIONAL RENDERING UPDATE: Render message text if file is present (e.g., image caption) */}
                        {msg.Message && renderMessageText(msg.Message)}
                      </div>
                    )}

                    {/* 4. CONDITIONAL RENDERING UPDATE: Render message text if NO file is present */}
                    {!fileUrl && msg.Message && renderMessageText(msg.Message)}
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
                        e.stopPropagation(); // --- INCORRECT: Should be `isMine` (which is false here) ---
                        toggleDropdown(msg.ID, e, isMine); // <--- CHANGE THIS // --------------------
                      }}
                    >
                      ⋮
                    </button>
                    {openDropdownId === msg.ID && (
                      <div
                        className={
                          isMine ? dropdownClassesMine : dropdownClassesOther
                        }
                        ref={dropdownRef}
                      >
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
      {openDropdownId && (
        <div
          className={`fixed ${
            // *** Change 'absolute' to 'fixed' here ***
            // Using the existing classes for background/shadow
            dropdownPosition.isMine
              ? "bg-white border text-sm"
              : "bg-white border text-sm"
          } w-28 rounded shadow-md z-[500]`} // <- Consolidate necessary Tailwind classes
          ref={dropdownRef}
          style={{
            top: `${dropdownPosition.top}px`, // If 'isMine' (right side), align the right edge of the dropdown with the right coordinate of the button.
            right: dropdownPosition.isMine
              ? `${window.innerWidth - dropdownPosition.left}px`
              : "auto", // If 'isMine' is false (left side), align the left edge of the dropdown with the left coordinate of the button.
            left: dropdownPosition.isMine
              ? "auto"
              : `${dropdownPosition.left}px`,
          }}
        >
          <button
            className={dropdownButtonClasses}
            onClick={(e) => {
              e.stopPropagation();
              const msg = sortedMessages.find((m) => m.ID === openDropdownId);
              if (msg) onPinToggle(msg);
              setOpenDropdownId(null);
            }}
          >
            {messages.find((m) => m.ID === openDropdownId)?.Pin
              ? "Unpin"
              : "Pin"}
          </button>
          <button
            className={`${dropdownButtonClasses} text-red-500`}
            onClick={(e) => {
              e.stopPropagation();
              const msg = sortedMessages.find((m) => m.ID === openDropdownId);
              if (msg) onDeleteMessage(msg);
              setOpenDropdownId(null);
            }}
          >
            Delete
          </button>
        </div>
      )}
      {fullScreenImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
          onClick={() => setFullScreenImage(null)}
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
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
