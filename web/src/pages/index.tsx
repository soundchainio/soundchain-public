import SEO from 'components/SEO';

export default function Index() {
  return (
    <div>
      <SEO title='SoundChain' description='SoundChain' canonicalUrl='/' />
      <main
        className='flex flex-col items-center justify-center gap-20 md:gap-30 py-36 md:py-52 font-rubik text-white w-full'>

        Hello World
      </main>
    </div>
  );
}
