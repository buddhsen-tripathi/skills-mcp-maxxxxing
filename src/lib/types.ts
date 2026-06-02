export type EntryKind = "skill" | "mcp" | "plugin";

export type InstallMethod = "npm" | "git" | "manual";

export type DirectoryEntry = {
  id: string;
  slug: string;
  name: string;
  kind: EntryKind;
  /** Short line for cards and search (max ~200 chars). */
  summary: string;
  /** Cleaned source blurb (max ~400 chars). */
  description: string;
  tags: string[];
  metadata: {
    author?: string;
    stars?: number;
  };
  links: {
    repository?: string;
    homepage?: string;
    docs?: string;
    llmsTxt?: string;
    designMd?: string;
  };
  install: {
    method: InstallMethod;
    command: string | null;
    agentPrompt: string;
  };
  source: {
    type: "github" | "website" | "manual";
    url?: string;
    repo?: string;
  };
  updatedAt: string;
};

export type Catalog = {
  generatedAt: string;
  items: DirectoryEntry[];
};

export type CatalogMeta = {
  storePath: string;
  itemCount: number;
  generatedAt: string;
  kinds: Record<EntryKind, number>;
};

export type AgentIntent = {
  kinds: EntryKind[];
  topics: string[];
  stack: string[];
};

export type AgentPlanStep = {
  entryId: string;
  name: string;
  kind: EntryKind;
  why: string;
  command: string | null;
  agentPrompt: string;
};

export type AgentAction = {
  name: string;
  command: string | null;
  agentPrompt: string;
};

export type AgentResponse = {
  query: string;
  intent: AgentIntent;
  summary: string;
  plan: AgentPlanStep[];
  recommended: DirectoryEntry[];
  relatedTags: string[];
  handoff: string;
  actions: AgentAction[];
};

/** Loose shape from older scrapes — normalized on read/write. */
export type LegacyDirectoryEntry = {
  id: string;
  name: string;
  slug: string;
  kind: EntryKind;
  description: string;
  purpose?: string;
  summary?: string;
  tags: string[];
  author?: string;
  stars?: number;
  metadata?: DirectoryEntry["metadata"];
  docs?: {
    design?: string;
    llms?: string;
    readme?: string;
  };
  links?: DirectoryEntry["links"];
  install: {
    method?: InstallMethod;
    command: string | null;
    agentPrompt: string;
  };
  source: {
    type: "github" | "website" | "manual";
    label?: string;
    url?: string;
    repo?: string;
  };
  updatedAt: string;
};
