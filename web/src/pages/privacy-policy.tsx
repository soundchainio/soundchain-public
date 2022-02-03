import { PrivacyPolicy } from 'components/PrivacyPolicy';
import SEO from 'components/SEO';

export default function PrivacyPolicyPage() {
  return (
    <>
      <SEO
        title="Privacy Policy | SoundChain"
        description="SoundChain Privacy Policy"
        canonicalUrl="/privacy-policy/"
      />
      <PrivacyPolicy />
    </>
  );
}
