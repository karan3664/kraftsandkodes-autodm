import { Inbox } from "lucide-react";
import { Card, CardContent } from "./card";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300">
          <Inbox className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="max-w-md text-sm text-zinc-400">{description}</p>
        {action}
      </CardContent>
    </Card>
  );
}
