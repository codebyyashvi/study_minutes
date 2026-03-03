import { useState } from "react";
import Sidebar from "../components/Sidebar";
import ChatArea from "../components/ChatArea";

const Home = () => {
  const [messages, setMessages] = useState([
    { role: "bot", content: "Hi 👋 Upload notes and ask me anything!" },
  ]);

  const [chats, setChats] = useState([
    { id: 1, title: "Semiconductor Revision" },
    { id: 2, title: "DBMS Important Questions" },
  ]);

  return (
    <div className="flex">
      <Sidebar chats={chats} setChats={setChats} setMessages={setMessages} />
      <ChatArea messages={messages} setMessages={setMessages} />
    </div>
  );
};

export default Home;