export const Comment = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20" {...props}>
      <circle cx="10" cy="10" r="10" fill="#C275FF"></circle>
      <path
        fill="#252525"
        d="M8.56 14.895a.538.538 0 01-.747-.106.522.522 0 01-.106-.315v-1.158h-.32A1.378 1.378 0 016 11.947V8.37C6 7.613 6.62 7 7.387 7h5.76c.766 0 1.386.613 1.386 1.369v3.578c0 .757-.62 1.369-1.386 1.369h-2.448l-2.14 1.579z"
      ></path>
    </svg>
  );
};
