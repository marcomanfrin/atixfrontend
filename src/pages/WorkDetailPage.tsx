import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Save, Edit2, X, CheckCircle2, Clock, TrendingUp, Building2, Factory, User, Calendar, Plus, Trash2, UserPlus, Phone, Mail, PlayCircle, AlertCircle, Pencil, ClipboardSignature } from 'lucide-react';
import { Work, WorkReportEntry, User as UserType, WorkStatus, WorksiteReferenceRole } from '@/types';
import { useToast } from '@/hooks/use-toast';
import AttachmentManager from '@/components/AttachmentManager';
import { WorkRapportiniCard } from '@/components/rapportini/WorkRapportiniCard';
import { useWork, useUpdateWork, useStartWork, useCloseWork, useInvoiceWork, useReopenWork, useForceWorkStatus, useDeleteWork, useAssignTechnician, useUnassignTechnician, useWorkReportEntries, useCreateReportEntry, useUpdateReportEntry, useDeleteReportEntry, useUsersByType, useWorksiteReferences, useAddReference, useRemoveReference, useCreateWorksiteReference, useAllPlants, useClients } from '@/hooks/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, formatDateTime } from '@/lib/date';
import { StatusBadge, getWorkStatusBadgeKey } from '@/components/ui/status-badge';

type AssignedTechnicianSummary = {
  id: string;
  technicianId?: string;
  name: string;
  email?: string;
  profileImageUrl?: string;
};

const getAssignedTechnicians = (
  work: Work,
  technicians: UserType[] = []
): AssignedTechnicianSummary[] => {
  const technicianById = new Map(technicians.map((tech) => [tech.id, tech]));
  const resolveProfileImageUrl = (technicianId?: string, fallback?: string) =>
    fallback || (technicianId ? technicianById.get(technicianId)?.profileImageUrl : undefined);

  if (work.assignedTechnicians && work.assignedTechnicians.length > 0) {
    return work.assignedTechnicians
      .map((assignment) => ({
        id: assignment.id,
        technicianId: assignment.technicianId,
        name: `${assignment.technicianFirstName} ${assignment.technicianLastName}`.trim(),
        email: assignment.technicianEmail,
        profileImageUrl: resolveProfileImageUrl(
          assignment.technicianId,
          assignment.profileImageUrl
        ),
      }))
      .filter((assignment) => assignment.name);
  }

  return (work.assignments || [])
    .map((assignment) => ({
      id: assignment.id,
      technicianId: assignment.user?.id,
      name: `${assignment.user?.firstName || ''} ${assignment.user?.lastName || ''}`.trim(),
      email: assignment.user?.email,
      profileImageUrl: resolveProfileImageUrl(
        assignment.user?.id,
        assignment.user?.profileImageUrl
      ),
    }))
    .filter((assignment) => assignment.name);
};

const getPlantDirectory = (work: Work): string =>
  work.plant?.nasDirectory || work.relatedPlantNasDirectory || '';

