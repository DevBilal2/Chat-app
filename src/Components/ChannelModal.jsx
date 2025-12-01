/* global ZOHO */
import { useEffect, useState } from "react";

export default function ChannelModal({
  onClose,
  onChannelCreated,
  onSelectChat,
}) {
  const [channelName, setChannelName] = useState("");
  const [members, setMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  useEffect(() => {
    var config = {
      app_name: "admiral-field-portal",
      report_name: "All_Portal_Users",
    };

    ZOHO.CREATOR.DATA.getRecords(config).then((res) => {
      console.log("Fetched users:", res);
      setMembers(res.data || []);
      setLoading(false);
    });

    ZOHO.CREATOR.UTIL.getInitParams().then((response) => {
      if (response && response.loginUser) {
        setCurrentUserEmail(response.loginUser);
      }
    });
  }, []);

  const toggleMember = (email) => {
    setSelectedMembers((prev) =>
      prev.includes(email) ? prev.filter((m) => m !== email) : [...prev, email]
    );
  };

  function handleCreate() {
    if (!channelName.trim() || selectedMembers.length === 0) {
      alert("Please enter a channel name and select at least one member!");
      return;
    }

    const randomId = Math.floor(100000 + Math.random() * 900000);
    const finalMembers = Array.from(
      new Set([...selectedMembers, currentUserEmail])
    );

    var channelData = {
      app_name: "admiral-field-portal",
      form_name: "ChannelsHiddenForm",
      payload: {
        data: {
          IDC: randomId,
          ChannelName: channelName,
          RecievedByC: finalMembers.join(","),
          Message: "",
          SentBy: currentUserEmail,
        },
      },
    };

    ZOHO.CREATOR.DATA.addRecords(channelData)
      .then((res) => {
        console.log("✅ Channel created:", res);
        if (res.code === 3000) {
          alert("Channel created successfully!");
          onChannelCreated?.({
            ID: randomId,
            ChannelName: channelName,
            RecievedByC: finalMembers.join(","),
          });
          onSelectChat?.(`#${channelName}`);
          onClose();
        } else {
          alert("Failed to create channel. Check console.");
        }
      })
      .catch((err) => {
        console.error("❌ Error creating channel:", err);
      });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1999] px-4">
      <div className="bg-white text-black w-full max-w-sm sm:max-w-md md:max-w-lg p-5 rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold mb-3 text-center">
          Create Channel
        </h3>

        <input
          placeholder="Channel name..."
          value={channelName}
          onChange={(e) => setChannelName(e.target.value)}
          className="w-full border border-gray-300 rounded p-2 mb-3 text-sm"
        />

        <div className="max-h-52 overflow-auto border border-gray-200 p-2 rounded">
          {loading ? (
            <p className="text-center text-gray-500 text-sm">
              Loading members...
            </p>
          ) : members.length > 0 ? (
            members.map((m, i) => (
              <label
                key={i}
                className="flex items-center gap-2 border-b border-gray-100 py-1 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedMembers.includes(m.Email)}
                  onChange={() => toggleMember(m.Email)}
                />
                <span>{m.Name}</span>
              </label>
            ))
          ) : (
            <p className="text-center text-gray-500 text-sm">
              No members found.
            </p>
          )}
        </div>

        <button
          onClick={handleCreate}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded mt-4 py-2 transition-all text-sm"
        >
          Create Channel
        </button>
        <button
          onClick={onClose}
          className="w-full border border-gray-300 hover:bg-gray-100 rounded mt-2 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
