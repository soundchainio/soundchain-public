import { SVGGradient } from './gradients'
import { IconProps } from './types/IconProps'

export const Library = ({ color, id, ...props }: IconProps) => {
  const url = `#${id ? id : ''}${color}-gradient`
  return (
    <svg width={20} height={20} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x={1} y={5} width={18} height={14} rx={3} stroke={color ? `url(${url})` : '#505050'} strokeWidth={2} />
      <path
        d="M12.8 8.3a.3.3 0 0 0-.386-.287l-4 1.2A.3.3 0 0 0 8.2 9.5v3.95a1.4 1.4 0 1 0 .599 1.082.301.301 0 0 0 .001-.032v-3.177l3.4-1.02v2.348a1.4 1.4 0 1 0 .599 1.081.285.285 0 0 0 .001-.032V8.3Z"
        fill={color ? `url(${url})` : '#505050'}
      />
      {color && <SVGGradient color={color} id={id} />}
      <rect x={4} y={2} width={12} height={1.5} rx={0.75} fill={color ? `url(${url})` : '#505050'} />
      <rect x={6} width={8} height={1.5} rx={0.75} fill={color ? `url(${url})` : '#505050'} />
    </svg>
  )
}
