import fetch from 'node-fetch';
import open from 'open';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_PATH = path.join(os.homedir(), '.claude-rank.json');
// Default to localhost for dev, but configurable
const API_URL = process.env.CLAUDE_RANK_API || 'http://localhost:3000/api';

interface DeviceCodeResponse {
    device_code: string;
    verification_uri: string;
    expires_in: number;
    interval: number;
    error?: string;
}

interface PollResponse {
    status: 'pending' | 'complete';
    api_key?: string;
    twitter_handle?: string;
    error?: string;
}

export async function loginCommand() {
    console.log(chalk.blue('Initiating device flow login...'));

    try {
        // 1. Request Code
        const res = await fetch(`${API_URL}/auth/device`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!res.ok) {
            throw new Error(`Failed to initialize auth: ${res.statusText}`);
        }

        const data = await res.json() as DeviceCodeResponse;

        if (data.error) {
            throw new Error(data.error);
        }

        const { device_code, verification_uri, interval } = data;
        const fullUri = `${verification_uri}?user_code=${device_code}`;

        console.log('\nPlease verify your device:');
        console.log(`Code: ${chalk.bold.green(device_code)}`);
        console.log(`URL:  ${chalk.underline(fullUri)}`);
        console.log('\nOpening browser...');

        await open(fullUri);

        process.stdout.write('Waiting for authentication...');

        // 2. Poll for Status
        const pollInterval = (interval || 5) * 1000;

        while (true) {
            await new Promise(r => setTimeout(r, pollInterval));
            process.stdout.write('.');

            const pollRes = await fetch(`${API_URL}/auth/device?code=${device_code}`);

            if (pollRes.status === 404) {
                // Code invalid or expired
                throw new Error('Device code expired or invalid.');
            }

            const pollData = await pollRes.json() as PollResponse;

            if (pollData.error) {
                // Should we abort?
                // If it's "pending", backend shouldn't return error but maybe just status pending.
                // My backend returns status: pending normally.
                // If explicit error, abort.
                throw new Error(pollData.error);
            }

            if (pollData.status === 'complete' && pollData.api_key) {
                console.log(chalk.green('\n Success!'));

                // 3. Save Creds
                const config = {
                    twitter_handle: pollData.twitter_handle,
                    api_key: pollData.api_key,
                    api_url: API_URL
                };

                fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

                console.log(chalk.green(`Logged in as @${pollData.twitter_handle}`));
                console.log(chalk.gray(`Credentials saved to ${CONFIG_PATH}`));
                console.log(chalk.cyan('\nNext step: Run `claude-rank setup` to configure your shell.'));
                break;
            }
            // If status is pending, continue loop
        }

    } catch (e: any) {
        console.error(chalk.red(`\nLogin failed: ${e.message}`));
        process.exit(1);
    }
}
