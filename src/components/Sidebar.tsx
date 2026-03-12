import { useState, useEffect } from 'react';
import {
  Plus,
  RefreshCw,
  KeyRound,
  FolderOpen,
  Settings,
} from 'lucide-react';
import logo from '@/assets/logo.png';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { SettingsDialog } from './SettingsDialog';

// Since all algorithms use the same styling, use a single constant
const KEY_ICON_CLASS = 'text-green-500 bg-green-500/10';

function formatAlgorithm(algorithm: string): string {
  if (algorithm === 'rsa' || algorithm === 'RSA') return 'RSA-4096';
  return algorithm.toUpperCase();
}

export function Sidebar() {
  const {
    keys,
    selectedKey,
    isLoading,
    currentView,
    loadKeys,
    selectKey,
    setCurrentView,
  } = useAppStore();

  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleKeyClick = (key: typeof keys[0]) => {
    selectKey(key);
    setCurrentView('list');
  };

  return (
    <div className="w-72 border-r bg-muted/30 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          <img src={logo} alt="SSHForge" className="h-9 w-9 rounded-sm" />
          <div>
            <h1 className="font-bold text-lg">SSHForge</h1>
            <p className="text-xs text-muted-foreground">Key Manager</p>
          </div>
        </div>

        <Button
          onClick={() => setCurrentView('create')}
          className={cn(
            'w-full justify-start gap-2',
            currentView === 'create' && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
          )}
        >
          <Plus className="h-4 w-4" />
          Create New Key
        </Button>
      </div>

      <Separator />

      {/* Keys List Header */}
      <div className="px-3 py-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Your Keys ({keys.length})
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => loadKeys()}
          disabled={isLoading}
        >
          <RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} />
        </Button>
      </div>

      {/* Keys List */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {keys.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No SSH keys found</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Create your first key to get started
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {keys.map((key) => (
                <div
                  key={key.privateKeyPath}
                  onClick={() => handleKeyClick(key)}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
                    'hover:bg-accent',
                    selectedKey?.privateKeyPath === key.privateKeyPath && 'bg-accent'
                  )}
                >
                  <div className={cn('p-2 rounded-lg shrink-0', KEY_ICON_CLASS)}>
                    <KeyRound className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="font-medium text-sm truncate">{key.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {formatAlgorithm(key.algorithm)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 justify-start gap-2 text-muted-foreground"
            onClick={async () => {
              const defaultPath = await window.electronAPI.getDefaultPath();
              window.electronAPI.openInFileManager(defaultPath);
            }}
          >
            <FolderOpen className="h-4 w-4" />
            Open SSH Folder
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setSettingsOpen(true)}
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
