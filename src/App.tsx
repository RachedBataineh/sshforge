import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from '@/components/Sidebar';
import { KeyDetailView } from '@/components/KeyDetailView';
import { KeyGeneratorForm } from '@/components/KeyGeneratorForm';
import { DeleteKeyDialog, RenameKeyDialog } from '@/components/KeyDialogs';
import { SuccessDialog } from '@/components/SuccessDialog';
import { useAppStore } from '@/store/useAppStore';
import { KeyRound } from 'lucide-react';

function CreateKeyView() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Generate New Key
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create a new SSH key pair for secure authentication
          </p>
        </div>

        {/* Form */}
        <KeyGeneratorForm />

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            Keys are generated locally on your machine.
            <br />
            Your private key never leaves your device.
          </p>
        </div>
      </div>
    </div>
  );
}

function App() {
  const { currentView } = useAppStore();

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-background">
        {/* macOS Title Bar - Transparent drag region for traffic light buttons */}
        <div className="h-12 flex-shrink-0 bg-background border-b" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <Sidebar />

          {/* Main Content */}
          {currentView === 'create' ? <CreateKeyView /> : <KeyDetailView />}
        </div>

        {/* Dialogs */}
        <SuccessDialog />
        <DeleteKeyDialog />
        <RenameKeyDialog />
      </div>
    </TooltipProvider>
  );
}

export default App;
