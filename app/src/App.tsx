import { ChatWindow } from './components/chat/ChatWindow'
import { AgentPanel } from './components/agent/AgentPanel'
import { ConversationList } from './components/sidebar/ConversationList'
import './App.css'

function App() {
  return (
    <div className="app-layout">
      <ConversationList />
      <ChatWindow />
      <AgentPanel />
    </div>
  )
}

export default App
