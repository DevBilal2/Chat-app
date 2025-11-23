import { useState, useRef, useEffect } from "react";
import {
  FiPaperclip,
  FiSend,
  FiX,
  FiFile,
  FiMic,
  FiSquare,
  FiTrash2,
  FiBold, // New: for Bold button
  FiItalic, // New: for Italic button
  FiLink, // New: for Link button
  FiList, // New: for Unordered List
  FiType, // New: for Blockquote
  FiCode, // New: for Code
  FiSmile, // New: for Emoji Picker
} from "react-icons/fi";
// Removed: import { Editor } from "@tinymce/tinymce-react";

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

export default function MessageInput({ onSend, members }) {
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); // New state

  // Voice states
  const [isRecording, setIsRecording] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioURL, setAudioURL] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);

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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
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
      str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // NEW ROBUST REGEX for repeated single-word mentions:
    // 1. (\s|^) : Leading space or start of line (Group 1: leadingSpace).
    // 2. (@\S+) : Matches '@' followed by one or more NON-WHITESPACE characters (the name) (Group 2: namePart).
    // The global flag (g) ensures ALL matches are processed.
    const mentionRegex = /(\s|^)(@\S+)/g;

    return plain.replace(mentionRegex, (match, leadingSpace, namePart) => {
      // 1. Highlight only the captured 'namePart' (e.g., "@John")
      const escapedMention = escapeHtml(namePart);

      // 2. Return the leading space + the highlighted span + an unhighlighted space (important for separation)
      // Note: The extra space is technically handled by the text that follows the match,
      // but ensuring a consistent output helps. We'll rely on the space inserted by selectSuggestion.

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
      setTagStartIndex(-1);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (member) => {
    const el = editorRef.current;
    if (!el || tagStartIndex === -1) return;

    const plain = currentText;

    // --- FIX APPLIED HERE ---
    // 1. Get the member's full name.
    const fullName = member.Name || "";

    // 2. Find the index of the first space.
    const firstSpaceIndex = fullName.indexOf(" ");

    // 3. Truncate the name: If a space is found, use only the text before it. Otherwise, use the full name.
    const firstName =
      firstSpaceIndex !== -1
        ? fullName.substring(0, firstSpaceIndex)
        : fullName;

    const mention = `@${firstName}`; // E.g., "@John" (dropping "Doe")
    // ------------------------

    const textBefore = plain.substring(0, tagStartIndex);

    // Construct the new plain text with only the first word + a trailing space
    const newPlain = textBefore + mention + " ";

    // Re-render the editor content
    el.innerHTML = renderWithMentionsHtml(newPlain);

    // Update the state and hide suggestions
    setCurrentText(newPlain);
    setShowSuggestions(false);
    setTagStartIndex(-1);

    // Move caret to the end
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
      mediaRecorderRef.current = new MediaRecorder(stream);
      let chunks = [];

      mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
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

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      const tracks = mediaRecorderRef.current.stream.getTracks();
      tracks.forEach((track) => track.stop());
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
    const audioFile = new File([audioBlob], "voice-message.webm", {
      type: "audio/webm",
    });
    onSend({ text: "", file: audioFile });
    resetVoiceState();
  };

  const handleSend = () => {
    if (isPreview) return sendAudio();

    let textHtml = editorRef.current?.innerHTML?.trim() || "";
    let plainText = editorRef.current?.innerText?.trim() || "";

    if (!plainText && !attachedFile) return;

    // Convert all emojis in plainText to Deluge Unicode
    const delugeText = plainText.replace(/([\p{Emoji}])/gu, (match) =>
      emojiToDeluge(match)
    );

    onSend({ text: delugeText, file: attachedFile || null });

    editorRef.current.innerHTML = "";
    setCurrentText("");
    setAttachedFile(null);
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

  // NEW: Rich Text Command Handler
  const executeCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current.focus();
  };

  // NEW: Emoji Insertion
  const insertEmoji = (emoji) => {
    // Insert the emoji at the current caret position
    executeCommand("insertText", emoji);
    setShowEmojiPicker(false);
  };

  /**
   * Toolbar Button Component
   */
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
              icon={FiLink}
              title="Link"
              command="createLink"
              value="http://"
            />
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

            {/* Emoji Picker Button */}
            <div className="relative">
              <button
                onMouseDown={(e) => e.preventDefault()} // Prevent contentEditable blur
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                title="Emoji"
                className="p-1 rounded text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <FiSmile size={18} />
              </button>
              {showEmojiPicker && (
                <div
                  ref={emojiPickerRef}
                  className="absolute top-full z-10000 left-0 mt-1 p-2 bg-white border border-gray-300 rounded shadow-lg z-1000 w-100 flex  gap-1"
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
              <FiSquare size={14} className="text-white" />
            </button>
          </div>
        ) : isPreview && audioURL ? (
          <div className="flex items-center p-3">
            <audio ref={audioRef} src={audioURL} controls className="flex-1" />
            <button
              onClick={resetVoiceState}
              className="text-red-500 ml-3 hover:text-red-700 transition-colors"
              title="Delete recording"
            >
              <FiTrash2 size={20} />
            </button>
            <button
              onClick={sendAudio}
              className="bg-blue-500 text-white p-2 rounded-full ml-2 hover:bg-blue-600 transition-colors"
              title="Send voice message"
            >
              <FiSend size={20} />
            </button>
          </div>
        ) : (
          <div className="flex items-center p-3">
            {/* Editable input */}
            <div
              ref={editorRef}
              contentEditable
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              className="flex-1 p-1 outline-none min-h-[40px] break-words max-h-32 overflow-y-auto"
              data-placeholder="Message #acct-midtech (use Shift+Enter for new line)"
              suppressContentEditableWarning
              style={{ whiteSpace: "pre-wrap" }}
            />

            {/* Right-side Action Buttons */}
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
                <FiMic size={20} />
              </button>
              <button
                className="p-1 text-gray-600 hover:text-gray-800"
                onClick={() => fileInputRef.current.click()}
                title="Attach file"
              >
                <FiPaperclip size={20} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={handleSend}
                className="p-2 text-white bg-blue-500 rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50"
                disabled={isInputEmpty}
                title="Send message"
              >
                <FiSend size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        /* Styles for the placeholder text */
        [data-placeholder]:empty:not(:focus)::before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        /* Styles for the mention tag */
        [data-mention] {
          background: rgba(59, 130, 246, 0.12);
          color: #1d4ed8;
          padding: 0 4px;
          border-radius: 6px;
          margin-right: 2px;
          display: inline-block;
          white-space: nowrap; /* Keep the mention tag together */
        }
        /* Ensure the input looks clean */
        [contentEditable="true"]:empty:focus::before {
          content: attr(data-placeholder);
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
}
