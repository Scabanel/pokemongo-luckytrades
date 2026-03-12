export default function CardSkeleton() {
  return (
    <div className="glass-card p-5 flex flex-col items-center gap-3">
      <div className="skeleton w-16 h-4 mt-2" />
      <div className="skeleton w-24 h-24 rounded-full mt-2" />
      <div className="skeleton w-20 h-4" />
      <div className="skeleton w-28 h-3" />
      <div className="skeleton w-32 h-8 mt-auto" style={{ borderRadius: 12 }} />
    </div>
  );
}
