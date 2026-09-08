import HomeClient from "@/components/home-client";

function getCodeParam(
  code: string | string[] | undefined,
): string | undefined {
  if (typeof code === "string" && code.length > 0) return code;
  if (Array.isArray(code) && typeof code[0] === "string" && code[0].length > 0) {
    return code[0];
  }
  return undefined;
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const { code: codeParam } = await searchParams;
  const code = getCodeParam(codeParam);

  return <HomeClient initialCode={code} />;
}
