import { useState, useRef, useEffect } from "react";
import { useDispatch } from "react-redux";
import { fetchMessages } from "../Store/MessageSlice";
import {
  FiPaperclip,
  FiSend,
  FiX,
  FiFile,
  FiMic,
  FiSquare,
  FiTrash2,
  FiBold,
  FiItalic,
  FiLink,
  FiList,
  FiType,
  FiCode,
  FiSmile,
} from "react-icons/fi";

// Simple list of emojis for a basic picker
const EMOJIS = [
  "😀",
  "😁",
  "😂",
  "🤣",
  "😊",
  "😇",
  "🥰",
  "😍",
  "😎",
  "🥳",
  "👍",
  "🙌",
  "🔥",
  "💡",
  "🚀",
];
const Loader = () => (
  <svg
    className="animate-spin h-5 w-5 text-white"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);
export default function MessageInput({ onSend, members, currentUser }) {
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [tagStartIndex, setTagStartIndex] = useState(-1);
  const [currentText, setCurrentText] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [attachedFile, setAttachedFile] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);
  // Voice states
  const [isRecording, setIsRecording] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioURL, setAudioURL] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const dispatch = useDispatch();

  // Timer for recording
  useEffect(() => {
    let timer;
    if (isRecording) {
      timer = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const Waveform = () => (
    <div className="flex space-x-1 items-end h-6">
      {[4, 8, 12, 8, 4].map((h, i) => (
        <div
          key={i}
          className="w-1 bg-red-500 animate-pulse"
          style={{ height: `${h + Math.random() * 10}px` }}
        />
      ))}
    </div>
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const emojiToDeluge = (emoji) => {
    const codePoint = emoji.codePointAt(0).toString(16);
    return `\\u{${codePoint}}`;
  };
  const moveCaretToEnd = (el, addSpace = false) => {
    el.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false); // move to end

    // Add a space if needed
    if (addSpace && el.innerText && !el.innerText.endsWith(" ")) {
      el.innerHTML += " ";
    }

    selection.removeAllRanges();
    selection.addRange(range);
  };

  const renderWithMentionsHtml = (plain) => {
    if (!plain) return "";

    const escapeHtml = (str) =>
      str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); // --- 🚀 FIX: New regex to capture @ followed by multiple word characters and spaces --- // It looks for @ followed by at least one word character, optionally followed by (space + one or more word characters). // This handles names like "@John Doe" while stopping at punctuation or a double space.

    const mentionRegex = /(\s|^)(@[\w]+(?:\s[\w]+)*)/g;

    return plain.replace(mentionRegex, (match, leadingSpace, namePart) => {
      const escapedMention = escapeHtml(namePart.trim());

      return `${leadingSpace}<span data-mention class="inline-block px-1 rounded text-blue-700 font-semibold">${escapedMention}</span>`;
    });
  };

  const handleInput = () => {
    const el = editorRef.current;
    if (!el) return;
    const plain = el.innerText || "";
    setCurrentText(plain);

    const atIndex = plain.lastIndexOf("@");
    if (atIndex !== -1 && (atIndex === 0 || plain[atIndex - 1] === " ")) {
      const query = plain.slice(atIndex + 1).toLowerCase();
      setTagStartIndex(atIndex);
      const filtered = members.filter((m) =>
        m.Name?.toLowerCase().includes(query)
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedIndex(0);
    } else {
      // --- 🔥 FIX 1: Explicitly clean up DOM when mention is inactive ---
      if (tagStartIndex !== -1) {
        el.innerHTML = plain; // Replaces current HTML with pure plain text
        moveCaretToEnd(el); // Restore caret position after cleanup
      } // -----------------------------------------------------------------
      setTagStartIndex(-1);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (member) => {
    const el = editorRef.current;
    if (!el || tagStartIndex === -1) return;

    const plain = currentText; // --- 🚀 FIX: Use the member's full name (including space) ---

    const fullName = member.Name || "";
    const mention = `@${fullName}`; // E.g., "@John Doe" // ------------------------ // 1. Determine the query part to replace (everything from @ to the next space or line break)
    const queryPart = plain.substring(tagStartIndex + 1).split(/[\s\n]/)[0]; // 2. Calculate the end index of the text being replaced in the original plain text

    const replaceEndIndex = tagStartIndex + 1 + queryPart.length; // 3. Get the text that comes *before* the '@' symbol.

    const textBefore = plain.substring(0, tagStartIndex); // 4. Get the preserved text *after* the query that was replaced.
    const textAfter = plain.substring(replaceEndIndex).trimStart(); // 5. Construct the new content: Text before + full mention + space + text after
    const newPlain = textBefore + mention + " " + textAfter; // Re-render the editor content

    el.innerHTML = renderWithMentionsHtml(newPlain); // Update the state and hide suggestions

    setCurrentText(newPlain);
    setShowSuggestions(false);
    setTagStartIndex(-1); // Move caret to the end

    moveCaretToEnd(el);
  };
  const handleFileChange = (e) => {
    setAttachedFile(e.target.files[0]);
    e.target.value = null;
  };

  const handleRemoveFile = () => setAttachedFile(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let options = {};

      if (MediaRecorder.isTypeSupported("audio/mp3")) {
        options.mimeType = "audio/mp3"; // iPhone supported
      } else if (MediaRecorder.isTypeSupported("audio/aac")) {
        options.mimeType = "audio/aac"; // fallback for Safari
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        options.mimeType = "audio/webm"; // desktop + Android
      }

      mediaRecorderRef.current = new MediaRecorder(stream, options);

      mediaRecorderRef.current = new MediaRecorder(stream, options);
      let chunks = [];

      mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        let mimeType = "audio/webm";

        if (MediaRecorder.isTypeSupported("audio/mp3")) {
          mimeType = "audio/mp3";
        } else if (MediaRecorder.isTypeSupported("audio/aac")) {
          mimeType = "audio/aac";
        }

        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);

        setAudioBlob(blob);
        setAudioURL(url);
        setIsPreview(true);
      };
      mediaRecorderRef.current.start();
      setRecordingTime(0);
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access denied:", err);
    }
  };

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream; // Exclude Windows 10 Edge
  const isSafari =
    /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
  };

  const resetVoiceState = () => {
    setAudioBlob(null);
    setAudioURL("");
    setIsPreview(false);
    setIsRecording(false);
    setRecordingTime(0);
  };

  const sendAudio = () => {
    if (!audioBlob) return;
    setIsSending(true);

    // Force mp4 for iOS / Safari
    const mimeType = "audio/mp3";
    const fileName = "voice-message.mp3";

    const audioFile = new File([audioBlob], fileName, { type: mimeType });
    onSend({
      text: "",
      file: audioFile,
      callback: () => setIsSending(false),
    });
    resetVoiceState();
  };

  const handleSend = () => {
    const plainText = editorRef.current.innerText.trim();
    const htmlText = editorRef.current.innerHTML.trim();
    const file = attachedFile;
    const audio = audioBlob;

    if (!plainText && !file && !audio) return;

    if (audioBlob && isPreview) return sendAudio();
    setIsSending(true);
    const delugeText = htmlText.replace(/([\p{Emoji}])/gu, (match) =>
      emojiToDeluge(match)
    );

    onSend({
      text: delugeText,
      file,
      callback: () => {
        setTimeout(() => dispatch(fetchMessages(currentUser)), 300);
        setIsSending(false);
      },
    });

    editorRef.current.innerHTML = "";
    setAttachedFile(null);
    setCurrentText("");
    setShowSuggestions(false);
    setTagStartIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + suggestions.length) % suggestions.length
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        selectSuggestion(suggestions[selectedIndex]);
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getFileName = (file) => {
    if (typeof file === "string") return file.split("/").pop();
    return file.name || "Attached File";
  };

  const getFileExtension = (file) => {
    const name = getFileName(file);
    return name.split(".").pop().toUpperCase();
  };

  const isInputEmpty =
    !attachedFile && !audioBlob && (!currentText || currentText.trim() === "");

  const executeCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current.focus();
  };

  const insertEmoji = (emoji) => {
    executeCommand("insertText", emoji);
    setShowEmojiPicker(false);
  };

  const ToolbarButton = ({ icon: Icon, title, command, value }) => (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        executeCommand(command, value);
      }}
      title={title}
      className="p-1 rounded text-gray-500 hover:bg-gray-200 transition-colors"
    >
      <Icon size={18} />
    </button>
  );

  return (
    <div className="border-t bg-white p-3 relative flex flex-col">
      {/* File preview */}
      {attachedFile && (
        <div className="mb-2 p-2 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between text-sm">
          <div className="flex items-center space-x-3 text-gray-700">
            {typeof attachedFile === "string" ||
            attachedFile.type?.startsWith("image/") ? (
              <img
                src={
                  typeof attachedFile === "string"
                    ? attachedFile
                    : URL.createObjectURL(attachedFile)
                }
                alt="Image preview"
                className="w-10 h-10 object-cover rounded-md flex-shrink-0"
              />
            ) : (
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-600 rounded-md flex-shrink-0 relative">
                <FiFile size={20} />
                <span className="absolute bottom-0 right-0 text-[8px] font-bold text-gray-700 bg-white px-0.5 rounded-br-md border-t border-l border-gray-200">
                  {getFileExtension(attachedFile)}
                </span>
              </div>
            )}
            <span className="truncate max-w-xs font-medium">
              {getFileName(attachedFile)}
            </span>
          </div>
          <button
            onClick={handleRemoveFile}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            title="Remove attachment"
          >
            <FiX size={18} />
          </button>
        </div>
      )}

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute bottom-full mb-2 bg-white border border-gray-300 w-full max-h-48 overflow-auto rounded z-10 shadow">
          {suggestions.map((m, i) => (
            <li
              key={m.Email || m.ID || m.Name}
              onMouseDown={(e) => {
                e.preventDefault();
                selectSuggestion(m);
              }}
              className={`p-2 cursor-pointer hover:bg-gray-100 ${
                i === selectedIndex ? "bg-blue-100" : ""
              }`}
            >
              {m.Name}
            </li>
          ))}
        </ul>
      )}

      {/* Input / Voice recording area */}
      <div className="flex flex-col border border-gray-200 rounded-lg overflow-hidden">
        {/* Rich Text Toolbar */}
        {!(isRecording || isPreview) && (
          <div className="flex items-center space-x-1 p-1 bg-gray-50 border-b border-gray-200">
            <ToolbarButton icon={FiBold} title="Bold" command="bold" />
            <ToolbarButton icon={FiItalic} title="Italic" command="italic" />

            <ToolbarButton
              icon={FiList}
              title="Unordered List"
              command="insertUnorderedList"
            />
            <ToolbarButton
              icon={FiCode}
              title="Code Block"
              command="formatBlock"
              value="pre"
            />
            <ToolbarButton
              icon={FiType}
              title="Blockquote"
              command="formatBlock"
              value="blockquote"
            />

            {/* Emoji Picker */}
            <div className="relative">
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                title="Emoji"
                className="p-1 rounded text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <FiSmile size={18} />
              </button>
              {showEmojiPicker && (
                <div
                  ref={emojiPickerRef}
                  className="absolute top-full z-10000 left-0 mt-1 p-2 bg-white border border-gray-300 rounded shadow-lg z-1000 w-100 flex gap-1"
                >
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => insertEmoji(emoji)}
                      onMouseDown={(e) => e.preventDefault()}
                      className="text-xl hover:bg-gray-100 p-1 rounded-full transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {isRecording ? (
          <div className="flex-1 p-3 bg-red-50 flex items-center justify-between">
            <Waveform />
            <span className="text-red-500 font-semibold mr-4">
              {formatTime(recordingTime)}
            </span>
            <button
              onClick={stopRecording}
              className="flex items-center justify-center w-8 h-8 bg-red-500 rounded-full shadow-md hover:bg-red-600 transition-all"
            >
              <FiSquare className="sm:size-4 md:size-5 lg:size-6 text-white" />
            </button>
          </div>
        ) : isPreview && audioURL ? (
          <div className="flex flex-row  sm:items-center p-3 gap-3 w-full">
            <audio
              ref={audioRef}
              src={
                isIOS && audioBlob && audioBlob.type === "audio/webm"
                  ? URL.createObjectURL(
                      new Blob([audioBlob], { type: "audio/mp3" })
                    )
                  : audioURL
              }
              controls
              className="w-full sm:flex-1 max-w-full"
            />
            <div className="flex items-center justify-end gap-2 w-fit">
              <button
                onClick={resetVoiceState}
                className="text-red-500 hover:text-red-700 transition-colors p-1"
                title="Delete recording"
              >
                <FiTrash2 className="size-4" /> {/* smaller */}
              </button>

              <button
                onClick={sendAudio}
                className="bg-[#001C57] text-white p-1.5 rounded-full transition-colors"
                title="Send voice message"
              >
                <FiSend className="size-4" /> {/* smaller */}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center p-3">
            <div
              ref={editorRef}
              contentEditable
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              className="flex-1 p-1 outline-none min-h-[40px] break-words max-h-32 overflow-y-auto text-base sm:text-base"
              data-placeholder="Message #acct-midtech (use Shift+Enter for new line)"
              suppressContentEditableWarning
              style={{ whiteSpace: "pre-wrap" }}
            />
            <div className="flex items-center space-x-1 flex-shrink-0 ml-3">
              <button
                className={`p-1 ${
                  isInputEmpty
                    ? "text-gray-600 hover:text-gray-800"
                    : "text-gray-400 cursor-not-allowed"
                }`}
                title="Record voice message"
                onClick={startRecording}
                disabled={!isInputEmpty}
              >
                <FiMic className="sm:size-4 md:size-5 lg:size-6" />
              </button>
              <button
                className="p-1 text-gray-600 hover:text-gray-800"
                onClick={() => fileInputRef.current.click()}
                title="Attach file"
              >
                <FiPaperclip className="sm:size-4 md:size-5 lg:size-6" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={handleSend}
                className="p-2 text-white bg-[#001C57] rounded-full hover:bg-blue-900 transition-colors disabled:opacity-50"
                // This line correctly disables the button if input is empty OR if sending is in progress.
                disabled={isInputEmpty || isSending}
                title={isSending ? "Sending..." : "Send message"}
              >
                {/* This line correctly shows the loader if sending is in progress. */}
                {isSending ? (
                  <Loader />
                ) : (
                  <FiSend className="sm:size-4 md:size-5 lg:size-6" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        [data-placeholder]:empty:not(:focus)::before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        [data-mention-list] {
          padding: 0 2px;
          border-radius: 6px;
          margin-right: 2px;
          display: inline-block;
          white-space: nowrap;
        }
        [data-mention] {
          font-weight: bold;
          color: #0c4a6e;
          padding: 0 2px;
          border-radius: 6px;
          margin-right: 2px;
          display: inline-block;
          white-space: nowrap;
        }
        [contentEditable="true"]:empty:focus::before {
          font-size: 16px;
          min-height: 40px; /* ensure visible area */
          line-height: 1.4;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch; /* smooth scrolling on iOS */
          content: attr(data-placeholder);
          color: #9ca3af;
        }
        @media (max-width: 640px) {
          [data-placeholder]:empty:not(:focus)::before {
            content: "Type here...";
            color: #9ca3af;
          }
        }
        @media (min-width: 641px) {
          [data-placeholder]:empty:not(:focus)::before {
            content: attr(data-placeholder);
          }
        }
      `}</style>
    </div>
  );
}
