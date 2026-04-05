import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { urls, CONFIG_PATH } from '../config';

export async function setupCommand() {
    if (!fs.existsSync(CONFIG_PATH)) {
        console.error(chalk.red('Error: You must login first. Run `npx crank-cli login`'));
        process.exit(1);
    }

    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));

    // Detect Shell
    const shell = process.env.SHELL || '';
    let rcFile = '';

    if (shell.includes('zsh')) {
        rcFile = path.join(os.homedir(), '.zshrc');
    } else if (shell.includes('bash')) {
        rcFile = path.join(os.homedir(), '.bashrc');
    } else {
        console.log(chalk.yellow('Could not detect shell (zsh/bash). Printing vars manually:'));
        printVars(config);
        return;
    }

    // Based on https://code.claude.com/docs/en/monitoring-usage
    const vars = [
        `# AI Rank Telemetry Configuration`,
        `export CLAUDE_CODE_ENABLE_TELEMETRY=1`,
        `export OTEL_METRICS_EXPORTER=otlp`,
        `export OTEL_LOGS_EXPORTER=otlp`,
        `export OTEL_TRACES_EXPORTER=otlp`,
        `export OTEL_EXPORTER_OTLP_PROTOCOL=http/json`,
        `export OTEL_EXPORTER_OTLP_ENDPOINT="${urls.OTEL}"`,
        `export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer ${config.api_key},X-Twitter-Handle=${config.twitter_handle}"`,
        `export OTEL_METRIC_EXPORT_INTERVAL=5000`,
        `export OTEL_SERVICE_NAME="claude-code"`,
        `export OTEL_RESOURCE_ATTRIBUTES="twitter_handle=${config.twitter_handle},user.id=${config.twitter_handle},service.name=claude-code"`
    ].join('\n');

    try {
        console.log(chalk.blue(`Detected shell config: ${rcFile}`));

        // Check if already exists to avoid duplication
        const currentContent = fs.existsSync(rcFile) ? fs.readFileSync(rcFile, 'utf-8') : '';
        if (currentContent.includes('CLAUDE_CODE_ENABLE_TELEMETRY')) {
            console.log(chalk.yellow('Configuration already exists. Replacing with new config...'));
            
            // Robustly remove old config block
            const newContent = currentContent
                .replace(/# AI Rank Telemetry Configuration[\s\S]*?export OTEL_RESOURCE_ATTRIBUTES=.*\n?/g, '')
                .replace(/export CLAUDE_CODE_ENABLE_TELEMETRY=.*\n?/g, '')
                .replace(/export OTEL_EXPORTER_OTLP_ENDPOINT=.*\n?/g, '')
                .replace(/export OTEL_RESOURCE_ATTRIBUTES=.*\n?/g, '')
                .replace(/export OTEL_METRICS_EXPORTER=.*\n?/g, '')
                .replace(/export OTEL_LOGS_EXPORTER=.*\n?/g, '')
                .replace(/export OTEL_TRACES_EXPORTER=.*\n?/g, '')
                .replace(/export OTEL_EXPORTER_OTLP_PROTOCOL=.*\n?/g, '')
                .replace(/export OTEL_EXPORTER_OTLP_HEADERS=.*\n?/g, '')
                .replace(/export OTEL_METRIC_EXPORT_INTERVAL=.*\n?/g, '')
                .replace(/export OTEL_SERVICE_NAME=.*\n?/g, '');
            
            fs.writeFileSync(rcFile, newContent.trim() + `\n\n${vars}\n`);
        } else {
            fs.appendFileSync(rcFile, `\n\n${vars}\n`);
        }

        console.log(chalk.green(`\n✓ Successfully configured environment variables in ${rcFile}`));
        console.log(chalk.cyan('\nPlease restart your terminal or run:'));
        console.log(chalk.white(`  source ${rcFile}`));
        console.log(chalk.cyan('\nThen run Claude Code to start tracking:'));
        console.log(chalk.white('  claude'));

    } catch (error: any) {
        console.error(chalk.red(`Failed to write to file: ${error.message}`));
        printVars(config);
    }
}

function printVars(config: any) {
    console.log('\nAdd these lines to your shell config manually:\n');
    console.log(chalk.gray('# AI Rank Telemetry Configuration'));
    console.log(`export CLAUDE_CODE_ENABLE_TELEMETRY=1`);
    console.log(`export OTEL_METRICS_EXPORTER=otlp`);
    console.log(`export OTEL_LOGS_EXPORTER=otlp`);
    console.log(`export OTEL_TRACES_EXPORTER=otlp`);
    console.log(`export OTEL_EXPORTER_OTLP_PROTOCOL=http/json`);
    console.log(`export OTEL_EXPORTER_OTLP_ENDPOINT="${urls.OTEL}"`);
    console.log(`export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer ${config.api_key},X-Twitter-Handle=${config.twitter_handle}"`);
    console.log(`export OTEL_METRIC_EXPORT_INTERVAL=5000`);
    console.log(`export OTEL_SERVICE_NAME="claude-code"`);
    console.log(`export OTEL_RESOURCE_ATTRIBUTES="twitter_handle=${config.twitter_handle},user.id=${config.twitter_handle},service.name=claude-code"`);
}
