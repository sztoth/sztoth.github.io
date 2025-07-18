const logArea = document.getElementById('log');

function log(message) {
    console.log(message);
    logArea.value += message + '\n';
    logArea.scrollTop = logArea.scrollHeight;
}

const delay = 10000; // 10 seconds in milliseconds, equivalent to the Go default

function NewAuthenticationMessage(accessToken) {
    return {
        messageType: 1,
        commandId: 2,
        accessToken: accessToken,
    };
}

function NewVoteMessage() {
    return {
        id: null,
        messageType: 1,
        commandId: 1,
        scope: 1,
        fwd: [
            {
                riddleId: 514690,
                messageType: 1,
                commandId: 1,
                category: "core_metrics",
                label: "start",
            },
            {
                riddleId: 514690,
                messageType: 1,
                commandId: 1,
                category: "answer",
                label: "1.66",
            },
        ],
    };
}

async function fetchSettings() {
    log('Fetching settings...');
    try {
        const response = await fetch('https://www.riddle.com/embed/ws/handshake/access-token/514690', {
            method: 'GET',
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Accept-Encoding': 'gzip',
                'Accept-Language': 'en-GB,en;q=0.9',
                'appToken': 'none',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Priority': 'u=3, i',
                'Referer': 'https://www.riddle.com/',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
                'X-Requested-With': 'XMLHttpRequest',
            }
        });

        if (!response.ok) {
            throw new Error(`Unexpected status code: ${response.status}`);
        }

        const accessToken = response.headers.get('x-access-token');
        const websocketURL = response.headers.get('x-websocket-url');

        if (!accessToken) {
            throw new Error('Access token not found in response headers');
        }
        if (!websocketURL) {
            throw new Error('Websocket URL not found in response headers');
        }

        log('Settings fetched successfully.');
        return { websocketURL, accessToken };
    } catch (error) {
        log(`Error fetching settings: ${error.message}`);
        throw error;
    }
}

function castVote(websocketURL, accessToken) {
    return new Promise((resolve, reject) => {
        log('Casting vote...');
        const conn = new WebSocket(websocketURL);

        conn.onopen = () => {
            log('WebSocket connection established.');
            const authMessage = NewAuthenticationMessage(accessToken);
            conn.send(JSON.stringify(authMessage));
            log('Authentication message sent.');
        };

        conn.onmessage = (event) => {
            const message = JSON.parse(event.data);

            // Assuming the first message is the auth response
            if (message.messageType === 2 && message.commandId === 2) {
                if (message.success) {
                    log('Authentication successful.');
                    const voteMessage = NewVoteMessage();
                    conn.send(JSON.stringify(voteMessage));
                    log('Vote message sent.');
                } else {
                    reject(new Error(`Authentication failed: ${message.reason}`));
                    conn.close();
                }
            } else if (message.messageType === 2 && message.commandId === 1) { // Vote response
                if (message.success) {
                    log('Vote successful.');
                    resolve();
                } else {
                    reject(new Error(`Vote failed: ${message.reason}`));
                }
                conn.close();
            } else {
                log(`Received unknown message: ${event.data}`);
            }
        };

        conn.onerror = (error) => {
            log(`WebSocket error: ${error.message}`);
            reject(error);
        };

        conn.onclose = () => {
            log('WebSocket connection closed.');
        };
    });
}

async function vote() {
    try {
        const { websocketURL, accessToken } = await fetchSettings();
        await castVote(websocketURL, accessToken);
        return true;
    } catch (error) {
        log(`Vote failed: ${error.message}`);
        return false;
    }
}

async function run() {
    let counter = 1;
    // while (true) {
        const success = await vote();
        if (success) {
            log(`Vote ${counter} successful`);
            counter++;
        } else {
            log(`Vote ${counter} failed`);
        }

        const wait = Math.floor(Math.random() * (delay - 1000)) + 1000;
        log(`Waiting for ${wait / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, wait));
    // }
}

document.addEventListener('DOMContentLoaded', () => {
    run();
});

