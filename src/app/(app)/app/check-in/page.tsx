import { CheckIn } from "@/components/attendance";

type CheckInPageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function CheckInPage({ searchParams }: CheckInPageProps) {
  const parameters = await searchParams;
  const value = parameters.token;
  const token = Array.isArray(value) ? value[0] ?? "" : value ?? "";
  return <CheckIn token={token.trim()} />;
}
