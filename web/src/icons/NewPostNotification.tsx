export const NewPostNotification = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20" {...props}>
      <circle cx="10" cy="10" r="10" fill="#C275FF"></circle>
      <path
        fill="#000"
        fillRule="evenodd"
        d="M10 5a5 5 0 100 10 5 5 0 000-10zm.454 6.818a.454.454 0 11-.909 0v-1.364H8.182a.454.454 0 110-.909h1.363V8.182a.455.455 0 11.91 0v1.363h1.363a.455.455 0 010 .91h-1.364v1.363z"
        clipRule="evenodd"
      ></path>
    </svg>
  );
};
