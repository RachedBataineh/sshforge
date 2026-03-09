import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from '@/components/Sidebar';
import { KeyDetailView } from '@/components/KeyDetailView';
import { KeyGeneratorForm } from '@/components/KeyGeneratorForm';
import { DeleteKeyDialog, RenameKeyDialog } from '@/components/KeyDialogs';
import { SuccessDialog } from '@/components/SuccessDialog';
import { useAppStore } from '@/store/useAppStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';

function CreateKeyView() {
  const { setCurrentView } = useAppStore();

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto p-4">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-4 -ml-2"
          onClick={() => setCurrentView('list')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Keys
        </Button>

        {/* Main Card */}
        <Card className="glass">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Generate New Key
            </CardTitle>
            <CardDescription>
              Create a new SSH key pair for secure authentication
            </CardDescription>
          </CardHeader>
          <CardContent>
            <KeyGeneratorForm />
          </CardContent>
        </Card>

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
