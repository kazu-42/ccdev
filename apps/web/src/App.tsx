import { Header } from '@/components/Layout/Header';
import { ChatContainer } from '@/components/Chat/ChatContainer';

function App() {
  return (
    <div className="flex flex-col h-screen bg-dark-bg">
      <Header />
      <main className="flex-1 overflow-hidden">
        <ChatContainer />
      </main>
    </div>
  );
}

export default App;
