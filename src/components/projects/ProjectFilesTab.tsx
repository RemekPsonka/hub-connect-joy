import { useRef } from 'react';
import { useProjectFiles, useUploadProjectFile } from '@/hooks/useProjects';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { Button } from '@/components/ui/button';
import { FileText, Upload, Download, Loader2, File, Image, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface ProjectFilesTabProps {
  projectId: string;
}

function getFileIcon(type: string | null) {
  if (!type) return <File className="h-5 w-5 text-muted-foreground" />;
  if (type.startsWith('image/')) return <Image className="h-5 w-5 text-primary" />;
  if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv'))
    return <FileSpreadsheet className="h-5 w-5 text-success" />;
  if (type.includes('pdf')) return <FileText className="h-5 w-5 text-destructive" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProjectFilesTab({ projectId }: ProjectFilesTabProps) {
  const { data: files, isLoading } = useProjectFiles(projectId);
  const uploadFile = useUploadProjectFile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile.mutateAsync({ projectId, file });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (isLoading) {
    return <SkeletonCard height="h-48" />;
  }

  return (
    <div className="space-y-4">
      {/* Upload button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleUpload}
          className="hidden"
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadFile.isPending}
          className="gap-2"
        >
          {uploadFile.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Prześlij plik
        </Button>
      </div>

      {/* Files list */}
      {!files?.length ? (
        <DataCard>
          <EmptyState
            icon={FileText}
            title="Brak plików"
            description="Prześlij pierwszy plik do tego projektu."
            action={{
              label: 'Prześlij plik',
              onClick: () => fileInputRef.current?.click(),
              icon: Upload,
            }}
          />
        </DataCard>
      ) : (
        <DataCard title={`Pliki (${files.length})`}>
          <div className="divide-y divide-border">
            {files.map((file) => (
              <div key={file.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                {getFileIcon(file.file_type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.file_size)} · {format(new Date(file.uploaded_at), 'd MMM yyyy', { locale: pl })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  asChild
                >
                  <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            ))}
          </div>
        </DataCard>
      )}
    </div>
  );
}
