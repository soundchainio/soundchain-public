import SEO from 'components/SEO';
import { TermsAndConditions } from 'components/TermsAndConditions';

export default function TermsAndConditionsPage() {
  return (
    <>
      <SEO
        title="Terms and Conditions | SoundChain"
        description="SoundChain Terms and Conditions"
        canonicalUrl="/terms-and-conditions/"
      />
      <TermsAndConditions />
    </>
  );
}
