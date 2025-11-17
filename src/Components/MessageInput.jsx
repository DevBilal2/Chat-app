import { useState, useRef, useEffect } from "react";

/**
 * MessageInput with:
 * - Colored @mentions
 * - Caret preserved
 * - Breaks text after mentions
 * - Placeholder intact
 * - Arrow navigation for mentions
 */
export default function MessageInput({ onSend, members }) {
  const editorRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [tagStartIndex, setTagStartIndex] = useState(-1);
  const [currentText, setCurrentText] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

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

  const handleSend = () => {
    const el = editorRef.current;
    if (!el) return;
    const plain = el.innerText || "";
    if (!plain.trim()) return;

    onSend(plain.trim());
    el.innerHTML = "";
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
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t bg-white p-3 relative">
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

      <div className="flex items-center bg-gray-100 rounded px-2 border border-gray-300">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          className="flex-1 p-2 outline-none bg-transparent min-h-[28px] break-words"
          data-placeholder="Type a message..."
          suppressContentEditableWarning={true}
          style={{ whiteSpace: "pre-wrap" }}
        />
        <button
          onClick={handleSend}
          className="text-blue-500 hover:text-blue-600 text-xl ml-2"
        >
          ➤
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
