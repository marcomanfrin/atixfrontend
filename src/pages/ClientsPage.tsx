import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Building2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ClientType } from '@/types';
import { useClients, useCreateClient } from '@/hooks/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ListPagination } from '@/components/ListPagination';
import { clientSchema, ValidationErrors, ClientFormData } from '@/lib/validations';

const PAGE_SIZE = 50;

export default function ClientsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation('clients');
  const [currentPage, setCurrentPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', type: 'ATIX' as ClientType });
  const [formErrors, setFormErrors] = useState<ValidationErrors<ClientFormData>>({});

  // Debounce search (300ms) and reset to first page
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setCurrentPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch clients with server-side search
  const { data: clientsData, isLoading, error } = useClients(currentPage, PAGE_SIZE, debouncedSearch);
  // Per-type counts, independent of the search (size 1: only totalElements is needed)
  const { data: atixData } = useClients(0, 1, undefined, 'ATIX');
  const { data: finalData } = useClients(0, 1, undefined, 'FINAL');
  const createClient = useCreateClient();

  const clients = clientsData?.content || [];
  const totalPages = clientsData?.totalPages ?? 0;
  const totalElements = clientsData?.totalElements ?? 0;

  const handleCreateClient = () => {
    const result = clientSchema.safeParse(newClient);
    
    if (!result.success) {
      const errors: ValidationErrors<ClientFormData> = {};
      result.error.errors.forEach((error) => {
        const path = error.path[0] as keyof ClientFormData;
        if (path && !errors[path]) {
          errors[path] = error.message;
        }
      });
      setFormErrors(errors);
      toast({
        title: t('common:titles.validationError'),
        description: t('validation:form.hasErrors'),
        variant: 'destructive',
      });
      return;
    }

    setFormErrors({});

    createClient.mutate({
      name: newClient.name,
      type: newClient.type,
    }, {
      onSuccess: () => {
        setNewClient({ name: '', type: 'ATIX' });
        setFormErrors({});
        setIsCreateOpen(false);
        toast({
          title: t('common:titles.success'),
          description: t('messages.createSuccessDescription'),
        });
      },
      onError: (error: any) => {
        toast({
          title: t('common:titles.error'),
          description: error.message,
          variant: 'destructive',
        });
      }
    });
  };

  if (isLoading) return <LoadingSpinner message={t('messages.loading')} />;
  if (error) return (
    <div className="flex items-center justify-center py-12">
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">
            {t('messages.error')}: {(error as Error).message}
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const atixCount = atixData?.totalElements ?? 0;
  const finalCount = finalData?.totalElements ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('createButton')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('form.createTitle')}</DialogTitle>
              <DialogDescription>{t('form.createDescription')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('form.nameLabel')} *</Label>
                <Input
                  id="name"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  placeholder={t('form.namePlaceholder')}
                  className={formErrors.name ? 'border-destructive' : ''}
                />
                {formErrors.name && (
                  <p className="text-sm text-destructive">{formErrors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">{t('form.typeLabel')} *</Label>
                <Select
                  value={newClient.type}
                  onValueChange={(value: ClientType) => setNewClient({ ...newClient, type: value })}
                >
                  <SelectTrigger className={formErrors.type ? 'border-destructive' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ATIX">{t('types.ATIX')}</SelectItem>
                    <SelectItem value="FINAL">{t('types.FINAL')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                {t('common:actions.cancel')}
              </Button>
              <Button onClick={handleCreateClient}>{t('common:actions.create')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.total')}</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{atixCount + finalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.atix')}</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{atixCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.final')}</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{finalCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('list.title')}</CardTitle>
          <CardDescription>{t('list.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('columns.name')}</TableHead>
                  <TableHead>{t('columns.type')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow
                    key={client.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>
                      <Badge variant={client.type === 'ATIX' ? 'default' : 'secondary'}>
                        {client.type === 'ATIX' ? (
                          <><Building2 className="mr-1 h-3 w-3" /> {t('types.ATIX')}</>
                        ) : (
                          <><User className="mr-1 h-3 w-3" /> {t('types.FINAL')}</>
                        )}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {clients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      {t('messages.noClients')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="mt-4">
              <ListPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                summary={t('pagination.showing', {
                  start: currentPage * PAGE_SIZE + 1,
                  end: Math.min((currentPage + 1) * PAGE_SIZE, totalElements),
                  total: totalElements,
                })}
              />
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
