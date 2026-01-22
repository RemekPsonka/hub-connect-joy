import { useState } from 'react';
import { Bug } from 'lucide-react';
import { ReportBugModal } from './ReportBugModal';
import { useBugReportsCount } from '@/hooks/useBugReports';
import { cn } from '@/lib/utils';

export function ReportBugButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [screenshotBlob, setScreenshotBlob] = useState<Blob | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const { data: openCount = 0 } = useBugReportsCount();

  const captureScreenshot = async () => {
    setIsCapturing(true);
    
    try {
      // Dynamic import to avoid loading html2canvas until needed
      const html2canvas = (await import('html2canvas')).default;
      
      // Hide the button temporarily during capture
      const button = document.getElementById('report-bug-button');
      if (button) button.style.visibility = 'hidden';

      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
        scale: 0.5, // Reduce size for performance
      });

      // Show button again
      if (button) button.style.visibility = 'visible';

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create blob'));
          },
          'image/png',
          0.8
        );
      });

      // Create preview URL
      const url = URL.createObjectURL(blob);
      
      setScreenshotBlob(blob);
      setScreenshotUrl(url);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      // Open modal anyway without screenshot
      setIsModalOpen(true);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    // Clean up blob URL
    if (screenshotUrl) {
      URL.revokeObjectURL(screenshotUrl);
      setScreenshotUrl(null);
    }
    setScreenshotBlob(null);
  };

  return (
    <>
      <button
        id="report-bug-button"
        className={cn(
          "fixed bottom-6 right-6 z-50 rounded-full p-4 shadow-lg",
          "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
          "transition-all duration-200 cursor-pointer",
          "flex items-center justify-center",
          isCapturing && "animate-pulse"
        )}
        onClick={captureScreenshot}
        disabled={isCapturing}
        type="button"
      >
        <Bug className="h-6 w-6" />
        {openCount > 0 && (
          <span 
            className="absolute -top-2 -right-2 h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium"
          >
            {openCount}
          </span>
        )}
      </button>

      <ReportBugModal
        open={isModalOpen}
        onOpenChange={handleClose}
        screenshotBlob={screenshotBlob}
        screenshotUrl={screenshotUrl}
      />
    </>
  );
}
