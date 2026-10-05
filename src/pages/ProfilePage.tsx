import { useState, useEffect } from 'react';
import { User, Mail, Lock, Camera, Save, Palette } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateUser, useUpdatePassword, useUploadAvatar, useUsers, useUpdateCalendarColor } from '@/hooks/api';
import { ColorPicker } from '@/components/calendar/ColorPicker';
import { isHexColor } from '@/lib/color';

export default function ProfilePage() {
  const { toast } = useToast();
  const { user, updateUser: updateAuthUser } = useAuth();
  const { t } = useTranslation(['profile', 'users', 'calendar']);

  const updateUser = useUpdateUser();
  const updatePassword = useUpdatePassword();
  const uploadAvatar = useUploadAvatar();
  const updateCalendarColor = useUpdateCalendarColor();

  // Fetch users to get the current user's ID if not available
  const { data: usersData } = useUsers();
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(user?.id);

  useEffect(() => {
    if (user?.id) {
      setCurrentUserId(user.id);
    } else if (usersData && user?.email) {
      // Find current user by email
      const currentUser = usersData.find((u: any) => u.email === user.email);
      if (currentUser) {
        setCurrentUserId(currentUser.id);
      }
    }
  }, [user, usersData]);
  
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    profileImageUrl: user?.profileImageUrl || '',
  });

  useEffect(() => {
    if (!user) return;
    setProfileData((prev) => ({
      ...prev,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      profileImageUrl: user.profileImageUrl || '',
    }));
  }, [user]);
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const savedCalendarColor = usersData?.find((u) => u.id === currentUserId)?.calendarColor ?? '';
  const [calendarColor, setCalendarColor] = useState('');

  useEffect(() => {
    setCalendarColor(savedCalendarColor);
  }, [savedCalendarColor]);

  const handleCalendarColorUpdate = () => {
    if (!isHexColor(calendarColor)) {
      toast({
        title: t('common:titles.validationError'),
        description: t('calendar:color.invalid'),
        variant: 'destructive',
      });
      return;
    }
    updateCalendarColor.mutate(
      { id: 'me', calendarColor },
      {
        onSuccess: () => {
          toast({
            title: t('common:titles.success'),
            description: t('calendar:color.updated'),
          });
        },
        onError: (error: Error) => {
          toast({
            title: t('common:titles.error'),
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!currentUserId) {
      toast({
        title: t('common:titles.error'),
        description: t('messages.userIdMissing'),
        variant: 'destructive',
      });
      return;
    }

    const previousUrl = profileData.profileImageUrl;
    const previewUrl = URL.createObjectURL(file);
    setProfileData((prev) => ({ ...prev, profileImageUrl: previewUrl }));
    setIsUploadingAvatar(true);
    uploadAvatar.mutate(
      { id: currentUserId, file },
      {
        onSuccess: (data: any) => {
          const nextUrl =
            data?.profileImageUrl ||
            data?.avatarUrl ||
            data?.url ||
            data?.imageUrl ||
            data?.avatar ||
            data?.user?.profileImageUrl;
          if (nextUrl) {
            updateAuthUser({ profileImageUrl: nextUrl });
            setProfileData((prev) => ({ ...prev, profileImageUrl: nextUrl }));
          }
          toast({
            title: t('common:titles.success'),
            description: t('messages.avatarUpdated'),
          });
          setIsUploadingAvatar(false);
        },
        onError: (error: any) => {
          setProfileData((prev) => ({ ...prev, profileImageUrl: previousUrl }));
          toast({
            title: t('common:titles.error'),
            description: error.message,
            variant: 'destructive',
          });
          setIsUploadingAvatar(false);
        }
      }
    );
  };

  const handleProfileUpdate = () => {
    if (!currentUserId) {
      toast({
        title: t('common:titles.error'),
        description: t('messages.userIdMissing'),
        variant: 'destructive',
      });
      return;
    }
    if (!profileData.firstName || !profileData.lastName || !profileData.email) {
      toast({
        title: t('common:titles.validationError'),
        description: t('messages.fieldsRequired'),
        variant: 'destructive',
      });
      return;
    }

    setIsUpdatingProfile(true);
    updateUser.mutate(
      {
        id: currentUserId,
        data: {
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          email: profileData.email,
        }
      },
      {
        onSuccess: (updatedUser: any) => {
          const nextFirstName = updatedUser?.firstName ?? profileData.firstName;
          const nextLastName = updatedUser?.lastName ?? profileData.lastName;
          const nextEmail = updatedUser?.email ?? profileData.email;
          updateAuthUser({
            firstName: nextFirstName,
            lastName: nextLastName,
            email: nextEmail,
          });
          setProfileData((prev) => ({
            ...prev,
            firstName: nextFirstName,
            lastName: nextLastName,
            email: nextEmail,
          }));
          toast({
            title: t('common:titles.success'),
            description: t('messages.updateSuccess'),
          });
          setIsUpdatingProfile(false);
        },
        onError: (error: any) => {
          toast({
            title: t('common:titles.error'),
            description: error.message,
            variant: 'destructive',
          });
          setIsUpdatingProfile(false);
        }
      }
    );
  };

  const handlePasswordUpdate = () => {
    const userId = currentUserId ?? user?.id;
    if (!userId) {
      toast({
        title: t('common:titles.error'),
        description: t('messages.userIdMissing'),
        variant: 'destructive',
      });
      return;
    }
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: t('common:titles.validationError'),
        description: t('messages.passwordFieldsRequired'),
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: t('common:titles.validationError'),
        description: t('messages.passwordMismatch'),
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        title: t('common:titles.validationError'),
        description: t('messages.passwordMinLength', { min: 8 }),
        variant: 'destructive',
      });
      return;
    }

    setIsUpdatingPassword(true);
    updatePassword.mutate(
      {
        id: userId,
        data: {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }
      },
      {
        onSuccess: () => {
          toast({
            title: t('common:titles.success'),
            description: t('messages.passwordUpdateSuccess'),
          });
          setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
          setIsUpdatingPassword(false);
        },
        onError: (error: any) => {
          toast({
            title: t('common:titles.error'),
            description: error.message,
            variant: 'destructive',
          });
          setIsUpdatingPassword(false);
        }
      }
    );
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Profile Image & Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t('general.title')}
          </CardTitle>
          <CardDescription>{t('general.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profileData.profileImageUrl} />
                <AvatarFallback className="text-2xl">
                  {profileData.firstName?.[0]}{profileData.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors">
                <Camera className="h-4 w-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploadingAvatar}
                  className="hidden"
                />
              </label>
            </div>
            <div className="flex-1">
              <p className="font-medium">{profileData.firstName} {profileData.lastName}</p>
              <p className="text-sm text-muted-foreground">{profileData.email}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('general.role')}: {user?.role ? t(`users:roles.${user.role}`) : t('common:messages.notSet')} • {t('general.type')}: {user?.type ? t(`users:types.${user.type}`) : t('common:messages.notSet')}
              </p>
            </div>
          </div>

          <Separator />

          {/* Profile Form */}
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t('general.firstName')}</Label>
                <Input
                  id="firstName"
                  value={profileData.firstName}
                  onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{t('general.lastName')}</Label>
                <Input
                  id="lastName"
                  value={profileData.lastName}
                  onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('general.email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <Button onClick={handleProfileUpdate} disabled={isUpdatingProfile} className="w-full">
            <Save className="mr-2 h-4 w-4" />
            {isUpdatingProfile ? t('common:messages.saving') : t('actions.save')}
          </Button>
        </CardContent>
      </Card>

      {/* Calendar colour */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            {t('calendar:color.title')}
          </CardTitle>
          <CardDescription>{t('calendar:color.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ColorPicker
            value={calendarColor}
            onChange={setCalendarColor}
            disabled={updateCalendarColor.isPending}
          />
          <Button
            onClick={handleCalendarColorUpdate}
            disabled={updateCalendarColor.isPending || calendarColor.toUpperCase() === savedCalendarColor.toUpperCase()}
            variant="outline"
            className="w-full"
          >
            <Save className="mr-2 h-4 w-4" />
            {updateCalendarColor.isPending ? t('common:messages.saving') : t('calendar:color.save')}
          </Button>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {t('security.title')}
          </CardTitle>
          <CardDescription>{t('security.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">{t('security.currentPassword')}</Label>
            <Input
              id="currentPassword"
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t('security.newPassword')}</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('security.confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              />
            </div>
          </div>
          <Button 
            onClick={handlePasswordUpdate} 
            disabled={isUpdatingPassword}
            variant="outline"
            className="w-full"
          >
            <Lock className="mr-2 h-4 w-4" />
            {isUpdatingPassword ? t('security.updatingPassword') : t('security.updatePassword')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
