interface CheckBodyScrollProps {
  anyModalOpened: boolean;
}

export const CheckBodyScroll = ({ anyModalOpened }: CheckBodyScrollProps) => {
  return anyModalOpened ? (
    <style jsx global>{`
      body {
        overflow: hidden;
      }
    `}</style>
  ) : null;
};
