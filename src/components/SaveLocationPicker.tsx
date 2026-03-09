import { useEffect } from 'react';
import { FolderOpen, Home, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useKeyStore } from '@/store/useKeyStore';
import { cn } from '@/lib/utils';
import type { SaveLocation } from '@/types';

export function SaveLocationPicker() {
  const {
    saveLocation,
    customPath,
    defaultPath,
    setSaveLocation,
    setCustomPath,
    setDefaultPath,
  } = useKeyStore();

  useEffect(() => {
    // Get default SSH path on mount
    window.electronAPI.getDefaultPath().then((path) => {
      setDefaultPath(path);
    });
  }, [setDefaultPath]);

  const handleBrowse = async () => {
    const selectedPath = await window.electronAPI.selectDirectory(defaultPath);
    if (selectedPath) {
      setCustomPath(selectedPath);
      setSaveLocation('custom');
    }
  };

  const locations: { value: SaveLocation; label: string; icon: React.ReactNode; description: string }[] = [
    {
      value: 'default',
      label: 'Default SSH Directory',
      icon: <Home className="h-4 w-4" />,
      description: defaultPath || 'Loading...',
    },
    {
      value: 'custom',
      label: 'Custom Location',
      icon: <HardDrive className="h-4 w-4" />,
      description: customPath || 'Choose a custom directory',
    },
  ];

  return (
    <div className="space-y-3">
      <Label>Save Location</Label>
      <div className="grid gap-3">
        {locations.map((loc) => (
          <button
            key={loc.value}
            type="button"
            onClick={() => setSaveLocation(loc.value)}
            className={cn(
              'algorithm-card',
              saveLocation === loc.value && 'selected'
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                'mt-0.5 p-2 rounded-lg transition-colors',
                saveLocation === loc.value ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              )}>
                {loc.icon}
              </div>
              <div className="flex-1 text-left">
                <span className="font-medium">{loc.label}</span>
                <p className="text-sm text-muted-foreground font-mono truncate">
                  {loc.description}
                </p>
              </div>
              <div className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                saveLocation === loc.value ? 'border-primary bg-primary' : 'border-muted-foreground/30'
              )}>
                {saveLocation === loc.value && (
                  <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {saveLocation === 'custom' && (
        <div className="flex gap-2 animate-fade-in">
          <Input
            value={customPath}
            onChange={(e) => setCustomPath(e.target.value)}
            placeholder="Select or enter a directory path"
            className="flex-1"
          />
          <Button type="button" variant="outline" onClick={handleBrowse}>
            <FolderOpen className="h-4 w-4 mr-2" />
            Browse
          </Button>
        </div>
      )}
    </div>
  );
}
