import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Plus,
  Search,
  Filter,
  Briefcase,
  Calendar,
  Building2,
  Factory,
  User,
  X,
  BarChart3
} from 'lucide-react';
import { Client, Plant, Work } from '@/types';
import { useWorks, useAllClients, useAllPlants, useUsersByType, useTickets } from '@/hooks/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { formatDate } from '@/lib/date';
import { StatusBadge, getWorkStatusBadgeKey } from '@/components/ui/status-badge';

const PAGE_SIZE = 30;

interface WorkFilters {
  atixClientId: string;
  finalClientId: string;
  sellerId: string;
  plantId: string;
  ticketId: string;
  technicianId: string;
  status: string;
  orderDateFrom: string;
  orderDateTo: string;
  expectedStartDateFrom: string;
  expectedStartDateTo: string;
  name: string;
  bidNumber: string;
  orderNumber: string;
}

const getAssignedTechnicianNames = (work: Work): string[] => {
  if (work.assignedTechnicians && work.assignedTechnicians.length > 0) {
    return work.assignedTechnicians
      .map((assignment) => `${assignment.technicianFirstName} ${assignment.technicianLastName}`.trim())
      .filter(Boolean);
  }

  return (work.assignments || [])
    .map((assignment) => `${assignment.user?.firstName || ''} ${assignment.user?.lastName || ''}`.trim())
    .filter(Boolean);
};

const getClientNames = (work: Work, clientsById?: Map<string, Client>): string[] => {
  const names: string[] = [];

  if (work.atixClient?.name) {
    names.push(work.atixClient.name);
  }
  if (work.finalClient?.name) {
    names.push(work.finalClient.name);
  }

  if (names.length === 0 && clientsById) {
    if (work.atixClientId) {
      const atixClient = clientsById.get(work.atixClientId);
      if (atixClient?.name) names.push(atixClient.name);
    }
    if (work.finalClientId) {
      const finalClient = clientsById.get(work.finalClientId);
      if (finalClient?.name) names.push(finalClient.name);
    }
  }

  return names.filter(Boolean);
};

const getPlantName = (work: Work, plantsById?: Map<string, Plant>): string => {
  if (work.plant?.name) return work.plant.name;
  if (work.plantId && plantsById) return plantsById.get(work.plantId)?.name || '';
  return '';
};

const getPlantDirectory = (work: Work, plantsById?: Map<string, Plant>): string => {
  if (work.plant?.nasDirectory) return work.plant.nasDirectory;
  if (work.relatedPlantNasDirectory) return work.relatedPlantNasDirectory;
  if (work.plantId && plantsById) return plantsById.get(work.plantId)?.nasDirectory || '';
  return '';
};

