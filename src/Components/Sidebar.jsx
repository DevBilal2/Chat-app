/* global ZOHO */
import DOMPurify from "dompurify";
import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import ChannelModal from "./ChannelModal";
import { fetchMessages, markHighlighted } from "../Store/MessageSlice";
import { FiSearch } from "react-icons/fi";
export default function Sidebar({
  onSelectPerson,
  onSelectChat,
  allUsers,
  currentUser,
  onNotify,
  setActiveChannel,
  activeChannel,
  queryParams,
  onScrollToMessage,
}) {
  const dispatch = useDispatch();
  const messages = useSelector((state) => state.messages.all);
  const [activeConversation, setActiveConversation] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [channels, setChannels] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [modalSearch, setModalSearch] = useState("");
  const [activeConversations, setActiveConversations] = useState([]);
  const queryParamsProcessed = useRef(false);

  useEffect(() => {
    if (!currentUser) return;

    const timeout = setTimeout(() => {
      ZOHO.CREATOR.DATA.getRecords({
        app_name: "admiral-field-portal",
        report_name: "ChannelsHiddenForm_Report",
      })
        .then((res) => {
          const allChannels = res.data || [];
          const userChannels = allChannels
            .filter((chan) =>
              (chan.RecievedByC || "")
                .split(",")
                .map((m) => m.trim().toLowerCase())
                .includes(currentUser.toLowerCase())
            )
            // ✅ Only channels with no message AND no file
            .filter((chan) => {
              const noMessage = !chan.Message || chan.Message.trim() === "";
              const noFile =
                !chan.File_Upload ||
                chan.File_Upload.length === 0 ||
                chan.File_Upload === "";
              return noMessage && noFile;
            })
            // Remove duplicate channel names
            .filter(
              (chan, index, self) =>
                index ===
                self.findIndex((c) => c.ChannelName === chan.ChannelName)
            );

          setChannels(userChannels);
        })
        .catch(console.error);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [currentUser, activeChannel]);

  useEffect(() => {
    // Force update for Safari/iOS
    if (channels.length > 0) {
      setChannels([...channels]);
    }
  }, []);

  // Handle query params to open channel and scroll to message
  // Only process once when query params and channels are available
  useEffect(() => {
    // Skip if already processed, no query params, no channels, or no current user
    if (
      queryParamsProcessed.current ||
      !queryParams?.QueryChannalName ||
      channels.length === 0 ||
      !currentUser
    ) {
      return;
    }

    // Find the channel by name
    const targetChannel = channels.find(
      (chan) => chan.ChannelName === queryParams.QueryChannalName
    );

    if (targetChannel) {
      // Mark as processed to prevent re-processing
      queryParamsProcessed.current = true;

      // Use the same selection logic as handleChannelClick to ensure proper state
      // This ensures activeConversation is cleared and channel is properly selected
      onSelectChat(targetChannel);
      setActiveConversation(null);
      setActiveChannel(targetChannel);

      // Mark highlighted messages as seen (same as handleChannelClick)
      messages
        .filter(
          (msg) =>
            msg.ChannelName === targetChannel.ChannelName && msg.Need_Highlight
        )
        .forEach((msg) => {
          dispatch(markHighlighted({ id: msg.ID }));
          markMessageInZoho(msg, "ChannelsHiddenForm_Report");
        });

      // Set the message ID to scroll to (use QueryMainID first, then QueryMassageID)
      const messageId = queryParams.QueryMainID || queryParams.QueryMassageID;
      if (messageId && onScrollToMessage) {
        console.log("Setting scroll target message ID:", messageId);
        // Set immediately - MessageList will handle waiting for messages to load
        onScrollToMessage(messageId);
      }
    }
  }, [
    channels,
    queryParams,
    currentUser,
    onSelectChat,
    setActiveChannel,
    onScrollToMessage,
    messages,
    dispatch,
  ]);
  useEffect(() => {
    if (!activeChannel) return;
    const stillExists = channels.some((chan) => chan.ID === activeChannel.ID);
    if (!stillExists) {
      if (channels.length > 0) {
        // Case 1: Channel removed, but others remain (select the first one)
        const nextChannel = channels[0];
        setActiveChannel(nextChannel);
        onSelectChat(nextChannel);
      } else if (activeConversations.length > 0) {
        // Case 2: All channels gone, select the first DM conversation
        const nextPerson = activeConversations[0];
        setActiveChannel(null); // Clear the channel state

        setActiveConversation(nextPerson); // Set the person state
        onSelectPerson(nextPerson); // Switch to person view (DM)
      } else {
        // Case 3: No channels and no DMs left. Show a blank screen.
        setActiveChannel(null);
        onSelectChat(null); // Ensure activeConversation is also reset
        setActiveConversation(null);
      }
    }
  }, [
    channels,
    activeChannel,
    activeConversations,
    setActiveChannel,
    onSelectChat,
    onSelectPerson,
  ]);

  // Classify users

  // Poll messages every 5 seconds

  useEffect(() => {
    if (!currentUser) return;
    dispatch(fetchMessages(currentUser));
    const interval = setInterval(
      () => dispatch(fetchMessages(currentUser)),
      5000
    );
    return () => clearInterval(interval);
  }, [currentUser, dispatch]);

  // Users you’ve already messaged
  useEffect(() => {
    const messaged = allUsers.filter((user) =>
      messages.some(
        (msg) =>
          !msg.ChannelName &&
          ((msg.SentBy?.toLowerCase() === currentUser.toLowerCase() &&
            msg.RecievedBy?.toLowerCase() === user.Email.toLowerCase()) ||
            (msg.RecievedBy?.toLowerCase() === currentUser.toLowerCase() &&
              msg.SentBy?.toLowerCase() === user.Email.toLowerCase()))
      )
    );

    // Merge messaged users with manually added ones
    setActiveConversations((prev) => {
      const combined = [...prev];
      messaged.forEach((u) => {
        if (!combined.some((c) => c.Email === u.Email)) {
          combined.push(u);
        }
      });
      return combined;
    });
  }, [messages, allUsers, currentUser]);

  const filteredUsers = activeConversations.filter((user) =>
    user.Name.toLowerCase().includes(sidebarSearch.toLowerCase())
  );

  // Compute unread highlights
  const unreadHighlights = {};
  const myEmail = currentUser?.toLowerCase();
  const myName = allUsers
    .find((u) => u.Email?.toLowerCase() === myEmail)
    ?.Name?.toLowerCase();

  messages.forEach((msg) => {
    const needHighlight = String(msg.Need_Highlight).toLowerCase() === "true";
    const alreadyHighlighted =
      String(msg.Already_Highlighted).toLowerCase() === "true";
    if (!needHighlight || alreadyHighlighted) return;

    const messageText = (msg.Message || "").toLowerCase();
    if (msg.ChannelName && msg.RecievedByC && myName) {
      const members = msg.RecievedByC.split(",").map((m) =>
        m.trim().toLowerCase()
      );
      if (messageText.includes(`@${myName}`))
        unreadHighlights[msg.ChannelName] = true;
    }

    if (!msg.ChannelName) {
      const isMine =
        msg.SentBy?.toLowerCase() === myEmail ||
        msg.RecievedBy?.toLowerCase() === myEmail;
      if (isMine) {
        const otherPerson =
          msg.SentBy?.toLowerCase() === myEmail ? msg.RecievedBy : msg.SentBy;
        if (otherPerson) unreadHighlights[otherPerson] = true;
      }
    }
  });
  useEffect(() => {
    if (!currentUser || !myName) return;
    console.log("Checking for app notifications...");
    messages.forEach((msg) => {
      const needHighlight = String(msg.Need_Highlight).toLowerCase() === "true";
      const appNotif = String(msg.App_Notification).toLowerCase() === "true";
      const alreadyHighlighted =
        String(msg.Already_Highlighted).toLowerCase() === "true";

      if (!needHighlight || appNotif || alreadyHighlighted) return;

      let shouldNotify = false;
      const messageText = DOMPurify.sanitize(msg.Message || "", {
        ALLOWED_TAGS: [],
      }).toLowerCase();
      if (msg.ChannelName && msg.RecievedByC) {
        // 🛑 MODIFICATION HERE: Check against the now clean (plain) messageText
        if (messageText.includes(`@${myName}`)) {
          shouldNotify = true;
        }
      }

      if (!msg.ChannelName) {
        // Notification for Direct Messages (DM)
        const isRecipient = msg.RecievedBy?.toLowerCase() === myEmail;
        if (isRecipient) shouldNotify = true;
      }

      if (shouldNotify) {
        console.log("App Notification:", msg.Message);

        if (typeof onNotify === "function") {
          // 1️⃣ Determine if message is channel or direct
          const targetId =
            msg.ChannelName ||
            (msg.SentBy?.toLowerCase() === myEmail
              ? msg.RecievedBy
              : msg.SentBy); // 2️⃣ Get email of actual sender (not you)

          const senderEmail =
            msg.SentBy?.toLowerCase() === myEmail
              ? msg.RecievedBy?.toLowerCase()
              : msg.SentBy?.toLowerCase(); // 3️⃣ Find sender name from allUsers

          const userData = allUsers.find(
            (u) => u.Email?.toLowerCase() === senderEmail
          ); // 4️⃣ Use full name → fallback to email if not found

          const senderName = userData?.Name || senderEmail || "You"; // Get original message text

          const originalMessageText = DOMPurify.sanitize(msg.Message || "", {
            ALLOWED_TAGS: [],
          }).toLowerCase();
          // 🧹 DOM Purify the message text immediately before use
          const sanitizedMessageText = DOMPurify.sanitize(originalMessageText);

          onNotify(targetId, senderName, sanitizedMessageText);
        }

        const reportName = msg.ChannelName
          ? "ChannelsHiddenForm_Report"
          : "PersonToPersonHiddenForm_Report";

        ZOHO.CREATOR.DATA.updateRecordById({
          app_name: "admiral-field-portal",
          report_name: reportName,
          id: msg.ID,
          payload: { data: { App_Notification: "true" } },
        }).then(() => console.log("App notification marked:", msg.ID));
      }
    });
  }, [messages, currentUser, myEmail, myName]);

  const markMessageInZoho = (msg, reportName) => {
    ZOHO.CREATOR.DATA.updateRecordById({
      app_name: "admiral-field-portal",
      report_name: reportName,
      id: msg.ID,
      payload: { data: { Already_Highlighted: "true" } },
    })
  };

  const handleChannelClick = (channel) => {
    onSelectChat(channel);
    setActiveConversation(null);

    // Set the selected channel
    setActiveChannel(channel);
    setSidebarOpen(false);

    messages
      .filter(
        (msg) => msg.ChannelName === channel.ChannelName && msg.Need_Highlight
      )
      .forEach((msg) => {
        dispatch(markHighlighted({ id: msg.ID }));
        markMessageInZoho(msg, "ChannelsHiddenForm_Report");
      });
  };

  const handlePersonClick = (person) => {
    onSelectPerson(person);
    setActiveConversation(person);
    setSidebarOpen(false);

    // Add to conversation list if not already there
    if (!activeConversations.some((u) => u.Email === person.Email)) {
      setActiveConversations((prev) => [person, ...prev]);
    }

    messages
      .filter(
        (msg) =>
          !msg.ChannelName &&
          ((msg.SentBy?.toLowerCase() === person.Email.toLowerCase() &&
            msg.RecievedBy?.toLowerCase() === myEmail) ||
            (msg.RecievedBy?.toLowerCase() === person.Email.toLowerCase() &&
              msg.SentBy?.toLowerCase() === myEmail)) &&
          msg.Need_Highlight
      )
      .forEach((msg) => {
        dispatch(markHighlighted({ id: msg.ID }));
        markMessageInZoho(msg, "PersonToPersonHiddenForm_Report");
      });
  };

  return (
    <>
      {/* Channel Modal */}
      {showModal && (
        <ChannelModal
          onClose={() => setShowModal(false)}
          onChannelCreated={(newChannel) => {
            setChannels((prev) => [newChannel, ...prev]);
            setActiveChannel(newChannel);
            setActiveConversation(null);
            setShowModal(false);
            onSelectChat(newChannel);
          }}
        />
      )}

      {/* New Conversation Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[2000] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm sm:max-w-md p-5 sm:p-6 relative">
            {/* Close Button */}
            <button
              onClick={() => setShowSearchModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition-colors text-lg"
            >
              ✖
            </button>

            {/* Heading */}
            <h3 className="font-bold  lg:text-md sm:text-sm mb-4 text-gray-800 text-center whitespace-nowrap">
              Start New Conversation
            </h3>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Search users..."
              value={modalSearch}
              onChange={(e) => setModalSearch(e.target.value)}
              className="w-full mb-3 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-[16px]"
            />

            {/* User List */}
            <div className="max-h-60 overflow-y-auto border-t border-gray-100 pt-2">
              {allUsers
                .filter(
                  (u) =>
                    u.Email.toLowerCase() !== currentUser.toLowerCase() && // exclude yourself
                    u.Name.toLowerCase().includes(modalSearch.toLowerCase())
                )
                .map((user) => (
                  <div
                    key={user.ID}
                    onClick={() => {
                      handlePersonClick(user);
                      setShowSearchModal(false);
                    }}
                    className="cursor-pointer px-3 py-2 hover:bg-gray-100 rounded flex items-center text-sm sm:text-base transition"
                  >
                    {user.Name}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Hamburger button */}
      <button
        className="sm:hidden fixed top-4 left-4 z-50 p-1 text-black rounded shadow"
        onClick={() => setSidebarOpen(true)}
      >
        ☰
      </button>

      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-200 bg-black/40 ${
          sidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* Sidebar */}
      <div
        className={`fixed sm:relative z-50 top-0 left-0 h-full w-56 bg-[#001C57] text-white flex flex-col overflow-hidden transform transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
        }`}
      >
        <div className="p-4 flex-1 overflow-y-auto">
          {/* Channels */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2 ml-1">
              <h3 className="text-base font-semibold text-gray-200">
                Channels
              </h3>
              <button
                onClick={() => setShowModal(true)}
                className="text-lg text-[#FFd700] px-2 hover:bg-[#404249] rounded transition"
              >
                +
              </button>
            </div>
            {channels.length ? (
              channels.map((chan) => {
                const hasHighlight = unreadHighlights[chan.ChannelName];
                return (
                  <div
                    key={chan.ID}
                    onClick={() => handleChannelClick(chan)}
                    className={`cursor-pointer px-2 py-1 rounded flex justify-between items-center transition-all ${
                      activeChannel?.ID === chan.ID
                        ? "bg-gray-400" // Active highlight
                        : hasHighlight
                        ? "bg-yellow-500/20 hover:bg-yellow-500/30"
                        : "hover:bg-[#404249]"
                    }`}
                  >
                    <span className="truncate">#{chan.ChannelName}</span>
                    {hasHighlight && (
                      <span className="ml-2 w-2 h-2 bg-yellow-400 rounded-full"></span>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-gray-400 text-xs">No channels found</p>
            )}
          </div>

          {/* Conversations */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold mb-2 text-gray-200">
                Conversation
              </h3>
              <button
                onClick={() => setShowSearchModal(true)}
                className="text-[#FFd700] hover:text-white p-1 rounded"
                title="New Conversation"
              >
                <FiSearch />
              </button>
            </div>

            {filteredUsers.length ? (
              filteredUsers.map((user) => {
                const hasHighlight = unreadHighlights[user.Email];
                return (
                  <div
                    key={user.ID}
                    onClick={() => handlePersonClick(user)}
                    className={`cursor-pointer px-2 py-1 rounded flex justify-between items-center ${
                      activeConversation?.Email === user.Email
                        ? "bg-gray-400" // Active highlight
                        : hasHighlight
                        ? "bg-yellow-500/20 hover:bg-yellow-500/30"
                        : "hover:bg-[#404249]"
                    }`}
                  >
                    <span>@{user.Name}</span>
                    {hasHighlight && (
                      <span className="ml-2 w-2 h-2 bg-yellow-400 rounded-full"></span>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-gray-400 text-xs">
                {sidebarSearch ? "No matching users" : "No conversations yet"}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
