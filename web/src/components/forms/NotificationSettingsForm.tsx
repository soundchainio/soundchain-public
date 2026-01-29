import { useState, useEffect } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { usePushNotifications } from 'hooks/usePushNotifications';
import { Button } from 'components/common/Buttons/Button';
import { Bell, Phone, MessageCircle, Heart, Users, DollarSign, ShoppingBag } from 'lucide-react';

// Simple toggle switch component
function Toggle({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-cyan-500' : 'bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

const ME_QUERY = gql`
  query MeNotificationSettings {
    me {
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
  const { data, refetch } = useQuery(ME_QUERY);
  const me = data?.me;

  const { permission, isSubscribed, subscribe, unsubscribe, isLoading: pushLoading, isSupported } = usePushNotifications();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [notifyOnFollow, setNotifyOnFollow] = useState(true);
  const [notifyOnLike, setNotifyOnLike] = useState(true);
  const [notifyOnComment, setNotifyOnComment] = useState(true);
  const [notifyOnSale, setNotifyOnSale] = useState(true);
  const [notifyOnTip, setNotifyOnTip] = useState(true);
  const [notifyOnDM, setNotifyOnDM] = useState(true);

  // Update state when data loads
  useEffect(() => {
    if (me) {
      setPhoneNumber(me.phoneNumber || '');
      setNotifyOnFollow(me.notifyOnFollow ?? true);
      setNotifyOnLike(me.notifyOnLike ?? true);
      setNotifyOnComment(me.notifyOnComment ?? true);
      setNotifyOnSale(me.notifyOnSale ?? true);
      setNotifyOnTip(me.notifyOnTip ?? true);
      setNotifyOnDM(me.notifyOnDM ?? true);
    }
  }, [me]);

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
              <button
                onClick={handlePushToggle}
                disabled={pushLoading || permission === 'denied'}
                className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                  isSubscribed
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                {pushLoading ? '...' : isSubscribed ? 'Enabled' : 'Enable'}
              </button>
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
            <Toggle checked={notifyOnFollow} onChange={setNotifyOnFollow} />
          </div>

          <div className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-gray-700">
            <div className="flex items-center gap-3">
              <Heart className="w-5 h-5 text-red-400" />
              <div>
                <p className="text-white font-medium">Likes</p>
                <p className="text-gray-500 text-xs">When someone likes your post or track</p>
              </div>
            </div>
            <Toggle checked={notifyOnLike} onChange={setNotifyOnLike} />
          </div>

          <div className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-gray-700">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-white font-medium">Comments</p>
                <p className="text-gray-500 text-xs">When someone comments on your content</p>
              </div>
            </div>
            <Toggle checked={notifyOnComment} onChange={setNotifyOnComment} />
          </div>

          <div className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-gray-700">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-white font-medium">Direct Messages</p>
                <p className="text-gray-500 text-xs">When you receive a new DM</p>
              </div>
            </div>
            <Toggle checked={notifyOnDM} onChange={setNotifyOnDM} />
          </div>

          <div className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-gray-700">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-white font-medium">Sales</p>
                <p className="text-gray-500 text-xs">When your NFT sells on the marketplace</p>
              </div>
            </div>
            <Toggle checked={notifyOnSale} onChange={setNotifyOnSale} />
          </div>

          <div className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-gray-700">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-white font-medium">Tips</p>
                <p className="text-gray-500 text-xs">When someone tips you OGUN</p>
              </div>
            </div>
            <Toggle checked={notifyOnTip} onChange={setNotifyOnTip} />
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
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  );
}
