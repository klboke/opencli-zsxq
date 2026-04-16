const EXIT_CODES = {
  GENERIC_ERROR: 1,
};

export class CliError extends Error {
  constructor(code, message, hint, exitCode = EXIT_CODES.GENERIC_ERROR) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.hint = hint;
    this.exitCode = exitCode;
  }
}

export class CommandExecutionError extends CliError {
  constructor(message, hint) {
    super('COMMAND_EXEC', message, hint, EXIT_CODES.GENERIC_ERROR);
  }
}

export const Strategy = {
  PUBLIC: 'public',
  COOKIE: 'cookie',
  HEADER: 'header',
  INTERCEPT: 'intercept',
  UI: 'ui',
};

function normalizeAliases(aliases, commandName) {
  if (!Array.isArray(aliases) || aliases.length === 0) {
    return [];
  }

  const seen = new Set();
  const normalized = [];
  for (const alias of aliases) {
    const value = typeof alias === 'string' ? alias.trim() : '';
    if (!value || value === commandName || seen.has(value)) {
      continue;
    }
    seen.add(value);
    normalized.push(value);
  }
  return normalized;
}

function normalizeCommand(cmd) {
  const strategy = cmd.strategy ?? (cmd.browser === false ? Strategy.PUBLIC : Strategy.COOKIE);
  const browser = cmd.browser ?? (strategy !== Strategy.PUBLIC);

  let navigateBefore = cmd.navigateBefore;
  if (navigateBefore === undefined) {
    if ((strategy === Strategy.COOKIE || strategy === Strategy.HEADER) && cmd.domain) {
      navigateBefore = `https://${cmd.domain}`;
    } else if (strategy !== Strategy.PUBLIC) {
      navigateBefore = true;
    }
  }

  return { ...cmd, strategy, browser, navigateBefore };
}

function getRegistry() {
  if (!globalThis.__opencli_registry__) {
    globalThis.__opencli_registry__ = new Map();
  }
  return globalThis.__opencli_registry__;
}

function fullName(cmd) {
  return `${cmd.site}/${cmd.name}`;
}

export function cli(opts) {
  const registry = getRegistry();
  const cmd = normalizeCommand({
    site: opts.site,
    name: opts.name,
    aliases: opts.aliases,
    description: opts.description ?? '',
    domain: opts.domain,
    strategy: opts.strategy,
    browser: opts.browser,
    args: opts.args ?? [],
    columns: opts.columns,
    func: opts.func,
    pipeline: opts.pipeline,
    timeoutSeconds: opts.timeoutSeconds,
    footerExtra: opts.footerExtra,
    requiredEnv: opts.requiredEnv,
    deprecated: opts.deprecated,
    replacedBy: opts.replacedBy,
    navigateBefore: opts.navigateBefore,
    defaultFormat: opts.defaultFormat,
  });

  const canonicalKey = fullName(cmd);
  const existing = registry.get(canonicalKey);
  if (existing?.aliases) {
    for (const alias of existing.aliases) {
      registry.delete(`${existing.site}/${alias}`);
    }
  }

  const aliases = normalizeAliases(cmd.aliases, cmd.name);
  cmd.aliases = aliases.length > 0 ? aliases : undefined;
  registry.set(canonicalKey, cmd);
  for (const alias of aliases) {
    registry.set(`${cmd.site}/${alias}`, cmd);
  }

  return registry.get(canonicalKey);
}

export { fullName, getRegistry };
