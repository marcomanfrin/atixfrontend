import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ArrowLeft, Plus, Save } from 'lucide-react';
import { Client, Plant, SellerUser } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useCreateWork, useAllClients, useAllPlants, useUsersByType, useCreateClient, useCreatePlant } from '@/hooks/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { workSchema, ValidationErrors, WorkFormData } from '@/lib/validations';

export default function CreateWorkPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation('works');

  // Pre-fill from ticket if coming from ticket detail
  const ticketState = location.state as { fromTicket?: string; ticketName?: string; ticketDescription?: string } | null;

  // Fetch data from API
  const { data: clientsData, isLoading: loadingClients } = useAllClients();
  const { data: plantsData, isLoading: loadingPlants } = useAllPlants();
  const { data: sellersData, isLoading: loadingSellers } = useUsersByType('SELLER');

  const createWork = useCreateWork();
  const createClient = useCreateClient();
  const createPlant = useCreatePlant();

  const clients = clientsData || [];
  const plants = plantsData || [];
  const sellers = sellersData || [];

  const [formData, setFormData] = useState({
    name: ticketState?.ticketName || '',
    bidNumber: '',
    orderNumber: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedStartDate: '',
    nasSubDirectory: '',
    expectedOfficeHours: 0,
    expectedPlantHours: 0,
    sellerId: '',
    atixClientId: '',
    finalClientId: '',
    plantId: '',
  });
  const [formErrors, setFormErrors] = useState<ValidationErrors<WorkFormData>>({});

  // Add client dialog
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', type: 'ATIX' });

  // Add plant dialog
  const [isAddPlantOpen, setIsAddPlantOpen] = useState(false);
  const [newPlant, setNewPlant] = useState({
    name: '',
    notes: '',
    nasDirectory: '',
    pswPhrase: '',
    pswPlatform: '',
    pswStation: '',
  });

  const handleAddClient = () => {
    if (!newClient.name.trim()) {
      toast({
        title: t('common:titles.validationError'),
        description: t('messages.clientNameRequired'),
        variant: 'destructive',
      });
      return;
    }

    createClient.mutate(
      { name: newClient.name, type: newClient.type as 'ATIX' | 'FINAL' },
      {
        onSuccess: (data) => {
          setFormData({ ...formData, atixClientId: data.id });
          setIsAddClientOpen(false);
          setNewClient({ name: '', type: 'ATIX' });
          toast({
            title: t('common:titles.success'),
            description: t('messages.clientAdded', { name: data.name }),
          });
        },
        onError: (error: any) => {
          toast({
            title: t('common:titles.error'),
            description: error.message,
            variant: 'destructive',
          });
        }
      }
    );
  };

  const handleAddPlant = () => {
    if (!newPlant.name.trim()) {
      toast({
        title: t('common:titles.validationError'),
        description: t('messages.plantNameRequired'),
        variant: 'destructive',
      });
      return;
    }

    createPlant.mutate(newPlant, {
      onSuccess: (data) => {
        setFormData({ ...formData, plantId: data.id });
        setIsAddPlantOpen(false);
        setNewPlant({
          name: '',
          notes: '',
          nasDirectory: '',
          pswPhrase: '',
          pswPlatform: '',
          pswStation: '',
        });
        toast({
          title: t('common:titles.success'),
          description: t('messages.plantAdded', { name: data.name }),
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const result = workSchema.safeParse(formData);
    
    if (!result.success) {
      const errors: ValidationErrors<WorkFormData> = {};
      result.error.errors.forEach((error) => {
        const path = error.path[0] as keyof WorkFormData;
        if (path && !errors[path]) {
          errors[path] = error.message;
        }
      });
      setFormErrors(errors);
      toast({
        title: t('messages.validationErrorTitle'),
        description: t('validation:form.hasErrors'),
        variant: 'destructive',
      });
      return;
    }

    setFormErrors({});

    // Prepare data for API
    const workData: any = {
      name: formData.name,
      bidNumber: formData.bidNumber,
      orderNumber: formData.orderNumber,
      orderDate: formData.orderDate,
    };

    // Add optional fields
    if (formData.atixClientId) workData.atixClientId = formData.atixClientId;
    if (formData.nasSubDirectory) workData.nasSubDirectory = formData.nasSubDirectory;
    if (formData.sellerId) workData.sellerId = formData.sellerId;
    if (formData.expectedStartDate) workData.expectedStartDate = formData.expectedStartDate;
    if (formData.finalClientId) workData.finalClientId = formData.finalClientId;
    if (formData.plantId) workData.plantId = formData.plantId;
    if (formData.expectedOfficeHours > 0) workData.expectedOfficeHours = formData.expectedOfficeHours;
    if (formData.expectedPlantHours > 0) workData.expectedPlantHours = formData.expectedPlantHours;
    if (ticketState?.fromTicket) workData.ticketId = ticketState.fromTicket;

    createWork.mutate(workData, {
      onSuccess: (data) => {
        toast({
          title: t('messages.createSuccessTitle'),
          description: t('messages.createSuccessDescription', { name: data.name }),
        });
        navigate('/works');
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

  if (loadingClients || loadingPlants || loadingSellers) {
    return <LoadingSpinner message={t('messages.loadingForm')} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/works')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('form.createTitle')}</h1>
          <p className="text-muted-foreground mt-1">
            {ticketState?.fromTicket
              ? t('create.subtitleFromTicket', { ticket: ticketState.ticketName })
              : t('create.subtitleDefault')}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>{t('sections.basicInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">{t('form.nameLabel')} *</Label>
                <Input
                  id="name"
                  placeholder={t('form.namePlaceholder')}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={formErrors.name ? 'border-destructive' : ''}
                />
                {formErrors.name && (
                  <p className="text-sm text-destructive">{formErrors.name}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="bidNumber">{t('form.bidNumberLabel')} *</Label>
                  <Input
                    id="bidNumber"
                    placeholder={t('form.bidNumberPlaceholder')}
                    value={formData.bidNumber}
                    onChange={(e) => setFormData({ ...formData, bidNumber: e.target.value })}
                    className={formErrors.bidNumber ? 'border-destructive' : ''}
                  />
                  {formErrors.bidNumber && (
                    <p className="text-sm text-destructive">{formErrors.bidNumber}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="orderNumber">{t('form.orderNumberLabel')} *</Label>
                  <Input
                    id="orderNumber"
                    placeholder={t('form.orderNumberPlaceholder')}
                    value={formData.orderNumber}
                    onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                    className={formErrors.orderNumber ? 'border-destructive' : ''}
                  />
                  {formErrors.orderNumber && (
                    <p className="text-sm text-destructive">{formErrors.orderNumber}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="orderDate">{t('form.orderDateLabel')} *</Label>
                  <Input
                    id="orderDate"
                    type="date"
                    value={formData.orderDate}
                    onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                    className={formErrors.orderDate ? 'border-destructive' : ''}
                  />
                  {formErrors.orderDate && (
                    <p className="text-sm text-destructive">{formErrors.orderDate}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expectedStartDate">{t('form.expectedStartDateLabel')}</Label>
                  <Input
                    id="expectedStartDate"
                    type="date"
                    value={formData.expectedStartDate}
                    onChange={(e) => setFormData({ ...formData, expectedStartDate: e.target.value })}
                  />
                </div>
              </div>


              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="officeHours">{t('form.expectedOfficeHoursLabel')}</Label>
                  <Input
                    id="officeHours"
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.expectedOfficeHours}
                    onChange={(e) => setFormData({ ...formData, expectedOfficeHours: Number(e.target.value) })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="plantHours">{t('form.expectedPlantHoursLabel')}</Label>
                  <Input
                    id="plantHours"
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.expectedPlantHours}
                    onChange={(e) => setFormData({ ...formData, expectedPlantHours: Number(e.target.value) })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Associations */}
          <Card>
            <CardHeader>
              <CardTitle>{t('sections.associations')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Seller */}
              <div className="grid gap-2">
                <Label>{t('form.sellerLabel')}</Label>
                <Select
                  value={formData.sellerId}
                  onValueChange={(v) => setFormData({ ...formData, sellerId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('form.sellerPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {sellers.map((seller) => (
                      <SelectItem key={seller.id} value={seller.id}>
                        {seller.firstName} {seller.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Atix Client */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>{t('form.atixClientLabel')}</Label>
                  <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="ghost" size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        {t('actions.addNew')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t('dialogs.addClient.title')}</DialogTitle>
                        <DialogDescription>{t('dialogs.addClient.description')}</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="client-name">{t('dialogs.addClient.nameLabel')}</Label>
                          <Input
                            id="client-name"
                            placeholder={t('dialogs.addClient.namePlaceholder')}
                            value={newClient.name}
                            onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="client-type">{t('dialogs.addClient.typeLabel')}</Label>
                          <Select
                            value={newClient.type}
                            onValueChange={(v) => setNewClient({ ...newClient, type: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ATIX">{t('dialogs.addClient.typeAtix')}</SelectItem>
                              <SelectItem value="FINAL">{t('dialogs.addClient.typeFinal')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddClientOpen(false)}>
                          {t('common:actions.cancel')}
                        </Button>
                        <Button onClick={handleAddClient} disabled={!newClient.name}>
                          {t('dialogs.addClient.addButton')}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <Select
                  value={formData.atixClientId}
                  onValueChange={(v) => setFormData({ ...formData, atixClientId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('form.clientPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Final Client */}
              <div className="grid gap-2">
                <Label>{t('form.finalClientLabel')}</Label>
                <Select
                  value={formData.finalClientId}
                  onValueChange={(v) => setFormData({ ...formData, finalClientId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('form.clientOptionalPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Plant */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>{t('form.plantLabel')}</Label>
                  <Dialog open={isAddPlantOpen} onOpenChange={setIsAddPlantOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="ghost" size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        {t('actions.addNew')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>{t('dialogs.addPlant.title')}</DialogTitle>
                        <DialogDescription>{t('dialogs.addPlant.description')}</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="plant-name">{t('dialogs.addPlant.nameLabel')} *</Label>
                          <Input
                            id="plant-name"
                            placeholder={t('dialogs.addPlant.namePlaceholder')}
                            value={newPlant.name}
                            onChange={(e) => setNewPlant({ ...newPlant, name: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="plant-notes">{t('dialogs.addPlant.notesLabel')}</Label>
                          <Input
                            id="plant-notes"
                            placeholder={t('dialogs.addPlant.notesPlaceholder')}
                            value={newPlant.notes}
                            onChange={(e) => setNewPlant({ ...newPlant, notes: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="plant-nas">{t('dialogs.addPlant.nasDirectoryLabel')}</Label>
                          <Input
                            id="plant-nas"
                            placeholder={t('dialogs.addPlant.nasDirectoryPlaceholder')}
                            value={newPlant.nasDirectory}
                            onChange={(e) => setNewPlant({ ...newPlant, nasDirectory: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="grid gap-2">
                            <Label htmlFor="psw-phrase">{t('dialogs.addPlant.pswPhraseLabel')}</Label>
                            <Input
                              id="psw-phrase"
                              type="password"
                              value={newPlant.pswPhrase}
                              onChange={(e) => setNewPlant({ ...newPlant, pswPhrase: e.target.value })}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="psw-platform">{t('dialogs.addPlant.pswPlatformLabel')}</Label>
                            <Input
                              id="psw-platform"
                              type="password"
                              value={newPlant.pswPlatform}
                              onChange={(e) => setNewPlant({ ...newPlant, pswPlatform: e.target.value })}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="psw-station">{t('dialogs.addPlant.pswStationLabel')}</Label>
                            <Input
                              id="psw-station"
                              type="password"
                              value={newPlant.pswStation}
                              onChange={(e) => setNewPlant({ ...newPlant, pswStation: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddPlantOpen(false)}>
                          {t('common:actions.cancel')}
                        </Button>
                        <Button onClick={handleAddPlant} disabled={!newPlant.name}>
                          {t('dialogs.addPlant.addButton')}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <Select
                  value={formData.plantId}
                  onValueChange={(v) => setFormData({ ...formData, plantId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('form.plantSelectPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {[...plants]
                      .sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' }))
                      .map((plant) => (
                        <SelectItem key={plant.id} value={plant.id}>
                          {plant.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={() => navigate('/works')}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit">
            <Save className="h-4 w-4 mr-2" />
            {t('createButton')}
          </Button>
        </div>
      </form>
    </div>
  );
}
