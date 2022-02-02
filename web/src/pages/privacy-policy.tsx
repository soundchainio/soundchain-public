import { Layout } from 'components/Layout';
import { PrivacyPolicy } from 'components/PrivacyPolicy';
import SEO from 'components/SEO';

export default function PrivacyPolicyPage() {
  return (
    <Layout>
      <SEO
        title="Privacy Policy | SoundChain"
        description="SoundChain Privacy Policy"
        canonicalUrl="/privacy-policy/"
      />
      <PrivacyPolicy />
    </Layout>
  );
}
