import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent } from '@/components/ui/card';
import { Users, Sparkles, Users2, BarChart3 } from 'lucide-react';
import { MeetingDetailHeader } from '@/components/meetings/MeetingDetailHeader';
import { MeetingModal } from '@/components/meetings/MeetingModal';
import { MeetingParticipantsTab } from '@/components/meetings/MeetingParticipantsTab';
import { MeetingRecommendationsTab } from '@/components/meetings/MeetingRecommendationsTab';
import { MeetingOneOnOnesTab } from '@/components/meetings/MeetingOneOnOnesTab';
import { MeetingSummaryTab } from '@/components/meetings/MeetingSummaryTab';
import {
  useMeeting,
  useDeleteMeeting,
  useMeetingParticipants,
} from '@/hooks/useMeetings';
import { toast } from 'sonner';

export default function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editModalOpen, setEditModalOpen] = useState(false);

  const { data: meeting, isLoading } = useMeeting(id);
  const { data: participants = [] } = useMeetingParticipants(id);
  const deleteMeeting = useDeleteMeeting();

  const handleDelete = async () => {
    if (!id) return;

    try {
      await deleteMeeting.mutateAsync(id);
      toast.success('Spotkanie zostało usunięte');
      navigate('/meetings');
    } catch (error) {
      toast.error('Błąd podczas usuwania spotkania');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/3" />
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-4 bg-muted rounded w-1/4" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-medium text-foreground mb-1">Nie znaleziono spotkania</h3>
            <p className="text-sm text-muted-foreground">
              Spotkanie o podanym ID nie istnieje lub zostało usunięte.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const participantCount = participants.length;
  const memberCount = participants.filter((p) => p.is_member).length;

  return (
    <div className="space-y-6">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/meetings">Spotkania</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{meeting.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <MeetingDetailHeader
        meeting={meeting}
        participantCount={participantCount}
        memberCount={memberCount}
        onEdit={() => setEditModalOpen(true)}
        onDelete={handleDelete}
        isDeleting={deleteMeeting.isPending}
      />

      <Tabs defaultValue="participants" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="participants" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Uczestnicy</span>
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Rekomendacje 1x1</span>
          </TabsTrigger>
          <TabsTrigger value="one-on-ones" className="gap-2">
            <Users2 className="h-4 w-4" />
            <span className="hidden sm:inline">Spotkania 1x1</span>
          </TabsTrigger>
          <TabsTrigger value="summary" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Podsumowanie</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="participants">
          <MeetingParticipantsTab meetingId={meeting.id} />
        </TabsContent>

        <TabsContent value="recommendations">
          <MeetingRecommendationsTab meetingId={meeting.id} />
        </TabsContent>

        <TabsContent value="one-on-ones">
          <MeetingOneOnOnesTab meetingId={meeting.id} />
        </TabsContent>

        <TabsContent value="summary">
          <MeetingSummaryTab meetingId={meeting.id} />
        </TabsContent>
      </Tabs>

      <MeetingModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        meeting={meeting}
      />
    </div>
  );
}
