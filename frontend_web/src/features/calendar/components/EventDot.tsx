type Props = {
  visible: boolean;
};

export default function EventDot({ visible }: Props) {
  return (
    <div className="calendar-dots" data-visible={visible} aria-hidden="true">
      {visible && <span className="calendar-dot" />}
    </div>
  );
}
