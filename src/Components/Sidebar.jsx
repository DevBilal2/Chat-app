/* global ZOHO */
import { useState, useEffect } from "react";
import ChannelModal from "./ChannelModal";

export default function Sidebar({
  onSelectPerson,
  onSelectChat,
  allUsers,
  allMessages: initialMessages = [],
  currentUser,
}) {
  const [showModal, setShowModal] = useState(false);
  const [ikeObmUsers, setIkeObmUsers] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [channels, setChannels] = useState([]);
  const [allMessages, setAllMessages] = useState(initialMessages);
  const [sidebarOpen, setSidebarOpen] = useState(false); // for small screens

  useEffect(() => {
    if (!currentUser) return;
    ZOHO.CREATOR.DATA.getRecords({
      app_name: "admiral-field-portal",
      report_name: "ChannelsHiddenForm_Report",
    })
      .then((res) => {
        const allChannels = res.data || [];
        const userChannels = allChannels
          .filter((chan) => {
            const members = chan.RecievedByC || "";
            return members
              .split(",")
              .map((m) => m.trim().toLowerCase())
              .includes(currentUser.toLowerCase());
          })
          .filter(
            (chan, index, self) =>
              index ===
              self.findIndex((c) => c.ChannelName === chan.ChannelName)
          );
        setChannels(userChannels);
      })
      .catch((err) => console.error("Error fetching channels:", err));
  }, [currentUser]);

  useEffect(() => {
    setIkeObmUsers(allUsers.filter((u) => u.Role === "IKE Admin"));
    setTechnicians(allUsers.filter((u) => u.Role === "Field Technician"));
  }, [allUsers]);

  const unreadHighlights = {};
  const myEmail = currentUser.toLowerCase();
  console.log(myEmail);
  const myName = allUsers
    .find((u) => u.Email.toLowerCase() === myEmail)
    ?.Name?.toLowerCase();
  console.log(myName);
  allMessages.forEach((msg) => {
    const needHighlight = String(msg.Need_Highlight).toLowerCase() === "true";
    const alreadyHighlighted =
      String(msg.Already_Highlighted).toLowerCase() === "true";
    if (!needHighlight || alreadyHighlighted) return;

    const messageText = (msg.Message || "").toLowerCase();
    if (msg.ChannelName && msg.RecievedByC) {
      const members = msg.RecievedByC.split(",").map((m) =>
        m.trim().toLowerCase()
      );
      if (myName && messageText.includes(`@${myName}`)) {
        unreadHighlights[msg.ChannelName] = true;
      }
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

  const handleChannelClick = (channel) => {
    onSelectChat(channel);
    setSidebarOpen(false); // close on small screens
    const updatedMessages = allMessages.map((msg) =>
      msg.ChannelName === channel.ChannelName
        ? { ...msg, Already_Highlighted: "true" }
        : msg
    );
    setAllMessages(updatedMessages);
    updatedMessages.forEach((msg) => {
      if (
        msg.ChannelName === channel.ChannelName &&
        String(msg.Need_Highlight).toLowerCase() === "true"
      ) {
        ZOHO.CREATOR.DATA.updateRecordById({
          app_name: "admiral-field-portal",
          report_name: "ChannelsHiddenForm_Report",
          id: msg.ID,
          payload: { data: { Already_Highlighted: "true" } },
        }).then(() => console.log("Channel message marked as seen:", msg.ID));
      }
    });
  };

  const handlePersonClick = (person) => {
    onSelectPerson(person);
    setSidebarOpen(false); // close on small screens
    const updatedMessages = allMessages.map((msg) =>
      !msg.ChannelName &&
      ((msg.SentBy?.toLowerCase() === person.Email.toLowerCase() &&
        msg.RecievedBy?.toLowerCase() === currentUser.toLowerCase()) ||
        (msg.RecievedBy?.toLowerCase() === person.Email.toLowerCase() &&
          msg.SentBy?.toLowerCase() === currentUser.toLowerCase()))
        ? { ...msg, Already_Highlighted: "true" }
        : msg
    );
    setAllMessages(updatedMessages);
    updatedMessages.forEach((msg) => {
      if (
        !msg.ChannelName &&
        String(msg.Need_Highlight).toLowerCase() === "true" &&
        ((msg.SentBy?.toLowerCase() === person.Email.toLowerCase() &&
          msg.RecievedBy?.toLowerCase() === currentUser.toLowerCase()) ||
          (msg.RecievedBy?.toLowerCase() === person.Email.toLowerCase() &&
            msg.SentBy?.toLowerCase() === currentUser.toLowerCase()))
      ) {
        ZOHO.CREATOR.DATA.updateRecordById({
          app_name: "admiral-field-portal",
          report_name: "PersonToPersonHiddenForm_Report",
          id: msg.ID,
          payload: { data: { Already_Highlighted: "true" } },
        }).then(() =>
          console.log("Person-to-person message marked as seen:", msg.ID)
        );
      }
    });
  };

  return (
    <>
      {showModal && (
        <ChannelModal
          onClose={() => setShowModal(false)}
          onChannelCreated={(newChannel) => {
            setChannels((prev) => [newChannel, ...prev]);
            setShowModal(false);
            onSelectChat(newChannel);
          }}
        />
      )}
      {/* Hamburger button for small screens */}
      <button
        className="sm:hidden fixed top-4 left-4 z-50 p-1 text-black rounded shadow"
        onClick={() => setSidebarOpen(true)}
      >
        ☰
      </button>

      {/* Sidebar overlay for small screens */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-200 bg-black/40 ${
          sidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      <div
        className={`fixed sm:relative z-50 top-0 left-0 h-full w-56 bg-[#23272a] text-white flex flex-col overflow-hidden transform transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
        }`}
      >
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2 ml-1">
              <h3 className="text-base font-semibold text-gray-200">
                Channels
              </h3>
              <button
                onClick={() => setShowModal(true)}
                className="text-lg px-2 bg-[#2c2f33] hover:bg-[#404249] rounded transition"
              >
                +
              </button>
            </div>
            {channels.length > 0 ? (
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

          <div className="mb-5">
            <h3 className="text-base font-semibold mb-2 text-gray-200">
              IKE / OBM
            </h3>
            {ikeObmUsers.length > 0 ? (
              ikeObmUsers.map((user) => {
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
              <p className="text-gray-400 text-xs">No IKE / OBM users found</p>
            )}
          </div>

          <div className="mb-2">
            <h3 className="text-sm font-semibold text-gray-200 mb-1">
              Technicians
            </h3>
            {technicians.length > 0 ? (
              technicians.map((tech) => {
                const hasHighlight = unreadHighlights[tech.Email];
                return (
                  <div
                    key={tech.ID}
                    onClick={() => handlePersonClick(tech)}
                    className={`cursor-pointer px-2 py-1 rounded flex justify-between items-center ${
                      hasHighlight
                        ? "bg-yellow-500/20 hover:bg-yellow-500/30"
                        : "hover:bg-[#404249]"
                    }`}
                  >
                    <span>@{tech.Name}</span>
                    {hasHighlight && (
                      <span className="ml-2 w-2 h-2 bg-yellow-400 rounded-full"></span>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-gray-400 text-xs">No Technicians found</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
