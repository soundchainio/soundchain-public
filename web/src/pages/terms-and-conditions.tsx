import { Layout } from 'components/Layout';
import SEO from 'components/SEO';
import { TermsAndConditions } from 'components/TermsAndConditions';

export default function TermsAndConditionsPage() {
  return (
    <Layout>
      <SEO
        title="Soundchain - Terms and Conditions"
        description="Soundchain Terms and Conditions"
        canonicalUrl="/terms-and-conditions/"
      />
      <TermsAndConditions />
    </Layout>
  );
}
