// Explicit handler for /dex base route
// The [[...slug]] catch-all should handle this, but Vercel's legacy routing may need this
export { default, getServerSideProps } from './[[...slug]]'
