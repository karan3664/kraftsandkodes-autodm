import { Card, CardContent } from "./card";

export function ErrorState({
  title = "Something went wrong",
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <Card className="border-red-500/30">
      <CardContent className="py-8">
        <p className="text-sm font-medium text-red-300">{title}</p>
        <p className="mt-2 text-sm text-zinc-400">{message}</p>
      </CardContent>
    </Card>
  );
}
