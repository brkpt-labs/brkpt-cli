#!/usr/bin/env node
import { Command } from 'commander';
import pc from 'picocolors';
import updateNotifier from 'update-notifier';

import pkg from '../package.json' with { type: 'json' };
import { registerAuthCommands } from './commands/auth';

updateNotifier({ pkg }).notify();

const program = new Command();

program
  .name('brkpt')
  .description('The official CLI for brkpt')
  .version(pkg.version)
  .configureOutput({
    writeErr: (str) => process.stderr.write(pc.red('✗') + ' ' + str),
  })
  .showHelpAfterError(true);

registerAuthCommands(program);

program.parse();
