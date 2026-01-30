import { useState, useEffect } from 'react';
import { gql, useMutation } from '@apollo/client';
import { usePushNotifications } from 'hooks/usePushNotifications';
import { Button } from 'components/common/Buttons/Button';
import { Bell, MessageCircle, Heart, Users, DollarSign, ShoppingBag, Radio, ExternalLink, Copy, Check, Sparkles } from 'lucide-react';

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

// Nostr Notification Section with auto-generated pubkey display
function NostrNotificationSection({
  nostrPubkey,
  notifyViaNostr,
  setNotifyViaNostr,
}: {
  nostrPubkey: string;
  notifyViaNostr: boolean;
  setNotifyViaNostr: (val: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);

  // Debug logging
  console.log('[NostrSection] nostrPubkey:', nostrPubkey);
  console.log('[NostrSection] notifyViaNostr:', notifyViaNostr);

  const handleCopy = async () => {
    if (!nostrPubkey) return;
    try {
      await navigator.clipboard.writeText(nostrPubkey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Truncate pubkey for display
  const displayPubkey = nostrPubkey
    ? `${nostrPubkey.slice(0, 12)}...${nostrPubkey.slice(-8)}`
    : null;

  return (
    <div className="space-y-4">
      <h3 className="text-white font-bold flex items-center gap-2">
        <Radio className="w-5 h-5 text-orange-400" />
        Nostr Notifications (Bitchat)
      </h3>
      <div className="bg-black/30 rounded-xl p-4 border border-orange-500/30 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-white font-medium">Decentralized Notifications</p>
            <p className="text-gray-400 text-sm">
              FREE notifications via Nostr protocol. Receive alerts in{' '}
              <a
                href="https://apps.apple.com/us/app/bitchat-mesh/id6748219622"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300 inline-flex items-center gap-1"
              >
                Bitchat app <ExternalLink className="w-3 h-3" />
              </a>
              {' '}or any NIP-17 compatible client.
            </p>
          </div>
          <Toggle checked={notifyViaNostr} onChange={setNotifyViaNostr} />
        </div>

        {/* Auto-generated Nostr Identity */}
        {nostrPubkey ? (
          <div className="bg-gradient-to-r from-orange-500/10 to-purple-500/10 border border-orange-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <p className="text-orange-300 text-sm font-medium">Your Nostr Identity (Auto-Generated)</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-black/50 rounded px-3 py-2 text-cyan-400 font-mono text-sm overflow-hidden">
                {displayPubkey}
              </code>
              <button
                onClick={handleCopy}
                className="p-2 bg-orange-500/20 hover:bg-orange-500/30 rounded-lg transition-colors"
                title="Copy full pubkey"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-orange-400" />
                )}
              </button>
            </div>
            <p className="text-gray-500 text-xs mt-2">
              Add this pubkey in Bitchat to receive SoundChain notifications
            </p>
          </div>
        ) : (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-yellow-300 text-sm">
              Your Nostr identity will be generated on your next login.
            </p>
          </div>
        )}

        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
          <p className="text-orange-300 text-xs">
            🔐 <strong>End-to-end encrypted</strong> — Your notifications are private and decentralized.
            No SMS costs, works even when browser is closed.
          </p>
        </div>
      </div>
    </div>
  );
}

const UPDATE_NOTIFICATION_SETTINGS = gql`
  mutation UpdateNotificationSettings($input: UpdateNotificationSettingsInput!) {
    updateNotificationSettings(input: $input) {
      id
      notifyOnFollow
      notifyOnLike
      notifyOnComment
      notifyOnSale
      notifyOnTip
      notifyOnDM
      notifyViaNostr
    }
  }
`;

interface NotificationSettingsFormProps {
  afterSubmit?: () => void;
  initialValues?: {
    notifyOnFollow?: boolean | null;
    notifyOnLike?: boolean | null;
    notifyOnComment?: boolean | null;
    notifyOnSale?: boolean | null;
    notifyOnTip?: boolean | null;
    notifyOnDM?: boolean | null;
    nostrPubkey?: string | null;
    notifyViaNostr?: boolean | null;
  };
}

export function NotificationSettingsForm({ afterSubmit, initialValues }: NotificationSettingsFormProps) {
  // Debug: log what we're receiving from the Me query
  console.log('[NotificationSettingsForm] initialValues:', JSON.stringify(initialValues, null, 2));

  const { permission, isSubscribed, subscribe, unsubscribe, isLoading: pushLoading, isSupported } = usePushNotifications();

  const [notifyOnFollow, setNotifyOnFollow] = useState(initialValues?.notifyOnFollow ?? true);
  const [notifyOnLike, setNotifyOnLike] = useState(initialValues?.notifyOnLike ?? true);
  const [notifyOnComment, setNotifyOnComment] = useState(initialValues?.notifyOnComment ?? true);
  const [notifyOnSale, setNotifyOnSale] = useState(initialValues?.notifyOnSale ?? true);
  const [notifyOnTip, setNotifyOnTip] = useState(initialValues?.notifyOnTip ?? true);
  const [notifyOnDM, setNotifyOnDM] = useState(initialValues?.notifyOnDM ?? true);
  // nostrPubkey is auto-generated, read-only display
  const [nostrPubkey] = useState(initialValues?.nostrPubkey || '');
  const [notifyViaNostr, setNotifyViaNostr] = useState(initialValues?.notifyViaNostr ?? true);

  // Update state when initialValues change
  useEffect(() => {
    if (initialValues) {
      setNotifyOnFollow(initialValues.notifyOnFollow ?? true);
      setNotifyOnLike(initialValues.notifyOnLike ?? true);
      setNotifyOnComment(initialValues.notifyOnComment ?? true);
      setNotifyOnSale(initialValues.notifyOnSale ?? true);
      setNotifyOnTip(initialValues.notifyOnTip ?? true);
      setNotifyOnDM(initialValues.notifyOnDM ?? true);
      setNotifyViaNostr(initialValues.notifyViaNostr ?? true);
    }
  }, [initialValues]);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [updateSettings] = useMutation(UPDATE_NOTIFICATION_SETTINGS, {
    refetchQueries: ['Me'], // Refetch Me query to update Apollo cache
  });

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    console.log('[NotificationSettingsForm] Saving settings:', {
      notifyOnFollow,
      notifyOnLike,
      notifyOnComment,
      notifyOnSale,
      notifyOnTip,
      notifyOnDM,
      notifyViaNostr,
    });

    try {
      const result = await updateSettings({
        variables: {
          input: {
            notifyOnFollow,
            notifyOnLike,
            notifyOnComment,
            notifyOnSale,
            notifyOnTip,
            notifyOnDM,
            notifyViaNostr,
          },
        },
      });

      console.log('[NotificationSettingsForm] Save result:', result);

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

  const [pushError, setPushError] = useState<string | null>(null);

  const handlePushToggle = async () => {
    setPushError(null);
    console.log('[NotificationSettingsForm] Push toggle clicked, isSubscribed:', isSubscribed);
    try {
      if (isSubscribed) {
        const result = await unsubscribe();
        console.log('[NotificationSettingsForm] Unsubscribe result:', result);
      } else {
        const result = await subscribe();
        console.log('[NotificationSettingsForm] Subscribe result:', result);
        if (!result) {
          setPushError('Failed to enable notifications. Check browser permissions.');
        }
      }
    } catch (err) {
      console.error('[NotificationSettingsForm] Push toggle error:', err);
      setPushError(err instanceof Error ? err.message : 'Push notification error');
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
            {pushError && (
              <p className="text-red-400 text-xs mt-2">{pushError}</p>
            )}
          </div>
        </div>
      )}

      {/* Nostr Notifications Section (Bitchat) */}
      <NostrNotificationSection
        nostrPubkey={nostrPubkey}
        notifyViaNostr={notifyViaNostr}
        setNotifyViaNostr={setNotifyViaNostr}
      />

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
