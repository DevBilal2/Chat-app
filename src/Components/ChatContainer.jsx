// =========================================================================================
// REVISED ChatContainer.jsx
// The main changes are within the handleSendMessage function.
// The useState for localMessages is kept for now, but its usage inside handleSendMessage is removed.
// =========================================================================================

/* global ZOHO */
import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { addMessage, updateMessage } from "../Store/MessageSlice";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { fetchMessages } from "../Store/MessageSlice";
export default function ChatContainer({
  activeChannel,
  activePerson,
  allUsers,
  currentUser,
  setActiveChannel,
  scrollToMessageId,
  onScrollComplete,
}) {
  const dispatch = useDispatch();
  const allMessages = useSelector((state) => state.messages.all);
  // Keep localMessages, but stop adding to it in handleSendMessage
  const [localMessages, setLocalMessages] = useState([]);
  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const combinedMessages = [...messages, ...localMessages];

  // ... (formatZohoDateTime function remains the same) ...
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
  // ... (useEffect for message filtering remains the same) ...
  useEffect(() => {
    if (!currentUser) return;

    dispatch(fetchMessages(currentUser));
  }, [activeChannel, currentUser]);
  useEffect(() => {
    let filtered = [];
    if (activeChannel) {
      filtered = allMessages.filter(
        (msg) => msg.ChannelName === activeChannel.ChannelName
      );
    } else if (activePerson) {
      filtered = allMessages.filter(
        (msg) => {
          // Regular user messages
          if ((msg.SentBy === currentUser &&
               msg.RecievedBy === activePerson.Email) ||
              (msg.SentBy === activePerson.Email && msg.RecievedBy === currentUser)) {
            return true;
          }
          
          // Bot messages - if activePerson is a bot
          if (activePerson.IsBot) {
            const isBotMessage = msg.SentBy === "" || !msg.SentBy;
            const botCheck = msg.BotCheck === true || msg.BotCheck === "true" || String(msg.BotCheck).toLowerCase() === "true";
            
            if (isBotMessage && 
                botCheck &&
                msg.BotName === activePerson.Name &&
                msg.RecievedBy === currentUser) {
              return true;
            }
          }
          
          return false;
        }
      );
    }

    filtered.sort((a, b) => {
      // 1. Primary Sort: Time (in milliseconds)
      const timeA = new Date(a.Added_Time).getTime();
      const timeB = new Date(b.Added_Time).getTime();

      if (timeA !== timeB) {
        return timeA - timeB;
      }

      // 2. Secondary Sort (Tie-Breaker): ID (String Comparison)
      // This is safer for long numeric IDs from a database, as it sorts lexicographically.
      // The earlier message will have the "smaller" ID string.
      if (a.ID < b.ID) {
        return -1; // a comes before b
      }
      if (a.ID > b.ID) {
        return 1; // a comes after b
      }
      return 0; // IDs are identical (should not happen)
    });

    setMessages(filtered);
  }, [activeChannel, activePerson, allMessages, currentUser]);

  // ... (handlePinToggle and handleMessageClick functions remain the same) ...

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

  // ===================================
  // ✅ REVISED handleSendMessage
  // Removed local (optimistic) updates.
  // ===================================

  // Extract mentioned user emails from message text
  const extractMentionedEmails = (text) => {
    if (!text || !allUsers.length) return "";
    
    const mentionedEmails = [];
    
    // First, extract plain text from HTML if needed (remove HTML tags)
    let plainText = text;
    if (text.includes('<') || text.includes('>')) {
      // Create a temporary div to extract text content from HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = text;
      plainText = tempDiv.textContent || tempDiv.innerText || text;
    }
    
    // Extract all mentioned usernames from the text (including parentheses)
    // Matches: @Preston, @Preston (Test Tech), @John Doe, @John Doe (Title)
    const mentionRegex = /@([\w]+(?:\s+[\w]+)*(?:\s*\([^)]+\))?)/g;
    let match;
    const mentionedNames = [];
    
    mentionRegex.lastIndex = 0;
    while ((match = mentionRegex.exec(plainText)) !== null) {
      const mentionName = match[1].trim();
      // Keep the full mention including parentheses (e.g., "Preston (Test Tech)")
      if (mentionName && !mentionedNames.some(m => m.toLowerCase() === mentionName.toLowerCase())) {
        mentionedNames.push(mentionName);
      }
    }
    
    // Match mentioned names to users and get their emails
    mentionedNames.forEach((mentionName) => {
      const mentionLower = mentionName.toLowerCase();
      
      const matchedUser = allUsers.find((user) => {
        if (!user.Name || !user.Email) return false;
        const userName = user.Name.trim().toLowerCase();
        
        // Exact match (handles "Preston" matching "Preston")
        if (userName === mentionLower) return true;
        
        // Match if mention includes user's name (e.g., "Preston (Test Tech)" matches "Preston")
        // Remove parentheses from mention for comparison
        const mentionWithoutParens = mentionLower.replace(/\s*\([^)]+\)$/, '').trim();
        if (userName === mentionWithoutParens) return true;
        
        // Check if mention is the start of user's name (e.g., "John" matches "John Doe")
        if (userName.startsWith(mentionLower + " ")) return true;
        
        // Check if user's name starts with mention (e.g., "John Doe" matches "John")
        if (mentionLower.startsWith(userName + " ")) return true;
        
        // Check if mention without parentheses starts with user's name
        if (mentionWithoutParens.startsWith(userName + " ")) return true;
        
        return false;
      });
      
      if (matchedUser && matchedUser.Email) {
        // Avoid duplicate emails
        if (!mentionedEmails.includes(matchedUser.Email)) {
          mentionedEmails.push(matchedUser.Email);
        }
      }
    });
    
    return mentionedEmails.join(",");
  };

  const handleSendMessage = async ({ text, file, callback }) => {
    const messageText = text || "";
    const lowerText = messageText.toLowerCase();

    if (!messageText && !file) return; // nothing to send

    const mentionDetected = allUsers.some((u) =>
      lowerText.includes(`@${u.Name?.toLowerCase()}`)
    );
    const Mentioned = mentionDetected ? "true" : "false";
    const Notified = "false";
    
    // Extract mentioned emails
    const mentionedEmails = extractMentionedEmails(messageText);

    const isChannel = !!activeChannel;
    const formName = isChannel
      ? "ChannelsHiddenForm"
      : "PersonToPersonHiddenForm";

    const payload = isChannel
      ? {
          IDC: activeChannel.IDC,
          ChannelName: activeChannel.ChannelName,
          Message: messageText,
          SentBy: currentUser,
          RecievedByC: activeChannel.RecievedByC,
          Need_Highlight: Mentioned,
          Already_Highlighted: Notified,
          Mentioned_Emails: mentionedEmails,
        }
      : {
          SentBy: currentUser,
          RecievedBy: activePerson.Email,
          Message: messageText,
          Need_Highlight: Mentioned,
          Already_Highlighted: Notified,
          Mentioned_Emails: mentionedEmails,
        };

    // Add record to Zoho
    console.log("file : ", file);
    ZOHO.CREATOR.DATA.addRecords({
      app_name: "admiral-field-portal",
      form_name: formName,
      payload: { data: payload },
    }).then((res) => {
      console.log("Record created:", res);

      const recordId = res.data && res.data.ID;
      console.log(recordId);
      const completeSend = () => {
        // 1. Turn off the loader in MessageInput
        if (callback) callback();
        // 2. Fetch the newly added message from the server
        dispatch(fetchMessages(currentUser));
      };
      // Upload file if attached
      if (recordId && file) {
        // NOTE: The report_name must match the form used in addRecords for the file upload to work.
        // It looks like you're using 'ChannelsHiddenForm_Report' for both person and channel in your original file upload logic,
        // which might be incorrect if you have separate forms/reports. Assuming the Channel form report name is used here as a placeholder.
        var config1 = {
          app_name: "admiral-field-portal",
          report_name: isChannel
            ? "ChannelsHiddenForm_Report"
            : "PersonToPersonHiddenForm_Report", // Adjusted based on formName
          id: recordId,
          field_name: "File_upload",
          file: file,
        };
        console.log(config1);
        ZOHO.CREATOR.FILE.uploadFile(config1).then(function (response) {
          console.log("File uploaded:", response);

          completeSend();
          // *** IMPORTANT: The message will only appear after the file upload and successful data refresh
          // (which presumably happens elsewhere in your app, e.g., a Redux action triggered by a webhook/polling).
        });
      } else {
        // No file to upload, just complete the send process
        completeSend();
      }

      // *** REMOVED: setLocalMessages((prev) => prev.filter((m) => m.ID !== tempId));
      // *** REMOVED: The temporary message creation and local state/Redux dispatch are gone.
      // The message will now appear when the Zoho API confirms it and triggers a global state update.
    });
  };

  if (!activeChannel && !activePerson) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 px-4 text-center">
        <div className="max-w-xs">
          <p className="text-lg font-medium mb-2">No Conversation Selected</p>
          <p className="text-sm">
            Tap or click a channel or person to start chatting 💬
          </p>
        </div>
      </div>
    );
  }

  const chatTitle = activeChannel
    ? activeChannel.ChannelName
    : activePerson?.IsBot 
      ? activePerson.Name 
      : activePerson?.Name || "Unknown User";

  // ... (filteredMessages and handleAddMember functions remain the same) ...
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
      dispatch(fetchMessages(currentUser));
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
          className="w-3/5 rounded-md border border-gray-300 px-3 py-2 text-[16px] text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <ChatHeader
        title={chatTitle}
        members={activeChannel?.RecievedByC || (activePerson?.IsBot ? "" : activePerson?.Email)}
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
        scrollToMessageId={scrollToMessageId}
        onScrollComplete={onScrollComplete}
      />

      {!activePerson?.IsBot && (
        <MessageInput
          onSend={handleSendMessage}
          members={allUsers}
          currentUser={currentUser}
          activeChannel={activeChannel}
          onAddMember={handleAddMember}
        />
      )}
      {activePerson?.IsBot && (
        <div className="border-t bg-gray-100 p-4 text-center text-gray-500 text-sm">
          This is a bot conversation. You can only receive messages, not send them.
        </div>
      )}
    </div>
  );
}
