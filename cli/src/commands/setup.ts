import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

const CONFIG_PATH = path.join(os.homedir(), '.claude-rank.json');

export async function setupCommand() {
    if (!fs.existsSync(CONFIG_PATH)) {
        console.error(chalk.red('Error: You must login first. Run `claude-rank login`'));
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

    const vars = [
        `export CLAUDE_CODE_ENABLE_TELEMETRY=1`,
        `export OTEL_EXPORTER_OTLP_ENDPOINT="${config.api_url}/v1/metrics"`, // Use correct metrics endpoint
        // Note: OTel standard is headers for auth usually, but resource attributes works if collector supports it.
        // Our backend looks at Resource Attributes.
        `export OTEL_RESOURCE_ATTRIBUTES="twitter_handle=@${config.twitter_handle.replace('@', '')},cr_api_key=${config.api_key}"`
    ].join('\n');

    try {
        console.log(chalk.blue(`Detected shell config: ${rcFile}`));

        // Check if already exists to avoid duplication
        const currentContent = fs.existsSync(rcFile) ? fs.readFileSync(rcFile, 'utf-8') : '';
        if (currentContent.includes('CLAUDE_CODE_ENABLE_TELEMETRY')) {
            console.log(chalk.yellow('Configuration seems to already exist in file. Skipping append.'));
            printVars(config);
            return;
        }

        fs.appendFileSync(rcFile, `\n${vars}\n`);
        console.log(chalk.green(`\nSuccessfully appended environment variables to ${rcFile}`));
        console.log(chalk.cyan('Please restart your terminal or run: source ' + rcFile));

    } catch (error: any) {
        console.error(chalk.red(`Failed to write to file: ${error.message}`));
        printVars(config);
    }
}

function printVars(config: any) {
    console.log('\nAdd these lines to your shell config manually:\n');
    console.log(`export CLAUDE_CODE_ENABLE_TELEMETRY=1`);
    console.log(`export OTEL_EXPORTER_OTLP_ENDPOINT="${config.api_url}/v1/metrics"`);
    console.log(`export OTEL_RESOURCE_ATTRIBUTES="twitter_handle=${config.twitter_handle},api_key=${config.api_key}"`);
}
