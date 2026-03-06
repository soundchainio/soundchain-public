// Re-export existing icons from parent directory
export { Fire } from '../Fire'
export { Heart } from '../Heart'

// Simple placeholder emoji components
export const Sad = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
    <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="18">😢</text>
  </svg>
)

export const Happy = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
    <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="18">😊</text>
  </svg>
)

export const Hundred = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
    <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="18">💯</text>
  </svg>
)

export const Horns = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
    <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="18">🤘</text>
  </svg>
)

export const Rocket = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
    <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="18">🚀</text>
  </svg>
)

export const Sunglasses = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
    <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="18">😎</text>
  </svg>
)
