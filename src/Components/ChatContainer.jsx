/* global ZOHO */
import { useState, useEffect } from "react";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

export default function ChatContainer({
  activeChannel,
  activePerson,
  allUsers,
  allMessages,
  currentUser,
}) {
  const [messages, setMessages] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

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

  useEffect(() => {
    let msgs = [];
    if (activeChannel) {
      msgs = allMessages.filter(
        (msg) => msg.ChannelName === activeChannel.ChannelName
      );
    } else if (activePerson) {
      msgs = allMessages.filter(
        (msg) =>
          (msg.SentBy === currentUser &&
            msg.RecievedBy === activePerson.Email) ||
          (msg.SentBy === activePerson.Email && msg.RecievedBy === currentUser)
      );
    }
    msgs.sort((a, b) => new Date(a.Added_Time) - new Date(b.Added_Time));
    setMessages(msgs);
    setFilteredMessages(msgs);
  }, [activeChannel, activePerson, allMessages, currentUser]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredMessages(messages);
    } else {
      const lower = searchTerm.toLowerCase();
      setFilteredMessages(
        messages.filter(
          (msg) =>
            msg.Message?.toLowerCase().includes(lower) ||
            msg.SentBy?.toLowerCase().includes(lower) ||
            msg.RecievedBy?.toLowerCase().includes(lower) ||
            msg.RecievedByC?.toLowerCase().includes(lower)
        )
      );
    }
  }, [searchTerm, messages]);

  const handleMessageClick = async (msg) => {
    if (msg.Mentioned !== "true") return;
    const formName = msg.ChannelName
      ? "ChannelsHiddenForm"
      : "PersonToPersonHiddenForm";
    const config = {
      app_name: "admiral-field-portal",
      report_name: formName,
      id: msg.ID,
      payload: { data: { Mentioned: "false" } },
    };
    ZOHO.CREATOR.DATA.updateRecordById(config).then(() => {
      setMessages((prev) =>
        prev.map((m) => (m.ID === msg.ID ? { ...m, Mentioned: "false" } : m))
      );
      setFilteredMessages((prev) =>
        prev.map((m) => (m.ID === msg.ID ? { ...m, Mentioned: "false" } : m))
      );
    });
  };

  const handleSendMessage = async (text) => {
    if (!text) return;
    const lowerText = text.toLowerCase();
    const mentionDetected = allUsers.some((u) =>
      lowerText.includes(`@${u.Name?.toLowerCase()}`)
    );
    const Mentioned = mentionDetected ? "true" : "false";
    const Notified = "false";

    const newMsg = {
      Message: text,
      SentBy: currentUser,
      Added_Time: formatZohoDateTime(new Date()),
      local: true,
      Mentioned,
      Notified,
    };

    const updated = [...messages, newMsg].sort(
      (a, b) => new Date(a.Added_Time) - new Date(b.Added_Time)
    );
    setMessages(updated);
    setFilteredMessages(updated);

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
    }).then((res) => console.log("Message sent:", res));
  };

  const handlePinToggle = (msg) => {
    const updated = { ...msg, Pin: msg.Pin === "true" ? "false" : "true" };
    setMessages((prev) => prev.map((m) => (m.ID === msg.ID ? updated : m)));
    setFilteredMessages((prev) =>
      prev.map((m) => (m.ID === msg.ID ? updated : m))
    );

    const formName = msg.ChannelName
      ? "ChannelsHiddenForm_Report"
      : "PersonToPersonHiddenForm_Report";
    ZOHO.CREATOR.DATA.updateRecordById({
      app_name: "admiral-field-portal",
      report_name: formName,
      id: msg.ID,
      payload: { data: { Pin: updated.Pin } },
    }).then((response) => console.log("📌 Pin updated response:", response));
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
        <button></button>
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
        messages={filteredMessages}
        currentUser={currentUser}
        allUsers={allUsers}
        onMessageClick={handleMessageClick}
        onPinToggle={handlePinToggle}
      />
      <MessageInput onSend={handleSendMessage} members={allUsers} />
    </div>
  );
}
