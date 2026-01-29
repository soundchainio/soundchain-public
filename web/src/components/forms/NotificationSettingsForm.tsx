import { useState, useEffect, useCallback } from 'react';
import { gql, useMutation } from '@apollo/client';
import { usePushNotifications } from 'hooks/usePushNotifications';
import { Button } from 'components/common/Buttons/Button';
import { Bell, Phone, MessageCircle, Heart, Users, DollarSign, ShoppingBag, Radio, ExternalLink } from 'lucide-react';

// International country codes - 1, 2, or 3 digits
// Common codes: +1 (US/CA), +44 (UK), +91 (India), +86 (China), +55 (Brazil), +971 (UAE)
const COUNTRY_CODES: { [key: string]: number } = {
  '1': 1,    // USA, Canada
  '7': 1,    // Russia, Kazakhstan
  '20': 2,   // Egypt
  '27': 2,   // South Africa
  '30': 2,   // Greece
  '31': 2,   // Netherlands
  '32': 2,   // Belgium
  '33': 2,   // France
  '34': 2,   // Spain
  '36': 2,   // Hungary
  '39': 2,   // Italy
  '40': 2,   // Romania
  '41': 2,   // Switzerland
  '43': 2,   // Austria
  '44': 2,   // UK
  '45': 2,   // Denmark
  '46': 2,   // Sweden
  '47': 2,   // Norway
  '48': 2,   // Poland
  '49': 2,   // Germany
  '51': 2,   // Peru
  '52': 2,   // Mexico
  '53': 2,   // Cuba
  '54': 2,   // Argentina
  '55': 2,   // Brazil
  '56': 2,   // Chile
  '57': 2,   // Colombia
  '58': 2,   // Venezuela
  '60': 2,   // Malaysia
  '61': 2,   // Australia
  '62': 2,   // Indonesia
  '63': 2,   // Philippines
  '64': 2,   // New Zealand
  '65': 2,   // Singapore
  '66': 2,   // Thailand
  '81': 2,   // Japan
  '82': 2,   // South Korea
  '84': 2,   // Vietnam
  '86': 2,   // China
  '90': 2,   // Turkey
  '91': 2,   // India
  '92': 2,   // Pakistan
  '93': 2,   // Afghanistan
  '94': 2,   // Sri Lanka
  '95': 2,   // Myanmar
  '98': 2,   // Iran
  '212': 3,  // Morocco
  '213': 3,  // Algeria
  '216': 3,  // Tunisia
  '218': 3,  // Libya
  '220': 3,  // Gambia
  '221': 3,  // Senegal
  '234': 3,  // Nigeria
  '249': 3,  // Sudan
  '254': 3,  // Kenya
  '255': 3,  // Tanzania
  '256': 3,  // Uganda
  '260': 3,  // Zambia
  '263': 3,  // Zimbabwe
  '351': 3,  // Portugal
  '352': 3,  // Luxembourg
  '353': 3,  // Ireland
  '354': 3,  // Iceland
  '358': 3,  // Finland
  '370': 3,  // Lithuania
  '371': 3,  // Latvia
  '372': 3,  // Estonia
  '380': 3,  // Ukraine
  '381': 3,  // Serbia
  '385': 3,  // Croatia
  '420': 3,  // Czech Republic
  '421': 3,  // Slovakia
  '852': 3,  // Hong Kong
  '853': 3,  // Macau
  '880': 3,  // Bangladesh
  '886': 3,  // Taiwan
  '960': 3,  // Maldives
  '961': 3,  // Lebanon
  '962': 3,  // Jordan
  '963': 3,  // Syria
  '964': 3,  // Iraq
  '965': 3,  // Kuwait
  '966': 3,  // Saudi Arabia
  '967': 3,  // Yemen
  '968': 3,  // Oman
  '970': 3,  // Palestine
  '971': 3,  // UAE
  '972': 3,  // Israel
  '973': 3,  // Bahrain
  '974': 3,  // Qatar
  '975': 3,  // Bhutan
  '976': 3,  // Mongolia
  '977': 3,  // Nepal
  '992': 3,  // Tajikistan
  '993': 3,  // Turkmenistan
  '994': 3,  // Azerbaijan
  '995': 3,  // Georgia
  '996': 3,  // Kyrgyzstan
  '998': 3,  // Uzbekistan
};

// Detect country code length from phone number
function detectCountryCodeLength(digits: string): number {
  // Check 3-digit codes first (more specific)
  if (digits.length >= 3 && COUNTRY_CODES[digits.slice(0, 3)] === 3) return 3;
  // Check 2-digit codes
  if (digits.length >= 2 && COUNTRY_CODES[digits.slice(0, 2)] === 2) return 2;
  // Check 1-digit codes
  if (digits.length >= 1 && COUNTRY_CODES[digits.slice(0, 1)] === 1) return 1;
  // Default: assume 1-digit code (covers unlisted countries)
  return 1;
}

