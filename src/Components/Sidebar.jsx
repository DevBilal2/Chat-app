/* global ZOHO */
import { useState, useEffect } from "react";
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
}) {
  const dispatch = useDispatch();
  const messages = useSelector((state) => state.messages.all);

  const [showModal, setShowModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [channels, setChannels] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeConversations, setActiveConversations] = useState([]);

  // Fetch channels for current user
  useEffect(() => {
    if (!currentUser) return;
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
          .filter(
            (chan, index, self) =>
              index ===
              self.findIndex((c) => c.ChannelName === chan.ChannelName)
          );
        setChannels(userChannels);
      })
      .catch(console.error);
  }, [currentUser, activeChannel]);

  useEffect(() => {
    if (!activeChannel) return;
    const stillExists = channels.some((chan) => chan.ID === activeChannel.ID);
    if (!stillExists) {
      if (channels.length > 0) {
        const nextChannel = channels[0];
        setActiveChannel(nextChannel);
        onSelectChat(nextChannel);
      } else {
        setActiveChannel(null);
        onSelectChat(null);
      }
    }
  }, [channels, activeChannel, setActiveChannel, onSelectChat]);

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
    user.Name.toLowerCase().includes(searchTerm.toLowerCase())
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
    messages.forEach((msg) => {
      const needHighlight = String(msg.Need_Highlight).toLowerCase() === "true";
      const appNotif = String(msg.App_Notification).toLowerCase() === "true";
      const alreadyHighlighted =
        String(msg.Already_Highlighted).toLowerCase() === "true";

      if (!needHighlight || appNotif || alreadyHighlighted) return;

      let shouldNotify = false;
      const messageText = (msg.Message || "").toLowerCase(); // Define messageText here

      if (msg.ChannelName && msg.RecievedByC) {
        // 🛑 MODIFICATION HERE: Only notify if they are mentioned (@myName)
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
              : msg.SentBy);

          // 2️⃣ Get email of actual sender (not you)
          const senderEmail =
            msg.SentBy?.toLowerCase() === myEmail
              ? msg.RecievedBy?.toLowerCase()
              : msg.SentBy?.toLowerCase();

          // 3️⃣ Find sender name from allUsers
          const userData = allUsers.find(
            (u) => u.Email?.toLowerCase() === senderEmail
          );

          // 4️⃣ Use full name → fallback to email if not found
          const senderName = userData?.Name || senderEmail || "You";

          const messageText = msg.Message || "";

          onNotify(targetId, senderName, messageText);
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
    }).then(() => console.log("Marked seen:", msg.ID));
  };

  const handleChannelClick = (channel) => {
    onSelectChat(channel);
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
            setShowModal(false);
            onSelectChat(newChannel);
          }}
        />
      )}

      {/* New Conversation Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 relative">
            <button
              onClick={() => setShowSearchModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
            >
              ✖
            </button>
            <h3 className="font-bold text-xl mb-4 text-gray-800">
              Start New Conversation
            </h3>
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full mb-3 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="max-h-60 overflow-y-auto">
              {allUsers
                .filter(
                  (u) =>
                    !activeConversations.some((c) => c.Email === u.Email) &&
                    u.Email.toLowerCase() !== currentUser.toLowerCase() &&
                    u.Name.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((user) => (
                  <div
                    key={user.ID}
                    onClick={() => {
                      handlePersonClick(user);
                      setShowSearchModal(false);
                    }}
                    className="cursor-pointer px-3 py-2 hover:bg-gray-100 rounded flex items-center"
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
                      hasHighlight
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
                      hasHighlight
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
                {searchTerm ? "No matching users" : "No conversations yet"}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