export default function WorkDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: currentUser, isAdmin, isOwner } = useAuth();
  const { t } = useTranslation(['works', 'worksite-references', 'reports']);

  // Fetch data
  const { data: work, isLoading, error } = useWork(id!);
  const { data: reportEntriesData } = useWorkReportEntries(id!);
  const { data: techniciansData } = useUsersByType('TECHNICIAN');
  const { data: sellersData } = useUsersByType('SELLER');
  const { data: worksiteReferencesData } = useWorksiteReferences();
  const { data: plantsData } = useAllPlants();
  const { data: clientsData } = useClients(0, 100);

  // Mutations
  const updateWork = useUpdateWork();
  const startWork = useStartWork();
  const closeWork = useCloseWork();
  const invoiceWork = useInvoiceWork();
  const reopenWork = useReopenWork();
  const forceWorkStatus = useForceWorkStatus();
  const deleteWork = useDeleteWork();
  const assignTechnician = useAssignTechnician();
  const unassignTechnician = useUnassignTechnician();
  const createReportEntry = useCreateReportEntry();
  const updateReportEntry = useUpdateReportEntry();
  const deleteReportEntry = useDeleteReportEntry();
  const addReference = useAddReference();
  const removeReference = useRemoveReference();
  const createWorksiteReference = useCreateWorksiteReference();

  const [isEditing, setIsEditing] = useState(false);
  const [editedWork, setEditedWork] = useState<any>({});
  

  const reportEntries = reportEntriesData || [];
  const technicians = techniciansData || [];
  const sellers = sellersData || [];
  const plants = (plantsData || []).sort((a: any, b: any) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' }));
  const atixClients = (clientsData?.content || []).filter((c: any) => c.type === 'ATIX');
  const finalClients = (clientsData?.content || []).filter((c: any) => c.type === 'FINAL');
  const allWorksiteReferences = worksiteReferencesData || [];

  // Update editedWork when work data loads
  useEffect(() => {
    if (work) {
      setEditedWork({
        ...work,
        plantId: work.plantId || work.plant?.id || null,
        sellerId: (work as any).sellerId || work.seller?.id || null,
        atixClientId: work.atixClientId || work.atixClient?.id || null,
        finalClientId: work.finalClientId || work.finalClient?.id || null,
      });
    }
  }, [work]);

  useEffect(() => {
    if (!currentUser?.id || currentUser.type !== 'TECHNICIAN') return;
    setNewEntry((prev) => (prev.technicianId ? prev : { ...prev, technicianId: currentUser.id! }));
  }, [currentUser?.id, currentUser?.type]);

  // New entry dialog
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({
    description: '',
    hours: 0,
    date: '',
    technicianId: ''
  });

  // Edit entry dialog
  const [isEditEntryOpen, setIsEditEntryOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<{ id: string; description: string; hours: number; date: string } | null>(null);

  // Assign technician dialog
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState('');

  // Add worksite reference dialog
  const [isAddReferenceOpen, setIsAddReferenceOpen] = useState(false);
  const [selectedReference, setSelectedReference] = useState('');
  const [selectedRole, setSelectedRole] = useState<WorksiteReferenceRole>('PLUMBER');
  const [isCreatingNewReference, setIsCreatingNewReference] = useState(false);
  const [newReferenceName, setNewReferenceName] = useState('');
  const [newReferencePhone, setNewReferencePhone] = useState('');
  const [newReferenceNotes, setNewReferenceNotes] = useState('');

  // Loading and error states
  if (isLoading) return <LoadingSpinner message={t('messages.loadingDetails')} />;
  if (error) return (
    <div className="flex items-center justify-center py-12">
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">
            {t('messages.errorDetails')}: {(error as Error).message}
          </p>
        </CardContent>
      </Card>
    </div>
  );
  if (!work) return null;

  const assignedTechnicians = getAssignedTechnicians(work, technicians);
  const assignedTechnicianIds = assignedTechnicians
    .map((assignment) => assignment.technicianId)
    .filter((id): id is string => Boolean(id));
  const isAssigned = currentUser
    ? assignedTechnicians.some((assignment) => assignment.technicianId === currentUser.id)
    : false;
  const canDelete = isOwner() || currentUser?.type === 'TECHNICIAN';
  const canManageAssignments = isAdmin() || isOwner();
  const availableTechnicians = technicians.filter((t: any) => !assignedTechnicianIds.includes(t.id));

  // Generate work index (e.g., "nasplant1work1")
  const getWorkIndex = (): string => {
    const plantDir = getPlantDirectory(work);
    const workDir = work.nasSubDirectory || '';
    return (plantDir + workDir).toLowerCase().replace(/\//g, '');
  };

  // Get full directory path
  const getFullDirectory = (): string => {
    const plantDir = getPlantDirectory(work);
    const workDir = work.nasSubDirectory || '';
    return plantDir + workDir;
  };
  const handleStatusChange = (newStatus: WorkStatus) => {
    const currentStatus = work.status;
    if (newStatus === currentStatus) return;

    const onError = (error: any) => {
      const is409 = error.message?.includes('conflict') || error.message?.includes('Conflict');
      toast({
        title: is409 ? t('messages.invalidTransitionTitle') : t('common:titles.error'),
        description: is409 ? t('messages.invalidTransitionDescription') : error.message,
        variant: 'destructive'
      });
    };

    if (newStatus === 'IN_PROGRESS' && currentStatus === 'SCHEDULED') {
      startWork.mutate(work.id, {
        onSuccess: () => toast({ title: t('messages.startedTitle'), description: t('messages.startedDescription') }),
        onError,
      });
    } else if (newStatus === 'IN_PROGRESS' && (currentStatus === 'CLOSED')) {
      reopenWork.mutate(work.id, {
        onSuccess: () => toast({ title: t('messages.reopenedTitle'), description: t('messages.reopenedDescription') }),
        onError,
      });
    } else if (newStatus === 'CLOSED' && currentStatus === 'IN_PROGRESS') {
      closeWork.mutate(work.id, {
        onSuccess: () => toast({ title: t('messages.closedTitle'), description: t('messages.closedDescription') }),
        onError,
      });
    } else if (newStatus === 'INVOICED' && currentStatus === 'CLOSED') {
      invoiceWork.mutate(work.id, {
        onSuccess: () => toast({ title: t('messages.invoicedTitle'), description: t('messages.invoicedDescription') }),
        onError,
      });
    } else if (isOwner()) {
      forceWorkStatus.mutate({ id: work.id, status: newStatus }, {
        onSuccess: () => toast({ title: t('messages.forceStatusTitle'), description: t('messages.forceStatusDescription') }),
        onError,
      });
    } else {
      toast({
        title: t('messages.invalidTransitionTitle'),
        description: t('messages.invalidTransitionDescription'),
        variant: 'destructive'
      });
    }
  };
  const handleSave = () => {
    updateWork.mutate({ id: work.id, data: editedWork }, {
      onSuccess: () => {
        setIsEditing(false);
        toast({
          title: t('messages.updateSuccessTitle'),
          description: t('messages.updateSuccessDescription')
        });
      },
      onError: (error: any) => {
        toast({
          title: t('common:titles.error'),
          description: error.message,
          variant: 'destructive'
        });
      }
    });
  };
  const handleCancel = () => {
    setEditedWork(work);
    setIsEditing(false);
  };
  const handleAddEntry = () => {
    createReportEntry.mutate({
      workId: work.id,
      description: newEntry.description,
      hours: newEntry.hours,
      ...(newEntry.date ? { date: newEntry.date } : {}),
      ...(newEntry.technicianId ? { technicianId: newEntry.technicianId } : {})
    }, {
      onSuccess: () => {
        setIsAddEntryOpen(false);
        const defaultTechnicianId = currentUser?.type === 'TECHNICIAN'
          ? currentUser.id ?? ''
          : '';
        setNewEntry({
          description: '',
          hours: 0,
          date: '',
          technicianId: defaultTechnicianId
        });
        toast({
          title: t('messages.entryAddedTitle'),
          description: t('messages.entryAddedDescription')
        });
      },
      onError: (error: any) => {
        toast({
          title: t('common:titles.error'),
          description: error.message,
          variant: 'destructive'
        });
      }
    });
  };
  const handleUpdateEntry = () => {
    if (!editingEntry) return;
    updateReportEntry.mutate({
      id: editingEntry.id,
      workId: work.id,
      data: {
        description: editingEntry.description,
        hours: editingEntry.hours,
        ...(editingEntry.date ? { date: editingEntry.date } : {})
      }
    }, {
      onSuccess: () => {
        setIsEditEntryOpen(false);
        setEditingEntry(null);
        toast({
          title: t('messages.entryUpdatedTitle'),
          description: t('messages.entryUpdatedDescription')
        });
      },
      onError: (error: any) => {
        toast({
          title: t('common:titles.error'),
          description: error.message,
          variant: 'destructive'
        });
      }
    });
  };

  const handleDeleteEntry = (entryId: string) => {
    if (!work?.id && !id) {
      toast({
        title: t('common:titles.error'),
        description: t('messages.errorDetails'),
        variant: 'destructive'
      });
      return;
    }

    deleteReportEntry.mutate({
      id: entryId,
      workId: work?.id || id!
    }, {
      onSuccess: () => {
        toast({
          title: t('messages.entryDeletedTitle'),
          description: t('messages.entryDeletedDescription')
        });
      },
      onError: (error: any) => {
        toast({
          title: t('common:titles.error'),
          description: error.message,
          variant: 'destructive'
        });
      }
    });
  };
  const handleAssignMyself = () => {
    if (!currentUser) return;
    assignTechnician.mutate({
      workId: work.id,
      technicianId: currentUser.id
    }, {
      onSuccess: () => {
        toast({
          title: t('messages.assignedTitle'),
          description: t('messages.assignedDescription')
        });
      },
      onError: (error: any) => {
        toast({
          title: t('common:titles.error'),
          description: error.message,
          variant: 'destructive'
        });
      }
    });
  };
  const handleAssignTechnician = () => {
    if (!selectedTechnician) return;
    const technician = technicians.find((t: any) => t.id === selectedTechnician);
    const technicianName = technician ? `${technician.firstName} ${technician.lastName}`.trim() : '';
    assignTechnician.mutate({
      workId: work.id,
      technicianId: selectedTechnician
    }, {
      onSuccess: () => {
        setIsAssignOpen(false);
        setSelectedTechnician('');
        toast({
          title: t('messages.technicianAssignedTitle'),
          description: t('messages.technicianAssignedDescription', { name: technicianName })
        });
      },
      onError: (error: any) => {
        toast({
          title: t('common:titles.error'),
          description: error.message,
          variant: 'destructive'
        });
      }
    });
  };
  const handleStartWork = () => {
    startWork.mutate(work.id, {
      onSuccess: () => {
        toast({ title: t('messages.startedTitle'), description: t('messages.startedDescription') });
      },
      onError: (error: any) => {
        toast({ title: t('common:titles.error'), description: error.message, variant: 'destructive' });
      }
    });
  };
  const handleCloseWork = () => {
    closeWork.mutate(work.id, {
      onSuccess: () => {
        toast({ title: t('messages.closedTitle'), description: t('messages.closedDescription') });
      },
      onError: (error: any) => {
        toast({ title: t('common:titles.error'), description: error.message, variant: 'destructive' });
      }
    });
  };
  const handleMarkInvoiced = () => {
    invoiceWork.mutate(work.id, {
      onSuccess: () => {
        toast({ title: t('messages.invoicedTitle'), description: t('messages.invoicedDescription') });
      },
      onError: (error: any) => {
        toast({ title: t('common:titles.error'), description: error.message, variant: 'destructive' });
      }
    });
  };
  const handleUnassignTechnician = (assignment: AssignedTechnicianSummary) => {
    if (!assignment.technicianId) return;
    unassignTechnician.mutate(
      { workId: work.id, technicianId: assignment.technicianId },
      {
        onSuccess: () => {
          toast({
            title: t('messages.technicianRemovedTitle'),
            description: t('messages.technicianRemovedDescription', { name: assignment.name }),
            variant: 'destructive'
          });
        },
        onError: (error: any) => {
          toast({
            title: t('common:titles.error'),
            description: error.message,
            variant: 'destructive'
          });
        }
      }
    );
  };
  const handleRemoveReference = (assignment: any) => {
    if (!assignment?.id) return;
    const referenceName = resolveWorksiteReferenceName(assignment);
    removeReference.mutate(
      { workId: work.id, assignmentId: assignment.id },
      {
        onSuccess: () => {
          toast({
            title: t('messages.referenceRemovedTitle'),
            description: t('messages.referenceRemovedDescription', { name: referenceName }),
            variant: 'destructive'
          });
        },
        onError: (error: any) => {
          toast({
            title: t('common:titles.error'),
            description: error.message,
            variant: 'destructive'
          });
        }
      }
    );
  };
  const handleDelete = () => {
    deleteWork.mutate(work.id, {
      onSuccess: () => {
        toast({
          title: t('messages.deleteSuccessTitle'),
          description: t('messages.deleteSuccessDescription'),
          variant: 'destructive'
        });
        navigate('/works');
      },
      onError: (error: any) => {
        toast({
          title: t('common:titles.error'),
          description: error.message,
          variant: 'destructive'
        });
      }
    });
  };
  const handleAddReference = () => {
    const roleLabel = t(`worksite-references:roles.${selectedRole}`);
    if (isCreatingNewReference) {
      // Create new reference first, then add it to the work
      if (!newReferenceName) {
        toast({
          title: t('messages.validationErrorTitle'),
          description: t('messages.validationReferenceName'),
          variant: 'destructive',
        });
        return;
      }

      const payload = {
        name: newReferenceName,
        ...(newReferencePhone.trim()
          ? { telephone: newReferencePhone.trim() }
          : {}),
        ...(newReferenceNotes.trim()
          ? { notes: newReferenceNotes.trim() }
          : {}),
      };

      createWorksiteReference.mutate(payload, {
        onSuccess: (newRef) => {
          // After creating, add it to the work
          addReference.mutate({
            workId: work.id,
            data: {
              worksiteReferenceId: newRef.id,
              role: selectedRole
            }
          }, {
            onSuccess: () => {
              setIsAddReferenceOpen(false);
              setSelectedReference('');
              setSelectedRole('PLUMBER');
              setIsCreatingNewReference(false);
              setNewReferenceName('');
              setNewReferencePhone('');
              setNewReferenceNotes('');
              toast({
                title: t('messages.referenceCreatedAndAddedTitle'),
                description: t('messages.referenceCreatedAndAddedDescription', {
                  name: newReferenceName,
                  role: roleLabel,
                })
              });
            },
            onError: (error: any) => {
              toast({
                title: t('common:titles.error'),
                description: error.message,
                variant: 'destructive'
              });
            }
          });
        },
        onError: (error: any) => {
          toast({
            title: t('messages.referenceCreateErrorTitle'),
            description: error.message,
            variant: 'destructive'
          });
        }
      });
    } else {
      // Add existing reference
      if (!selectedReference) return;
      const reference = allWorksiteReferences.find((ref: any) => ref.id === selectedReference);
      addReference.mutate({
        workId: work.id,
        data: {
          worksiteReferenceId: selectedReference,
          role: selectedRole
        }
      }, {
        onSuccess: () => {
          setIsAddReferenceOpen(false);
          setSelectedReference('');
          setSelectedRole('PLUMBER');
          toast({
            title: t('messages.referenceAddedTitle'),
            description: t('messages.referenceAddedDescription', {
              name: reference?.name || '',
              role: roleLabel,
            })
          });
        },
        onError: (error: any) => {
          toast({
            title: t('common:titles.error'),
            description: error.message,
            variant: 'destructive'
          });
        }
      });
    }
  };
  const resolveWorksiteReferenceName = (assignment: any) => {
    const directName = assignment?.worksiteReference?.name
      || assignment?.worksiteReferenceName
      || assignment?.referenceName
      || assignment?.worksiteReference?.label;
    if (directName) return directName;

    const referenceId = assignment?.worksiteReferenceId
      ?? assignment?.referenceId
      ?? assignment?.worksiteReference?.id
      ?? assignment?.reference?.id;
    if (!referenceId) return t('common:messages.notSet');

    const match = allWorksiteReferences.find((ref: any) => String(ref.id) === String(referenceId));
    return match?.name || t('common:messages.notSet');
  };
  const resolveWorksiteReferencePhone = (assignment: any) => {
    const directPhone = assignment?.worksiteReference?.telephone
      || assignment?.worksiteReferenceTelephone
      || assignment?.referenceTelephone
      || assignment?.telephone
      || assignment?.phone;
    if (directPhone) return directPhone;

    const referenceId = assignment?.worksiteReferenceId
      ?? assignment?.referenceId
      ?? assignment?.worksiteReference?.id
      ?? assignment?.reference?.id;
    if (!referenceId) return '';

    const match = allWorksiteReferences.find((ref: any) => String(ref.id) === String(referenceId));
    return match?.telephone || '';
  };
  const resolveReportEntryUser = (entry: any) => {
    if (entry?.userName) return entry.userName;

    const userId = entry?.userId ?? entry?.user?.id;
    if (!userId) return t('common:messages.notSet');

    const match = technicians.find((tech) => String(tech.id) === String(userId));
    return match ? `${match.firstName} ${match.lastName}`.trim() : t('common:messages.notSet');
  };
  const totalHours = reportEntries.reduce((sum: number, e: any) => sum + e.hours, 0);
  return <div className="space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/works')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">
              {isEditing ? t('form.editTitle') : work.name}
            </h1>
            <Badge className="bg-primary text-primary-foreground font-mono text-sm font-bold">
              {getWorkIndex()}
            </Badge>
            {isEditing ? (
              <Select value={work.status} onValueChange={value => handleStatusChange(value as WorkStatus)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SCHEDULED">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-3 w-3" />
                      {t('badges.scheduled')}
                    </div>
                  </SelectItem>
                  <SelectItem value="IN_PROGRESS">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      {t('badges.inProgress')}
                    </div>
                  </SelectItem>
                  <SelectItem value="CLOSED">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3" />
                      {t('badges.closed')}
                    </div>
                  </SelectItem>
                  <SelectItem value="INVOICED">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-3 w-3" />
                      {t('badges.invoiced')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <StatusBadge
                status={work.status}
                type="work"
                label={t(`badges.${getWorkStatusBadgeKey(work.status)}`)}
              />
            )}
          </div>

        </div>
        <div className="flex gap-2 flex-wrap">
          {!isEditing ? <>
              {work.status === 'SCHEDULED' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button>
                      <PlayCircle className="h-4 w-4 mr-2" />
                      {t('actions.startWork')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('dialogs.startWorkTitle')}</AlertDialogTitle>
                      <AlertDialogDescription>{t('dialogs.startWorkDescription')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleStartWork}>
                        {t('common:actions.confirm')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {work.status === 'IN_PROGRESS' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {t('actions.closeWork')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('dialogs.markClosedTitle')}</AlertDialogTitle>
                      <AlertDialogDescription>{t('dialogs.markClosedDescription')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCloseWork}>
                        {t('common:actions.confirm')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {work.status === 'CLOSED' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      {t('actions.markInvoiced')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('dialogs.markInvoicedTitle')}</AlertDialogTitle>
                      <AlertDialogDescription>{t('dialogs.markInvoicedDescription')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleMarkInvoiced}>
                        {t('common:actions.confirm')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                {t('common:actions.edit')}
              </Button>
              {canDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('common:actions.delete')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('dialogs.deleteTitle')}</AlertDialogTitle>
                      <AlertDialogDescription>{t('dialogs.deleteDescription')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>
                        {t('common:actions.delete')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </> : <>
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                {t('common:actions.cancel')}
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                {t('actions.saveChanges')}
              </Button>
            </>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Work Details */}
        <Card className="order-1 lg:order-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('details.title')}</CardTitle>
          </CardHeader>
            <CardContent>
              {isEditing ? <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="name">{t('form.nameLabel')}</Label>
                    <Input id="name" value={editedWork.name} onChange={e => setEditedWork({
                  ...editedWork,
                  name: e.target.value
                })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="bidNumber">{t('details.bidNumber')}</Label>
                    <Input id="bidNumber" value={editedWork.bidNumber} onChange={e => setEditedWork({
                  ...editedWork,
                  bidNumber: e.target.value
                })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="orderNumber">{t('details.orderNumber')}</Label>
                    <Input id="orderNumber" value={editedWork.orderNumber} onChange={e => setEditedWork({
                  ...editedWork,
                  orderNumber: e.target.value
                })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="orderDate">{t('details.orderDate')}</Label>
                    <Input id="orderDate" type="date" value={editedWork.orderDate} onChange={e => setEditedWork({
                  ...editedWork,
                  orderDate: e.target.value
                })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="electrical">{t('details.electricalProgress')}</Label>
                    <Input id="electrical" type="number" min="0" max="100" value={editedWork.electricalSchemaProgression} onChange={e => setEditedWork({
                  ...editedWork,
                  electricalSchemaProgression: Number(e.target.value)
                })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="programming">{t('details.programmingProgress')}</Label>
                    <Input id="programming" type="number" min="0" max="100" value={editedWork.programmingProgression} onChange={e => setEditedWork({
                  ...editedWork,
                  programmingProgression: Number(e.target.value)
                })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="officeHours">{t('details.expectedOfficeHours')}</Label>
                    <Input id="officeHours" type="number" step="0.5" value={editedWork.expectedOfficeHours} onChange={e => setEditedWork({
                  ...editedWork,
                  expectedOfficeHours: Number(e.target.value)
                })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="plantHours">{t('details.expectedPlantHours')}</Label>
                    <Input id="plantHours" type="number" step="0.5" value={editedWork.expectedPlantHours} onChange={e => setEditedWork({
                  ...editedWork,
                  expectedPlantHours: Number(e.target.value)
                })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="expectedStartDate">{t('details.expectedStart')}</Label>
                    <Input id="expectedStartDate" type="date" value={editedWork.expectedStartDate || ''} onChange={e => setEditedWork({
                  ...editedWork,
                  expectedStartDate: e.target.value
                })} />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="description">{t('details.description')}</Label>
                    <Textarea id="description" rows={6} value={editedWork.description || ''} onChange={e => setEditedWork({
                  ...editedWork,
                  description: e.target.value
                })} />
                  </div>
                </div> : <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-muted-foreground text-xs">{t('details.bidNumber')}</Label>
                      <p>{work.bidNumber}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">{t('details.orderNumber')}</Label>
                      <p>{work.orderNumber}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">{t('details.orderDate')}</Label>
                      <p>{formatDate(work.orderDate, t('common:messages.notSet'))}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-muted-foreground text-xs">{t('details.description')}</Label>
                    <p className="mt-1 whitespace-pre-wrap">{work.description || ''}</p>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-muted-foreground text-xs mb-2 block">{t('details.electricalSchematic')}</Label>
                      <div className="flex items-center gap-3">
                        <Progress value={work.electricalSchemaProgression} className="flex-1" />
                        <span className="text-sm font-medium w-12">{work.electricalSchemaProgression}%</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs mb-2 block">{t('details.programming')}</Label>
                      <div className="flex items-center gap-3">
                        <Progress value={work.programmingProgression} className="flex-1" />
                        <span className="text-sm font-medium w-12">{work.programmingProgression}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-muted-foreground text-xs">{t('details.expectedOfficeHours')}</Label>
                      <p>{work.expectedOfficeHours} {t('units.hours')}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">{t('details.expectedPlantHours')}</Label>
                      <p>{work.expectedPlantHours} {t('units.hours')}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <Label className="text-muted-foreground text-xs">{t('details.expectedStart')}</Label>
                    <p>{formatDate(work.expectedStartDate, t('common:messages.notSet'))}</p>
                  </div>
                </div>}
            </CardContent>
          </Card>

          {/* Client & Plant Info */}
          <Card className="order-2 lg:order-2">
            <CardHeader>
              <CardTitle>{t('sections.projectInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="plantId">{t('details.plant')}</Label>
                    <Select 
                      value={editedWork.plantId || ''} 
                      onValueChange={(value) => setEditedWork({ ...editedWork, plantId: value || null })}
                    >
                      <SelectTrigger id="plantId">
                        <SelectValue placeholder={t('common:messages.notSet')} />
                      </SelectTrigger>
                      <SelectContent>
                        {plants.map((plant: any) => (
                          <SelectItem key={plant.id} value={plant.id}>
                            {plant.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sellerId">{t('details.seller')}</Label>
                    <Select 
                      value={editedWork.sellerId || ''} 
                      onValueChange={(value) => setEditedWork({ ...editedWork, sellerId: value || null })}
                    >
                      <SelectTrigger id="sellerId">
                        <SelectValue placeholder={t('common:messages.notSet')} />
                      </SelectTrigger>
                      <SelectContent>
                        {sellers.map((seller: any) => (
                          <SelectItem key={seller.id} value={seller.id}>
                            {seller.firstName} {seller.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="atixClientId">{t('details.atixClient')}</Label>
                    <Select 
                      value={editedWork.atixClientId || ''} 
                      onValueChange={(value) => setEditedWork({ ...editedWork, atixClientId: value || null })}
                    >
                      <SelectTrigger id="atixClientId">
                        <SelectValue placeholder={t('common:messages.notSet')} />
                      </SelectTrigger>
                      <SelectContent>
                        {atixClients.map((client: any) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="finalClientId">{t('details.finalClient')}</Label>
                    <Select 
                      value={editedWork.finalClientId || ''} 
                      onValueChange={(value) => setEditedWork({ ...editedWork, finalClientId: value || null })}
                    >
                      <SelectTrigger id="finalClientId">
                        <SelectValue placeholder={t('common:messages.notSet')} />
                      </SelectTrigger>
                      <SelectContent>
                        {finalClients.map((client: any) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-muted-foreground text-xs">{t('details.createdAt')}</Label>
                      <p className="text-sm">{formatDateTime(work.createdAt, t('common:messages.notSet'))}</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {work.plant && <div className="flex items-center gap-3">
                      <Factory className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Label className="text-muted-foreground text-xs">{t('details.plant')}</Label>
                        <button
                          type="button"
                          onClick={() => navigate(`/plants/${work.plant!.id}`)}
                          className="text-sm font-medium text-primary hover:underline text-left"
                        >
                          {work.plant.name}
                        </button>
                      </div>
                    </div>}
                  {work.seller && <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Label className="text-muted-foreground text-xs">{t('details.seller')}</Label>
                        <p className="text-sm font-medium">{work.seller.firstName} {work.seller.lastName}</p>
                      </div>
                    </div>}
                  {work.atixClient && <div className="flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Label className="text-muted-foreground text-xs">{t('details.atixClient')}</Label>
                        <p className="text-sm font-medium">{work.atixClient.name}</p>
                      </div>
                    </div>}
                  {work.finalClient && <div className="flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Label className="text-muted-foreground text-xs">{t('details.finalClient')}</Label>
                        <p className="text-sm font-medium">{work.finalClient.name}</p>
                      </div>
                    </div>}
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-muted-foreground text-xs">{t('details.createdAt')}</Label>
                      <p className="text-sm">{formatDateTime(work.createdAt, t('common:messages.notSet'))}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Work Report */}
          <Card className="order-3 lg:order-3 lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('sections.workReport')}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('report.totalHours')}: <span className="font-medium">{totalHours}</span>
                </p>
              </div>
              <Dialog open={isAddEntryOpen} onOpenChange={setIsAddEntryOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('report.addEntry')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('report.addEntryTitle')}</DialogTitle>
                    <DialogDescription>{t('report.addEntryDescription')}</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="entry-description">{t('report.descriptionLabel')}</Label>
                      <Textarea id="entry-description" placeholder={t('report.descriptionPlaceholder')} value={newEntry.description} onChange={e => setNewEntry({
                      ...newEntry,
                      description: e.target.value
                    })} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="entry-hours">{t('report.hoursLabel')}</Label>
                      <Input id="entry-hours" type="number" step="0.5" min="0" value={newEntry.hours} onChange={e => setNewEntry({
                      ...newEntry,
                      hours: Number(e.target.value)
                    })} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="entry-date">{t('report.dateLabel')}</Label>
                      <Input id="entry-date" type="date" value={newEntry.date} onChange={e => setNewEntry({
                      ...newEntry,
                      date: e.target.value
                    })} />
                      <p className="text-xs text-muted-foreground">{t('report.dateHelper')}</p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddEntryOpen(false)}>
                      {t('common:actions.cancel')}
                    </Button>
                    <Button onClick={handleAddEntry} disabled={!newEntry.description || newEntry.hours < 0}>
                      {t('report.addEntry')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>

            {/* Edit Entry Dialog */}
            <Dialog open={isEditEntryOpen} onOpenChange={(open) => { setIsEditEntryOpen(open); if (!open) setEditingEntry(null); }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('report.editEntryTitle')}</DialogTitle>
                  <DialogDescription>{t('report.editEntryDescription')}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-entry-description">{t('report.descriptionLabel')}</Label>
                    <Textarea id="edit-entry-description" placeholder={t('report.descriptionPlaceholder')} value={editingEntry?.description ?? ''} onChange={e => setEditingEntry(prev => prev ? { ...prev, description: e.target.value } : prev)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-entry-hours">{t('report.hoursLabel')}</Label>
                    <Input id="edit-entry-hours" type="number" step="0.5" min="0" value={editingEntry?.hours ?? 0} onChange={e => setEditingEntry(prev => prev ? { ...prev, hours: Number(e.target.value) } : prev)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-entry-date">{t('report.dateLabel')}</Label>
                    <Input id="edit-entry-date" type="date" value={editingEntry?.date ?? ''} onChange={e => setEditingEntry(prev => prev ? { ...prev, date: e.target.value } : prev)} />
                    <p className="text-xs text-muted-foreground">{t('report.dateHelper')}</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsEditEntryOpen(false); setEditingEntry(null); }}>
                    {t('common:actions.cancel')}
                  </Button>
                  <Button onClick={handleUpdateEntry} disabled={!editingEntry?.description || (editingEntry?.hours ?? 0) < 0}>
                    {t('common:actions.save')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <CardContent>
              {reportEntries.length === 0 ? <p className="text-muted-foreground text-center py-6">
                  {t('report.empty')}
                </p> : <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('report.tableDescription')}</TableHead>
                      <TableHead>{t('report.tableTechnician')}</TableHead>
                      <TableHead className="hidden sm:table-cell w-32">{t('report.tableDate')}</TableHead>
                      <TableHead className="w-24 text-right">{t('report.tableHours')}</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportEntries.map(entry => <TableRow key={entry.id}>
                        <TableCell>{entry.description}</TableCell>
                        <TableCell>{resolveReportEntryUser(entry)}</TableCell>
                        <TableCell className="hidden sm:table-cell">{formatDate(entry.date, t('common:messages.notSet'))}</TableCell>
                        <TableCell className="text-right font-medium">{entry.hours}</TableCell>
                        <TableCell>
                          {entry.rapportinoId ? (
                            // Generated by a signed rapportino: read-only, corrected only by voiding the rapportino
                            <Button variant="ghost" size="icon" className="h-8 w-8" title={t('reports:work.generatedEntry')}
                              aria-label={t('reports:work.openRapportino')} onClick={() => navigate(`/reports/${entry.rapportinoId}`)}>
                              <ClipboardSignature className="h-4 w-4" />
                            </Button>
                          ) : (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingEntry({ id: entry.id, description: entry.description, hours: entry.hours, date: entry.date || '' }); setIsEditEntryOpen(true); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteEntry(entry.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          )}
                        </TableCell>
                      </TableRow>)}
                  </TableBody>
                </Table>}
            </CardContent>
          </Card>

          {/* Rapportini */}
          <WorkRapportiniCard workId={id || ''} className="order-4 lg:order-5 lg:col-span-2" />

          {/* Attachments */}
          <div className="order-4 lg:order-5 lg:col-span-2">
            <AttachmentManager targetType="WORK" targetId={id || ''} readOnly={false} />
          </div>

          {/* Assigned Technicians */}
          <Card className="order-5 lg:order-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('assignments.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {assignedTechnicians.length > 0 ? assignedTechnicians.map(assignment => <div key={assignment.id} className="group flex items-start gap-3 rounded-lg border border-border/50 bg-muted/40 p-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={assignment.profileImageUrl || ""} />
                      <AvatarFallback className="text-xs">
                        {assignment.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium truncate">{assignment.name}</p>
                      {assignment.email ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          <span className="truncate">{assignment.email}</span>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground truncate">
                          {t('assignments.emailUnavailable')}
                        </p>
                      )}
                    </div>
                    {canManageAssignments && assignment.technicianId && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('dialogs.removeTechnicianTitle')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('dialogs.removeTechnicianDescription', { name: assignment.name })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleUnassignTechnician(assignment)}>
                              {t('common:actions.remove')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>) : <p className="text-sm text-muted-foreground">{t('assignments.empty')}</p>}

              <Separator />

              <div className="space-y-2">
                {!isAssigned && <Button variant="outline" className="w-full" onClick={handleAssignMyself}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t('assignments.assignMyself')}
                  </Button>}

                {isAdmin && availableTechnicians.length > 0 && <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <UserPlus className="h-4 w-4 mr-2" />
                        {t('assignments.assignTechnician')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t('assignments.dialogTitle')}</DialogTitle>
                        <DialogDescription>{t('assignments.dialogDescription')}</DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('assignments.selectPlaceholder')} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableTechnicians.map(tech => <SelectItem key={tech.id} value={tech.id}>
                                {tech.firstName} {tech.lastName}
                              </SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAssignOpen(false)}>
                          {t('common:actions.cancel')}
                        </Button>
                        <Button onClick={handleAssignTechnician} disabled={!selectedTechnician}>
                          {t('assignments.assignTechnician')}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>}
              </div>
            </CardContent>
          </Card>

          {/* Worksite References */}
          <Card className="order-6 lg:order-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('references.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(work as any).worksiteReferenceAssignments && (work as any).worksiteReferenceAssignments.length > 0 ? (work as any).worksiteReferenceAssignments.map((assignment: any) => <div key={assignment.id} className="group flex items-start gap-3 rounded-lg border border-border/50 bg-muted/40 p-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {resolveWorksiteReferenceName(assignment)}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {t(`worksite-references:roles.${assignment.role}`)}
                        </Badge>
                      </div>
                      {resolveWorksiteReferencePhone(assignment) ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{resolveWorksiteReferencePhone(assignment)}</span>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {t('common:messages.notSet')}
                        </p>
                      )}
                    </div>
                    {canManageAssignments && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('dialogs.removeReferenceTitle')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('dialogs.removeReferenceDescription', { name: resolveWorksiteReferenceName(assignment) })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRemoveReference(assignment)}>
                              {t('common:actions.remove')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>) : <p className="text-sm text-muted-foreground">{t('references.empty')}</p>}

              <Separator />

              {isAdmin && <Dialog open={isAddReferenceOpen} onOpenChange={(open) => {
                  setIsAddReferenceOpen(open);
                  if (!open) {
                    setIsCreatingNewReference(false);
                    setNewReferenceName('');
                    setNewReferencePhone('');
                    setNewReferenceNotes('');
                    setSelectedReference('');
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      {t('references.addReference')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('references.dialogTitle')}</DialogTitle>
                      <DialogDescription>{t('references.dialogDescription')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant={!isCreatingNewReference ? "default" : "outline"}
                          size="sm"
                          onClick={() => setIsCreatingNewReference(false)}
                        >
                          {t('references.selectExisting')}
                        </Button>
                        <Button
                          type="button"
                          variant={isCreatingNewReference ? "default" : "outline"}
                          size="sm"
                          onClick={() => setIsCreatingNewReference(true)}
                        >
                          {t('references.createNew')}
                        </Button>
                      </div>

                      {isCreatingNewReference ? (
                        <div className="grid gap-2">
                          <Label htmlFor="newReferenceName">{t('references.referenceNameLabel')}</Label>
                          <Input
                            id="newReferenceName"
                            value={newReferenceName}
                            onChange={(e) => setNewReferenceName(e.target.value)}
                            placeholder={t('references.referenceNamePlaceholder')}
                          />
                          <Label htmlFor="newReferencePhone">{t('references.referencePhoneLabel')}</Label>
                          <Input
                            id="newReferencePhone"
                            type="tel"
                            value={newReferencePhone}
                            onChange={(e) => setNewReferencePhone(e.target.value)}
                            placeholder={t('references.referencePhonePlaceholder')}
                          />
                          <Label htmlFor="newReferenceNotes">{t('references.referenceNotesLabel')}</Label>
                          <Textarea
                            id="newReferenceNotes"
                            value={newReferenceNotes}
                            onChange={(e) => setNewReferenceNotes(e.target.value)}
                            placeholder={t('references.referenceNotesPlaceholder')}
                          />
                        </div>
                      ) : (
                        <div className="grid gap-2">
                          <Label htmlFor="reference">{t('references.referenceLabel')}</Label>
                          <Select value={selectedReference} onValueChange={setSelectedReference}>
                            <SelectTrigger id="reference">
                              <SelectValue placeholder={t('references.referencePlaceholder')} />
                            </SelectTrigger>
                            <SelectContent>
                              {allWorksiteReferences.map((ref: any) => <SelectItem key={ref.id} value={ref.id}>
                                  {ref.name}
                                </SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="grid gap-2">
                        <Label htmlFor="role">{t('references.roleLabel')}</Label>
                        <Select value={selectedRole} onValueChange={(value: any) => setSelectedRole(value)}>
                          <SelectTrigger id="role">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PLUMBER">{t('worksite-references:roles.PLUMBER')}</SelectItem>
                            <SelectItem value="ELECTRICIAN">{t('worksite-references:roles.ELECTRICIAN')}</SelectItem>
                            <SelectItem value="MAINTENANCE">{t('worksite-references:roles.MAINTENANCE')}</SelectItem>
                            <SelectItem value="OTHER">{t('worksite-references:roles.OTHER')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddReferenceOpen(false)}>
                        {t('common:actions.cancel')}
                      </Button>
                      <Button
                        onClick={handleAddReference}
                        disabled={isCreatingNewReference ? !newReferenceName : !selectedReference}
                      >
                        {isCreatingNewReference ? t('references.createAndAdd') : t('references.addButton')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>}
            </CardContent>
          </Card>
      </div>
    </div>;
}
