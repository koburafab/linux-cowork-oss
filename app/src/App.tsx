import { ChatWindow } from './components/chat/ChatWindow'
import { AgentPanel } from './components/agent/AgentPanel'
import './App.css'

function App() {
  return (
    <div className="app-layout">
      <ChatWindow />
      <AgentPanel />
    </div>
  )
}

export default App
