import { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { useMe } from '../../hooks/useMe';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Bell, Phone, MessageCircle, Heart, Users, DollarSign, ShoppingBag } from 'lucide-react';

const UPDATE_NOTIFICATION_SETTINGS = gql`
  mutation UpdateNotificationSettings($input: UpdateNotificationSettingsInput!) {
    updateNotificationSettings(input: $input) {
      id
      phoneNumber
      notifyOnFollow
      notifyOnLike
      notifyOnComment
      notifyOnSale
      notifyOnTip
      notifyOnDM
    }
  }
`;

interface NotificationSettingsFormProps {
  afterSubmit?: () => void;
}

export function NotificationSettingsForm({ afterSubmit }: NotificationSettingsFormProps) {
  const { me, refetch } = useMe();
  const { permission, isSubscribed, subscribe, unsubscribe, isLoading: pushLoading, isSupported } = usePushNotifications();

  const [phoneNumber, setPhoneNumber] = useState(me?.phoneNumber || '');
  const [notifyOnFollow, setNotifyOnFollow] = useState(me?.notifyOnFollow ?? true);
  const [notifyOnLike, setNotifyOnLike] = useState(me?.notifyOnLike ?? true);
  const [notifyOnComment, setNotifyOnComment] = useState(me?.notifyOnComment ?? true);
  const [notifyOnSale, setNotifyOnSale] = useState(me?.notifyOnSale ?? true);
  const [notifyOnTip, setNotifyOnTip] = useState(me?.notifyOnTip ?? true);
  const [notifyOnDM, setNotifyOnDM] = useState(me?.notifyOnDM ?? true);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [updateSettings] = useMutation(UPDATE_NOTIFICATION_SETTINGS);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await updateSettings({
        variables: {
          input: {
            phoneNumber: phoneNumber || null,
            notifyOnFollow,
            notifyOnLike,
            notifyOnComment,
            notifyOnSale,
            notifyOnTip,
            notifyOnDM,
          },
        },
      });

      await refetch();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      if (afterSubmit) {
        setTimeout(afterSubmit, 500);
      }
    } catch (err) {
      console.error('[NotificationSettingsForm] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handlePushToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <div className="space-y-6">
      {/* Push Notifications Section */}
      {isSupported && (
        <div className="space-y-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-400" />
            Push Notifications
          </h3>
          <div className="bg-black/30 rounded-xl p-4 border border-purple-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Browser Notifications</p>
                <p className="text-gray-400 text-sm">
                  {permission === 'denied'
                    ? 'Blocked - enable in browser settings'
                    : isSubscribed
                    ? 'Enabled - you\'ll receive notifications'
                    : 'Get notified even when the tab is closed'}
                </p>
              </div>
              <Button
                onClick={handlePushToggle}
                disabled={pushLoading || permission === 'denied'}
                className={isSubscribed ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'}
              >
                {pushLoading ? '...' : isSubscribed ? 'Enabled' : 'Enable'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Phone Number Section */}
      <div className="space-y-4">
        <h3 className="text-white font-bold flex items-center gap-2">
          <Phone className="w-5 h-5 text-cyan-400" />
          Phone Number
        </h3>
        <div className="bg-black/30 rounded-xl p-4 border border-cyan-500/30">
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+1 (555) 123-4567"
            className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
          />
          <p className="text-gray-500 text-xs mt-2">Optional - for future SMS notifications via Nostr</p>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="space-y-4">
        <h3 className="text-white font-bold">Notification Preferences</h3>
        <p className="text-gray-400 text-sm">Choose which notifications you want to receive</p>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-gray-700">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-white font-medium">New Followers</p>
                <p className="text-gray-500 text-xs">When someone follows you</p>
              </div>
            </div>
            <Switch checked={notifyOnFollow} onCheckedChange={setNotifyOnFollow} />
          </div>

          <div className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-gray-700">
            <div className="flex items-center gap-3">
              <Heart className="w-5 h-5 text-red-400" />
              <div>
                <p className="text-white font-medium">Likes</p>
                <p className="text-gray-500 text-xs">When someone likes your post or track</p>
              </div>
            </div>
            <Switch checked={notifyOnLike} onCheckedChange={setNotifyOnLike} />
          </div>

          <div className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-gray-700">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-white font-medium">Comments</p>
                <p className="text-gray-500 text-xs">When someone comments on your content</p>
              </div>
            </div>
            <Switch checked={notifyOnComment} onCheckedChange={setNotifyOnComment} />
          </div>

          <div className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-gray-700">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-white font-medium">Direct Messages</p>
                <p className="text-gray-500 text-xs">When you receive a new DM</p>
              </div>
            </div>
            <Switch checked={notifyOnDM} onCheckedChange={setNotifyOnDM} />
          </div>

          <div className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-gray-700">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-white font-medium">Sales</p>
                <p className="text-gray-500 text-xs">When your NFT sells on the marketplace</p>
              </div>
            </div>
            <Switch checked={notifyOnSale} onCheckedChange={setNotifyOnSale} />
          </div>

          <div className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-gray-700">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-white font-medium">Tips</p>
                <p className="text-gray-500 text-xs">When someone tips you OGUN</p>
              </div>
            </div>
            <Switch checked={notifyOnTip} onCheckedChange={setNotifyOnTip} />
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3 text-green-400 text-sm">
          Settings saved successfully!
        </div>
      )}

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3"
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  );
}
