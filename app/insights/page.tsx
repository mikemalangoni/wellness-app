import sql from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import { ReportSelector } from "./ReportSelector";

interface Report {
  report_date: string;
  period_start: string;
  period_end: string;
  content: string;
  generated_at: string;
}

async function getReport(date?: string): Promise<{ report: Report | null; dates: string[] }> {
  const history = await sql`
    SELECT report_date FROM reports ORDER BY report_date DESC LIMIT 12
  `;
  const dates = history.map((r) => String(r.report_date).split("T")[0]);

  if (dates.length === 0) return { report: null, dates: [] };

  const target = date ?? dates[0];
  const [report] = await sql`
    SELECT report_date, period_start, period_end, content, generated_at
    FROM reports
    WHERE report_date = ${target}
  `;

  return { report: (report as Report) ?? null, dates };
}

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function InsightsPage({ searchParams }: PageProps) {
  const { date } = await searchParams;
  const { report, dates } = await getReport(date);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Insights</h1>
          {report && (
            <p className="text-sm text-muted-foreground mt-1">
              {formatDate(String(report.period_start).split("T")[0])} –{" "}
              {formatDate(String(report.period_end).split("T")[0])}
            </p>
          )}
        </div>
        {dates.length > 1 && report && (
          <ReportSelector
            dates={dates}
            selected={String(report.report_date).split("T")[0]}
          />
        )}
      </div>

      {!report ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No reports generated yet. Run <code>python generate_report.py</code> to create the first one.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{report.content}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
