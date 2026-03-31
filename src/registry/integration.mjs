/**
 * Integration commands
 */

export default [
  // ── Phase 3: Memory System ──
  {
    name: 'memory',
    description: 'Sync vault notes to Claude Code memory',
    usage: 'memory <sync|push|status>',
    subcommands: {
      sync: {
        mcpName: 'memory_sync',
        description: 'Sync all memory:true notes to Claude memory',
        mcpSchema: { dry_run: { type: 'boolean', description: 'Preview without writing' } },
        async run(root, flags) {
          const { memorySync } = await import('../commands/memory.mjs');
          return memorySync(root, { dryRun: flags.dry_run === true });
        },
      },
      push: {
        mcpName: 'memory_push',
        description: 'Push a specific note to Claude memory',
        mcpSchema: { note: { type: 'string', description: 'Note filename' } },
        mcpRequired: ['note'],
        async run(root, flags, pos) {
          const { memoryPush } = await import('../commands/memory.mjs');
          return memoryPush(root, flags.note || pos[0]);
        },
      },
      status: {
        mcpName: 'memory_status',
        description: 'Show vault-memory sync status',
        mcpSchema: {},
        async run(root) {
          const { memoryStatus } = await import('../commands/memory.mjs');
          return memoryStatus(root);
        },
      },
    },
    async run(root, flags, pos) {
      const subcmd = pos[0] || 'status';
      if (!this.subcommands[subcmd]) throw new Error(`Unknown subcommand: ${subcmd}`);
      return this.subcommands[subcmd].run(root, flags, pos.slice(1));
    },
  },,
  {
    name: 'context-for-topic',
    description: 'Get vault context for a topic (search + neighbors + backlinks)',
    usage: 'context-for-topic <topic>',
    mcpName: 'context_for_topic',
    mcpSchema: {
      topic: { type: 'string', description: 'Topic to search for' },
      depth: { type: 'number', description: 'Relationship depth (default: 1)' },
    },
    mcpRequired: ['topic'],
    async run(root, flags, pos) {
      const { contextForTopic } = await import('../commands/memory.mjs');
      return contextForTopic(root, flags.topic || pos[0], { depth: flags.depth });
    },
  },,
  // ── Phase 4: CLAUDE.md Management ──
  {
    name: 'claude-md',
    description: 'Manage vault context in CLAUDE.md files',
    usage: 'claude-md <generate|inject|remove>',
    subcommands: {
      generate: {
        mcpName: 'claude_md_generate',
        description: 'Output vault CLAUDE.md block to stdout',
        mcpSchema: {},
        async run(root) {
          const { generate } = await import('../commands/claude-md.mjs');
          return generate(root);
        },
      },
      inject: {
        mcpName: 'claude_md_inject',
        description: 'Inject vault block into CLAUDE.md',
        mcpSchema: {
          global: { type: 'boolean', description: 'Target ~/.claude/CLAUDE.md' },
          path: { type: 'string', description: 'Target CLAUDE.md path' },
        },
        async run(root, flags) {
          const { inject } = await import('../commands/claude-md.mjs');
          return inject(root, { global: flags.global === true, path: flags.path });
        },
      },
      remove: {
        mcpName: 'claude_md_remove',
        description: 'Remove clausidian block from CLAUDE.md',
        mcpSchema: {
          global: { type: 'boolean' },
          path: { type: 'string' },
        },
        async run(root, flags) {
          const { remove } = await import('../commands/claude-md.mjs');
          return remove(root, { global: flags.global === true, path: flags.path });
        },
      },
    },
    async run(root, flags, pos) {
      const subcmd = pos[0] || 'generate';
      if (!this.subcommands[subcmd]) throw new Error(`Unknown subcommand: ${subcmd}`);
      return this.subcommands[subcmd].run(root, flags, pos.slice(1));
    },
  },
];