export default function WorksPage() {
  const navigate = useNavigate();
  const { t } = useTranslation('works');

  // F4: default tab is 'all', order: tutti → aperti → chiusi → non assegnati
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<WorkFilters>({
    atixClientId: '',
    finalClientId: '',
    sellerId: '',
    plantId: '',
    ticketId: '',
    technicianId: '',
    status: '',
    orderDateFrom: '',
    orderDateTo: '',
    expectedStartDateFrom: '',
    expectedStartDateTo: '',
    name: '',
    bidNumber: '',
    orderNumber: '',
  });

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Build API params from filters
  const baseParams = useMemo(() => {
    const p: Record<string, any> = {
      ...filters,
    };
    // Remove empty values
    Object.keys(p).forEach(key => {
      if (p[key] === '' || p[key] === undefined || p[key] === null) {
        delete p[key];
      }
    });
    return p;
  }, [filters]);

  const listParams = useMemo(() => {
    const p: Record<string, any> = {
      ...baseParams,
      page: currentPage,
      size: PAGE_SIZE,
      sort: ['plant.nasDirectory,desc', 'nasSubDirectory,desc'],
    };
    if (debouncedSearch) {
      p.search = debouncedSearch;
    }
    if (activeTab === 'all') {
      // No status filter
    } else if (activeTab === 'scheduled') {
      p.statuses = ['SCHEDULED'];
    } else if (activeTab === 'open') {
      p.statuses = ['IN_PROGRESS'];
    } else {
      p.statuses = ['CLOSED', 'INVOICED'];
    }
    return p;
  }, [baseParams, activeTab, currentPage, debouncedSearch]);

  const countParams = useMemo(() => ({
    ...baseParams,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    page: 0,
    size: 1,
  }), [baseParams, debouncedSearch]);

  const allCountParams = useMemo(() => ({
    ...countParams,
  }), [countParams]);

  const scheduledCountParams = useMemo(() => ({
    ...countParams,
    statuses: ['SCHEDULED'],
  }), [countParams]);

  const openCountParams = useMemo(() => ({
    ...countParams,
    statuses: ['IN_PROGRESS'],
  }), [countParams]);

  const closedCountParams = useMemo(() => ({
    ...countParams,
    statuses: ['CLOSED', 'INVOICED'],
  }), [countParams]);

  // Fetch data
  const { data: worksData, isLoading: worksLoading, error: worksError } = useWorks(listParams);
  const { data: allWorksData } = useWorks(allCountParams);
  const { data: scheduledWorksData } = useWorks(scheduledCountParams);
  const { data: openWorksData } = useWorks(openCountParams);
  const { data: closedWorksData } = useWorks(closedCountParams);
  const { data: clientsData } = useAllClients();
  const { data: plantsData } = useAllPlants();
  const { data: sellersData } = useUsersByType('SELLER');
  const { data: techniciansData } = useUsersByType('TECHNICIAN');
  const { data: ticketsData } = useTickets();

  const works = worksData?.content || [];
  const clients = clientsData || [];
  const plants = plantsData || [];
  const sellers = sellersData || [];
  const technicians = techniciansData || [];
  const tickets = ticketsData?.content || [];
  const clientsById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
  const plantsById = useMemo(() => new Map(plants.map((plant) => [plant.id, plant])), [plants]);
  // Search is now handled server-side via the `search` API parameter
  const filteredWorks = works;

  const clearFilters = () => {
    setFilters({
      atixClientId: '',
      finalClientId: '',
      sellerId: '',
      plantId: '',
      ticketId: '',
      technicianId: '',
      status: '',
      orderDateFrom: '',
      orderDateTo: '',
      expectedStartDateFrom: '',
      expectedStartDateTo: '',
      name: '',
      bidNumber: '',
      orderNumber: '',
    });
    setSearchQuery('');
    setCurrentPage(0);
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '') || searchQuery !== '';

  const allWorksCount = allWorksData?.totalElements || 0;
  const scheduledWorksCount = scheduledWorksData?.totalElements || 0;
  const openWorksCount = openWorksData?.totalElements || 0;
  const closedWorksCount = closedWorksData?.totalElements || 0;
  const totalPages = worksData?.totalPages || 0;
  const totalElements = worksData?.totalElements || 0;

  // Reset page when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentPage(0);
  };

  if (worksLoading) {
    return <LoadingSpinner message={t('messages.loading')} />;
  }

  if (worksError) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">
              {t('messages.error')}: {(worksError as Error).message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>
        <Button onClick={() => navigate('/works/new')}>
          <Plus className="h-4 w-4 mr-2" />
          {t('createButton')}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* F4: tab order is aperti → chiusi → non assegnati */}
          <TabsList>
            <TabsTrigger value="all">
              {t('tabs.all')} ({allWorksCount})
            </TabsTrigger>
            <TabsTrigger value="open">
              {t('tabs.open')} ({openWorksCount})
            </TabsTrigger>
            <TabsTrigger value="closed">
              {t('tabs.closed')} ({closedWorksCount})
            </TabsTrigger>
            <TabsTrigger value="scheduled">
              {t('tabs.scheduled')} ({scheduledWorksCount})
            </TabsTrigger>
          </TabsList>

          {/* Search & Filters */}
          <div className="flex flex-1 gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-muted' : ''}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card className="mt-4">
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {/* Atix Client */}
                <div>
                  <Label className="mb-2 block text-sm">{t('filters.atixClient')}</Label>
                  <Select value={filters.atixClientId || "__all__"} onValueChange={(v) => setFilters({...filters, atixClientId: v === "__all__" ? "" : v})}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('filters.all')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">{t('filters.all')}</SelectItem>
                      {clients.filter((c: any) => c.type === 'ATIX').map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Final Client */}
                <div>
                  <Label className="mb-2 block text-sm">{t('filters.finalClient')}</Label>
                  <Select value={filters.finalClientId || "__all__"} onValueChange={(v) => setFilters({...filters, finalClientId: v === "__all__" ? "" : v})}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('filters.all')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">{t('filters.all')}</SelectItem>
                      {clients.filter((c: any) => c.type === 'FINAL').map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Plant */}
                <div>
                  <Label className="mb-2 block text-sm">{t('filters.plant')}</Label>
                  <Select value={filters.plantId || "__all__"} onValueChange={(v) => setFilters({...filters, plantId: v === "__all__" ? "" : v})}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('filters.all')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">{t('filters.all')}</SelectItem>
                      {plants.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Seller */}
                <div>
                  <Label className="mb-2 block text-sm">{t('filters.seller')}</Label>
                  <Select value={filters.sellerId || "__all__"} onValueChange={(v) => setFilters({...filters, sellerId: v === "__all__" ? "" : v})}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('filters.all')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">{t('filters.all')}</SelectItem>
                      {sellers.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Technician */}
                <div>
                  <Label className="mb-2 block text-sm">{t('filters.technician')}</Label>
                  <Select value={filters.technicianId || "__all__"} onValueChange={(v) => setFilters({...filters, technicianId: v === "__all__" ? "" : v})}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('filters.all')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">{t('filters.all')}</SelectItem>
                      {technicians.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Ticket */}
                <div>
                  <Label className="mb-2 block text-sm">{t('filters.ticket')}</Label>
                  <Select value={filters.ticketId || "__all__"} onValueChange={(v) => setFilters({...filters, ticketId: v === "__all__" ? "" : v})}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('filters.all')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">{t('filters.all')}</SelectItem>
                      {tickets.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div>
                  <Label className="mb-2 block text-sm">{t('filters.status')}</Label>
                  <Select value={filters.status || "__all__"} onValueChange={(v) => setFilters({...filters, status: v === "__all__" ? "" : v})}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('filters.all')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">{t('filters.all')}</SelectItem>
                      <SelectItem value="SCHEDULED">{t('filters.statusScheduled')}</SelectItem>
                      <SelectItem value="IN_PROGRESS">{t('filters.statusInProgress')}</SelectItem>
                      <SelectItem value="CLOSED">{t('filters.statusClosed')}</SelectItem>
                      <SelectItem value="INVOICED">{t('filters.statusInvoiced')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Order Date From */}
                <div>
                  <Label className="mb-2 block text-sm">{t('filters.orderDateFrom')}</Label>
                  <Input
                    type="date"
                    value={filters.orderDateFrom}
                    onChange={(e) => setFilters({...filters, orderDateFrom: e.target.value})}
                  />
                </div>

                {/* Order Date To */}
                <div>
                  <Label className="mb-2 block text-sm">{t('filters.orderDateTo')}</Label>
                  <Input
                    type="date"
                    value={filters.orderDateTo}
                    onChange={(e) => setFilters({...filters, orderDateTo: e.target.value})}
                  />
                </div>

                {/* Expected Start From */}
                <div>
                  <Label className="mb-2 block text-sm">{t('filters.expectedStartFrom')}</Label>
                  <Input
                    type="date"
                    value={filters.expectedStartDateFrom}
                    onChange={(e) => setFilters({...filters, expectedStartDateFrom: e.target.value})}
                  />
                </div>

                {/* Expected Start To */}
                <div>
                  <Label className="mb-2 block text-sm">{t('filters.expectedStartTo')}</Label>
                  <Input
                    type="date"
                    value={filters.expectedStartDateTo}
                    onChange={(e) => setFilters({...filters, expectedStartDateTo: e.target.value})}
                  />
                </div>

                {/* Name */}
                <div>
                  <Label className="mb-2 block text-sm">{t('filters.name')}</Label>
                  <Input
                    placeholder={t('placeholders.searchName')}
                    value={filters.name}
                    onChange={(e) => setFilters({...filters, name: e.target.value})}
                  />
                </div>

                {/* Bid Number */}
                <div>
                  <Label className="mb-2 block text-sm">{t('filters.bidNumber')}</Label>
                  <Input
                    placeholder={t('placeholders.searchBid')}
                    value={filters.bidNumber}
                    onChange={(e) => setFilters({...filters, bidNumber: e.target.value})}
                  />
                </div>

                {/* Order Number */}
                <div>
                  <Label className="mb-2 block text-sm">{t('filters.orderNumber')}</Label>
                  <Input
                    placeholder={t('placeholders.searchOrder')}
                    value={filters.orderNumber}
                    onChange={(e) => setFilters({...filters, orderNumber: e.target.value})}
                  />
                </div>

                {/* Clear Filters Button */}
                <div className="flex items-end">
                  <Button variant="ghost" size="sm" onClick={clearFilters} disabled={!hasActiveFilters}>
                    <X className="h-4 w-4 mr-1" />
                    {t('filters.clear')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* F4: Works List – tab order: tutti → aperti → chiusi → non assegnati */}
        <TabsContent value="all" className="mt-4 space-y-4">
          <WorksList
            works={filteredWorks}
            navigate={navigate}
            clientsById={clientsById}
            plantsById={plantsById}
          />
          {totalPages > 1 && (
            <WorksPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalElements={totalElements}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          )}
        </TabsContent>
        <TabsContent value="open" className="mt-4 space-y-4">
          <WorksList
            works={filteredWorks}
            navigate={navigate}
            clientsById={clientsById}
            plantsById={plantsById}
          />
          {totalPages > 1 && (
            <WorksPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalElements={totalElements}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          )}
        </TabsContent>
        <TabsContent value="closed" className="mt-4 space-y-4">
          <WorksList
            works={filteredWorks}
            navigate={navigate}
            clientsById={clientsById}
            plantsById={plantsById}
          />
          {totalPages > 1 && (
            <WorksPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalElements={totalElements}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          )}
        </TabsContent>
        <TabsContent value="scheduled" className="mt-4 space-y-4">
          <WorksList
            works={filteredWorks}
            navigate={navigate}
            clientsById={clientsById}
            plantsById={plantsById}
          />
          {totalPages > 1 && (
            <WorksPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalElements={totalElements}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WorksPagination({
  currentPage,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const { t } = useTranslation('works');
  const startItem = currentPage * pageSize + 1;
  const endItem = Math.min((currentPage + 1) * pageSize, totalElements);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
      if (currentPage < 3) {
        for (let i = 0; i < Math.min(maxVisible, totalPages); i++) pages.push(i);
      } else if (currentPage > totalPages - 4) {
        for (let i = totalPages - maxVisible; i < totalPages; i++) pages.push(i);
      } else {
        for (let i = currentPage - 2; i <= currentPage + 2; i++) pages.push(i);
      }
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">
        {t('pagination.showing', { start: startItem, end: endItem, total: totalElements })}
      </p>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => onPageChange(Math.max(0, currentPage - 1))}
              className={currentPage === 0 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
          {getPageNumbers().map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                onClick={() => onPageChange(page)}
                isActive={currentPage === page}
                className="cursor-pointer"
              >
                {page + 1}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
              className={currentPage >= totalPages - 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

function WorksList({
  works,
  navigate,
  clientsById,
  plantsById,
}: {
  works: Work[];
  navigate: (path: string) => void;
  clientsById: Map<string, Client>;
  plantsById: Map<string, Plant>;
}) {
  const { t } = useTranslation('works');
  // Generate work index (e.g., "nasplant1work1")
  const getWorkIndex = (work: Work): string => {
    const plantDir = getPlantDirectory(work, plantsById);
    const workDir = work.nasSubDirectory || '';
    return (plantDir + workDir).toLowerCase().replace(/\//g, '');
  };

  if (works.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">{t('messages.noWorks')}</h3>
          <p className="text-muted-foreground mt-1">{t('messages.noWorksFilters')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {works.map((work) => {
        const expectedStartDateLabel = formatDate(work.expectedStartDate);
        const clientName = getClientNames(work, clientsById).join(' / ');
        const plantName = getPlantName(work, plantsById);
        const plantId = work.plant?.id ?? work.plantId;
        const technicianNames = getAssignedTechnicianNames(work).join(', ');

        return (
          <Card
            key={work.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/works/${work.id}`)}
          >
            <CardContent className="py-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge
                      className={`bg-primary text-primary-foreground font-mono text-sm font-bold${plantId ? ' cursor-pointer hover:underline' : ''}`}
                      onClick={plantId ? (e) => {
                        e.stopPropagation();
                        navigate(`/plants/${plantId}`);
                      } : undefined}
                    >
                      {getWorkIndex(work)}
                    </Badge>
                    <h3 className="font-medium">{work.name}</h3>
                    <StatusBadge
                      status={work.status}
                      type="work"
                      label={t(`badges.${getWorkStatusBadgeKey(work.status)}`)}
                    />
                  </div>
                  {/* F3: order number → atix client → plant → technician → start date */}
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                    {work.orderNumber && (
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        <span>{work.orderNumber}</span>
                      </div>
                    )}
                    {clientName && (
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        <span>{clientName}</span>
                      </div>
                    )}
                    {plantName && (
                      <div className="flex items-center gap-1">
                        <Factory className="h-3 w-3" />
                        <span>{plantName}</span>
                      </div>
                    )}
                    {technicianNames && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{technicianNames}</span>
                      </div>
                    )}
                    {expectedStartDateLabel && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{expectedStartDateLabel}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress indicators */}
                <div className="flex gap-4 lg:gap-6">
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <BarChart3 className="h-3 w-3" />
                      {t('progress.electrical')}
                    </div>
                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${work.electricalSchemaProgression || 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{work.electricalSchemaProgression || 0}%</span>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <BarChart3 className="h-3 w-3" />
                      {t('progress.programming')}
                    </div>
                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${work.programmingProgression || 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{work.programmingProgression || 0}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
