/* global ZOHO */
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

/** Fetch all messages from Zoho */
export const fetchMessages = createAsyncThunk(
  "messages/fetchMessages",
  async (currentUser) => {
    const channelsRes = await ZOHO.CREATOR.DATA.getRecords({
      app_name: "admiral-field-portal",
      report_name: "ChannelsHiddenForm_Report",
    });
    const personRes = await ZOHO.CREATOR.DATA.getRecords({
      app_name: "admiral-field-portal",
      report_name: "PersonToPersonHiddenForm_Report",
      criteria: `(SentBy == "${currentUser}" || RecievedBy == "${currentUser}")`,
    });

    const allMsgs = [
      ...channelsRes.data.map((msg) => ({
        ...msg,
        Need_Highlight: msg.Need_Highlight === "true",
        Already_Highlighted: msg.Already_Highlighted === "true",
        Pin: msg.Pin === "true",
      })),
      ...personRes.data.map((msg) => ({
        ...msg,
        Need_Highlight: msg.Need_Highlight === "true",
        Already_Highlighted: msg.Already_Highlighted === "true",
        Pin: msg.Pin === "true",
      })),
    ].sort((a, b) => new Date(a.Added_Time) - new Date(b.Added_Time));

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
      // Avoid duplicates: check by ID
      const exists = state.all.find((m) => m.ID === action.payload.ID);
      if (!exists) state.all.push(action.payload);
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
        state.all = action.payload;
        state.loading = false;
      })
      .addCase(fetchMessages.rejected, (state) => {
        state.loading = false;
      });
  },
});

export const { markHighlighted, addMessage, updateMessage } =
  messagesSlice.actions;
export default messagesSlice.reducer;
