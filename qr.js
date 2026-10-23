const { makeid } = require('./id');
const { create } = require('./session');
const express = require('express');
const fs = require('fs');
const QRCode = require('qrcode');
const pino = require('pino');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    Browsers,
    makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');

const router = express.Router();

function removeFile(p) {
    if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = makeid();
    const dir = './temp/' + id;
    let sent = false;

    async function start() {
        const { state, saveCreds } = await useMultiFileAuthState(dir);
        try {
            const logger = pino({ level: 'fatal' }).child({ level: 'fatal' });
            const sock = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, logger)
                },
                printQRInTerminal: false,
                logger,
                browser: Browsers.macOS('Desktop')
            });

            sock.ev.on('creds.update', saveCreds);

            sock.ev.on('connection.update', async (u) => {
                const { connection, lastDisconnect, qr } = u;

                if (qr && !sent && !res.headersSent) {
                    sent = true;
                    const png = await QRCode.toBuffer(qr);
                    res.setHeader('Content-Type', 'image/png');
                    res.end(png);
                }

                if (connection === 'open') {
                    await delay(5000);
                    const json = await fs.promises.readFile(`${__dirname}/temp/${id}/creds.json`, 'utf-8');
                    const { id: data } = await create(json);
                    await sock.sendMessage(sock.user.id, { text: 'bot~' + data });
                    await delay(100);
                    await sock.ws.close();
                    removeFile(dir);
                } else if (
                    connection === 'close' &&
                    lastDisconnect && lastDisconnect.error &&
                    lastDisconnect.error.output &&
                    lastDisconnect.error.output.statusCode !== 401
                ) {
                    await delay(10000);
                    start();
                }
            });
        } catch (err) {
            console.log('qr service error:', err.message);
            removeFile(dir);
            if (!res.headersSent) res.status(503).json({ code: 'Service Unavailable' });
        }
    }

    return start();
});

module.exports = router;
