/* global ZOHO */
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

/** Fetch all messages from Zoho */
/** Fetch all messages from Zoho */
export const fetchMessages = createAsyncThunk(
  "messages/fetchMessages",
  async (currentUser) => {
    let channelMessages = [];
    let personMessages = [];

    try {
      // Fetch channel messages
      const channelsRes = await ZOHO.CREATOR.DATA.getRecords({
        app_name: "admiral-field-portal",
        report_name: "ChannelsHiddenForm_Report",
      });

      channelMessages = (channelsRes?.data || []).map((msg) => ({
        ...msg,
        Need_Highlight: msg.Need_Highlight === "true",
        Already_Highlighted: msg.Already_Highlighted === "true",
        Pin: msg.Pin === "true",
      }));
    } catch (error) {
      console.warn("Error fetching channel messages:", error);
      // Continue with empty array for channel messages
    }

    try {
      // Fetch person-to-person messages (including bot messages)
      // Fetch all messages where user is sender, receiver, or bot messages where user is receiver
      const personRes = await ZOHO.CREATOR.DATA.getRecords({
        app_name: "admiral-field-portal",
        report_name: "PersonToPersonHiddenForm_Report",
        criteria: `(SentBy == "${currentUser}" || RecievedBy == "${currentUser}")`,
      });

      personMessages = (personRes?.data || []).map((msg) => {
        // Normalize BotCheck to handle both boolean and string
        const botCheck = msg.BotCheck === true || msg.BotCheck === "true" || String(msg.BotCheck || "").toLowerCase() === "true";
        return {
          ...msg,
          Need_Highlight: msg.Need_Highlight === "true",
          Already_Highlighted: msg.Already_Highlighted === "true",
          Pin: msg.Pin === "true",
          BotCheck: botCheck,
        };
      });
    } catch (error) {
      // Check if it's the "no records found" error (code 9280)
      if (error?.code === 9280) {
        console.log(
          "No person-to-person messages found for user:",
          currentUser
        );
        // This is not really an error - just no records match the criteria
        personMessages = [];
      } else {
        console.warn("Error fetching person messages:", error);
        // For other errors, also continue with empty array
      }
    }

    // Combine both arrays
    const allMsgs = [...channelMessages, ...personMessages];

    // Sort by time
    allMsgs.sort((a, b) => new Date(a.Added_Time) - new Date(b.Added_Time));

    console.log("Fetched messages:", allMsgs);
    return allMsgs;
  }
);

const messagesSlice = createSlice({
  name: "messages",
  initialState: {
    all: [],
    loading: false,
  },
  reducers: {
    markHighlighted: (state, action) => {
      const { id } = action.payload;
      const msg = state.all.find((m) => m.ID === id);
      if (msg) msg.Already_Highlighted = true;
    },
    addMessage: (state, action) => {
      const exists = state.all.find((m) => m.ID === action.payload.ID);
      if (!exists) {
        state.all.push({
          ...action.payload,
          fileUrl: action.payload.fileUrl || null, // for actual URL from Zoho
        });
      }
    },

    updateMessage: (state, action) => {
      // payload: { id, changes: { Pin: "true", ... } }
      const { id, changes } = action.payload;
      const msg = state.all.find((m) => m.ID === id);
      if (msg) Object.assign(msg, changes);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMessages.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading = false;

        const fetched = action.payload || [];
        const fetchedIds = new Set(fetched.map((m) => m.ID));

        // Get local/temp/failed messages BEFORE overwriting
        const localMsgs = (state.all || []).filter(
          (m) => m.local || m.sending || m.failed
        );

        const localsToKeep = localMsgs.filter((m) => !fetchedIds.has(m.ID));

        // Now safely merge
        state.all = [...fetched, ...localsToKeep].sort(
          (a, b) => new Date(a.Added_Time) - new Date(b.Added_Time)
        );
      });
  },
});

export const { markHighlighted, addMessage, updateMessage } =
  messagesSlice.actions;
export default messagesSlice.reducer;
