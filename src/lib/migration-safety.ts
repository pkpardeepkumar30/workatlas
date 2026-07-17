export const destructiveMigrationRules = [
  { name: "DROP TABLE", pattern: /\bdrop\s+table\b/i },
  { name: "TRUNCATE", pattern: /\btruncate\b/i },
  { name: "DELETE", pattern: /\bdelete\s+from\b/i },
  { name: "DROP COLUMN", pattern: /\balter\s+table[\s\S]*?\bdrop\s+column\b/i },
  { name: "DROP TYPE", pattern: /\bdrop\s+type\b/i },
  { name: "destructive type conversion", pattern: /\balter\s+column[\s\S]*?\btype\b/i },
  { name: "table or column rename", pattern: /\balter\s+table[\s\S]*?\brename\b/i },
  { name: "live-data seed", pattern: /\binsert\s+into\s+["']?(users|sessions|projects|tasks|comments|project_members)["']?\b/i },
] as const;

function withoutComments(sql: string) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*--.*$/gm, "");
}

export function findUnsafeMigrationStatements(sql: string) {
  const source = withoutComments(sql);
  return destructiveMigrationRules.filter((rule) => rule.pattern.test(source)).map((rule) => rule.name);
}

export function assertMigrationIsForwardOnly(filename: string, sql: string) {
  const violations = findUnsafeMigrationStatements(sql);
  if (violations.length) {
    throw new Error(
      `Unsafe migration ${filename}: ${violations.join(", ")}. Automated migrations permit additive, forward-only SQL only. `
      + "Create a pg_dump backup, review a manual expand/migrate/contract plan, and document recovery before proceeding outside automation.",
    );
  }
}
