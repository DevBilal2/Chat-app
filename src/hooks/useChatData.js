/* global ZOHO */
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useChatData(currentUser)
 *
 * - fetches users once
 * - polls messages every 5s
 * - preserves Already_Highlighted state by merging instead of replacing
 * - exposes updateMessage(id, partialUpdates) to update local copy immediately
 */
export default function useChatData(currentUser) {
  const [allUsers, setAllUsers] = useState([]);
  const [allMessages, setAllMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // keep authoritative list in ref so we can merge/append without losing old flags
  const messagesRef = useRef([]);

  // Fetch users once
  const fetchUsers = useCallback(async () => {
    try {
      const usersRes = await ZOHO.CREATOR.DATA.getRecords({
        app_name: "admiral-field-portal",
        report_name: "All_Portal_Users",
      });
      setAllUsers(usersRes.data || []);
    } catch (err) {
      console.error("useChatData.fetchUsers error:", err);
    }
  }, []);

  // Fetch messages (channels + person-to-person)
  const fetchMessagesOnce = useCallback(async () => {
    if (!currentUser) return [];
    try {
      const channelsRes = await ZOHO.CREATOR.DATA.getRecords({
        app_name: "admiral-field-portal",
        report_name: "ChannelsHiddenForm_Report",
      });
      const channelsData = channelsRes.data || [];

      // determine channels where currentUser is member
      const userChannels = channelsData.filter((chan) => {
        const members = chan.RecievedByC || "";
        return members
          .split(",")
          .map((m) => m.trim().toLowerCase())
          .includes(currentUser.toLowerCase());
      });

      const channelMessages = channelsData
        .filter((msg) =>
          userChannels.some((c) => c.ChannelName === msg.ChannelName)
        )
        .map((msg) => ({
          ...msg,
          Mentioned: msg.Need_Highlight === "true",
          Already_Highlighted: msg.Already_Highlighted === "true",
        }));

      const personMsgsRes = await ZOHO.CREATOR.DATA.getRecords({
        app_name: "admiral-field-portal",
        report_name: "PersonToPersonHiddenForm_Report",
        criteria: `(SentBy == "${currentUser}" || RecievedBy == "${currentUser}")`,
      });
      const personMessages = (personMsgsRes.data || []).map((msg) => ({
        ...msg,
        Mentioned: msg.Need_Highlight === "true",
        Already_Highlighted: msg.Already_Highlighted === "true",
      }));

      const merged = [...channelMessages, ...personMessages].sort(
        (a, b) =>
          new Date(a.Added_Time || a.Created_Time) -
          new Date(b.Added_Time || b.Created_Time)
      );

      return merged;
    } catch (err) {
      console.error("useChatData.fetchMessagesOnce error:", err);
      return [];
    }
  }, [currentUser]);

  // Merge fetched messages into messagesRef & set state only for new messages or changed flags
  const mergeFetchedMessages = useCallback((fetched) => {
    // map prev by ID
    const prevMap = {};
    messagesRef.current.forEach((m) => {
      prevMap[m.ID] = m;
    });

    // Build new merged list but preserve Already_Highlighted from prevMap when present
    const merged = fetched.map((m) => ({
      ...m,
      Already_Highlighted:
        prevMap[m.ID]?.Already_Highlighted ?? m.Already_Highlighted,
      Mentioned: m.Mentioned ?? prevMap[m.ID]?.Mentioned ?? false,
    }));

    // find new additions (by ID)
    const prevIds = new Set(messagesRef.current.map((m) => m.ID));
    const additions = merged.filter((m) => !prevIds.has(m.ID));

    // also check for updates to flag fields (Already_Highlighted / Mentioned) that differ from ref
    const changed = merged.filter((m) => {
      const prev = prevMap[m.ID];
      if (!prev) return false;
      return (
        String(prev.Already_Highlighted) !== String(m.Already_Highlighted) ||
        String(prev.Mentioned) !== String(m.Mentioned)
      );
    });

    if (additions.length === 0 && changed.length === 0) {
      // nothing to change
      return;
    }

    // Apply changes: prefer merged order (sorted)
    messagesRef.current = merged;
    setAllMessages(messagesRef.current);
  }, []);

  // Public: update a single message locally (preserve in ref)
  const updateMessage = useCallback((id, patch) => {
    const idx = messagesRef.current.findIndex((m) => m.ID === id);
    if (idx === -1) return;
    messagesRef.current[idx] = { ...messagesRef.current[idx], ...patch };
    setAllMessages([...messagesRef.current]);
  }, []);

  // Public: push a local message (e.g. when user sends, before server response)
  const pushLocalMessage = useCallback((msg) => {
    // avoid duplicate idless local messages mixing — just append
    messagesRef.current = [...messagesRef.current, msg];
    setAllMessages([...messagesRef.current]);
  }, []);

  // Initial load & polling
  useEffect(() => {
    if (!currentUser) return;

    let isMounted = true;
    let intervalId = null;

    const doFetch = async () => {
      if (!isMounted) return;
      setLoading(true);
      try {
        const fetched = await fetchMessagesOnce();
        // merge (preserves flags)
        mergeFetchedMessages(fetched);
      } catch (err) {
        console.error("useChatData.doFetch error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // fetch users once (independent)
    fetchUsers();

    // initial fetch
    doFetch();

    // poll every 5s
    intervalId = setInterval(doFetch, 5000);

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [currentUser, fetchMessagesOnce, fetchUsers, mergeFetchedMessages]);

  return {
    allUsers,
    allMessages,
    loading,
    updateMessage, // call to update a message locally
    pushLocalMessage, // push a new local message (send optimistic update)
    refetch: async () => {
      const fetched = await fetchMessagesOnce();
      mergeFetchedMessages(fetched);
    },
  };
}