// Format phone number with dashes as user types
// Supports international: +1-480-231-5629 (US) or +44-20-7946-0958 (UK) or +971-50-123-4567 (UAE)
function formatPhoneNumber(value: string): string {
  // Remove all non-digit characters except +
  const cleaned = value.replace(/[^\d+]/g, '');

  // If empty or just +, return as is
  if (!cleaned || cleaned === '+') return cleaned;

  // Ensure starts with +
  const withPlus = cleaned.startsWith('+') ? cleaned : '+' + cleaned;
  const digits = withPlus.slice(1); // Remove + for formatting

  if (digits.length === 0) return '+';

  // Detect country code length
  const ccLength = detectCountryCodeLength(digits);
  const countryCode = digits.slice(0, ccLength);
  const nationalNumber = digits.slice(ccLength);

  // Format: +CC-XXX-XXX-XXXX (adapts to country code length)
  if (nationalNumber.length === 0) {
    return '+' + countryCode;
  } else if (nationalNumber.length <= 3) {
    return '+' + countryCode + '-' + nationalNumber;
  } else if (nationalNumber.length <= 6) {
    return '+' + countryCode + '-' + nationalNumber.slice(0, 3) + '-' + nationalNumber.slice(3);
  } else {
    // Full format with max 4 digits in last group
    return '+' + countryCode + '-' + nationalNumber.slice(0, 3) + '-' + nationalNumber.slice(3, 6) + '-' + nationalNumber.slice(6, 10);
  }
}

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
      nostrPubkey
      notifyViaNostr
    }
  }
`;

interface NotificationSettingsFormProps {
  afterSubmit?: () => void;
  initialValues?: {
    phoneNumber?: string | null;
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
  const { permission, isSubscribed, subscribe, unsubscribe, isLoading: pushLoading, isSupported } = usePushNotifications();

  const [phoneNumber, setPhoneNumber] = useState(formatPhoneNumber(initialValues?.phoneNumber || ''));
  const [notifyOnFollow, setNotifyOnFollow] = useState(initialValues?.notifyOnFollow ?? true);
  const [notifyOnLike, setNotifyOnLike] = useState(initialValues?.notifyOnLike ?? true);
  const [notifyOnComment, setNotifyOnComment] = useState(initialValues?.notifyOnComment ?? true);
  const [notifyOnSale, setNotifyOnSale] = useState(initialValues?.notifyOnSale ?? true);
  const [notifyOnTip, setNotifyOnTip] = useState(initialValues?.notifyOnTip ?? true);
  const [notifyOnDM, setNotifyOnDM] = useState(initialValues?.notifyOnDM ?? true);
  const [nostrPubkey, setNostrPubkey] = useState(initialValues?.nostrPubkey || '');
  const [notifyViaNostr, setNotifyViaNostr] = useState(initialValues?.notifyViaNostr ?? false);

  // Update state when initialValues change
  useEffect(() => {
    if (initialValues) {
      setPhoneNumber(formatPhoneNumber(initialValues.phoneNumber || ''));
      setNotifyOnFollow(initialValues.notifyOnFollow ?? true);
      setNotifyOnLike(initialValues.notifyOnLike ?? true);
      setNotifyOnComment(initialValues.notifyOnComment ?? true);
      setNotifyOnSale(initialValues.notifyOnSale ?? true);
      setNotifyOnTip(initialValues.notifyOnTip ?? true);
      setNotifyOnDM(initialValues.notifyOnDM ?? true);
      setNostrPubkey(initialValues.nostrPubkey || '');
      setNotifyViaNostr(initialValues.notifyViaNostr ?? false);
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
      phoneNumber: phoneNumber || null,
      notifyOnFollow,
      notifyOnLike,
      notifyOnComment,
      notifyOnSale,
      notifyOnTip,
      notifyOnDM,
      nostrPubkey: nostrPubkey || null,
      notifyViaNostr,
    });

    try {
      const result = await updateSettings({
        variables: {
          input: {
            phoneNumber: phoneNumber || null,
            notifyOnFollow,
            notifyOnLike,
            notifyOnComment,
            notifyOnSale,
            notifyOnTip,
            notifyOnDM,
            nostrPubkey: nostrPubkey || null,
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
                {' '}or any NIP-17 compatible Nostr client.
              </p>
            </div>
            <Toggle checked={notifyViaNostr} onChange={setNotifyViaNostr} />
          </div>

          {notifyViaNostr && (
            <div className="space-y-2">
              <label className="text-gray-400 text-sm">Your Nostr Public Key (npub or hex)</label>
              <input
                type="text"
                value={nostrPubkey}
                onChange={(e) => setNostrPubkey(e.target.value.trim())}
                placeholder="npub1... or hex pubkey"
                className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none font-mono text-sm"
              />
              <p className="text-gray-500 text-xs">
                Find your pubkey in Bitchat Settings → Profile, or from any Nostr client
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

      {/* Phone Number Section (Legacy - for future SMS) */}
      <div className="space-y-4">
        <h3 className="text-white font-bold flex items-center gap-2">
          <Phone className="w-5 h-5 text-cyan-400" />
          Phone Number
          <span className="text-xs text-gray-500 font-normal">(Optional)</span>
        </h3>
        <div className="bg-black/30 rounded-xl p-4 border border-cyan-500/30">
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
            placeholder="+1-555-123-4567"
            className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none font-mono"
          />
          <p className="text-gray-500 text-xs mt-2">Format: +1-480-231-5629 (US) or +44-20-7946-0958 (UK)</p>
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
