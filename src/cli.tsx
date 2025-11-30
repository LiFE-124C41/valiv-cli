#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import App from './ui/App.js';

const program = new Command();

program
  .name('valiv')
  .description('CLI tool for tracking vα-liv activities')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize valiv-cli')
  .action(() => {
    render(<App command="init" />);
  });

program
  .command('add')
  .description('Add a new creator')
  .action(() => {
    render(<App command="add" />);
  });

program
  .command('remove')
  .alias('rm')
  .description('Remove a creator')
  .action(() => {
    render(<App command="remove" />);
  });

program
  .command('list')
  .description('List registered creators')
  .option('-d, --detail', 'Show detailed information')
  .option('-i, --interactive', 'Enable interactive mode')
  .action((options) => {
    render(
      <App
        command="list"
        detail={options.detail}
        interactive={options.interactive}
      />,
    );
  });

program
  .command('check')
  .description('Check recent activities')
  .argument('[id]', 'Filter by creator ID or name')
  .option('-a, --audio-only', 'Play audio only (MPV)')
  .option('-d, --debug', 'Enable debug logging to file')
  .action((id, options) => {
    render(
      <App
        command="check"
        filterId={id}
        audioOnly={options.audioOnly}
        debug={options.debug}
      />,
    );
  });

program
  .command('schedule')
  .description('Check upcoming schedules')
  .argument('[id]', 'Filter by creator ID or name')
  .action((id) => {
    render(<App command="schedule" filterId={id} />);
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
