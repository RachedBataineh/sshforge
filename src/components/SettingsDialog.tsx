import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, Info, RefreshCw, Download, CheckCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SettingsTab = 'about' | 'update';

interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
}

type UpdateState = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error' | 'uptodate';

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('about');
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [updateState, setUpdateState] = useState<UpdateState>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      // Get current version
      window.electronAPI.getAppVersion().then(setCurrentVersion);

      // Listen for update available
      window.electronAPI.onUpdateAvailable((info) => {
        setUpdateInfo(info);
        setUpdateState('available');
      });

      // Listen for download progress
      window.electronAPI.onUpdateProgress((progress) => {
        setDownloadProgress(progress);
        setUpdateState('downloading');
      });

      // Listen for update downloaded
      window.electronAPI.onUpdateDownloaded((info) => {
        setUpdateInfo(info);
        setDownloadProgress(null);
        setUpdateState('downloaded');
      });

      // Listen for update errors
      window.electronAPI.onUpdateError((err) => {
        setError(err.message);
        setUpdateState('error');
      });
    }
  }, [open]);

  const handleCheckForUpdates = async () => {
    setUpdateState('checking');
    setError(null);
    try {
      const result = await window.electronAPI.checkForUpdates();
      if (result.available) {
        setUpdateInfo({ version: result.version || 'Unknown' });
        setUpdateState('available');
      } else {
        setUpdateState('uptodate');
      }
    } catch (err) {
      setError(String(err));
      setUpdateState('error');
    }
  };

  const handleDownload = async () => {
    setUpdateState('downloading');
    setDownloadProgress({ percent: 0, transferred: 0, total: 0 });
    setError(null);

    try {
      const result = await window.electronAPI.downloadUpdate();
      if (!result.success) {
        setError(result.error || 'Download failed');
        setUpdateState('error');
      }
    } catch (err) {
      setError(String(err));
      setUpdateState('error');
    }
  };

  const handleInstall = () => {
    window.electronAPI.installUpdate();
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after animation
    setTimeout(() => {
      setActiveTab('about');
      setUpdateState('idle');
      setError(null);
      setDownloadProgress(null);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 h-[500px]">
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>Configure SSHForge settings</DialogDescription>
          </DialogHeader>
        </VisuallyHidden>
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-48 border-r bg-muted/30 flex flex-col">
            <div className="p-4 border-b">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <span className="font-semibold">Settings</span>
              </div>
            </div>

            <div className="flex-1 p-2 space-y-2">
              <button
                onClick={() => setActiveTab('about')}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                  activeTab === 'about' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'
                )}
              >
                <Info className="h-4 w-4" />
                About
              </button>
              <button
                onClick={() => setActiveTab('update')}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                  activeTab === 'update' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'
                )}
              >
                <RefreshCw className="h-4 w-4" />
                Update
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* About Tab */}
            {activeTab === 'about' && (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="space-y-6 text-center">
                  <img src={logo} alt="SSHForge" className="w-20 h-20 mx-auto rounded-2xl mb-4" />
                  <div>
                    <h2 className="text-2xl font-bold">SSHForge</h2>
                    <p className="text-muted-foreground text-sm -mt-1">SSH Key Manager</p>
                  </div>

                  <div className="inline-block text-sm">
                    <div className="flex justify-between gap-8 py-2 border-b">
                      <span className="text-muted-foreground">Version</span>
                      <span className="font-mono font-medium">{currentVersion || 'Loading...'}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Developed by <span className="font-medium text-foreground">Rached Bataineh</span>
                    </p>
                    <div className="flex justify-center gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open('https://github.com/RachedBataineh', '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        GitHub
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open('https://youtube.com/@rachedbataineh', '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        YouTube
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open('https://instagram.com/rachedbataineh', '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Instagram
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open('https://x.com/rachedbataineh', '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        X
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Update Tab */}
            {activeTab === 'update' && (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-sm space-y-6">
                  {/* Update Available */}
                  {updateState === 'available' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg">
                        <RefreshCw className="h-6 w-6 text-green-600" />
                        <div>
                          <p className="font-medium text-green-600">Update Available!</p>
                          <p className="text-sm text-muted-foreground">
                            SSHForge {updateInfo?.version} is ready to install
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Current version:</span>
                          <span className="font-mono">{currentVersion}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">New version:</span>
                          <span className="font-mono font-medium text-green-600">{updateInfo?.version}</span>
                        </div>
                      </div>
                      <Button className="w-full" onClick={handleDownload}>
                        <Download className="h-4 w-4 mr-2" />
                        Download Update
                      </Button>
                    </div>
                  )}

                  {/* Downloading */}
                  {updateState === 'downloading' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 bg-blue-500/10 rounded-lg">
                        <Download className="h-6 w-6 text-blue-600 animate-bounce" />
                        <div>
                          <p className="font-medium text-blue-600">Downloading...</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${downloadProgress?.percent || 0}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{downloadProgress?.percent.toFixed(0)}%</span>
                          <span>
                            {formatBytes(downloadProgress?.transferred || 0)} / {formatBytes(downloadProgress?.total || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Downloaded */}
                  {updateState === 'downloaded' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                        <div>
                          <p className="font-medium text-green-600">Ready to Install!</p>
                          <p className="text-sm text-muted-foreground">
                            Restart the app to complete the update
                          </p>
                        </div>
                      </div>
                      <Button className="w-full" onClick={handleInstall}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Restart & Install
                      </Button>
                    </div>
                  )}

                  {/* Error */}
                  {updateState === 'error' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-destructive/10 rounded-lg">
                        <p className="text-sm text-destructive">{error}</p>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => window.open('https://github.com/RachedBataineh/sshforge/releases', '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Download from GitHub
                      </Button>
                    </div>
                  )}

                  {/* Up to Date */}
                  {updateState === 'uptodate' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                        <div>
                          <p className="font-medium text-green-600">You're up to date!</p>
                          <p className="text-sm text-muted-foreground">
                            SSHForge {currentVersion} is the latest version
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setUpdateState('idle')}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Check Again
                      </Button>
                    </div>
                  )}

                  {/* Idle / Check for Updates */}
                  {(updateState === 'idle' || updateState === 'checking') && (
                    <div className="space-y-4">
                      <div className="text-center py-8">
                        <RefreshCw className={cn('h-12 w-12 mx-auto text-primary', updateState === 'checking' && 'animate-spin')} />
                        <p className="text-muted-foreground mt-4">
                          {updateState === 'checking' ? 'Checking for updates...' : 'Check for new versions of SSHForge'}
                        </p>
                      </div>
                      {updateState === 'idle' && (
                        <Button className="w-full" onClick={handleCheckForUpdates}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Check for Updates
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
