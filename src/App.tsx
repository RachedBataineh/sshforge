import { Key, Shield, Terminal } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TooltipProvider } from '@/components/ui/tooltip';
import { KeyGeneratorForm } from '@/components/KeyGeneratorForm';
import { APP_NAME } from '@/lib/constants';

function App() {
  return (
    <TooltipProvider>
      <div className="min-h-screen gradient-bg">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center gap-3 mb-4">
              <div className="relative">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Key className="h-8 w-8 text-primary" />
                </div>
                <div className="absolute -bottom-1 -right-1 p-1 bg-green-500/20 rounded-full">
                  <Shield className="h-4 w-4 text-green-500" />
                </div>
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              {APP_NAME}
            </h1>
            <p className="text-muted-foreground flex items-center justify-center gap-2">
              <Terminal className="h-4 w-4" />
              Generate secure SSH keys with a beautiful interface
            </p>
          </div>

          {/* Main Card */}
          <Card className="glass glow">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl">Generate New Key</CardTitle>
              <CardDescription>
                Create a new SSH key pair for secure authentication
              </CardDescription>
            </CardHeader>
            <CardContent>
              <KeyGeneratorForm />
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>
              Keys are generated locally on your machine.
              <br />
              Your private key never leaves your device.
            </p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default App;
