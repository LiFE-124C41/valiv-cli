#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import App from './ui/App';

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
    .command('list')
    .description('List registered creators')
    .action(() => {
        render(<App command="list" />);
    });

program
    .command('check')
    .description('Check recent activities')
    .argument('[name]', 'Filter by creator name')
    .action((name) => {
        render(<App command="check" filterName={name} />);
    });

program
    .command('schedule')
    .description('Check upcoming schedules')
    .argument('[name]', 'Filter by creator name')
    .action((name) => {
        render(<App command="schedule" filterName={name} />);
    });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
}
