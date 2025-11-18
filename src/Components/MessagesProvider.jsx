// /* MessagesContext.js */
// import { createContext, useContext, useState, useEffect, useRef } from "react";

// /* global ZOHO */
// const MessagesContext = createContext();

// export function MessagesProvider({ children, currentUser }) {
//   const [allUsers, setAllUsers] = useState([]);
//   const [allMessages, setAllMessages] = useState([]);
//   const [loading, setLoading] = useState(true);

//   const allMessagesRef = useRef([]); // store messages in ref to avoid full rerender

//   // Fetch users once
//   useEffect(() => {
//     const fetchUsers = async () => {
//       try {
//         const usersRes = await ZOHO.CREATOR.DATA.getRecords({
//           app_name: "admiral-field-portal",
//           report_name: "All_Portal_Users",
//         });
//         setAllUsers(usersRes.data || []);
//       } catch (err) {
//         console.error("Error fetching users:", err);
//       }
//     };
//     fetchUsers();
//   }, []);

//   // Fetch messages (initial + interval)
//   useEffect(() => {
//     if (!currentUser) return;

//     let intervalId;

//     const fetchMessages = async () => {
//       try {
//         // CHANNEL MESSAGES
//         const channelsRes = await ZOHO.CREATOR.DATA.getRecords({
//           app_name: "admiral-field-portal",
//           report_name: "ChannelsHiddenForm_Report",
//         });
//         const channelsData = channelsRes.data || [];

//         const userChannels = channelsData.filter((chan) => {
//           const members = chan.RecievedByC || "";
//           return members
//             .split(",")
//             .map((m) => m.trim().toLowerCase())
//             .includes(currentUser.toLowerCase());
//         });

//         const channelMessages = channelsData
//           .filter((msg) =>
//             userChannels.some((c) => c.ChannelName === msg.ChannelName)
//           )
//           .map((msg) => ({
//             ...msg,
//             mentioned: msg.Need_Highlight === "true",
//             Already_Highlighted: msg.Already_Highlighted === "true",
//           }));

//         // PERSON MESSAGES
//         const personMsgsRes = await ZOHO.CREATOR.DATA.getRecords({
//           app_name: "admiral-field-portal",
//           report_name: "PersonToPersonHiddenForm_Report",
//           criteria: `(SentBy == "${currentUser}" || RecievedBy == "${currentUser}")`,
//         });

//         const personMessages = (personMsgsRes.data || []).map((msg) => ({
//           ...msg,
//           mentioned: msg.Need_Highlight === "true",
//           Already_Highlighted: msg.Already_Highlighted === "true",
//         }));

//         const allNewMsgs = [...channelMessages, ...personMessages].sort(
//           (a, b) =>
//             new Date(a.Added_Time || a.Created_Time) -
//             new Date(b.Added_Time || b.Created_Time)
//         );

//         // Only append messages that are not already in allMessagesRef
//         const existingIds = new Set(allMessagesRef.current.map((m) => m.ID));
//         const messagesToAdd = allNewMsgs.filter((m) => !existingIds.has(m.ID));

//         if (messagesToAdd.length > 0) {
//           allMessagesRef.current = [...allMessagesRef.current, ...messagesToAdd];
//           setAllMessages(allMessagesRef.current);
//         }

//       } catch (err) {
//         console.error("Error fetching messages:", err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchMessages(); // initial fetch
//     intervalId = setInterval(fetchMessages, 5000); // fetch every 5s

//     return () => clearInterval(intervalId);
//   }, [currentUser]);

//   return (
//     <MessagesContext.Provider value={{ allUsers, allMessages, loading }}>
//       {children}
//     </MessagesContext.Provider>
//   );
// }

// // Custom hook
// export function useMessages() {
//   return useContext(MessagesContext);
// }
