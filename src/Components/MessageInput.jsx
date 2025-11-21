import { useState, useRef } from "react";
import { FiPaperclip } from "react-icons/fi";
import { FiSend } from "react-icons/fi";
import { FiX } from "react-icons/fi"; // Added X icon for closing/removing file
import { FiFile } from "react-icons/fi"; // Added File icon for generic files

export default function MessageInput({ onSend, members }) {
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [tagStartIndex, setTagStartIndex] = useState(-1);
  const [currentText, setCurrentText] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [attachedFile, setAttachedFile] = useState(null);

  const moveCaretToEnd = (el) => {
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  };

  const renderWithMentionsHtml = (plain) => {
    if (!plain) return "";
    const escapeHtml = (str) =>
      str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const tokens = plain.split(/(\s+)/);
    return tokens
      .map((tok) => {
        if (tok.startsWith("@") && tok.length > 1) {
          const name = escapeHtml(tok.slice(1));
          return `<span data-mention class="inline-block px-1 rounded text-blue-700 font-semibold">@${name}</span>`;
        }
        return escapeHtml(tok);
      })
      .join("");
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
    if (!editorRef.current || tagStartIndex === -1) return;
    const el = editorRef.current;
    const plain = el.innerText || "";

    const afterSpace = plain.slice(tagStartIndex).replace(/^@[\w-]*/, "");
    const before = plain.slice(0, tagStartIndex);

    const newPlain = `${before}@${member.Name} ${afterSpace}`;
    setCurrentText(newPlain);

    el.innerHTML = renderWithMentionsHtml(newPlain);
    moveCaretToEnd(el);

    setShowSuggestions(false);
    setTagStartIndex(-1);
  };

  const handleFileChange = (e) => {
    setAttachedFile(e.target.files[0]);
    // Reset file input value so the same file can be selected again after removal
    e.target.value = null;
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
  };

  const handleSend = () => {
    const text = editorRef.current?.innerText?.trim() || "";

    // Debug: log current message and attached file
    console.log("Sending message...");
    console.log("Text:", text);
    console.log("Attached file:", attachedFile);

    if (!text && !attachedFile) return; // nothing to send

    // Send the message to parent
    onSend({ text, file: attachedFile ? attachedFile : null });

    // Clear input
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
    } else if (e.key === "Enter") {
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

  return (
    <div className="border-t bg-white p-3 relative flex flex-col">
      {/* 🖼️ File Preview above input (Improved) */}
      {attachedFile && (
        <div className="mb-2 p-2 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between text-sm">
          <div className="flex items-center space-x-3 text-gray-700">
            {/* Image preview */}
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
              // Generic file preview (Document)
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

          {/* Remove file button */}
          <button
            onClick={handleRemoveFile}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            title="Remove attachment"
          >
            <FiX size={18} />
          </button>
        </div>
      )}

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

      {/* Input and buttons side by side */}
      <div className="flex items-center space-x-2">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          className="flex-1 p-2 outline-none bg-gray-100 rounded min-h-[36px] break-words"
          data-placeholder="Type a message..."
          suppressContentEditableWarning={true}
          style={{ whiteSpace: "pre-wrap" }}
        />
        <button
          className="p-1 text-gray-600 hover:text-gray-800"
          onClick={() => fileInputRef.current.click()}
        >
          <FiPaperclip size={22} />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={handleSend}
          className="p-2 text-blue-500 hover:text-blue-600"
        >
          <FiSend size={24} />
        </button>
      </div>

      <style jsx>{`
        [data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        [data-mention] {
          background: rgba(59, 130, 246, 0.12);
          color: #1d4ed8;
          padding: 0 4px;
          border-radius: 6px;
          margin-right: 2px;
        }
      `}</style>
    </div>
  );
}
