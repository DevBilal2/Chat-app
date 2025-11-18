// store/index.js
import { configureStore } from "@reduxjs/toolkit";
import messagesReducer from "./MessageSlice";

export const store = configureStore({
  reducer: {
    messages: messagesReducer,
  },
});
