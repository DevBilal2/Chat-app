/* global ZOHO */
import { useState, useEffect } from "react";
import Sidebar from "./Components/Sidebar";
import ChatContainer from "./Components/ChatContainer";

export default function App() {
  const [currentUser, setCurrentUser] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [activePerson, setActivePerson] = useState(null);
  const [loading, setLoading] = useState(true);

  // messages come from ChatContainer now
  const [chatMessages, setChatMessages] = useState([]);

  useEffect(() => {
    ZOHO.CREATOR.UTIL.getInitParams().then((res) => {
      if (res?.loginUser) setCurrentUser(res.loginUser);
    });
  }, []);

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

  const handleSelectPerson = (person) => {
    setActivePerson(person);
    setActiveChannel(null);
  };

  const handleSelectChannel = (channel) => {
    setActiveChannel(channel);
    setActivePerson(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Loading app data...
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden font-sans">
      <Sidebar
        allUsers={allUsers}
        currentUser={currentUser}
        messages={chatMessages} // get messages from ChatContainer
        activeChannel={activeChannel}
        activePerson={activePerson}
        onSelectPerson={handleSelectPerson}
        onSelectChat={handleSelectChannel}
      />

      <ChatContainer
        allUsers={allUsers}
        currentUser={currentUser}
        activeChannel={activeChannel}
        activePerson={activePerson}
        onMessagesUpdate={setChatMessages} // callback updates Sidebar
      />
    </div>
  );
}
