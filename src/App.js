/* global ZOHO */
import { useState, useEffect } from "react";
import Sidebar from "./Components/Sidebar";
import ChatContainer from "./Components/ChatContainer";

export default function App() {
  const [currentUser, setCurrentUser] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [allMessages, setAllMessages] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [activePerson, setActivePerson] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ZOHO.CREATOR.UTIL.getInitParams().then((res) => {
      if (res?.loginUser) setCurrentUser(res.loginUser);
    });
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const fetchAllData = async () => {
      setLoading(true);
      try {
        const usersRes = await ZOHO.CREATOR.DATA.getRecords({
          app_name: "admiral-field-portal",
          report_name: "All_Portal_Users",
        });
        const users = usersRes.data || [];
        setAllUsers(users);

        const channelsRes = await ZOHO.CREATOR.DATA.getRecords({
          app_name: "admiral-field-portal",
          report_name: "ChannelsHiddenForm_Report",
        });
        const channelsData = channelsRes.data || [];

        const userChannels = channelsData.filter((chan) => {
          const members = chan.RecievedByC || "";
          return members
            .split(",")
            .map((m) => m.trim().toLowerCase())
            .includes(currentUser.toLowerCase());
        });

        const channelMessages = channelsData
          .filter((msg) => userChannels.some((c) => c.ChannelName === msg.ChannelName))
          .map((msg) => ({
            ...msg,
            mentioned: msg.Need_Highlight === "true",
            Already_Highlighted: msg.Already_Highlighted === "true",
          }));

        const personMsgsRes = await ZOHO.CREATOR.DATA.getRecords({
          app_name: "admiral-field-portal",
          report_name: "PersonToPersonHiddenForm_Report",
          criteria: `(SentBy == "${currentUser}" || RecievedBy == "${currentUser}")`,
        });

        const personMessages = (personMsgsRes.data || []).map((msg) => ({
          ...msg,
          mentioned: msg.Need_Highlight === "true",
          Already_Highlighted: msg.Already_Highlighted === "true",
        }));

        const allMsgs = [...channelMessages, ...personMessages].sort(
          (a, b) =>
            new Date(a.Added_Time || a.Created_Time) - new Date(b.Added_Time || b.Created_Time)
        );

        const messagesToHighlight = allMsgs.filter(
          (msg) => msg.Need_Highlight === "true" && msg.Already_Highlighted !== "true"
        );
        console.log("🟡 Messages that need highlighting:", messagesToHighlight);

        setAllMessages(allMsgs);
      } catch (err) {
        console.error("Error fetching app data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
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
        allMessages={allMessages}
        currentUser={currentUser}
        onSelectPerson={handleSelectPerson}
        onSelectChat={handleSelectChannel}
      />
      <ChatContainer
        allMessages={allMessages}
        currentUser={currentUser}
        activeChannel={activeChannel}
        activePerson={activePerson}
        allUsers={allUsers}
      />
    </div>
  );
}
