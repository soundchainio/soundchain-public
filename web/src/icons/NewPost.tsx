import { NavIconProps } from './interfaces/NavIconProps';

export const NewPost = (props: NavIconProps) => {
  return (
    <>
      {props.activated ? (
        <svg width={25} height={25} viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zm.91 13.636a.909.909 0 01-1.82 0V10.91H6.365a.91.91 0 010-1.818H9.09V6.364a.91.91 0 111.818 0V9.09h2.727a.91.91 0 010 1.818H10.91v2.727z"
            fill="#505050"
          />
        </svg>
      ) : (
        <svg width={25} height={25} viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zm.91 13.636a.909.909 0 01-1.82 0V10.91H6.365a.91.91 0 010-1.818H9.09V6.364a.91.91 0 111.818 0V9.09h2.727a.91.91 0 010 1.818H10.91v2.727z"
            fill="#505050"
          />
        </svg>
      )}
    </>
  );
};
