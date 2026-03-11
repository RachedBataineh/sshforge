import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, CheckCircle } from 'lucide-react';

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

type UpdateState = 'idle' | 'available' | 'downloading' | 'downloaded' | 'error';

export function UpdateNotification() {
  const [updateState, setUpdateState] = useState<UpdateState>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get current version
    window.electronAPI.getAppVersion().then(setCurrentVersion);

    // Listen for update available (pushed from main process)
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
    window.electronAPI.onUpdateError((error) => {
      setError(error.message);
      setUpdateState('error');
    });
  }, []);

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

  const handleClose = () => {
    setUpdateState('idle');
    setError(null);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      {/* Update Available Dialog */}
      <Dialog open={updateState === 'available'} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Update Available
            </DialogTitle>
            <DialogDescription>
              A new version of SSHForge is available!
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current version:</span>
              <span className="font-medium">{currentVersion}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-muted-foreground">New version:</span>
              <span className="font-medium text-green-600">{updateInfo?.version}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Later
            </Button>
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Downloading Dialog */}
      <Dialog open={updateState === 'downloading'}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 animate-bounce text-primary" />
              Downloading Update...
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="w-full bg-muted rounded-full h-2 mb-2">
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
        </DialogContent>
      </Dialog>

      {/* Update Downloaded Dialog */}
      <Dialog open={updateState === 'downloaded'} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Update Ready
            </DialogTitle>
            <DialogDescription>
              SSHForge {updateInfo?.version} has been downloaded and is ready to install.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              The application will restart to complete the installation.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Later
            </Button>
            <Button onClick={handleInstall}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Restart & Install
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <Dialog open={updateState === 'error'} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Error</DialogTitle>
            <DialogDescription>
              There was a problem updating SSHForge.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-destructive">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">
              You can download the latest version manually from GitHub.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
            <Button onClick={() => window.open('https://github.com/RachedBataineh/sshforge/releases', '_blank')}>
              Open GitHub
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
