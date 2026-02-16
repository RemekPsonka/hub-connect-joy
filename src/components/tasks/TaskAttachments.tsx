import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Paperclip, Upload, Trash2, FileText, Image, File, Loader2 } from 'lucide-react';
import { useTaskAttachments, useUploadTaskAttachment, useDeleteTaskAttachment } from '@/hooks/useTaskAttachments';

interface TaskAttachmentsProps {
  taskId: string;
}

function getFileIcon(type: string | null) {
  if (!type) return File;
  if (type.startsWith('image/')) return Image;
  if (type.includes('pdf') || type.includes('document') || type.includes('text')) return FileText;
  return File;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TaskAttachments({ taskId }: TaskAttachmentsProps) {
  const { data: attachments = [] } = useTaskAttachments(taskId);
  const uploadAttachment = useUploadTaskAttachment();
  const deleteAttachment = useDeleteTaskAttachment();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      await uploadAttachment.mutateAsync({ taskId, file });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      <Separator />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Paperclip className="h-3.5 w-3.5" />
            Załączniki {attachments.length > 0 && `(${attachments.length})`}
          </h4>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadAttachment.isPending}
          >
            {uploadAttachment.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            Dodaj
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            onChange={handleFileChange}
          />
        </div>

        {attachments.length > 0 && (
          <div className="space-y-1">
            {attachments.map((att) => {
              const Icon = getFileIcon(att.file_type);
              return (
                <div key={att.id} className="flex items-center gap-2 py-1.5 px-2 -mx-2 rounded-md hover:bg-muted/50 group">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a
                    href={att.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm truncate flex-1 hover:text-primary transition-colors"
                  >
                    {att.file_name}
                  </a>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatFileSize(att.file_size)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive"
                    onClick={() => deleteAttachment.mutate({ id: att.id, taskId, fileUrl: att.file_url })}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
