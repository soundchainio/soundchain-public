// Handle /dex base route - regular catch-all [...slug] only handles /dex/*
// This file handles /dex specifically

import DEXDashboard, { getServerSideProps as gSSP } from './[...slug]'

export const getServerSideProps = gSSP

// Attach the getLayout from the main component
const Page = DEXDashboard as any
Page.getLayout = (DEXDashboard as any).getLayout

export default Page
