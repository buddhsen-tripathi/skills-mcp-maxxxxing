export function isServerlessRuntime(): boolean {
  return (
    process.env.VERCEL === "1" ||
    Boolean(process.env.VERCEL_ENV) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME)
  );
}

/** Writable skill cache root — only used for local git installs. */
export function getWritableSkillRoot(): string {
  if (isServerlessRuntime()) {
    return "/tmp/skills-mcp/skills";
  }
  return `${process.cwd()}/.tools/skills`;
}
