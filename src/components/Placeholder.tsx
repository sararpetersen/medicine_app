export default function Placeholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="pt-8">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-ink-soft">{description}</p>
      <div className="mt-6 rounded-2xl bg-accent-soft p-5">
        <p className="text-sm text-accent">
          This screen is on its way — it arrives in an upcoming build step.
        </p>
      </div>
    </div>
  );
}
