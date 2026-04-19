import { Command } from 'commander';
import { authInit } from './auth/init';
import { authAdd } from './auth/add';

export function registerAuthCommands(program: Command) {
  const auth = program.command('auth').description('Commands for brkpt-auth');

  auth
    .command('init')
    .description('Initialize brkpt-auth in your NestJS project')
    .action(authInit);

  auth
    .command('add [feature]')
    .description('Add a brkpt-auth feature')
    .option('--verifier <names>', 'Add verifier(s) for this feature')
    .action(authAdd);
}
