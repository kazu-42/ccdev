import { Header } from '@/components/Layout/Header';
import { ChatContainer } from '@/components/Chat/ChatContainer';
import { TerminalContainer } from '@/components/Terminal/TerminalContainer';
import { useAppStore } from '@/stores/appStore';

function App() {
  const mode = useAppStore((state) => state.mode);

  return (
    <div className="flex flex-col h-screen bg-dark-bg">
      <Header />
      <main className="flex-1 overflow-hidden">
        {mode === 'chat' ? <ChatContainer /> : <TerminalContainer />}
      </main>
    </div>
  );
}

export default App;
