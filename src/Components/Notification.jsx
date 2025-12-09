export default function Notification({ message, onClose }) {
  if (!message) return null;

  // Color classes based on type
  console.log("Testing", message);
  return (
    <div className="fixed top-0 left-0 w-full flex justify-center z-50 px-2">
      <div
        className="bg-blue-500 text-white max-w-md w-full rounded shadow-lg flex items-center justify-between px-4 py-3 mt-2
               pointer-events-auto"
      >
        <span className="text-sm sm:text-base break-words">{message}</span>
        <button
          onClick={onClose}
          className="ml-4 text-white font-bold hover:text-gray-200 focus:outline-none"
        >
          ✖
        </button>
      </div>
    </div>
  );
}
// Usage of CSSTransition can be added for animation effects if desired
