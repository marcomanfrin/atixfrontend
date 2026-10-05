import { useState } from 'react';
import { Plus, Search, UserPlus, Mail, Shield, Briefcase, Trash2, Edit2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole, UserType } from '@/types';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useUpdateCalendarColor } from '@/hooks/api';
import { ColorPicker } from '@/components/calendar/ColorPicker';
import { colorOrFallback, isHexColor } from '@/lib/color';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { userSchema, validateForm, ValidationErrors, UserFormData } from '@/lib/validations';

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  type: UserType;
  calendarColor?: string;
}

export default function UsersPage() {
  const { toast } = useToast();
  const { canManageUsers } = useAuth();
  const { t } = useTranslation(['users', 'calendar']);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch users
  const { data: usersData, isLoading, error } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const updateCalendarColor = useUpdateCalendarColor();
  const deleteUser = useDeleteUser();

  const users = usersData || [];
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'USER' as UserRole,
    type: 'TECHNICIAN' as UserType,
  });
  const [formErrors, setFormErrors] = useState<ValidationErrors<UserFormData>>({});

  // Filter users based on search
  const filteredUsers = users.filter((user) => {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    return (
      fullName.includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

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

  const handleCreateUser = () => {
    const result = userSchema.safeParse(newUser);
    
    if (!result.success) {
      const errors: ValidationErrors<UserFormData> = {};
      result.error.errors.forEach((error) => {
        const path = error.path[0] as keyof UserFormData;
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

    createUser.mutate(newUser, {
      onSuccess: () => {
        toast({
          title: t('common:titles.success'),
          description: t('messages.createSuccessDescription', {
            name: `${newUser.firstName} ${newUser.lastName}`,
          }),
        });
        setNewUser({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          role: 'USER',
          type: 'TECHNICIAN',
        });
        setFormErrors({});
        setIsCreateDialogOpen(false);
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

  const handleEditUser = async () => {
    if (!editingUser) return;

    const { calendarColor, ...userData } = editingUser;
    const originalColor = users.find((u) => u.id === editingUser.id)?.calendarColor ?? '';
    const colorChanged = !!calendarColor && calendarColor.toUpperCase() !== originalColor.toUpperCase();

    if (colorChanged && !isHexColor(calendarColor)) {
      toast({
        title: t('common:titles.validationError'),
        description: t('calendar:color.invalid'),
        variant: 'destructive',
      });
      return;
    }

    try {
      // Colour has its own endpoint (allowed to ADMIN/OWNER on any user)
      if (colorChanged) {
        await updateCalendarColor.mutateAsync({ id: editingUser.id, calendarColor });
      }
      await updateUser.mutateAsync({ id: editingUser.id, data: userData });
      toast({
        title: t('common:titles.updated'),
        description: t('messages.updateSuccessDescription', {
          name: `${editingUser.firstName} ${editingUser.lastName}`,
        }),
      });
      setIsEditDialogOpen(false);
      setEditingUser(null);
    } catch (error) {
      toast({
        title: t('common:titles.error'),
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = (userId: string) => {
    const user = users.find((u: any) => u.id === userId);
    deleteUser.mutate(userId, {
      onSuccess: () => {
        toast({
          title: t('common:titles.deleted'),
          description: t('messages.deleteSuccessDescription', {
            name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
          }),
          variant: 'destructive',
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

  const openEditDialog = (user: UserData) => {
    setEditingUser({ ...user });
    setIsEditDialogOpen(true);
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'OWNER':
        return 'default';
      case 'ADMIN':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getUserTypeIcon = (type: UserType) => {
    switch (type) {
      case 'TECHNICIAN':
        return '🔧';
      case 'ADMINISTRATION':
        return '📋';
      case 'SELLER':
        return '💼';
    }
  };

  if (!canManageUsers()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <Shield className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">{t('accessDenied.title')}</h2>
        <p className="text-muted-foreground max-w-md">
          {t('accessDenied.description')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              {t('createButton')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t('form.createTitle')}</DialogTitle>
              <DialogDescription>{t('form.createDescription')}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t('form.firstNameLabel')} *</Label>
                  <Input
                    id="firstName"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                    placeholder={t('form.firstNamePlaceholder')}
                    className={formErrors.firstName ? 'border-destructive' : ''}
                  />
                  {formErrors.firstName && (
                    <p className="text-sm text-destructive">{formErrors.firstName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t('form.lastNameLabel')} *</Label>
                  <Input
                    id="lastName"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                    placeholder={t('form.lastNamePlaceholder')}
                    className={formErrors.lastName ? 'border-destructive' : ''}
                  />
                  {formErrors.lastName && (
                    <p className="text-sm text-destructive">{formErrors.lastName}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('form.emailLabel')} *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder={t('form.emailPlaceholder')}
                  className={formErrors.email ? 'border-destructive' : ''}
                />
                {formErrors.email && (
                  <p className="text-sm text-destructive">{formErrors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('form.passwordLabel')} *</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder={t('form.passwordPlaceholder')}
                  className={formErrors.password ? 'border-destructive' : ''}
                />
                {formErrors.password && (
                  <p className="text-sm text-destructive">{formErrors.password}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">{t('form.roleLabel')} *</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(value: UserRole) => setNewUser({ ...newUser, role: value })}
                  >
                    <SelectTrigger className={formErrors.role ? 'border-destructive' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">{t('roles.USER')}</SelectItem>
                      <SelectItem value="ADMIN">{t('roles.ADMIN')}</SelectItem>
                      <SelectItem value="OWNER">{t('roles.OWNER')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">{t('form.typeLabel')} *</Label>
                  <Select
                    value={newUser.type}
                    onValueChange={(value: UserType) => setNewUser({ ...newUser, type: value })}
                  >
                    <SelectTrigger className={formErrors.type ? 'border-destructive' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TECHNICIAN">{t('types.TECHNICIAN')}</SelectItem>
                      <SelectItem value="ADMINISTRATION">{t('types.ADMINISTRATION')}</SelectItem>
                      <SelectItem value="SELLER">{t('types.SELLER')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                {t('common:actions.cancel')}
              </Button>
              <Button onClick={handleCreateUser}>{t('createButton')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.total')}</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.sellers')}</CardTitle>
            <span className="text-lg">💼</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.type === 'SELLER').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.technicians')}</CardTitle>
            <span className="text-lg">🔧</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.type === 'TECHNICIAN').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.administration')}</CardTitle>
            <span className="text-lg">📋</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.type === 'ADMINISTRATION').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('columns.user')}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t('columns.role')}</TableHead>
                  <TableHead className="text-right">{t('columns.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Avatar className="h-8 w-8 sm:h-9 sm:w-9 shrink-0">
                          <AvatarImage src={user.profileImageUrl || ""} />
                          <AvatarFallback className="text-xs sm:text-sm">
                            {user.firstName[0]}
                            {user.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 font-medium text-sm sm:text-base">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/10"
                              style={{ backgroundColor: colorOrFallback(user.calendarColor) }}
                              title={t('calendar:color.title')}
                            />
                            <span className="truncate">{user.firstName} {user.lastName}</span>
                          </div>
                          <div className="text-xs text-muted-foreground truncate sm:hidden">
                            {user.email}
                          </div>
                          <div className="text-xs text-muted-foreground sm:hidden">
                            {getUserTypeIcon(user.type)} {t(`roles.${user.role}`)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="space-y-1">
                        <Badge variant={getRoleBadgeVariant(user.role)}>{t(`roles.${user.role}`)}</Badge>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          {getUserTypeIcon(user.type)}
                          {t(`types.${user.type}`)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(user)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>{t('dialogs.deleteTitle')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('dialogs.deleteDescription', { name: `${user.firstName} ${user.lastName}` })}
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>
                                {t('common:actions.delete')}
                              </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      {t('messages.noUsers')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('form.editTitle')}</DialogTitle>
            <DialogDescription>{t('form.editDescription')}</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editFirstName">{t('form.firstNameLabel')} *</Label>
                  <Input
                    id="editFirstName"
                    value={editingUser.firstName}
                    onChange={(e) => setEditingUser({ ...editingUser, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editLastName">{t('form.lastNameLabel')} *</Label>
                  <Input
                    id="editLastName"
                    value={editingUser.lastName}
                    onChange={(e) => setEditingUser({ ...editingUser, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEmail">{t('form.emailLabel')} *</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editRole">{t('form.roleLabel')} *</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(value: UserRole) => setEditingUser({ ...editingUser, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">{t('roles.USER')}</SelectItem>
                    <SelectItem value="ADMIN">{t('roles.ADMIN')}</SelectItem>
                    <SelectItem value="OWNER">{t('roles.OWNER')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('calendar:color.title')}</Label>
                <ColorPicker
                  value={editingUser.calendarColor ?? ''}
                  onChange={(calendarColor) => setEditingUser({ ...editingUser, calendarColor })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={handleEditUser}>{t('actions.saveChanges')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
