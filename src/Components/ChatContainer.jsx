/* global ZOHO */
import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { addMessage, updateMessage } from "../Store/MessageSlice";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

export default function ChatContainer({
  activeChannel,
  activePerson,
  allUsers,
  currentUser,
}) {
  const dispatch = useDispatch();
  const allMessages = useSelector((state) => state.messages.all);
  const [localMessages, setLocalMessages] = useState([]);
  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const combinedMessages = [...messages, ...localMessages];
  // ========================
  // Format date for Zoho
  // ========================
  const formatZohoDateTime = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  };

  // ========================
  // Filter messages for active chat
  // ========================
  useEffect(() => {
    let filtered = [];
    if (activeChannel) {
      filtered = allMessages.filter(
        (msg) => msg.ChannelName === activeChannel.ChannelName
      );
    } else if (activePerson) {
      filtered = allMessages.filter(
        (msg) =>
          (msg.SentBy === currentUser &&
            msg.RecievedBy === activePerson.Email) ||
          (msg.SentBy === activePerson.Email && msg.RecievedBy === currentUser)
      );
    }

    // Sort by date
    filtered.sort((a, b) => new Date(a.Added_Time) - new Date(b.Added_Time));

    // Merge local messages that might not exist in allMessages yet
    setMessages((prev) => {
      const existingIds = new Set(filtered.map((m) => m.ID));
      const newLocal = prev.filter((m) => m.local && !existingIds.has(m.ID));
      return [...filtered, ...newLocal];
    });
  }, [activeChannel, activePerson, allMessages, currentUser]);

  // ========================
  // Handle pin/unpin a message
  // ========================
  const handlePinToggle = (msg) => {
    const newPin = msg.Pin === true ? false : true;

    // Update local state
    setMessages((prev) =>
      prev.map((m) => (m.ID === msg.ID ? { ...m, Pin: newPin } : m))
    );

    // Update Redux
    dispatch(updateMessage({ id: msg.ID, changes: { Pin: newPin } }));

    // Update Zoho
    const formName = msg.ChannelName
      ? "ChannelsHiddenForm_Report"
      : "PersonToPersonHiddenForm_Report";

    ZOHO.CREATOR.DATA.updateRecordById({
      app_name: "admiral-field-portal",
      report_name: formName,
      id: msg.ID,
      payload: { data: { Pin: newPin } },
    }).then((res) => console.log("📌 Pin updated:", res));
  };

  // ========================
  // Handle message click (mention)
  // ========================
  const handleMessageClick = async (msg) => {
    if (msg.Mentioned !== "true") return;
    const formName = msg.ChannelName
      ? "ChannelsHiddenForm"
      : "PersonToPersonHiddenForm";

    await ZOHO.CREATOR.DATA.updateRecordById({
      app_name: "admiral-field-portal",
      report_name: formName,
      id: msg.ID,
      payload: { data: { Mentioned: "false" } },
    });

    dispatch(updateMessage({ id: msg.ID, changes: { Mentioned: "false" } }));
    setMessages((prev) =>
      prev.map((m) => (m.ID === msg.ID ? { ...m, Mentioned: "false" } : m))
    );
  };

  // ========================
  // Handle send message
  // ========================
  const handleSendMessage = async (text) => {
    if (!text) return;

    const lowerText = text.toLowerCase();
    const mentionDetected = allUsers.some((u) =>
      lowerText.includes(`@${u.Name?.toLowerCase()}`)
    );
    const Mentioned = mentionDetected ? "true" : "false";
    const Notified = "false";

    const tempMsg = {
      ID: Date.now().toString(), // temporary ID
      Message: text,
      SentBy: currentUser,
      Added_Time: formatZohoDateTime(new Date()),
      local: true,
      Mentioned,
      Notified,
      Pin: "false",
    };

    // 1️⃣ Immediately append locally
    setLocalMessages((prev) => [...prev, tempMsg]);

    // 2️⃣ Add to Redux (optional, keeps store updated)
    dispatch(addMessage(tempMsg));

    // 3️⃣ Send to backend
    const isChannel = !!activeChannel;
    const payload = isChannel
      ? {
          IDC: activeChannel.IDC,
          ChannelName: activeChannel.ChannelName,
          Message: text,
          SentBy: currentUser,
          RecievedByC: activeChannel.RecievedByC,
          Need_Highlight: Mentioned,
          Already_Highlighted: Notified,
        }
      : {
          SentBy: currentUser,
          RecievedBy: activePerson.Email,
          Message: text,
          Need_Highlight: Mentioned,
          Already_Highlighted: Notified,
        };

    ZOHO.CREATOR.DATA.addRecords({
      app_name: "admiral-field-portal",
      form_name: isChannel ? "ChannelsHiddenForm" : "PersonToPersonHiddenForm",
      payload: { data: payload },
    }).then((res) => {
      console.log("Message sent:", res);
      // remove temp message or replace ID with backend ID
      setLocalMessages((prev) => prev.filter((m) => m.ID !== tempMsg.ID));
    });
  };

  if (!activeChannel && !activePerson) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        Select a channel or person to start chatting 💬
      </div>
    );
  }

  const chatTitle = activeChannel
    ? activeChannel.ChannelName
    : activePerson?.Name || "Unknown User";

  return (
    <div className="flex flex-col flex-1 bg-gray-50">
      <div className="flex items-center justify-center border-b border-gray-300 bg-gray-100 p-3">
        <input
          type="text"
          placeholder="Search messages or users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-3/5 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <ChatHeader title={chatTitle} />
      <MessageList
        messages={combinedMessages}
        currentUser={currentUser}
        allUsers={allUsers}
        onMessageClick={handleMessageClick}
        onPinToggle={handlePinToggle}
      />

      <MessageInput onSend={handleSendMessage} members={allUsers} />
    </div>
  );
}
