import { planCompare } from "@/lib/marketing-copy";

export function PlanCompare() {
  return (
    <div className="mt-10 overflow-x-auto rounded-2xl border border-white/10">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-white/5 text-zinc-300">
          <tr>
            {planCompare.headers.map((header) => (
              <th key={header} className="px-4 py-3 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {planCompare.rows.map((row) => (
            <tr key={row[0]} className="border-t border-white/10">
              {row.map((cell, index) => (
                <td
                  key={`${row[0]}-${index}`}
                  className={`px-4 py-3 ${index === 0 ? "text-zinc-200" : "text-zinc-400"}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
