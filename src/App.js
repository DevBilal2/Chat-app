/* global ZOHO */
import { useState, useEffect } from "react";
import Sidebar from "./Components/Sidebar";
import ChatContainer from "./Components/ChatContainer";
import Notification from "./Components/Notification";
export default function App() {
  const [currentUser, setCurrentUser] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [activePerson, setActivePerson] = useState(null);
  const [loading, setLoading] = useState(true);

  const [chatMessages, setChatMessages] = useState([]);

  // 🔔 Keep track of notifications by chat target (email or channel)
  const [notifications, setNotifications] = useState({});

  // 🟢 Top notification banner
  const [topNotification, setTopNotification] = useState("");

  // ========== Load Initial User ==========
  useEffect(() => {
    ZOHO.CREATOR.UTIL.getInitParams().then((res) => {
      if (res?.loginUser) setCurrentUser(res.loginUser);
    });
  }, []);

  // ========== Load All Users ==========
  useEffect(() => {
    if (!currentUser) return;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const usersRes = await ZOHO.CREATOR.DATA.getRecords({
          app_name: "admiral-field-portal",
          report_name: "All_Portal_Users",
        });
        setAllUsers(usersRes.data || []);
      } catch (err) {
        console.error("Error fetching users:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentUser]);

  // ========== Handle Selecting a Person ==========
  const handleSelectPerson = (person) => {
    setActivePerson(person);
    setActiveChannel(null);

    // 🔕 Clear notifications for this person
    setNotifications((prev) => ({
      ...prev,
      [person.Email]: 0,
    }));
  };

  // ========== Handle Selecting a Channel ==========
  const handleSelectChannel = (channel) => {
    setActiveChannel(channel);
    setActivePerson(null);

    // 🔕 Clear notifications for this channel
    setNotifications((prev) => ({
      ...prev,
      [channel.ChannelName]: 0,
    }));
  };
  const handleCloseNotification = () => setTopNotification("");
  // 🔔 Trigger a notification
  const handleNotify = (targetId, senderName, messageText) => {
    // Increment notification count
    setNotifications((prev) => ({
      ...prev,
      [targetId]: (prev[targetId] || 0) + 1,
    }));

    // Show top banner
    setTopNotification(`${senderName} mentioned you: "${messageText}"`);
    setTimeout(() => setTopNotification(""), 4000); // auto-hide after 4s
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Loading app data...
      </div>
    );
  }
  console.log(topNotification);
  return (
    <div className="flex h-screen overflow-hidden font-sans relative">
      {/* Top Notification */}
      {topNotification && (
        <Notification
          message={topNotification}
          onClose={handleCloseNotification}
        />
      )}

      <Sidebar
        allUsers={allUsers}
        currentUser={currentUser}
        messages={chatMessages}
        notifications={notifications} // Pass notifications to sidebar
        activeChannel={activeChannel}
        activePerson={activePerson}
        onSelectPerson={handleSelectPerson}
        onSelectChat={handleSelectChannel}
        onNotify={(targetId, senderName, messageText) =>
          handleNotify(targetId, senderName, messageText)
        }
      />

      <ChatContainer
        allUsers={allUsers}
        currentUser={currentUser}
        activeChannel={activeChannel}
        activePerson={activePerson}
        onMessagesUpdate={setChatMessages}
        // Pass notification handler
      />
    </div>
  );
}
