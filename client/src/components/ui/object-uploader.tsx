import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (result: { successful: { uploadURL?: string }[] }) => void;
  buttonClassName?: string;
  children: ReactNode;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      const uploadResults = [];

      for (let i = 0; i < Math.min(files.length, maxNumberOfFiles); i++) {
        const file = files[i];
        
        // Check file size
        if (file.size > maxFileSize) {
          alert(`File ${file.name} is too large. Max size is ${Math.round(maxFileSize / 1024 / 1024)}MB`);
          continue;
        }

        // Get upload URL
        const { url } = await onGetUploadParameters();
        
        // Upload file
        const response = await fetch(url, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (response.ok) {
          uploadResults.push({ uploadURL: url.split('?')[0] });
        }
      }

      if (onComplete && uploadResults.length > 0) {
        onComplete({ successful: uploadResults });
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <Input
        type="file"
        multiple={maxNumberOfFiles > 1}
        accept="image/*"
        onChange={handleFileSelect}
        disabled={uploading}
        style={{ display: 'none' }}
        id="file-upload"
      />
      <Button 
        onClick={() => document.getElementById('file-upload')?.click()} 
        className={buttonClassName}
        disabled={uploading}
      >
        {uploading ? 'Uploading...' : children}
      </Button>
    </div>
  );
}