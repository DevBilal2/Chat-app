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
  setActiveChannel,
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

    setMessages(filtered);
  }, [activeChannel, activePerson, allMessages, currentUser]);

  // ========================
  // Handle pin/unpin a message
  // ========================
  const handlePinToggle = (msg) => {
    const newPin = msg.Pin === true || msg.Pin === "true" ? false : true;

    setMessages((prev) =>
      prev.map((m) => (m.ID === msg.ID ? { ...m, Pin: newPin } : m))
    );
    dispatch(updateMessage({ id: msg.ID, changes: { Pin: newPin } }));

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

  // ========================
  // Handle send message
  // ========================

  const handleSendMessage = async ({ text, file }) => {
    const messageText = text || "";
    const lowerText = messageText.toLowerCase();

    if (!messageText && !file) return; // nothing to send

    const mentionDetected = allUsers.some((u) =>
      lowerText.includes(`@${u.Name?.toLowerCase()}`)
    );
    const Mentioned = mentionDetected ? "true" : "false";
    const Notified = "false";

    const tempId = Date.now().toString();
    const tempMsg = {
      ID: tempId,
      Message: messageText,
      SentBy: currentUser,
      Added_Time: formatZohoDateTime(new Date()),
      local: true,
      Mentioned,
      Notified,
      Pin: "false",
      File: file ? file.name : null, // store filename locally
    };

    setLocalMessages((prev) => [...prev, tempMsg]);
    dispatch(addMessage(tempMsg));

    const isChannel = !!activeChannel;
    const payload = isChannel
      ? {
          IDC: activeChannel.IDC,
          ChannelName: activeChannel.ChannelName,
          Message: messageText,
          SentBy: currentUser,
          RecievedByC: activeChannel.RecievedByC,
          Need_Highlight: Mentioned,
          Already_Highlighted: Notified,
        }
      : {
          SentBy: currentUser,
          RecievedBy: activePerson.Email,
          Message: messageText,
          Need_Highlight: Mentioned,
          Already_Highlighted: Notified,
        };

    // Add record to Zoho
    console.log("file : ", file);
    ZOHO.CREATOR.DATA.addRecords({
      app_name: "admiral-field-portal",
      form_name: isChannel ? "ChannelsHiddenForm" : "PersonToPersonHiddenForm",
      payload: { data: payload },
    }).then((res) => {
      console.log("Record created:", res);

      const recordId = res.data && res.data.ID;
      console.log(recordId);
      // Upload file if attached
      var config1 = {
        app_name: "admiral-field-portal",
        report_name: "ChannelsHiddenForm_Report",
        id: recordId,
        field_name: "File_upload",
        file: file,
      };
      console.log(config1);
      if (recordId && file) {
        ZOHO.CREATOR.FILE.uploadFile(config1).then(function (response) {
          console.log("File uploaded:", response);
        });
      }

      // Remove temp message
      setLocalMessages((prev) => prev.filter((m) => m.ID !== tempId));
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

  // ========================
  // Filter messages by search term
  // ========================
  const filteredMessages = combinedMessages.filter((msg) => {
    if (!searchTerm) return true;
    const lower = searchTerm.toLowerCase();
    return (
      msg.Message?.toLowerCase().includes(lower) ||
      msg.SentBy?.toLowerCase().includes(lower) ||
      msg.RecievedBy?.toLowerCase().includes(lower)
    );
  });
  const handleAddMember = async (emails, action = "add") => {
    console.log("Handling emails:", emails, "Action:", action);

    if (!emails || emails.length === 0) return;

    // Normalize input
    const emailsArray = emails
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (emailsArray.length === 0) return;

    const currentEmail = currentUser.toLowerCase(); // optional: exclude self if needed

    // Existing members
    const existingMembers = activeChannel.RecievedByC
      ? activeChannel.RecievedByC.split(",").map((e) => e.trim().toLowerCase())
      : [];

    let updatedMembers = [];

    if (action === "add") {
      // Add emails
      updatedMembers = [...new Set([...existingMembers, ...emailsArray])];
    } else if (action === "remove") {
      // Remove emails
      updatedMembers = existingMembers.filter((e) => !emailsArray.includes(e));
    }

    const memberString = updatedMembers.join(",");

    const payload = {
      app_name: "admiral-field-portal",
      report_name: "ChannelsHiddenForm_Report",
      id: activeChannel.ID,
      payload: { data: { RecievedByC: memberString } },
    };

    console.log("Payload to Zoho:", payload);

    ZOHO.CREATOR.DATA.updateRecordById(payload).then(() => {
      // Update state immediately
      setActiveChannel((prev) => ({ ...prev, RecievedByC: memberString }));

      if (action === "add") {
        alert("Member(s) added successfully!");
      } else if (action === "remove") {
        alert("You left the channel.");
      }
    });
  };

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

      <ChatHeader
        title={chatTitle}
        members={activeChannel?.RecievedByC || activePerson.Email}
        allUsers={allUsers}
        onAddMember={handleAddMember}
        currentUser={currentUser}
        setActiveChannel={setActiveChannel}
        isChannel={!!activeChannel}
      />
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
