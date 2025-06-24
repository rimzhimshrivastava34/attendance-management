import React, { useEffect, useRef, useState } from "react";
import ChatbotFilter from "./ChatbotFilter"; // Import the new component

const Chatbot = ({ onClose, attendanceData }) => {
  const messagesEndRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const sendQueryToBackend = async (query) => {
    try {
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: query }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.statusText}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error sending query to backend:", error);
      return { actions: [], error: error.message }; // Expecting 'actions' now
    }
  };

  const handleSendMessage = async () => {
    const query = inputValue.trim();
    if (!query) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Please enter a message to send." },
      ]);
      scrollToBottom();
      return;
    }

    setMessages((prev) => [
      ...prev,
      { sender: "user", text: query },
    ]);

    const backendResponse = await sendQueryToBackend(query);
    console.log("Backend response:", backendResponse);

    let botResponses = [];
    if (backendResponse.error) {
      botResponses.push({ sender: "bot", text: `Error: ${backendResponse.error}` });
    } else if (backendResponse.actions && Array.isArray(backendResponse.actions)) {
    backendResponse.actions.forEach((action) => {
  botResponses.push({
    sender: "bot",
    text: (
      <ChatbotFilter
        attendanceData={attendanceData}
        actions={[action]} // Wrap single action in array
      />
          ),
        });
      });
      if (botResponses.length === 0) {
        botResponses.push({ sender: "bot", text: "Sorry, I couldn't process your request." });
      }
    } else {
      botResponses.push({ sender: "bot", text: "Sorry, I couldn't process your request." });
    }

    setMessages((prev) => [...prev, ...botResponses]);
    setInputValue("");
    scrollToBottom();
  };

  useEffect(() => {
    setMessages([
      {
        sender: "bot",
        text: "Welcome to the Attendance Assistant! Ask about employee attendance.",
      },
    ]);
    scrollToBottom();
  }, []);

  const handleInputChange = (e) => setInputValue(e.target.value);
  const handleKeyPress = (e) => e.key === "Enter" && handleSendMessage();

  return (
    <div className="fixed bottom-24 right-6 w-[500px] h-[600px] bg-white rounded-lg shadow-xl flex flex-col z-50">
      <div className="bg-[#082669] text-white p-5 rounded-t-lg flex justify-between items-center">
        <h3 className="text-sm font-semibold">Attendance Assistant</h3>
        <button onClick={onClose} className="text-white hover:text-gray-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div id="chat-messages" className="flex-1 p-2 overflow-y-auto bg-gray-200">
        {messages.length === 0 ? (
          <div className="text-gray-500 text-sm">No messages to display.</div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`mb-4 flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[100%] p-3 rounded-lg text-sm ${
                  message.sender === "user"
                    ? "bg-[#082669] text-white"
                    : "bg-white text-gray-800 shadow"
                }`}
              >
                {message.text}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-gray-200">
        <div className="flex items-center">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Enter your query..."
            className="flex-1 border border-gray-300 rounded-l-lg p-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          />
          <button
            onClick={handleSendMessage}
            className="bg-[#082669] text-white p-2 rounded-r-lg hover:bg-[#1D4ED8]"
          >
            <svg className="w-4 h-4"  fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;