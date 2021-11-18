import { BackButton } from 'components/Buttons/BackButton';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';

export default function ListPage() {
  const topNovaBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
    title: 'List for Sale',
  };

  return (
    <Layout topNavBarProps={topNovaBarProps}>
      <div></div>
    </Layout>
  );
}
