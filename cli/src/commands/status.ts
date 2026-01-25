import fetch from 'node-fetch';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import os from 'os';
// @ts-ignore
import Table from 'cli-table3';

const CONFIG_PATH = path.join(os.homedir(), '.claude-rank.json');

export async function statusCommand() {
    if (!fs.existsSync(CONFIG_PATH)) {
        console.error(chalk.red('Not logged in. Run `claude-rank login`'));
        process.exit(1);
    }

    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));

    try {
        const res = await fetch(`${config.api_url}/user/${config.twitter_handle}`);
        if (!res.ok) throw new Error('Failed to fetch stats');

        const user = await res.json() as any;

        const table = new Table({
            head: [chalk.cyan('Metric'), chalk.cyan('Value')],
            style: { head: [], border: [] }
        });

        table.push(
            ['Global Rank', chalk.bold.yellow(`#${user.rank || '?'}`)],
            ['Twitter Handle', chalk.bold.white(`@${user.twitter_handle}`)],
            ['Total Tokens', chalk.green(user.total_tokens.toLocaleString())],
            ['Savings Score', chalk.blue(`${user.savings_score?.toFixed(1)}%`)],
            ['Cache Read', user.cache_tokens.toLocaleString()],
            ['Output Gen', user.output_tokens.toLocaleString()]
        );

        console.log(chalk.bold(`\n  CLAUDE RANK STATUS`));
        console.log(table.toString());

    } catch (error: any) {
        console.error(chalk.red(`Error: ${error.message}`));
    }
}
