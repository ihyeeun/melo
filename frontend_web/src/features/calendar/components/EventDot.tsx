type Props = {
  visible: boolean;
};

export default function EventDot({ visible }: Props) {
  if (!visible) return <div className="calendar-dots calendar-dots--empty" />;

  return (
    <div className="calendar-dots" aria-hidden="true">
      <span className="calendar-dot" />
    </div>
  );
}
