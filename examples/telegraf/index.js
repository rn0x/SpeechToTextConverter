/**
 * LICENSE MIT
 * Copyright (c) 2024 rn0x
 * github: https://github.com/rn0x
 * telegram: https://t.me/F93ii
 * repository: https://github.com/rn0x/Audio2TextJS
 */

import { Telegraf } from 'telegraf';
import fs from 'fs';
import fetch from 'node-fetch';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Audio2TextJS from '../../src/Audio2TextJS.js';

// Create your bot using the token
const bot = new Telegraf('YOUR_TELEGRAM_BOT_TOKEN');

// Define __dirname using import.meta.url and path.dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the Audio2TextJS
const sttConverter = new Audio2TextJS({
    threads: 4,
    processors: 1,
    duration: 0,
    maxLen: 0,
    outputJson: true,
    outputTxt: false,
    outputCsv: false
});

// Ensure the 'downloads' directory exists, create it if not
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir);
}

/**
 * Downloads a file from a URL and saves it to a local path
 * @param {string} url - The URL of the file to download
 * @param {string} outputPath - The local path to save the downloaded file
 * @returns {Promise<string>} - The path to the downloaded file
 */
const downloadFile = async (url, outputPath) => {
    const response = await fetch(url);
    const buffer = await response.buffer();
    await fs.promises.writeFile(outputPath, buffer);
    return outputPath;
};

/**
 * Handles audio messages sent to the bot
 * @param {Object} ctx - The update context from Telegraf
 */
const handleAudioMessage = async (ctx) => {
    try {
        const audio = ctx.message.audio || ctx.message.voice;

        if (!audio) {
            return ctx.reply('Please send an audio file.');
        }

        const fileLink = await ctx.telegram.getFileLink(audio.file_id);
        const inputFileUrl = fileLink.href;
        const inputFilePath = path.join(downloadsDir, `${audio.file_id}.ogg`);

        // Download the audio file from the URL
        await downloadFile(inputFileUrl, inputFilePath);

        // Run the speech-to-text conversion process using the Audio2TextJS
        const result = await sttConverter.runWhisper(inputFilePath, 'base', 'auto');

        if (result.success) {
            ctx.reply(`Conversion completed successfully:\n${result.output}`);
        } else {
            ctx.reply(`Conversion failed:\n${result.message}`);
        }

        // Optionally delete the downloaded file after processing
        await fs.promises.unlink(inputFilePath);
    } catch (error) {
        ctx.reply(`An error occurred while processing the message:\n${error.message}`);
    }
};

// Listen for text commands
bot.start((ctx) => ctx.reply('Welcome! Send me an audio file to convert it to text.'));

// Listen for audio and voice messages
bot.on(['audio', 'voice'], handleAudioMessage);

// Start the bot
bot.launch().then(() => {
    console.log('The bot is now running...');
}).catch((error) => {
    console.error('Failed to launch the bot:', error.message);
});
