#!/usr/bin/env node
import { Command } from 'commander';
import { loginCommand } from './commands/login';
import { setupCommand } from './commands/setup';
import { statusCommand } from './commands/status';

const program = new Command();

program
    .name('claude-rank')
    .description('CLI for Claude Rank Leaderboard')
    .version('1.0.0');

program
    .command('login')
    .description('Authenticate with Claude Rank')
    .action(loginCommand);

program
    .command('setup')
    .description('Configure shell environment for OTel')
    .action(setupCommand);

program
    .command('status')
    .description('Check your current rank and stats')
    .action(statusCommand);

program.parse(process.argv);
