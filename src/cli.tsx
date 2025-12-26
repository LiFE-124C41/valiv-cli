#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import App from './ui/App.js';

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const program = new Command();

program
  .name('valiv')
  .description('CLI tool for tracking vα-liv activities')
  .version(pkg.version, '-v, --version');

program
  .command('init')
  .description('Initialize valiv-cli')
  .option('-C, --clean', 'Clean existing configuration and cache')
  .action((options) => {
    render(<App command="init" clean={options.clean} />);
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
  .option('-r, --refresh', 'Force refresh data')
  .option('--no-color-creator', 'Disable creator colors')
  .action((options) => {
    render(
      <App
        command="list"
        detail={options.detail}
        interactive={options.interactive}
        refresh={options.refresh}
        disableColor={!options.colorCreator}
      />,
    );
  });

program
  .command('check')
  .description('Check recent activities')
  .argument('[id]', 'Filter by creator ID or name')
  .option('-a, --audio-only', 'Play audio only (MPV)')
  .option('-p, --playlist <path>', 'Path to uta_picker playlist CSV file')
  .option('-d, --debug', 'Enable debug logging to file')
  .option('-r, --refresh', 'Force refresh data')
  .option(
    '-s, --summary',
    'Summarize the latest activity (requires Gemini API Key)',
  )
  .option('--no-color-creator', 'Disable creator colors')
  .action((id, options) => {
    render(
      <App
        command="check"
        filterId={id}
        audioOnly={options.audioOnly}
        playlist={options.playlist}
        debug={options.debug}
        refresh={options.refresh}
        summary={options.summary}
        disableColor={!options.colorCreator}
      />,
    );
  });

program
  .command('schedule')
  .description('Check upcoming schedules')
  .argument('[id]', 'Filter by creator ID or name')
  .option('-r, --refresh', 'Force refresh data')
  .option('-w, --week', 'Show weekly graphical view')
  .option('--no-color-creator', 'Disable creator colors')
  .action((id, options) => {
    render(
      <App
        command="schedule"
        filterId={id}
        refresh={options.refresh}
        week={options.week}
        disableColor={!options.colorCreator}
      />,
    );
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
