import { useState, useEffect } from 'react';
import { KeyRound, Mail, FileText, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlgorithmSelector } from './AlgorithmSelector';
import { PassphraseInput } from './PassphraseInput';
import { KeyPreview } from './KeyPreview';
import { SuccessDialog } from './SuccessDialog';
import { useKeyStore } from '@/store/useKeyStore';
import { validateKeyName, validateEmail } from '@/lib/utils';

export function KeyGeneratorForm() {
  const {
    algorithm,
    keyName,
    email,
    passphrase,
    confirmPassphrase,
    defaultPath,
    generatedKey,
    isGenerating,
    error,
    setKeyName,
    setEmail,
    setGeneratedKey,
    setIsGenerating,
    setError,
    setPrivateKeyPath,
    setPublicKeyPath,
    setShowSuccess,
    setShowOverwriteDialog,
    setDefaultPath,
  } = useKeyStore();

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Get default SSH path on mount
    window.electronAPI.getDefaultPath().then((path) => {
      setDefaultPath(path);
    });
  }, [setDefaultPath]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!keyName.trim()) {
      errors.keyName = 'Key name is required';
    } else if (!validateKeyName(keyName)) {
      errors.keyName = 'Key name can only contain letters, numbers, underscores, hyphens, and dots';
    }

    if (email && !validateEmail(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (passphrase && passphrase !== confirmPassphrase) {
      errors.passphrase = 'Passphrases do not match';
    }

    if (passphrase && passphrase.length < 5) {
      errors.passphrase = 'Passphrase should be at least 5 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleGenerate = async () => {
    if (!validate()) return;

    setIsGenerating(true);
    setError(null);

    try {
      // Generate the key
      const result = await window.electronAPI.generateKey({
        algorithm,
        keyName,
        passphrase: passphrase || undefined,
        email: email || undefined,
      });

      if (!result.success || !result.key) {
        setError(result.error || 'Failed to generate key');
        return;
      }

      setGeneratedKey(result.key);

      // Save the key to default SSH directory
      if (!defaultPath) {
        setError('Unable to determine default SSH directory');
        return;
      }

      const saveResult = await window.electronAPI.saveKey({
        privateKey: result.key.privateKey,
        publicKey: result.key.publicKey,
        keyName,
        savePath: defaultPath,
      });

      if (!saveResult.success) {
        if (saveResult.error === 'FILES_EXIST') {
          setShowOverwriteDialog(true);
          setPrivateKeyPath(saveResult.privateKeyPath);
          setPublicKeyPath(saveResult.publicKeyPath);
        } else {
          setError(saveResult.error || 'Failed to save key');
        }
        return;
      }

      setPrivateKeyPath(saveResult.privateKeyPath);
      setPublicKeyPath(saveResult.publicKeyPath);
      setShowSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" className="animate-fade-in">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <AlgorithmSelector />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="keyName">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Key Name
            </div>
          </Label>
          <Input
            id="keyName"
            value={keyName}
            onChange={(e) => {
              setKeyName(e.target.value);
              setValidationErrors((prev) => ({ ...prev, keyName: '' }));
            }}
            placeholder="id_ed25519"
            className={validationErrors.keyName ? 'border-red-500' : ''}
          />
          {validationErrors.keyName && (
            <p className="text-xs text-red-500">{validationErrors.keyName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email (optional)
            </div>
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setValidationErrors((prev) => ({ ...prev, email: '' }));
            }}
            placeholder="user@example.com"
            className={validationErrors.email ? 'border-red-500' : ''}
          />
          {validationErrors.email && (
            <p className="text-xs text-red-500">{validationErrors.email}</p>
          )}
        </div>
      </div>

      <PassphraseInput />

      {generatedKey && <KeyPreview />}

      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full h-12 text-base"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Generating Key...
          </>
        ) : (
          <>
            <KeyRound className="h-5 w-5 mr-2" />
            Generate SSH Key
          </>
        )}
      </Button>

      <SuccessDialog />
    </div>
  );
}
